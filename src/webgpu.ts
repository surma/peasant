/// <reference types="@webgpu/types" />

import { Node, NodeParams } from "./dag.js";

import type { Image } from "./image.js";

const MAX_WIDTH = 2 ** 13;
const MAX_HEIGHT = 2 ** 13;
const MAX_NUM_PIXELS = MAX_WIDTH * MAX_HEIGHT;
const MAX_BUFFER_SIZE = MAX_NUM_PIXELS * 4 * Float32Array.BYTES_PER_ELEMENT;

// @ts-ignore
import colorspacesSrc from "./wgsl/colorspaces.wgsl?raw";
// @ts-ignore
import shaderSrc from "./wgsl/shader.wgsl?raw";

function totalAbort(msg) {
  document.body.innerHTML = `<pre class="error">${msg}</pre>`;
}

let device: GPUDevice;
await (async () => {
  if (!("gpu" in navigator)) {
    totalAbort("WebGPU is not supported.");
    return;
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    totalAbort("Couldn’t request WebGPU adapter.");
    return;
  }
  device = await adapter.requestDevice({
    requiredLimits: {
      maxStorageBufferBindingSize: MAX_BUFFER_SIZE,
    },
  });
  if (!device) {
    totalAbort("Couldn’t request WebGPU device.");
    return;
  }
})();

export function ShaderNode(
  img: Node<any, Image>,
  offset: [Node<any, number>, Node<any, number>, Node<any, number>]
) {
  const imageInputBuffer = device.createBuffer({
    size: MAX_NUM_PIXELS * 4 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const imageOutputBuffer = device.createBuffer({
    size: MAX_NUM_PIXELS * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const gpuReadBuffer = device.createBuffer({
    size: MAX_NUM_PIXELS * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  const uniformsBuffer = device.createBuffer({
    size:
      4 * Uint32Array.BYTES_PER_ELEMENT + 4 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "read-only-storage",
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "storage",
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "uniform",
        },
      },
    ],
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: imageInputBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: imageOutputBuffer,
        },
      },
      {
        binding: 2,
        resource: {
          buffer: uniformsBuffer,
        },
      },
    ],
  });

  const shaderModule = device.createShaderModule({
    code: [colorspacesSrc, shaderSrc].join("\n"),
  });

  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    compute: {
      module: shaderModule,
      entryPoint: "main",
    },
  });

  // A separate node so that image uploading doesn’t happen on every update,
  // but only when the image actually changes.
  const imgUploaderNode = new Node<[Image], Image>({
    inputs: [img],
    async update([img]) {
      device.queue.writeBuffer(imageInputBuffer, 0, img.data);
      return img;
    },
  });

  function createUniformBuffer(
    width: number,
    height: number,
    x: number,
    y: number,
    z: number
  ): ArrayBuffer {
    const buffer = new ArrayBuffer(
      4 * Uint32Array.BYTES_PER_ELEMENT + 4 * Float32Array.BYTES_PER_ELEMENT
    );
    const view = new DataView(buffer);
    view.setUint32(0, width, true);
    view.setUint32(4, height, true);
    view.setFloat32(16, x, true);
    view.setFloat32(20, y, true);
    view.setFloat32(24, z, true);
    view.setFloat32(28, 0, true);
    return buffer;
  }

  return new Node<[Image, number, number, number], Image<Uint8ClampedArray>>({
    inputs: [imgUploaderNode, ...offset],
    async update([img, x, y, z]) {
      const numOutputPixels = img.width * img.height;
      const numOutputBytes =
        numOutputPixels * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT;
      device.queue.writeBuffer(
        uniformsBuffer,
        0,
        createUniformBuffer(img.width, img.height, x, y, z)
      );
      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(computePipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatch(Math.ceil(numOutputPixels / 256));
      passEncoder.endPass();
      commandEncoder.copyBufferToBuffer(
        imageOutputBuffer,
        0,
        gpuReadBuffer,
        0,
        numOutputBytes
      );
      const commands = commandEncoder.finish();
      device.queue.submit([commands]);

      await gpuReadBuffer.mapAsync(GPUMapMode.READ);
      const copyArrayBuffer = gpuReadBuffer.getMappedRange(0, numOutputBytes);
      const data = new Uint8ClampedArray(copyArrayBuffer).slice();
      gpuReadBuffer.unmap();

      return {
        ...img,
        data,
      };
    },
  });
}
