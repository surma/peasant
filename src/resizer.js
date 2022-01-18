import init, { resize_u16 } from "../resize/pkg/resize.js";

await init();

export function resize(img, factor) {
  const result = resize_u16(img.data, img.width, img.height, factor, 0);
  const [data, width, height] = result;
  return {
    ...img,
    width,
    height,
    data,
  };
}
