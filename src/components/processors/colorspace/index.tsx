import { h, Fragment } from "preact";
import { ProcessorUIProps } from "../../../processors/processor-ui.js";
import {
  ColorSpace,
  ColorSpaceProcessingData,
  name,
} from "../../../processors/colorspace/index.js";
import { ProcessingStep } from "../../../processors/index.js";

export default {
  canRender(step: ProcessingStep) {
    return step.name === name;
  },
  render({ step, path, dispatch }: ProcessorUIProps) {
    const data = step.data as ColorSpaceProcessingData;
    return <pre>${ColorSpace[data.space]}</pre>;
  },
};
