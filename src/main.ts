import { fromEvent, forEach, discard, merge } from "observables-with-streams";
import { decode } from "./raw-decoder.js";
import { ShaderNode } from "./webgpu.js";
import { Node } from "./dag.js";
import { settle } from "./observable-utilts.js";
import "./tone-curve.js";

import type { Image } from "./image.js";
import { clamp } from "./utils.js";

const { f, c1, x, y, z, scale } = document.all as any as {
  f: HTMLInputElement;
  c1: HTMLCanvasElement;
  x: HTMLInputElement;
  y: HTMLInputElement;
  z: HTMLInputElement;
  scale: HTMLInputElement;
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

const offsetNodes = [x, y, z].map(
  (el) =>
    new Node<[], number>({
      async update() {
        return parseFloat(el.value);
      },
    })
);

const shaderNode = ShaderNode(decodedImageNode, offsetNodes as any);
const node = RenderNode(shaderNode);

// A bit of plumbing to pull a new value out of the DAG whenever any of the
// input values chage.
const realTimeInputs = [
  ...document.querySelectorAll("input[data-realtime=true]"),
].map((el) => fromEvent(el, "input"));
const settledInputs = [
  ...document.querySelectorAll("input[data-realtime=false]"),
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
