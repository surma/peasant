globalThis.WorkerGlobalScope = 1;
import factory from "../raw/result/decoder.js";
import { encodePNG } from "jsr:@img/png";
import {XYZ_to_sRGB} from "./colorspaces.ts";

const {decode, version} = await factory();


console.log(version());
 // const buffer = await Deno.readFile("/Users/surma/Sync/scratch/830A7962.CR3");
 const buffer = await Deno.readFile("/Users/surma/Downloads/IMG_250716_152601.dng");
 const decoded = await decode(buffer.buffer);
 // console.log({decoded})


interface Image {
  data: Float32Array,
  width: number,
  height: number
}
let image: Image = {
  data: new Float32Array(decoded.data),
  width: decoded.width,
  height: decoded.height
};

const normalize = (_: number, i: number, p: Float32Array<ArrayBufferLike>) => p[i] = p[i] / 65535;
const toSRGB = (_: number, i: number, p: Float32Array<ArrayBufferLike>) => p.set(XYZ_to_sRGB(p));

// downscale(8);
applyPixelStage(p => {
  p.forEach(normalize);
  // p.forEach(toSRGB);
});

const output = new Uint8Array(image.width * image.height * 4);
for(let p = 0; p < image.data.length; p += 1) {
  output[p*4 + 0] = image.data[p*3 + 0] * 255;
  output[p*4 + 1] = image.data[p*3 + 1] * 255;
  output[p*4 + 2] = image.data[p*3 + 2] * 255;
  output[p*4 + 3] = 255;
}
const jpg = await encodePNG(output, {width: image.width, height: image.height, compression: 0, filter: 0, interlace: 0});
await Deno.writeFile("output.jpg", jpg);

function applyPixelStage(f: (pixel: Float32Array, image: Image) => unknown) {
  for(let p = 0; p < image.data.length; p += 3) {
    f(image.data.subarray(p, p+3), image)
  }
}

function downscale(n: number) {
  const width = Math.floor(image.width / n);
  const height = Math.floor(image.height / n);
  let data = new Float32Array(width * height * 3);
  for(let y = 0; y < image.height; y++) {
      for(let x = 0; x < image.height; x++) {
        data[(y * width + x) * 3 + 0] = image.data[(y * n * image.width + x * n) * 3 + 0]
        data[(y * width + x) * 3 + 1] = image.data[(y * n * image.width + x * n) * 3 + 1]
        data[(y * width + x) * 3 + 2] = image.data[(y * n * image.width + x * n) * 3 + 2]
      }
  }
  image = { width, height, data};
}
