import { h, Fragment } from "preact";
import { ProcessorUIProps } from "../../../processors/processor-ui.js";
import {
  ColorSpaceProcessingData,
  name,
} from "../../../processors/colorspace/index.js";
import { ProcessingStep } from "../../../processors/index.js";
import { ColorSpaceConversion } from "../../../gpu/operations.js";

export default {
  canRender(step: ProcessingStep) {
    return step.name === name;
  },
  render({ step, path, dispatch }: ProcessorUIProps) {
    const data = step.data as ColorSpaceProcessingData;

    function update(ev) {
      const input = ev.target as HTMLInputElement;
      dispatch({
        path: [...path, "data", "space"],
        value: ColorSpaceConversion[input.value],
      });
    }

    return (
      <select onInput={update}>
        {Object.values(ColorSpaceConversion)
          .filter((key) => typeof key === "string")
          .map((key) => (
            <option
              selected={ColorSpaceConversion[key] === data.space}
              value={key}
            >
              {key}
            </option>
          ))}
      </select>
    );
  },
};

export function add(source: ProcessingStep): ProcessingStep {
  const data: ColorSpaceProcessingData = {
    space: ColorSpaceConversion.XYZ_to_sRGB,
  };
  return {
    name,
    data,
    source,
  };
}
