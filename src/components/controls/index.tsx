import { h, Fragment } from "preact";

// @ts-ignore
import classes from "./index.module.css";
import { Step } from "../../processors";
import { Action } from "../../../state";
import StepControl from "../step-control/index.jsx";
import { add as addCurve } from "../processors/curve/index.jsx";
import { add as addColorSpace } from "../processors/colorspace/index.jsx";

interface Props {
  steps?: Step;
  path: (string | number)[];
  dispatch: (action: Action) => void;
}

export default function ProcessSteps(props: Props) {
  const { steps, dispatch, path } = props;

  function addStep(stepAdderFunc) {
    dispatch({
      path: ["steps"],
      value: stepAdderFunc(steps),
    });
  }

  return (
    <>
      <div classes={classes.processors}>
        <button onClick={() => addStep(addCurve)}>Curve</button>
        <button onClick={() => addStep(addColorSpace)}>Color Space</button>
      </div>
      <StepControl {...props} step={steps} />
    </>
  );
}
