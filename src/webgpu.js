let device;
await (async () => {
  if (!("gpu" in navigator)) {
    console.error("WebGPU is not supported.");
    return;
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    console.error("Couldn’t request WebGPU adapter.");
    return;
  }
  device = await adapter.requestDevice();
  if (!device) {
    console.error("Couldn’t request WebGPU device.");
    return;
  }
})();

export async function process(img) {
  const size = img.data.byteLength;
  const imageInputBuffer = device.createBuffer({
    mappedAtCreation: true,
    size,
    usage: GPUBufferUsage.STORAGE,
  });
  const arrayBuffer = imageInputBuffer.getMappedRange();
  new Float32Array(arrayBuffer).set(img.data);
  imageInputBuffer.unmap();

  const imageOutputBuffer = device.createBuffer({
    size,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const gpuReadBuffer = device.createBuffer({
    size,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
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
    ],
  });

  const shaderModule = device.createShaderModule({
    code: `
      struct Image {
        pixel: array<f32>;
      };

      [[group(0), binding(0)]] var<storage, read> input: Image;
      [[group(0), binding(1)]] var<storage, write> output: Image;
  
      fn shade(color: vec3<f32>) -> vec3<f32> {
        return vec3(1.) - color;
      }

      [[stage(compute), workgroup_size(256)]]
      fn main([[builtin(global_invocation_id)]] global_id : vec3<u32>) {
        let index = global_id.x;
        let color = vec3(
          input.pixel[3u*index + 0u],
          input.pixel[3u*index + 1u],
          input.pixel[3u*index + 2u],
        );
        let newColor = shade(color);
        output.pixel[3u*index + 0u] = newColor.r;
        output.pixel[3u*index + 1u] = newColor.g;
        output.pixel[3u*index + 2u] = newColor.b;
      }
    `,
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

  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(computePipeline);
  passEncoder.setBindGroup(0, bindGroup);
  const numPixels = size / 3;
  passEncoder.dispatch(Math.ceil(numPixels / 256));
  passEncoder.endPass();
  commandEncoder.copyBufferToBuffer(
    imageOutputBuffer,
    0,
    gpuReadBuffer,
    0,
    size
  );

  const commands = commandEncoder.finish();
  device.queue.submit([commands]);

  await gpuReadBuffer.mapAsync(GPUMapMode.READ);
  const copyArrayBuffer = gpuReadBuffer.getMappedRange();
  const data = new Float32Array(copyArrayBuffer).slice();
  gpuReadBuffer.unmap();
  return {
    ...img,
    data,
  };
}
