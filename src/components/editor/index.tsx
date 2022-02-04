import { h, Fragment } from "preact";
import { useEffect } from "preact/hooks";
import { Action, reducer, State } from "../../../state.js";
import { useAsyncReducer } from "../../use-async-reducer.js";
import ImageView from "../image-view/index.jsx";
import ProcessingSteps from "../controls/index.jsx";

// @ts-ignore
import classes from "./index.module.css";

export interface Props {
  blob: Blob;
  initialScale?: number;
}
export default function Editor({ blob, initialScale = 20 }: Props) {
  const [{ steps, outputImage }, dispatch] = useAsyncReducer<State, Action>(
    reducer,
    {
      steps: {
        blob,
        scale: 20,
      },
    }
  );

  // Kick off initial processing
  useEffect(
    () =>
      dispatch({
        path: [],
        value: null,
      }),
    []
  );

  return (
    <section classes={classes.editor}>
      <div classes={classes.view}>
        {outputImage ? <ImageView image={outputImage} /> : "Rendering..."}
      </div>
      <div classes={classes.processing}>
        <ProcessingSteps path={["steps"]} steps={steps} dispatch={dispatch} />
      </div>
    </section>
  );
}
