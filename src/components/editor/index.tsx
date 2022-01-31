import { h, Fragment } from "preact";
import { useEffect } from "preact/hooks";
import { useAsyncReducer } from "../../use-async-reducer.js";
import ImageView from "../image-view/index.jsx";
import { ProcessorType } from "../../core/processing.js";
import ProcessingSteps from "../process-steps/index.jsx";

// @ts-ignore
import classes from "./index.module.css";
import { Action, reducer, State } from "../../core/state.js";

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
