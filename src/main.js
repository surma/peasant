import { decode } from "./raw-decoder.ts";
import { process } from "./webgpu.ts";

const { f, c1 } = document.all;
const ctx = c1.getContext("2d");
ctx.fillStyle = "red";
ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

f.addEventListener("change", async (ev) => {
  if (ev.target.files.length <= 0) return;
  const buffer = await new Response(ev.target.files[0]).arrayBuffer();
  let img = decode(buffer, 0.2);
  img = await process(img);
  showImage(img, c1);
});

function showImage(img, c) {
  const imgData = new ImageData(img.data, img.width, img.height);
  c.width = imgData.width;
  c.height = imgData.height;
  ctx.putImageData(imgData, 0, 0);
}
