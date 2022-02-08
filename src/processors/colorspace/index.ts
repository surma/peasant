import { ProcessingStep, Processor } from "..";
import {
  ColorSpaceConversion,
  Operation,
  OperationType,
} from "../../gpu/operations";

export const name = "colorspace";

export interface ColorSpaceProcessingData {
  space: ColorSpaceConversion;
}

const processor: Processor = {
  name,
  toGPUOperation(proc: ProcessingStep): Operation[] {
    if (proc.name !== name) return [];
    const data = proc.data as ColorSpaceProcessingData;

    return [
      {
        type: OperationType.OPERATION_COLORSPACE_CONVERSION,
        conversion: data.space,
      },
    ];
  },
};

export default processor;
