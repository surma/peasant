import { cleanSet } from "../clean-set.js";
import { GPUProcessor } from "../gpu/index.js";
import { process, ProcessingStep } from "./processing.js";

import type { Image } from "./image.js";

export interface State {
  file: Blob | null;
  steps: ProcessingStep;
  image?: Image;
}

export interface Action {
  path: (string | number)[];
  value: any;
}

const gpu = new GPUProcessor();
export async function reducer(state: State, action: Action) {
  if (action.path.length > 0) {
    state = cleanSet(state, action.path, action.value);
  }
  state.image = await process({ gpu }, state.steps);
  // New wrapper object to ensure a re-render. Debouncing happens
  // in sub-components.
  return { ...state };
}
