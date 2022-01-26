/// <reference types="@webgpu/types" />

import { Node } from "./dag.js";

import type { Image } from "./image.js";
import { encodeOperation, Operation } from "./operations.js";

const MAX_BUFFER_SIZE = 8192 ** 2 * 4 * Float32Array.BYTES_PER_ELEMENT;

// @ts-ignore
import bindingsSrc from "./wgsl/bindings.wgsl?raw";
// @ts-ignore
import colorspacesSrc from "./wgsl/colorspaces.wgsl?raw";
// @ts-ignore
import curvesSrc from "./wgsl/curves.wgsl?raw";
// @ts-ignore
import processingSrc from "./wgsl/processing.wgsl?raw";
// @ts-ignore
import renderSrc from "./wgsl/render.wgsl?raw";

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

interface ImageUploaderOutput {
  numPixels: number;
  numInputBytes: number;
  numOutputBytes: number;
  img: Image;
}

export function ProcessingNode(
  img: Node<any, Image>,
  operationsNode: Node<any, Operation[]>
) {
  let bufferIn: GPUBuffer;
  let bufferOut: GPUBuffer;
  let gpuReadBuffer: GPUBuffer;

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

  const processingModule = device.createShaderModule({
    code: [bindingsSrc, colorspacesSrc, curvesSrc, processingSrc].join("\n"),
  });

  const renderModule = device.createShaderModule({
    code: [colorspacesSrc, renderSrc].join("\n"),
  });

  const processingPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    compute: {
      module: processingModule,
      entryPoint: "main",
    },
  });

  const renderPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    compute: {
      module: renderModule,
      entryPoint: "main",
    },
  });

  const operationsBuffer = device.createBuffer({
    size:
      4 * Uint32Array.BYTES_PER_ELEMENT + 1024 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  function createBindGroup() {
    return device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: bufferIn,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: bufferOut,
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
  }

  // A separate node so that image uploading doesn’t happen on every update,
  // but only when the image actually changes.
  const imgUploaderNode = new Node<[Image], ImageUploaderOutput>({
    inputs: [img],
    async update([img]) {
      const numPixels = img.width * img.height;
      const numInputBytes = numPixels * 4 * Float32Array.BYTES_PER_ELEMENT;
      const numOutputBytes =
        numPixels * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT;

      if (bufferIn) bufferIn.destroy();
      bufferIn = device.createBuffer({
        size: numInputBytes,
        usage:
          GPUBufferUsage.STORAGE |
          GPUBufferUsage.COPY_DST |
          GPUBufferUsage.COPY_SRC,
      });

      if (bufferOut) bufferOut.destroy();
      bufferOut = device.createBuffer({
        size: numInputBytes,
        usage:
          GPUBufferUsage.STORAGE |
          GPUBufferUsage.COPY_DST |
          GPUBufferUsage.COPY_SRC,
      });

      if (gpuReadBuffer) bufferOut.destroy();
      gpuReadBuffer = device.createBuffer({
        // size: numOutputBytes,
        size: numInputBytes,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });

      return {
        numPixels,
        numInputBytes,
        numOutputBytes,
        img,
      };
    },
  });

  function createOperationsBuffer(
    width: number,
    height: number,
    op?: Operation
  ): ArrayBuffer {
    const buffer = new ArrayBuffer(
      4 * Uint32Array.BYTES_PER_ELEMENT + 1024 * Float32Array.BYTES_PER_ELEMENT
    );
    const startOfData = 4 * Uint32Array.BYTES_PER_ELEMENT;
    const view = new DataView(buffer);
    view.setUint32(0, width, true);
    view.setUint32(4, height, true);
    if (op) {
      view.setUint32(8, op.type, true);
      encodeOperation(op, new DataView(buffer, startOfData));
    }
    return buffer;
  }

  async function readOutBuffer(numBytes: number): Promise<ArrayBuffer> {
    const commandEncoder = device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(bufferOut, 0, gpuReadBuffer, 0, numBytes);
    const commands = commandEncoder.finish();
    device.queue.submit([commands]);

    await gpuReadBuffer.mapAsync(GPUMapMode.READ, 0, numBytes);
    const copyArrayBuffer = gpuReadBuffer.getMappedRange(0, numBytes);
    const data = copyArrayBuffer.slice(0);
    gpuReadBuffer.unmap();
    return data;
  }

  async function readOutBufferAsImageData(
    width: number,
    height: number
  ): Promise<ImageData> {
    const numOutputBytes =
      width * height * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT;

    [bufferIn, bufferOut] = [bufferOut, bufferIn];
    device.queue.writeBuffer(
      operationsBuffer,
      0,
      createOperationsBuffer(width, height, null)
    );
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(renderPipeline);
    passEncoder.setBindGroup(0, createBindGroup());
    passEncoder.dispatch(Math.ceil(width / 16), Math.ceil(height / 16));
    passEncoder.endPass();
    const commands = commandEncoder.finish();
    device.queue.submit([commands]);

    const buffer = await readOutBuffer(numOutputBytes);
    const data = new Uint8ClampedArray(buffer).slice();
    return new ImageData(data, width, height);
  }

  return new Node<[ImageUploaderOutput, Operation[]], Image<Uint8ClampedArray>>(
    {
      inputs: [imgUploaderNode, operationsNode],
      async update([{ img }, operations]) {
        device.queue.writeBuffer(bufferIn, 0, img.data);

        for (const op of operations) {
          device.queue.writeBuffer(
            operationsBuffer,
            0,
            createOperationsBuffer(img.width, img.height, op)
          );

          const commandEncoder = device.createCommandEncoder();
          const passEncoder = commandEncoder.beginComputePass();
          passEncoder.setPipeline(processingPipeline);
          passEncoder.setBindGroup(0, createBindGroup());
          passEncoder.dispatch(
            Math.ceil(img.width / 16),
            Math.ceil(img.height / 16)
          );
          passEncoder.endPass();
          const commands = commandEncoder.finish();
          device.queue.submit([commands]);
          [bufferIn, bufferOut] = [bufferOut, bufferIn];
        }
        // If the loop ended, undo the last swap so that there is
        // a result in `bufferOut`.
        [bufferIn, bufferOut] = [bufferOut, bufferIn];

        return {
          ...img,
          data: (await readOutBufferAsImageData(img.width, img.height)).data,
        };
      },
    }
  );
}
