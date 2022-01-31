/// <reference types="@webgpu/types" />

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

export class GPUProcessor {
  private device: GPUDevice;
  private adapter: GPUAdapter;
  private operationsBuffer: GPUBuffer;
  private bufferIn: GPUBuffer;
  private bufferOut: GPUBuffer;
  private gpuReadBuffer: GPUBuffer;
  private bindGroupLayout: GPUBindGroupLayout;
  private processingPipeline: GPUComputePipeline;
  private renderPipeline: GPUComputePipeline;
  private ready: Promise<void>;

  constructor() {
    if (!("gpu" in navigator)) {
      throw Error("WebGPU not supports");
    }
    this.ready = this.init().then(() => {});
  }

  async init() {
    this.adapter = await navigator.gpu.requestAdapter();
    if (!this.adapter) {
      throw Error("Couldn’t request WebGPU adapter.");
    }
    this.device = await this.adapter.requestDevice({
      requiredLimits: {
        maxStorageBufferBindingSize: MAX_BUFFER_SIZE,
      },
    });
    if (!this.device) {
      throw Error("Couldn’t request WebGPU device.");
    }

    this.bindGroupLayout = this.device.createBindGroupLayout({
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

    const processingModule = this.device.createShaderModule({
      code: [bindingsSrc, colorspacesSrc, curvesSrc, processingSrc].join("\n"),
    });

    const renderModule = this.device.createShaderModule({
      code: [colorspacesSrc, renderSrc].join("\n"),
    });

    this.processingPipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.bindGroupLayout],
      }),
      compute: {
        module: processingModule,
        entryPoint: "main",
      },
    });

    this.renderPipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.bindGroupLayout],
      }),
      compute: {
        module: renderModule,
        entryPoint: "main",
      },
    });

    this.operationsBuffer = this.device.createBuffer({
      size:
        4 * Uint32Array.BYTES_PER_ELEMENT +
        1024 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private recreateBuffers(size: number) {
    if (this.bufferIn) this.bufferIn.destroy();
    this.bufferIn = this.device.createBuffer({
      size,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });

    if (this.bufferOut) this.bufferOut.destroy();
    this.bufferOut = this.device.createBuffer({
      size,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });

    if (this.gpuReadBuffer) this.gpuReadBuffer.destroy();
    this.gpuReadBuffer = this.device.createBuffer({
      size,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
  }

  async process(img: Image, operations: Operation[]): Promise<Image> {
    await this.ready;
    const numPixels = img.width * img.height;
    const numBytes = numPixels * 4 * Float32Array.BYTES_PER_ELEMENT;

    this.recreateBuffers(numBytes);

    this.device.queue.writeBuffer(this.bufferIn, 0, img.data);

    for (const op of operations) {
      this.device.queue.writeBuffer(
        this.operationsBuffer,
        0,
        this.createOperationsBuffer(img.width, img.height, op)
      );

      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(this.processingPipeline);
      passEncoder.setBindGroup(0, this.createBindGroup());
      passEncoder.dispatch(
        Math.ceil(img.width / 16),
        Math.ceil(img.height / 16)
      );
      passEncoder.endPass();
      const commands = commandEncoder.finish();
      this.device.queue.submit([commands]);
      this.swapBuffers();
    }
    // If the loop ended, undo the last swap so that there is
    // a result in `bufferOut`.
    this.swapBuffers();

    return {
      ...img,
      data: new Float32Array(await this.readOutBuffer(numBytes)),
    };
  }

  async render(img: Image): Promise<Image<Uint8ClampedArray>> {
    await this.ready;
    const numPixels = img.width * img.height;
    const numBytes = numPixels * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT;

    this.recreateBuffers(numBytes);
    this.device.queue.writeBuffer(this.bufferIn, 0, img.data);

    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.renderPipeline);
    passEncoder.setBindGroup(0, this.createBindGroup());
    passEncoder.dispatch(Math.ceil(img.width / 16), Math.ceil(img.height / 16));
    passEncoder.endPass();
    const commands = commandEncoder.finish();
    this.device.queue.submit([commands]);

    return {
      ...img,
      data: new Uint8ClampedArray(await this.readOutBuffer(numBytes)),
    };
  }

  private createBindGroup(): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.bufferIn,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: this.bufferOut,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: this.operationsBuffer,
          },
        },
      ],
    });
  }

  private createOperationsBuffer(
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

  private async readOutBuffer(numBytes: number): Promise<ArrayBuffer> {
    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(
      this.bufferOut,
      0,
      this.gpuReadBuffer,
      0,
      numBytes
    );
    const commands = commandEncoder.finish();
    this.device.queue.submit([commands]);

    await this.gpuReadBuffer.mapAsync(GPUMapMode.READ, 0, numBytes);
    const copyArrayBuffer = this.gpuReadBuffer.getMappedRange(0, numBytes);
    const data = copyArrayBuffer.slice(0);
    this.gpuReadBuffer.unmap();
    return data;
  }

  private swapBuffers() {
    [this.bufferIn, this.bufferOut] = [this.bufferOut, this.bufferIn];
  }
}
