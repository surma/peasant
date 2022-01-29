import { h, Fragment } from "preact";
import { useState, useCallback } from "preact/hooks";
import { Image } from "../../image";
import { clamp } from "../../utils";

export interface Props<T> {
  image: Image<T>;
}
export default function ImageView<T>({ image }: Props<T>) {
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const ref = useCallback((domNode) => {
    const ctx = domNode.getContext("2d");
    setCtx(ctx);
  }, []);

  if (ctx) {
    ctx.canvas.width = image.width;
    ctx.canvas.height = image.height;
    let data: Uint8ClampedArray;
    if (image.data instanceof Float32Array) {
      data = new Uint8ClampedArray(image.data.length);
      data.forEach((_, i) => {
        data[i] = clamp(0, image.data[i] * 255, 255);
      });
    } else if (image.data instanceof Uint8ClampedArray) {
      data = image.data;
    } else {
      throw Error("Unsupported data type");
    }
    ctx.putImageData(new ImageData(data, image.width, image.height), 0, 0);
  }

  return <canvas ref={ref} />;
}
