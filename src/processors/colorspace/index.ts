import { ProcessingStep, Processor } from "..";
import {
  ColorSpaceConversion,
  Operation,
  OperationType,
} from "../../gpu/operations";

export const name = "colorspace";

export enum ColorSpace {
  XYZ,
  xyY,
  sRGB,
}

export interface ColorSpaceProcessingData {
  space: ColorSpace;
}

const processor: Processor = {
  name,
  toGPUOperation(proc: ProcessingStep): Operation[] {
    if (proc.name !== name) return [];
    const data = proc.data as ColorSpaceProcessingData;

    const conversion = ColorSpaceConversion[`XYZ_to_${ColorSpace[data.space]}`];
    if (conversion === undefined) {
      throw Error("Invalid color space");
    }

    return [
      {
        type: OperationType.OPERATION_COLORSPACE_CONVERSION,
        conversion,
      },
    ];
  },
};

export default processor;
