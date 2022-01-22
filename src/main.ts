import { fromEvent, forEach, discard } from "observables-with-streams";
import { decode } from "./raw-decoder.js";
import { ShaderNode } from "./webgpu.js";
import { Node, singleValueNode } from "./dag.js";

import type { Image } from "./image.js";

const { f, c1, x, y, z } = document.all as any as {
  f: HTMLInputElement;
  c1: HTMLCanvasElement;
  x: HTMLInputElement;
  y: HTMLInputElement;
  z: HTMLInputElement;
};
const ctx = c1.getContext("2d");
ctx.fillStyle = "red";
ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

f.addEventListener("change", async (ev) => {
  const file = f.files?.[0];
  if (!file) return;
  const inputBuffer = await new Response(file).arrayBuffer();
  const fileNode = singleValueNode(inputBuffer);
  const decodedNode = new Node({
    inputs: [fileNode],
    update: async ([inputBuffer]) => decode(inputBuffer, 0.2),
  });

  const img = await decodedNode.pull();

  const offsetNodes = [x, y, z].map(
    (el) =>
      new Node<[], number>({
        async update() {
          return parseFloat(el.value);
        },
        useCache: false,
      })
  );

  const shaderNode = ShaderNode(img, offsetNodes);

  const node = RenderNode(shaderNode);
  await node.pull();
  fromEvent(document.body, "input")
    .pipeThrough(forEach(async () => await node.pull()))
    .pipeTo(discard());
});

function RenderNode(input: Node<any, Image>): Node<any, unknown> {
  return new Node({
    inputs: [input],
    async update([img]) {
      const imgData = new ImageData(img.data as any, img.width, img.height);
      c1.width = imgData.width;
      c1.height = imgData.height;
      ctx.putImageData(imgData, 0, 0);
    },
  });
}
