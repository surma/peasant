import { h, Fragment } from "preact";
import { useEffect } from "preact/hooks";
import { useAsyncReducer } from "../../use-async-reducer.js";
import ImageView from "../image-view/index.jsx";
import { cleanSet } from "../../clean-set.js";
import ProcessingSteps, {
  process,
  processNoCache,
  ProcessingStep,
  ProcessorType,
  processCacheOnly,
} from "../process-steps/index.jsx";
// @ts-ignore
import classes from "./index.module.css";

interface State {
  file: Blob | null;
  steps: ProcessingStep;
}

interface Action {
  path: (string | number)[];
  value: any;
}

async function reducer(state: State, action: Action) {
  if (action.path.length > 0) {
    state = cleanSet(state, action.path, action.value);
  }
  await process(state.steps);
  // New wrapper object to ensure a re-render. Debouncing happens
  // in sub-components.
  return { ...state };
}

export interface Props {
  file: Blob;
  initialScale?: number;
}
export default function Editor({ file, initialScale = 20 }: Props) {
  const [{ steps }, dispatch] = useAsyncReducer<State, Action>(reducer, {
    file,
    steps: {
      type: ProcessorType.DECODE,
      file,
      scale: initialScale,
    },
  });

  // Kick-off processing on mount.
  useEffect(() => dispatch({ path: [], value: null }), []);
  const image = processCacheOnly(steps);

  return (
    <section classes={classes.editor}>
      <div classes={classes.view}>
        {image ? <ImageView image={image} /> : "Loading..."}
      </div>
      <div classes={classes.processing}>
        <ProcessingSteps steps={steps} />
      </div>
    </section>
  );
}
