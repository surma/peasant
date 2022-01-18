let wasm;

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

let heap_next = heap.length;

function addHeapObject(obj) {
  if (heap_next === heap.length) heap.push(heap.length + 1);
  const idx = heap_next;
  heap_next = heap[idx];

  heap[idx] = obj;
  return idx;
}

function getObject(idx) {
  return heap[idx];
}

function dropObject(idx) {
  if (idx < 36) return;
  heap[idx] = heap_next;
  heap_next = idx;
}

function takeObject(idx) {
  const ret = getObject(idx);
  dropObject(idx);
  return ret;
}

let cachedTextDecoder = new TextDecoder("utf-8", {
  ignoreBOM: true,
  fatal: true,
});

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
  if (
    cachegetUint8Memory0 === null ||
    cachegetUint8Memory0.buffer !== wasm.memory.buffer
  ) {
    cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
  return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

let cachegetUint16Memory0 = null;
function getUint16Memory0() {
  if (
    cachegetUint16Memory0 === null ||
    cachegetUint16Memory0.buffer !== wasm.memory.buffer
  ) {
    cachegetUint16Memory0 = new Uint16Array(wasm.memory.buffer);
  }
  return cachegetUint16Memory0;
}

let WASM_VECTOR_LEN = 0;

function passArray16ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 2);
  getUint16Memory0().set(arg, ptr / 2);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
/**
 * @param {Uint16Array} input_image
 * @param {number} input_width
 * @param {number} input_height
 * @param {number} factor
 * @param {number} resize_type
 * @returns {any}
 */
export function resize_u16(
  input_image,
  input_width,
  input_height,
  factor,
  resize_type
) {
  var ptr0 = passArray16ToWasm0(input_image, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  var ret = wasm.resize_u16(
    ptr0,
    len0,
    input_width,
    input_height,
    factor,
    resize_type
  );
  return takeObject(ret);
}

async function load(module, imports) {
  if (typeof Response === "function" && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        if (module.headers.get("Content-Type") != "application/wasm") {
          console.warn(
            "`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n",
            e
          );
        } else {
          throw e;
        }
      }
    }

    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);

    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }
}

async function init(input) {
  if (typeof input === "undefined") {
    input = new URL("resize_bg.wasm", import.meta.url);
  }
  const imports = {};
  imports.wbg = {};
  imports.wbg.__wbg_new_949bbc1147195c4e = function () {
    var ret = new Array();
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_memory = function () {
    var ret = wasm.memory;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_buffer_397eaa4d72ee94dd = function (arg0) {
    var ret = getObject(arg0).buffer;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_newwithbyteoffsetandlength_8bd669b4092b7244 = function (
    arg0,
    arg1,
    arg2
  ) {
    var ret = new Float32Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_object_drop_ref = function (arg0) {
    takeObject(arg0);
  };
  imports.wbg.__wbg_new_8b45a9becdb89691 = function (arg0) {
    var ret = new Float32Array(getObject(arg0));
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_push_284486ca27c6aa8b = function (arg0, arg1) {
    var ret = getObject(arg0).push(getObject(arg1));
    return ret;
  };
  imports.wbg.__wbindgen_number_new = function (arg0) {
    var ret = arg0;
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_throw = function (arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
  };

  if (
    typeof input === "string" ||
    (typeof Request === "function" && input instanceof Request) ||
    (typeof URL === "function" && input instanceof URL)
  ) {
    input = fetch(input);
  }

  const { instance, module } = await load(await input, imports);

  wasm = instance.exports;
  init.__wbindgen_wasm_module = module;

  return wasm;
}

export default init;
