import { ProcessingStep, Processor } from "..";
import { Point, ToneCurve } from "../../custom-elements/tone-curve";
import {
  ColorSpaceConversion,
  Operation,
  OperationType,
} from "../../gpu/operations";

export const name = "curve";

export enum ColorSpace {
  XYZ,
  xyY,
  sRGB,
}

export interface CurveProcessingData {
  space: ColorSpace;
  inMin: number;
  inMax: number;
  inChannel: number;
  outMin: number;
  outMax: number;
  outChannel: number;
  curve: Point[];
}

const processor: Processor = {
  name,
  toGPUOperation(proc: ProcessingStep): Operation[] {
    if (proc.name !== name) return [];
    const data = proc.data as CurveProcessingData;

    const f = ToneCurve.cardinalSpline(ToneCurve.sortPoints(data.curve), 0);
    const curve = new Float32Array(512);
    curve.forEach((_, i, arr) => (arr[i] = f(i / 512)));

    return [
      {
        type: OperationType.OPERATION_APPLY_CURVE,
        inChannel: data.inChannel,
        inMax: data.inMax,
        inMin: data.inMin,
        outChannel: data.outChannel,
        outMax: data.outMax,
        outMin: data.outMin,
        curve,
      },
    ];
  },
};

export default processor;
