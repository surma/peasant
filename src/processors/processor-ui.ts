import { JSXInternal } from "preact/src/jsx";
import { ProcessingStep } from ".";
import { Action } from "../../state";

export interface ProcessorUIProps {
  path: (string | number)[];
  step: ProcessingStep;
  dispatch: (action: Action) => void;
}

export interface ProcessorUI {
  canRender(step: ProcessingStep): boolean;
  render(props: ProcessorUIProps): JSXInternal.Element;
}
