import { h, Fragment } from "preact";
import { useAsyncReducer } from "../../use-async-reducer.js";
import { Image } from "../../image.js";
import { decode } from "../../raw-decoder.js";
import ImageView from "../image-view/index.jsx";
import { cleanSet } from "../../clean-set.js";
// @ts-ignore
import classes from "./index.module.css";
import { Operation } from "../../operations.js";

interface State {
  file: Blob | null;
  image: Image | null;
  operations: Array<Operation>;
}

const enum ActionType {
  DecodeImage,
}

interface DecodeImageAction {
  type: ActionType.DecodeImage;
  file: Blob;
  scale?: number;
}

type Action = DecodeImageAction;

type ActionObject = {
  [key in ActionType]: (state: State, action: Action) => Promise<State>;
};
const actions: ActionObject = {
  async [ActionType.DecodeImage](state: State, action: DecodeImageAction) {
    const buffer = await new Response(action.file).arrayBuffer();
    const image = decode(buffer, (action.scale ?? 100) / 100);
    return cleanSet(state, ["image"], image);
  },
};

export interface Props {
  file: Blob;
  initialScale?: number;
}
export default function Editor({ file, initialScale = 20 }: Props) {
  const [{ image, operations }, dispatch] = useAsyncReducer<State, Action>(
    async (state: State, action: Action): Promise<State> => {
      return actions[action.type](state, action);
    },
    { file: null, image: null, operations: [] }
  );

  if (image === null) {
    dispatch({
      type: ActionType.DecodeImage,
      file,
      scale: initialScale,
    });
  }
  return (
    <section classes={classes.editor}>
      <div classes={classes.view}>
        {image ? <ImageView image={image} /> : "Loading..."}
      </div>
      <div classes={classes.controls}>
        <pre>{JSON.stringify(operations, null, "")}</pre>
      </div>
    </section>
  );
}
