import { h, Fragment } from "preact";
import { useEffect } from "preact/hooks";
import { useAsyncReducer } from "../../use-async-reducer.js";
import ImageView from "../image-view/index.jsx";
import { cleanSet } from "../../clean-set.js";
import ProcessingSteps, {
  process,
  ProcessingStep,
  ProcessorType,
} from "../process-steps/index.jsx";
import { GPUProcessor } from "../../gpu/gpu.js";
import { Image } from "../../image";

// @ts-ignore
import classes from "./index.module.css";

interface State {
  file: Blob | null;
  steps: ProcessingStep;
  image?: Image;
}

export interface Action {
  path: (string | number)[];
  value: any;
}

const gpu = new GPUProcessor();
async function reducer(state: State, action: Action) {
  if (action.path.length > 0) {
    state = cleanSet(state, action.path, action.value);
  }
  state.image = await process({ gpu }, state.steps);
  // New wrapper object to ensure a re-render. Debouncing happens
  // in sub-components.
  return { ...state };
}

export interface Props {
  file: Blob;
  initialScale?: number;
}
export default function Editor({ file, initialScale = 20 }: Props) {
  const [{ steps, image }, dispatch] = useAsyncReducer<State, Action>(reducer, {
    file,
    steps: {
      type: ProcessorType.CURVE,
      curvePoints: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      source: {
        type: ProcessorType.CURVE,
        curvePoints: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        source: {
          type: ProcessorType.DECODE,
          file,
          scale: initialScale,
        },
      },
    },
  });

  // Kick-off processing on mount.
  useEffect(() => dispatch({ path: [], value: null }), []);
  return (
    <section classes={classes.editor}>
      <div classes={classes.view}>
        {image ? <ImageView image={image} /> : "Rendering..."}
      </div>
      <div classes={classes.processing}>
        <ProcessingSteps path={["steps"]} steps={steps} dispatch={dispatch} />
      </div>
    </section>
  );
}
