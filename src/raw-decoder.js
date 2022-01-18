import factory from "../raw/build/raw.js";

const module = await factory();
await module.ready;

export function decode(buffer) {
  return module.decode(new Uint8Array(buffer));
}
