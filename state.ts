import { cleanSet } from "./src/clean-set";
import { decode, Decoder, DecodeStep } from "./src/decoder";
import { GPUProcessor } from "./src/gpu";
import { Image } from "./src/processors/image";
import { process, ProcessingStep, Step } from "./src/processors/index.js";


export interface State {
  outputImage?: Image;
  steps?: Step;
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
  if(state.steps) {
    state.outputImage = await process({ gpu }, state.steps);
  }
  // New wrapper object to ensure a re-render. Debouncing happens
  // in sub-components.
  return { ...state };
}