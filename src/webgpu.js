function totalAbort(msg) {
  document.body.innerHTML = `<pre class="error">${msg}</pre>`;
}

let device;
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

export async function process(img) {
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
    usage: GPUBufferUsage.UNIFORM,
  });
  const uniformsArrayBuffer = uniformsBuffer.getMappedRange();
  new Float32Array(uniformsArrayBuffer).set([0.0, 0.01, 0.0, 0]);
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
    code: `
      struct ImageF32 {
        pixel: array<vec4<f32>>;
      };

      struct ImageU8 {
        pixel: array<u32>;
      };

      struct Uniforms {
        offset: vec4<f32>;
      };

      [[group(0), binding(0)]] var<storage, read> input: ImageF32;
      [[group(0), binding(1)]] var<storage, write> output: ImageU8;
      [[group(0), binding(2)]] var<uniform> uniforms: Uniforms;
  
      fn shade(color: vec4<f32>) -> vec4<f32> {
        return color + uniforms.offset;
      }

      let xyz_to_linear_srgb = mat3x3<f32>(
        3.2406, -0.9689, 0.0557,
        -1.5372, 1.8758, -0.2040,
        -0.4986, 0.0415, 1.0570
      );

      fn srgb(color: vec4<f32>) -> vec4<f32> {
        let linear_srgb = xyz_to_linear_srgb * color.rgb;
        return vec4(1.055 * pow(linear_srgb, vec3(1./2.4)) - 0.055, color.a);
      }

      [[stage(compute), workgroup_size(256)]]
      fn main([[builtin(global_invocation_id)]] global_id : vec3<u32>) {
        let index = global_id.x;
        if(index >= arrayLength(&input.pixel)) {
          return;
        }
        var color = input.pixel[index];
        color = shade(color);
        color = srgb(color);
        // Manual conversion from vec4<[0. to 1.]> to vec4<[0 to 255]>
        color = clamp(color, vec4(0.), vec4(1.)) * 255.;
        output.pixel[index] = (u32(color.r) << 0u) | (u32(color.g) << 8u) | (u32(color.b) << 16u) | (u32(color.a) << 24u);
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
