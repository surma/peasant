import { h, Fragment } from "preact";
import type { JSXInternal } from "preact/src/jsx";
import { ProcessorUI } from "../../processors/processor-ui";

import curveProcessorUI from "../processors/curve/index.jsx";
import colorSpaceProcessorUI from "../processors/colorspace/index.jsx";
import { ProcessingStep } from "../../processors";
import { Action } from "../../../state";

const processorUIs: ProcessorUI[] = [curveProcessorUI, colorSpaceProcessorUI];

interface Props {
  step: ProcessingStep;
  path: (string | number)[];
  dispatch: (action: Action) => void;
}

export function renderStepUI({
  dispatch,
  path,
  step,
}: Props): JSXInternal.Element {
  const ui = processorUIs.find((ui) => ui.canRender(step));
  if (!ui) {
    return <pre>Unknown step {step.name}</pre>;
  }
  return ui.render({ dispatch, path, step });
}
