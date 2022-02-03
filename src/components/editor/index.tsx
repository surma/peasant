import { h, Fragment } from "preact";
import { useEffect } from "preact/hooks";
import { Action, reducer, State } from "../../../state.js";
import { decode } from "../../decoder/index.js";
import { useAsyncReducer } from "../../use-async-reducer.js";
import ImageView from "../image-view/index.jsx";
import ProcessingSteps from "../process-steps/index.jsx";

// @ts-ignore
import classes from "./index.module.css";

export interface Props {
  file: Blob;
  initialScale?: number;
}
export default function Editor({ file, initialScale = 20 }: Props) {
  const [{ steps, image }, dispatch] = useAsyncReducer<State, Action>(reducer, {
    file,
    decoderOptions: {
      scale: 20,
    },
    //   name: "curve",
    //   data: {
    //     curve: [
    //       { x: 0, y: 0 },
    //       { x: 1, y: 1 },
    //     ],
    //   },
    //   source: {
    //     name: "curve",
    //     data: {
    //       curve: [
    //         { x: 0, y: 0 },
    //         { x: 1, y: 1 },
    //       ],
    //     },
    //     source: image
    //   },
    // },
  });

  useEffect(
    () =>
      dispatch({
        path: ["decoderOptions"],
        value: {
          scale: 20,
        },
      }),
    []
  );
  return (
    <section classes={classes.editor}>
      <div classes={classes.view}>
        {image ? <ImageView image={image} /> : "Rendering..."}
      </div>
      <div classes={classes.processing}>
        {steps ? (
          <ProcessingSteps path={["steps"]} steps={steps} dispatch={dispatch} />
        ) : null}
      </div>
    </section>
  );
}
