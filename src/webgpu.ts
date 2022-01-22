/// <reference types="@webgpu/types" />

import { Node, NodeParams } from "./dag.ts";

import type { Image } from "./image.js";

// @ts-ignore
import shaderSrc from "./shader.wgsl?raw";

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
  device = await adapter.requestDevice();
  if (!device) {
    totalAbort("Couldn’t request WebGPU device.");
    return;
  }
})();

export function ShaderNode(img: Image, offset: Array<Node<any, number>>) {
  const numPixels = img.data.length / 4;
  const imageInputBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: numPixels * 4 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE,
  });
  const imageInputArrayBuffer = imageInputBuffer.getMappedRange();
  new Float32Array(imageInputArrayBuffer).set(img.data);
  imageInputBuffer.unmap();

  const imageOutputBuffer = device.createBuffer({
    size: numPixels * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const gpuReadBuffer = device.createBuffer({
    size: numPixels * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  const uniformsBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: 4 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const uniformsArrayBuffer = uniformsBuffer.getMappedRange();
  new Float32Array(uniformsArrayBuffer).set([0.0, 0.0, 0.0, 0]);
  uniformsBuffer.unmap();

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
    code: shaderSrc,
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

  return new Node<[number], Image>({
    inputs: offset,
    async update([x, y, z]) {
      device.queue.writeBuffer(
        uniformsBuffer,
        0,
        new Float32Array([x, y, z, 0])
      );

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(computePipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatch(Math.ceil(numPixels / 256));
      passEncoder.endPass();
      commandEncoder.copyBufferToBuffer(
        imageOutputBuffer,
        0,
        gpuReadBuffer,
        0,
        numPixels * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT
      );
      const commands = commandEncoder.finish();
      device.queue.submit([commands]);

      await gpuReadBuffer.mapAsync(GPUMapMode.READ);
      const copyArrayBuffer = gpuReadBuffer.getMappedRange();
      const data = new Uint8ClampedArray(copyArrayBuffer).slice();
      gpuReadBuffer.unmap();

      return {
        ...img,
        data,
      };
    },
  });
}
