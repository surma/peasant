import { cleanSet } from "./src/clean-set";
import { decode, Decoder, DecoderOptions } from "./src/decoder";
import { GPUProcessor } from "./src/gpu";
import { Image } from "./src/processors/image";
import { process, ProcessingStep } from "./src/processors/index.js";


export interface State {
  file: Blob | null;
  decoderOptions?: DecoderOptions;
  image?: Image;
  steps?: ProcessingStep;
}

export interface Action {
  path: (string | number)[];
  value: any;
}

const gpu = new GPUProcessor();
export async function reducer(state: State, action: Action) {
  const oldState = state;
  if (action.path.length > 0) {
    state = cleanSet(state, action.path, action.value);
  }
  if(oldState.decoderOptions !== state.decoderOptions) {
    const buffer = await new Response(state.file).arrayBuffer();
    state.image = await decode(buffer, state.decoderOptions);
  }
  if(state.steps) {
    state.image = await process({ gpu }, state.steps);
  }
  // New wrapper object to ensure a re-render. Debouncing happens
  // in sub-components.
  return { ...state };
}
