import factory from "../../../raw/build/raw.js";
import init, { resize_u16 } from "../../../resize/pkg/resize.js";

import { Decoder } from "../index.js";

const module = await factory();
await module.ready;
await init();

const knownMagicHeaders = {
  // Canon’s CR files
  CRX: [
    0x00, 0x000, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x63, 0x72, 0x78, 0x20,
  ],
};
const maxHeaderLength = Math.max(
  ...Object.values(knownMagicHeaders).map((v) => v.length)
);

function cropAndCompareArrays(a: Array<number>, b: Array<number>): boolean {
  const length = Math.min(a.length, b.length);
  // Sue me.
  return (
    JSON.stringify(a.slice(0, length)) === JSON.stringify(b.slice(0, length))
  );
}

const decoder: Decoder = {
  async canDecode(buffer) {
    return Object.values(knownMagicHeaders).some((header) =>
      cropAndCompareArrays(
        [...new Uint8Array(buffer, 0, maxHeaderLength)],
        header
      )
    );
  },
  async decode(buffer, opts) {
    const img = module.decode(new Uint8Array(buffer));
    const [data, width, height] = resize_u16(
      img.data,
      img.width,
      img.height,
      opts.scale / 100,
      0
    );
    return {
      ...img,
      width,
      height,
      data,
    };
  },
};
export default decoder;
