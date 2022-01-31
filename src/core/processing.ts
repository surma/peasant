import { decode } from "../raw-decoder/index.js";
import { ToneCurve, Point } from "../custom-elements/tone-curve/index.js";
import { OperationType, ColorSpaceConversion } from "../gpu/operations.js";

import type { GPUProcessor } from "../gpu/index.js";
import type { Image } from "./image.js";

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
