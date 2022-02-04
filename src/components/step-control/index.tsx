import { h, Fragment } from "preact";

import { Step } from "../../processors";
import { Action } from "../../../state";
import { isDecodeStep } from "../../decoder";
import DecoderControl from "../decoder-control";
import ProcessorControl from "../processor-control";

interface Props {
  step: Step;
  path: (string | number)[];
  dispatch: (action: Action) => void;
}

export default function StepControl(props: Props) {
  const { step, dispatch, path } = props;

  if (isDecodeStep(step)) {
    return <DecoderControl {...{ step, dispatch, path }} />;
  } else {
    return <ProcessorControl {...{ step, dispatch, path }} />;
  }
}
