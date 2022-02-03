import { h, Fragment } from "preact";

// @ts-ignore
import classes from "./index.module.css";
import { ProcessingStep } from "../../processors";
import { isImage } from "../../processors/image";
import { Action } from "../../../state";
import { renderStepUI } from "../processors";

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
        {renderStepUI({ step: steps, dispatch, path })}
      </div>
      {"source" in steps && !isImage(steps.source) ? (
        <ProcessSteps
          path={[...path, "source"]}
          dispatch={dispatch}
          steps={steps.source}
        />
      ) : (
        <pre>DECODER</pre>
      )}
    </>
  );
}
