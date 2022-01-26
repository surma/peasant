/// <reference types="@webgpu/types" />

import { Node, NodeParams } from "./dag.js";

import type { Image } from "./image.js";
import { encodeOperation, Operation, OperationType } from "./operations.js";
import { entries, isEven } from "./utils.js";

const MAX_WIDTH = 2 ** 13;
const MAX_HEIGHT = 2 ** 13;
const MAX_NUM_PIXELS = MAX_WIDTH * MAX_HEIGHT;
const MAX_BUFFER_SIZE = MAX_NUM_PIXELS * 4 * Float32Array.BYTES_PER_ELEMENT;

// @ts-ignore
import bindingsSrc from "./wgsl/bindings.wgsl?raw";
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

export function ShaderNode(img: Node<any, Image>) {
  let bufferA = device.createBuffer({
    size: MAX_NUM_PIXELS * 4 * Float32Array.BYTES_PER_ELEMENT,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  });

  let bufferB = device.createBuffer({
    size: MAX_NUM_PIXELS * 4 * Float32Array.BYTES_PER_ELEMENT,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  });

  const gpuReadBuffer = device.createBuffer({
    size: MAX_NUM_PIXELS * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  const operationsBuffer = device.createBuffer({
    size:
      4 * Uint32Array.BYTES_PER_ELEMENT + 1024 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
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
          type: "read-only-storage",
        },
      },
    ],
  });

  const shaderModule = device.createShaderModule({
    code: [bindingsSrc, colorspacesSrc, shaderSrc].join("\n"),
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
      device.queue.writeBuffer(bufferA, 0, img.data);
      return img;
    },
  });

  function createOperationsBuffer(
    width: number,
    height: number,
    op: Operation
  ): ArrayBuffer {
    const buffer = new ArrayBuffer(
      3 * Uint32Array.BYTES_PER_ELEMENT + 1024 * Float32Array.BYTES_PER_ELEMENT
    );
    const startOfData = 4 * Uint32Array.BYTES_PER_ELEMENT;
    const view = new DataView(buffer);
    view.setUint32(0, width, true);
    view.setUint32(4, height, true);
    view.setUint32(8, op.type, true);
    encodeOperation(op, new DataView(buffer, startOfData));
    return buffer;
  }

  return new Node<[Image], Image<Uint8ClampedArray>>({
    inputs: [imgUploaderNode],
    async update([img]) {
      const numOutputPixels = img.width * img.height;
      const numOutputBytes =
        numOutputPixels * 4 * Float32Array.BYTES_PER_ELEMENT;

      const operations: Operation[] = [
        {
          type: OperationType.OPERATION_COLORSPACE_CONVERSION,
          conversion: 0,
        },
        {
          type: OperationType.OPERATION_COLORSPACE_CONVERSION,
          conversion: 256,
        },
        {
          type: OperationType.OPERATION_COLORSPACE_CONVERSION,
          conversion: 0,
        },
      ];

      for (const [index, op] of operations.entries()) {
        device.queue.writeBuffer(
          operationsBuffer,
          0,
          createOperationsBuffer(img.width, img.height, op)
        );

        const bindGroup = device.createBindGroup({
          layout: bindGroupLayout,
          entries: [
            {
              binding: 0,
              resource: {
                buffer: isEven(index) ? bufferA : bufferB,
              },
            },
            {
              binding: 1,
              resource: {
                buffer: isEven(index) ? bufferB : bufferA,
              },
            },
            {
              binding: 2,
              resource: {
                buffer: operationsBuffer,
              },
            },
          ],
        });

        const commandEncoder = device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(computePipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.dispatch(
          Math.ceil(img.width / 16),
          Math.ceil(img.height / 16)
        );
        passEncoder.endPass();
        const commands = commandEncoder.finish();
        device.queue.submit([commands]);
      }

      const commandEncoder = device.createCommandEncoder();
      commandEncoder.copyBufferToBuffer(
        isEven(operations.length) ? bufferB : bufferA,
        0,
        gpuReadBuffer,
        0,
        numOutputBytes
      );
      const commands = commandEncoder.finish();
      device.queue.submit([commands]);

      await gpuReadBuffer.mapAsync(GPUMapMode.READ);
      const copyArrayBuffer = gpuReadBuffer.getMappedRange(0, numOutputBytes);
      const data = new Float32Array(copyArrayBuffer).slice();
      // console.log({data, numOutputBy});
      gpuReadBuffer.unmap();

      return {
        ...img,
        data: new Uint8ClampedArray(data.map((v) => v * 255)),
      };
    },
  });
}
