import rawDecoder from "./raw/index.js";
import { Image } from "../processors/image";

export interface DecoderOptions {
  scale: number;
}

export interface Decoder {
  canDecode(buffer: ArrayBuffer): Promise<boolean>;
  decode(buffer: ArrayBuffer, opts: DecoderOptions): Promise<Image>;
}

const decoders: Array<Decoder> = [rawDecoder];
export default decoders;

export async function canDecode(buffer: ArrayBuffer): Promise<boolean> {
  for (const decoder of decoders) {
    if (await decoder.canDecode(buffer)) {
      return true;
    }
  }
  return false;
}

export async function decode(
  buffer: ArrayBuffer,
  opts: DecoderOptions
): Promise<Image> {
  for (const decoder of decoders) {
    if (await decoder.canDecode(buffer)) {
      return decoder.decode(buffer, opts);
    }
  }
  throw Error("Unsupported format");
}
