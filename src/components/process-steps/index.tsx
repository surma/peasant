import { h, Fragment } from "preact";
import { Image } from "../../image.js";
import { decode } from "../../raw-decoder/index.js";
import { Point } from "../../custom-elements/tone-curve/index.js";
import { GPUProcessor } from "../../gpu/gpu.js";
import { JSXInternal } from "preact/src/jsx";
import { ToneCurve } from "../../custom-elements/tone-curve/index.js";

// @ts-ignore
import classes from "./index.module.css";
import { ColorSpaceConversion, OperationType } from "../../gpu/operations.js";
import { Action } from "../editor/index.js";

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
    const f = ToneCurve.cardinalSpline(
      ToneCurve.sortPoints(step.curvePoints),
      0
    );
    const curve = new Float32Array(512);
    curve.forEach((_, i, arr) => (arr[i] = f(i / 512)));
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
  [key in ProcessorType]: (
    step: ProcessingStep,
    props: Props
  ) => JSXInternal.Element;
};
const processStepRenderers: ProcessDisplayRenderers = {
  [ProcessorType.DECODE](step: DecodeProcessor, props: Props) {
    return <pre>Decoding {step.scale}</pre>;
  },
  [ProcessorType.CURVE](step: CurveProcessor, { path = [], dispatch }: Props) {
    function listener(ev) {
      const tc = ev.target as ToneCurve;
      dispatch({
        path: [...path, "curvePoints"],
        value: tc.points,
      });
    }
    return (
      // @ts-ignore LOL
      <tone-curve points={step.curvePoints} oninput={listener}></tone-curve>
    );
  },
};

interface Props {
  steps: ProcessingStep;
  path: (string | number)[];
  dispatch: (action: Action) => void;
}

export default function ProcessSteps(props: Props) {
  const { steps, dispatch, path } = props;
  return (
    <>
      <div classes={classes.step}>
        {processStepRenderers[steps.type](steps, props)}
      </div>
      {"source" in steps ? (
        <ProcessSteps
          path={[...path, "source"]}
          dispatch={dispatch}
          steps={steps.source}
        />
      ) : null}
    </>
  );
}
