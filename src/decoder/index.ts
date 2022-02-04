import rawDecoder from "./raw/index.js";
import { Image } from "../processors/image";
import { Step } from "../processors/index.js";

export interface DecodeStep {
  blob: Blob;
  scale: number;
}

export function isDecodeStep(s: Step): s is DecodeStep {
  return "blob" in s;
}

export interface Decoder {
  canDecode(buffer: ArrayBuffer): Promise<boolean>;
  decode(buffer: ArrayBuffer, step: DecodeStep): Promise<Image>;
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

export async function decode(step: DecodeStep): Promise<Image> {
  const buffer = await new Response(step.blob).arrayBuffer();
  for (const decoder of decoders) {
    if (await decoder.canDecode(buffer)) {
      return decoder.decode(buffer, step);
    }
  }
  throw Error("Unsupported format");
}
