import { h, Fragment } from "preact";
import { useRef } from "preact/hooks";
import { Image } from "../../image.js";
import { decode } from "../../raw-decoder.js";
import { Point } from "../../tone-curve.js";
import { GPUProcessor } from "../../webgpu.js";
import { JSXInternal } from "preact/src/jsx";

// @ts-ignore
import classes from "./index.module.css";
import { ColorSpaceConversion, OperationType } from "../../operations.js";

export const enum ProcessorType {
  DECODE,
  CURVE,
}

export interface DecodeProcessor {
  type: ProcessorType.DECODE;
  file: Blob;
  scale: number;
}

export interface CurveProcessor {
  type: ProcessorType.CURVE;
  curvePoints: Point[];
  source: ProcessingStep;
}

export type ProcessingStep = CurveProcessor | DecodeProcessor;

const PROCESSOR_CACHE = new WeakMap<ProcessingStep, Image>();

interface ProcessingContext {
  gpu: GPUProcessor;
}

type Processors = {
  [key in ProcessorType]: (
    ctx: ProcessingContext,
    step: ProcessingStep
  ) => Promise<Image>;
};

const processors: Processors = {
  async [ProcessorType.DECODE](ctx, step: DecodeProcessor) {
    const buffer = await new Response(step.file).arrayBuffer();
    const image = decode(buffer, step.scale / 100);
    return image;
  },
  async [ProcessorType.CURVE](ctx, step: CurveProcessor) {
    const source = await process(ctx, step.source);
    const curve = new Float32Array(512);
    curve.forEach((_, i, arr) => (arr[i] = 1 - i / 255));
    const result = await ctx.gpu.process(source, [
      {
        type: OperationType.OPERATION_APPLY_CURVE,
        conversion: ColorSpaceConversion.XYZ_to_xyY,
        channel: 2,
        curve,
      },
    ]);
    return result;
  },
};

export async function processNoCache(
  ctx: ProcessingContext,
  step: ProcessingStep
): Promise<Image> {
  return await processors[step.type](ctx, step);
}

export function processCacheOnly(step: ProcessingStep): Image | null {
  return PROCESSOR_CACHE.get(step);
}

export async function process(
  ctx: ProcessingContext,
  step: ProcessingStep
): Promise<Image> {
  if (!PROCESSOR_CACHE.has(step)) {
    const image = await processNoCache(ctx, step);
    PROCESSOR_CACHE.set(step, image);
  }
  return PROCESSOR_CACHE.get(step);
}

type ProcessDisplayRenderers = {
  [key in ProcessorType]: (step: ProcessingStep) => JSXInternal.Element;
};
const processStepRenderers: ProcessDisplayRenderers = {
  [ProcessorType.DECODE](step: DecodeProcessor) {
    return <pre>Decoding {step.scale}</pre>;
  },
  [ProcessorType.CURVE](step: CurveProcessor) {
    return <pre>Curve</pre>;
  },
};

interface Props {
  steps: ProcessingStep;
}

export default function ProcessSteps({ steps }: Props) {
  return (
    <>
      <div classes={classes.step}>
        {processStepRenderers[steps.type](steps)}
      </div>
      {"source" in steps ? <ProcessSteps steps={steps.source} /> : null}
    </>
  );
}
