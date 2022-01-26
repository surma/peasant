import { fromEvent, forEach, discard, merge } from "observables-with-streams";
import { decode } from "./raw-decoder.js";
import { ProcessingNode } from "./webgpu.js";
import { Node } from "./dag.js";
import { settle } from "./observable-utils.js";
import { ToneCurve } from "./tone-curve.js";
customElements.define("tone-curve", ToneCurve);

import type { Image } from "./image.js";
import { clamp } from "./utils.js";
import {
  ColorSpaceConversion,
  Operation,
  OperationType,
} from "./operations.js";

const { f, c1, x, y, z, scale, ss, tc } = document.all as any as {
  f: HTMLInputElement;
  c1: HTMLCanvasElement;
  x: HTMLInputElement;
  y: HTMLInputElement;
  z: HTMLInputElement;
  scale: HTMLInputElement;
  ss: HTMLInputElement;
  tc: ToneCurve;
};
const ctx = c1.getContext("2d");
ctx.fillStyle = "red";
ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

// This node is split into two steps so that the ArrayBuffer only gets
// recreated when the input file has actually changed.
const fileNode = new Node({
  async update() {
    return f.files?.[0];
  },
}).map((file) => {
  if (!file) return;
  return new Response(file).arrayBuffer();
});

const scaleNode = new Node<[], number>({
  async update() {
    return clamp(0, parseFloat(scale.value) / 100, 100);
  },
});

const decodedImageNode = new Node<[ArrayBuffer, number], Image>({
  inputs: [fileNode, scaleNode],
  update: async ([inputBuffer, scale]) => decode(inputBuffer, scale),
});

let curve: Float32Array = new Float32Array(512);
curve.forEach((_, i, arr) => (arr[i] = i / arr.length));

fromEvent(tc, "input").pipeTo(
  discard((v) => {
    curve = generateCurveMap(tc);
  })
);

const operationsNode = new Node<[], Float32Array>({
  async update() {
    return curve;
  },
}).map<Operation[]>(async (curve) => {
  return [
    {
      type: OperationType.OPERATION_APPLY_CURVE,
      conversion: ColorSpaceConversion.XYZ_to_xyY,
      channel: 2,
      curve,
    },
  ];
});

const shaderNode = ProcessingNode(decodedImageNode, operationsNode);
const node = RenderNode(shaderNode);

// A bit of plumbing to pull a new value out of the DAG whenever any of the
// input values chage.
const realTimeInputs = [
  ...document.querySelectorAll("[data-realtime=true]"),
].map((el) => fromEvent(el, "input"));
const settledInputs = [
  ...document.querySelectorAll("[data-realtime=false]"),
].map((el) => fromEvent(el, "input").pipeThrough(settle(1000)));
merge(...realTimeInputs, ...settledInputs)
  .pipeThrough(
    forEach(async () => {
      try {
        await node.pull();
      } catch (e) {
        console.error(e);
      }
    })
  )
  .pipeTo(discard());

function RenderNode(
  input: Node<any, Image<Uint8ClampedArray>>
): Node<any, unknown> {
  return new Node({
    inputs: [input],
    async update([img]) {
      const imgData = new ImageData(img.data, img.width, img.height);
      c1.width = imgData.width;
      c1.height = imgData.height;
      ctx.putImageData(imgData, 0, 0);
    },
  });
}

fromEvent(ss, "input").pipeTo(
  discard((v) => (tc.straightness = parseFloat(ss.value)))
);

function generateCurveMap(tc: ToneCurve): Float32Array {
  const result = new Float32Array(512);
  const f = tc.curveFunction();
  result[0] = f(0).y;

  let idx = 1;
  for (let t = 0; t < 1; t += 1 / (2 * result.length)) {
    const p = f(t);
    if (p.x >= idx / (result.length - 1)) {
      result[idx] = p.y;
      idx++;
    }
  }

  result[result.length - 1] = f(1).y;

  return result;
}
