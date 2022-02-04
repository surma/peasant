import { h, Fragment } from "preact";

// @ts-ignore
import classes from "./index.module.css";
import { ProcessingStep } from "../../processors";
import { Action } from "../../../state";
import { renderStepUI } from "../processors";
import StepControl from "../step-control";
import { isDecodeStep } from "../../decoder";

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

  function moveDown() {
    const child = { ...step.source };
    if (isDecodeStep(child)) return;
    const grandchild = child.source;
    child.source = { ...step };
    child.source.source = grandchild;
    dispatch({
      path,
      value: { ...child },
    });
  }

  return (
    <>
      <div classes={classes.step}>
        <button onClick={() => deleteProcessor()}>x</button>
        <button onClick={() => moveDown()}>v</button>
        {renderStepUI({ step: step, dispatch, path })}
      </div>
      {step?.source ? (
        <StepControl {...props} path={[...path, "source"]} step={step.source} />
      ) : null}
    </>
  );
}
