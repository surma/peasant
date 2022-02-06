import { h, Fragment } from "preact";
import { ToneCurve } from "../../../custom-elements/tone-curve/index.js";
import { ProcessorUIProps } from "../../../processors/processor-ui.js";
import {
  ColorSpace,
  CurveProcessingData,
  name,
} from "../../../processors/curve/index.js";
import { ProcessingStep } from "../../../processors/index.js";

export default {
  canRender(step: ProcessingStep) {
    return step.name === name;
  },
  render({ step, path, dispatch }: ProcessorUIProps) {
    const data = step.data as CurveProcessingData;

    function curveInputListener(ev) {
      const tc = ev.target as ToneCurve;
      dispatch({
        path: [...path, "data", "curve"],
        value: tc.points,
      });
    }

    function rangeInputListener(ev) {
      const input = ev.target as HTMLInputElement;
      const field = input.dataset.field;
      dispatch({
        path: [...path, "data", field],
        value: input.value,
      });
    }

    // @ts-ignore LOL
    return (
      <>
        <tone-curve
          points={data.curve}
          onInput={curveInputListener}
        ></tone-curve>
        {["inMin", "inMax", "outMin", "outMax"].map((field) => (
          <label>
            {field}:{" "}
            <input
              type="number"
              step={0.01}
              value={data[field]}
              data-field={field}
              onInput={rangeInputListener}
            />
          </label>
        ))}
        {["inChannel", "outChannel"].map((field) => (
          <label>
            {field}:{" "}
            <input
              type="number"
              value={data[field]}
              min={0}
              max={2}
              data-field={field}
              onInput={rangeInputListener}
            />
          </label>
        ))}
      </>
    );
  },
};

export function add(source: ProcessingStep): ProcessingStep {
  const data: CurveProcessingData = {
    curve: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
    space: ColorSpace.xyY,
    inChannel: 2,
    inMax: 1,
    inMin: 0,
    outChannel: 2,
    outMax: 1,
    outMin: 0,
  };
  return {
    name,
    data,
    source,
  };
}
