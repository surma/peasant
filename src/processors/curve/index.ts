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
  channel: number;
  curve: Point[];
}

const processor: Processor = {
  name,
  toGPUOperation(proc: ProcessingStep): Operation[] {
    if (proc.name !== name) return [];
    const data = proc.data as CurveProcessingData;

    const conversion = ColorSpaceConversion[`XYZ_to_${ColorSpace[data.space]}`];
    if (!conversion) {
      throw Error("Invalid color space");
    }

    const f = ToneCurve.cardinalSpline(ToneCurve.sortPoints(data.curve), 0);
    const curve = new Float32Array(512);
    curve.forEach((_, i, arr) => (arr[i] = f(i / 512)));

    return [
      {
        type: OperationType.OPERATION_APPLY_CURVE,
        channel: data.channel,
        conversion,
        curve,
      },
    ];
  },
};

export default processor;
