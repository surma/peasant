import { h, Fragment } from "preact";
import { Image } from "../../image.js";
import { decode } from "../../raw-decoder.js";
import { Point } from "../../tone-curve.js";
import { JSXInternal } from "preact/src/jsx";

// @ts-ignore
import classes from "./index.module.css";

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

type Processors = {
  [key in ProcessorType]: (step: ProcessingStep) => Promise<Image>;
};

const processors: Processors = {
  async [ProcessorType.DECODE](step: DecodeProcessor) {
    const buffer = await new Response(step.file).arrayBuffer();
    const image = decode(buffer, step.scale / 100);
    return image;
  },
  async [ProcessorType.CURVE](step: CurveProcessor) {
    return await process(step.source);
  },
};

export async function processNoCache(step: ProcessingStep): Promise<Image> {
  return await processors[step.type](step);
}

export function processCacheOnly(step: ProcessingStep): Image | null {
  return PROCESSOR_CACHE.get(step);
}

export async function process(step: ProcessingStep): Promise<Image> {
  if (!PROCESSOR_CACHE.has(step)) {
    const image = await processNoCache(step);
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
