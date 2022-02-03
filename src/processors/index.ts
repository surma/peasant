import { ToneCurve, Point } from "../custom-elements/tone-curve/index.js";
import { GPUProcessor } from "../gpu/index.js";
import {
  OperationType,
  ColorSpaceConversion,
  Operation,
} from "../gpu/operations.js";

import curveProcessor from "./curve/index.js";
import colorSpaceProcessor from "./curve/index.js";

import { Image, isImage } from "./image.js";

export interface ProcessingStep {
  name: string;
  source?: ProcessingStep | Image;
  data: any;
}

export interface Processor {
  name: string;
  toGPUOperation(step: ProcessingStep): Operation[];
}

const processors: Processor[] = [curveProcessor, colorSpaceProcessor];

// const PROCESSING_RESULT_CACHE = new WeakMap<ProcessingStep, Image>();

export interface ProcessingContext {
  gpu: GPUProcessor;
}

function mustFindProcessorByName(name: string): Processor {
  const processor = processors.find((processor) => processor.name === name);
  if (!processor) {
    throw Error(`Unknown processor: ${name}`);
  }
  return processor;
}

// export async function processNoCache(
//   ctx: ProcessingContext,
//   step: ProcessingStep
// ): Promise<Image> {
// }

// export function processCacheOnly(step: ProcessingStep): Image | null {
//   return PROCESSING_RESULT_CACHE.get(step);
// }

function* stepsIterator(step: ProcessingStep) {
  yield step;
  if (isImage(step.source)) {
    yield step.source;
    return;
  }
  yield* stepsIterator(step.source);
}

export async function process(
  ctx: ProcessingContext,
  step: ProcessingStep
): Promise<Image> {
  const steps = [...stepsIterator(step)];
  const image = steps.pop();
  const ops = steps.flatMap((step) =>
    mustFindProcessorByName(step.name).toGPUOperation(step)
  );
  return ctx.gpu.process(image, ops);

  // if (!PROCESSING_RESULT_CACHE.has(step)) {
  //   const image = await processNoCache(ctx, step);
  //   PROCESSING_RESULT_CACHE.set(step, image);
  // }
  // return PROCESSING_RESULT_CACHE.get(step);
}
