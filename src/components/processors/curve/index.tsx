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
    function listener(ev) {
      const tc = ev.target as ToneCurve;
      dispatch({
        path: [...path, "curve"],
        value: tc.points,
      });
    }
    // @ts-ignore LOL
    return <tone-curve points={data.curve} oninput={listener}></tone-curve>;
  },
};

export function add(source: ProcessingStep): ProcessingStep {
  const data: CurveProcessingData = {
    channel: 2,
    curve: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
    space: ColorSpace.xyY,
  };
  return {
    name,
    data,
    source,
  };
}
