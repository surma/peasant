import { h, Fragment } from "preact";
import {
  ProcessorType,
  ProcessingStep,
  DecodeProcessor,
  CurveProcessor,
} from "../../core/processing.js";
import { ToneCurve } from "../../custom-elements/tone-curve/index.js";

import type { JSXInternal } from "preact/src/jsx";

// @ts-ignore
import classes from "./index.module.css";
import { Action } from "../../core/state.js";

type ProcessStepRenderers = {
  [key in ProcessorType]: (
    step: ProcessingStep,
    props: Props
  ) => JSXInternal.Element;
};
const processStepRenderers: ProcessStepRenderers = {
  [ProcessorType.DECODE](step: DecodeProcessor, props: Props) {
    return <pre>Decoding {step.scale}</pre>;
  },
  [ProcessorType.CURVE](step: CurveProcessor, { path = [], dispatch }: Props) {
    function listener(ev) {
      const tc = ev.target as ToneCurve;
      dispatch({
        path: [...path, "curvePoints"],
        value: tc.points,
      });
    }
    return (
      // @ts-ignore LOL
      <tone-curve points={step.curvePoints} oninput={listener}></tone-curve>
    );
  },
};

interface Props {
  steps: ProcessingStep;
  path: (string | number)[];
  dispatch: (action: Action) => void;
}

export default function ProcessSteps(props: Props) {
  const { steps, dispatch, path } = props;
  return (
    <>
      <div classes={classes.step}>
        {processStepRenderers[steps.type](steps, props)}
      </div>
      {"source" in steps ? (
        <ProcessSteps
          path={[...path, "source"]}
          dispatch={dispatch}
          steps={steps.source}
        />
      ) : null}
    </>
  );
}
