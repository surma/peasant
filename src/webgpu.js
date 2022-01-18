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
  const gpuInputBuffer = device.createBuffer({
    mappedAtCreation: true,
    size,
    usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
  });
  const arrayBuffer = gpuInputBuffer.getMappedRange();
  new Float32Array(arrayBuffer).set(img.data);
  gpuInputBuffer.unmap();

  const gpuOutputBuffer = device.createBuffer({
    size,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  const copyEncoder = device.createCommandEncoder();
  copyEncoder.copyBufferToBuffer(gpuInputBuffer, 0, gpuOutputBuffer, 0, size);
  const copyCommands = copyEncoder.finish();
  device.queue.submit([copyCommands]);

  await gpuOutputBuffer.mapAsync(GPUMapMode.READ);
  const copyArrayBuffer = gpuOutputBuffer.getMappedRange();
  const data = new Float32Array(copyArrayBuffer).slice();
  gpuOutputBuffer.unmap();
  return {
    ...img,
    data,
  };
}
