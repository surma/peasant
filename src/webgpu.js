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
  const numPixels = img.data.length / 3;
  const imageInputBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: numPixels * 3 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE,
  });
  const arrayBuffer = imageInputBuffer.getMappedRange();
  new Float32Array(arrayBuffer).set(img.data);
  imageInputBuffer.unmap();

  const imageOutputBuffer = device.createBuffer({
    size: numPixels * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const gpuReadBuffer = device.createBuffer({
    size: numPixels * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT,
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
      struct ImageF32 {
        pixel: array<f32>;
      };

      struct ImageU8 {
        pixel: array<u32>;
      };

      [[group(0), binding(0)]] var<storage, read> input: ImageF32;
      [[group(0), binding(1)]] var<storage, write> output: ImageU8;
  
      fn shade(color: vec3<f32>) -> vec3<f32> {
        return vec3(1.) - color;
      }

      let xyz_to_srgb = mat3x3<f32>(
        3.2406, -0.9689, 0.0557,
        -1.5372, 1.8758, -0.2040,
        -0.4986, 0.0415, 1.0570
      );

      fn srgb(color: vec3<f32>) -> vec3<f32> {
        let new_color = xyz_to_srgb * color;
        return 1.055 * pow(new_color, vec3(1./2.4)) - 0.055;
      }

      [[stage(compute), workgroup_size(256)]]
      fn main([[builtin(global_invocation_id)]] global_id : vec3<u32>) {
        let index = global_id.x;
        if(index >= arrayLength(&input.pixel)) {
          return;
        }
        var color = vec3(
          input.pixel[3u*index + 0u],
          input.pixel[3u*index + 1u],
          input.pixel[3u*index + 2u],
        );
        // color = shade(color);
        color = srgb(color);
        output.pixel[index] = (u32(color.r * 255.) << 0u) | (u32(color.g * 255.) << 8u) | (u32(color.b * 255.) << 16u) | (255u << 24u);
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
}
