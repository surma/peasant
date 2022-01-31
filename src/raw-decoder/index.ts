import factory from "../../raw/build/raw.js";
import init, { resize_u16 } from "../../resize/pkg/resize.js";

import type { Image } from "../image.js";

const module = await factory();
await module.ready;
await init();

export function decode(buffer: ArrayBuffer, scaleFactor: number): Image {
  const img = module.decode(new Uint8Array(buffer));
  const [data, width, height] = resize_u16(
    img.data,
    img.width,
    img.height,
    scaleFactor,
    0
  );
  return {
    ...img,
    width,
    height,
    data,
  };
}
