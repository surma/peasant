import { h, Fragment } from "preact";

// @ts-ignore
import classes from "./index.module.css";
import { ProcessingStep, Step } from "../../processors";
import { isImage } from "../../processors/image";
import { Action } from "../../../state";
import { renderStepUI } from "../processors";
import StepControl from "../step-control";

interface Props {
  step: ProcessingStep;
  path: (string | number)[];
  dispatch: (action: Action) => void;
}

export default function ProcessorControl(props: Props) {
  const { step, dispatch, path } = props;

  function deleteProcessor() {
    dispatch({
      path,
      value: step.source,
    });
  }

  return (
    <>
      <div classes={classes.step}>
        <button onClick={() => deleteProcessor()}>x</button>
        {renderStepUI({ step: step, dispatch, path })}
      </div>
      {step?.source ? (
        <StepControl {...props} path={[...path, "source"]} step={step.source} />
      ) : null}
    </>
  );
}
