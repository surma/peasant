import { h, Fragment } from "preact";
import { Action } from "../../../state.js";
import { DecodeStep } from "../../decoder/index.js";

export interface Props {
  step: DecodeStep;
  path: (string | number)[];
  dispatch: (action: Action) => void;
}
export default function DecoderControl({ step }: Props) {
  return <pre>{step.scale}</pre>;
}
