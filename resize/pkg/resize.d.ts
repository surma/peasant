/* tslint:disable */
/* eslint-disable */
/**
 * @param {Uint16Array} input_image
 * @param {number} input_width
 * @param {number} input_height
 * @param {number} factor
 * @param {number} resize_type
 * @returns {any}
 */
export function resize_u16(
  input_image: Uint16Array,
  input_width: number,
  input_height: number,
  factor: number,
  resize_type: number
): any;

export type InitInput =
  | RequestInfo
  | URL
  | Response
  | BufferSource
  | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly resize_u16: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
  ) => number;
  readonly __wbindgen_malloc: (a: number) => number;
}

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {InitInput | Promise<InitInput>} module_or_path
 *
 * @returns {Promise<InitOutput>}
 */
export default function init(
  module_or_path?: InitInput | Promise<InitInput>
): Promise<InitOutput>;
