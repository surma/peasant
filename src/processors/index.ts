import { ToneCurve, Point } from "../custom-elements/tone-curve/index.js";
import { decode, DecodeStep, isDecodeStep } from "../decoder/index.js";
import { GPUProcessor } from "../gpu/index.js";
import {
  OperationType,
  ColorSpaceConversion,
  Operation,
} from "../gpu/operations.js";

import curveProcessor from "./curve/index.js";
import colorSpaceProcessor from "./colorspace/index.js";

import { Image, isImage } from "./image.js";

export type Step = ProcessingStep | DecodeStep;

export interface ProcessingStep {
  name: string;
  source?: Step;
  data: any;
}

export interface Processor {
  name: string;
  toGPUOperation(step: ProcessingStep): Operation[];
}

const processors: Processor[] = [curveProcessor, colorSpaceProcessor];

const RESULT_CACHE = new WeakMap<ProcessingStep, Image>();

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

function* stepsIterator(step: Step) {
  yield step;
  if (isDecodeStep(step)) {
    return;
  }
  yield* stepsIterator(step.source);
}

export async function process(
  ctx: ProcessingContext,
  step: Step
): Promise<Image> {
  const steps = [...stepsIterator(step)].reverse();
  const decodeStep = steps.shift();
  let image: Image;
  if (RESULT_CACHE.has(decodeStep)) {
    image = RESULT_CACHE.get(decodeStep)!;
  } else {
    image = await decode(decodeStep);
    RESULT_CACHE.set(decodeStep, image);
  }
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
