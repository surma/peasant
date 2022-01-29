import { h, Fragment } from "preact";
import { useState } from "preact/hooks";
import { Image } from "../../image.js";
import { decode } from "../../raw-decoder.js";
import ImageView from "../image-view/index.jsx";
// @ts-ignore
import classes from "./index.module.css";

export interface Props {
  buffer: ArrayBuffer;
  initialScale?: number;
}
export default function Editor({ buffer, initialScale = 20 }: Props) {
  const [image, setImage] = useState<Image | null>(null);

  if (image === null) {
    const bitmap = decode(buffer, initialScale / 100);
    setImage(bitmap);
    return;
  }
  return (
    <section classes={classes.editor}>
      <div classes={classes.view}>
        {image ? <ImageView image={image} /> : "Loading..."}
      </div>
      <div classes={classes.controls}>Controls here</div>
    </section>
  );
}
