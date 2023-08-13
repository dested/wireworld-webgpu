import wireworldtxt from './wireworld.txt?raw';

async function main() {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<canvas/>
`;
  const rows = wireworldtxt.replace(new RegExp('\r', 'g'), '').split('\n');
  /*
  const canvas = document.querySelector('canvas');
  if (!canvas) throw new Error('No adapter');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No adapter');
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) throw new Error('No context');*/

  const boardWidth = rows[0].length;
  const boardHeight = rows.length;

  const data = new Uint8Array(boardWidth * boardHeight);

  // Create GPU context
  const adapter = (await navigator.gpu.requestAdapter())!;
  const device = await adapter!.requestDevice();

  const inputData = new Uint8Array(1024).fill(1);
  const inputBuffer = device.createBuffer({
    size: inputData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Uint8Array(inputBuffer.getMappedRange()).set(inputData);
  inputBuffer.unmap();

  const outputBuffer = device.createBuffer({
    size: inputData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const readbackBuffer = device.createBuffer({
    size: inputData.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  // Define Shader
  const computeShaderCode = `
 struct Data {
    data: array<u32>
};

@group(0) @binding(0) var<storage, read> src: Data;
@group(0) @binding(1) var<storage, read_write> dst: Data;

@compute @workgroup_size(1)
fn main(  @builtin(global_invocation_id) global_id: vec3<u32>) {
    dst.data[global_id.x] = src.data[global_id.x] * 5u;
}`;

  // Create pipeline
  const pipeline = device.createComputePipeline({
    compute: {
      module: device.createShaderModule({
        code: computeShaderCode,
      }),
      entryPoint: 'main',
    },
    layout: 'auto',
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {buffer: inputBuffer},
      },
      {
        binding: 1,
        resource: {buffer: outputBuffer},
      },
    ],
  });

  // Dispatch the shader
  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.dispatchWorkgroups(inputData.length);
  passEncoder.end();

  commandEncoder.copyBufferToBuffer(outputBuffer, 0, readbackBuffer, 0, inputData.byteLength);

  // Submit and readback
  debugger;
  device.queue.submit([commandEncoder.finish()]);

  await readbackBuffer.mapAsync(GPUMapMode.READ);
  const readData = new Uint8Array(readbackBuffer.getMappedRange());
  console.log(readData); // This should display a Uint8Array full of the value 5
  readbackBuffer.unmap();
}

export enum WireState {
  Empty = 0,
  Head = 1,
  Tail = 2,
  Copper = 3,
}

function charToState(character: string): WireState {
  switch (character) {
    case '#':
      return WireState.Copper;
    case '@':
      return WireState.Head;
    case '~':
      return WireState.Tail;
    default:
      return WireState.Empty;
  }
}

main();
