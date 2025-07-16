import factory from "../raw/result/decoder.js";
const { decode, version, ColorSpace } = await factory();

console.log(version());
const main = document.querySelector("main")!;
main.innerHTML = `
  <form>
    <input name="file" type="file">
    <button type="submit">Go</button>
  </form>
`;

interface Image {
  data: Float32Array;
  width: number;
  height: number;
}

let image: Image = {} as any;

main.querySelector("form")!.addEventListener("submit", async ev => {
  ev.preventDefault();
  const file = ev.target.file.files[0];
  if (!file) return;
  const buffer = await new Response(file).arrayBuffer();
  const decoded = await decode(buffer, ColorSpace.Rec2020);
  image = {
    data: new Float32Array(decoded.data),
    width: decoded.width,
    height: decoded.height,
  };
  applyPixelStage(p => {
    p.forEach(normalize);
    // p.forEach(toSRGB);
  });

  const output = new Uint8ClampedArray(image.width * image.height * 4);
  for (let p = 0; p < image.data.length; p += 1) {
    output[p * 4 + 0] = image.data[p * 3 + 0] * 255;
    output[p * 4 + 1] = image.data[p * 3 + 1] * 255;
    output[p * 4 + 2] = image.data[p * 3 + 2] * 255;
    output[p * 4 + 3] = 255;
  }

  const osc = new OffscreenCanvas(decoded.width, decoded.height);
  const ctx = osc.getContext("2d")!;
  ctx.putImageData(new ImageData(output, decoded.width, decoded.height), 0, 0);
  const blob = await osc.convertToBlob({ type: "image/jpg", quality: 80 });
  const u = URL.createObjectURL(blob);
  window.open(u);
});

function downscale(n: number) {
  const width = Math.floor(image.width / n);
  const height = Math.floor(image.height / n);
  let data = new Float32Array(width * height * 3);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.height; x++) {
      data[(y * width + x) * 3 + 0] = image.data[(y * n * image.width + x * n) * 3 + 0];
      data[(y * width + x) * 3 + 1] = image.data[(y * n * image.width + x * n) * 3 + 1];
      data[(y * width + x) * 3 + 2] = image.data[(y * n * image.width + x * n) * 3 + 2];
    }
  }
  image = { width, height, data };
}

const normalize = (_: number, i: number, p: Float32Array<ArrayBufferLike>) => p[i] = p[i] / 65535;
// const toSRGB = (_: number, i: number, p: Float32Array<ArrayBufferLike>) => p.set(XYZ_to_sRGB(p));
function applyPixelStage(f: (pixel: Float32Array, image: Image) => unknown) {
  for (let p = 0; p < image.data.length; p += 3) {
    f(image.data.subarray(p, p + 3), image);
  }
}
