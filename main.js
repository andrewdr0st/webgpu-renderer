let adapter;
let device;

let canvas;
let context;

let module;
let pipeline;
let renderPassDescriptor;

let vertexBuffer;
let vertexColorBuffer;
let instanceBuffer;
let indexBuffer;
let objectsBindGroup;
let uniformBuffer;

let vertexCount = 0;
let vertexList = [];

function createFVertices() {
    const positions = [
      // left column
      0, 0, 0,
      30, 0, 0,
      0, 150, 0,
      30, 150, 0,
  
      // top rung
      30, 0, 0,
      100, 0, 0,
      30, 30, 0,
      100, 30, 0,
  
      // middle rung
      30, 60, 0,
      70, 60, 0,
      30, 90, 0,
      70, 90, 0,
  
      // left column back
      0, 0, 30,
      30, 0, 30,
      0, 150, 30,
      30, 150, 30,
  
      // top rung back
      30, 0, 30,
      100, 0, 30,
      30, 30, 30,
      100, 30, 30,
  
      // middle rung back
      30, 60, 30,
      70, 60, 30,
      30, 90, 30,
      70, 90, 30,
    ];
  
    const indices = [
        // front
        0,  1,  2,    2,  1,  3,  // left column
        4,  5,  6,    6,  5,  7,  // top run
        8,  9, 10,   10,  9, 11,  // middle run
    
        // back
        12,  14,  13,   14, 15, 13,  // left column back
        16,  18,  17,   18, 19, 17,  // top run back
        20,  22,  21,   22, 23, 21,  // middle run back
    
        0, 12, 5,   12, 17, 5,   // top
        5, 17, 7,   17, 19, 7,   // top rung right
        6, 7, 18,   18, 7, 19,   // top rung bottom
        6, 18, 8,   18, 20, 8,   // between top and middle rung
        8, 20, 9,   20, 21, 9,   // middle rung top
        9, 21, 11,  21, 23, 11,  // middle rung right
        10, 11, 22, 22, 11, 23,  // middle rung bottom
        10, 22, 3,  22, 15, 3,   // stem right
        2, 3, 14,   14, 3, 15,   // bottom
        0, 2, 12,   12, 2, 14,   // left
    ];
  
    const quadColors = [
        200,  70, 120,  // left column front
        200,  70, 120,  // top rung front
        200,  70, 120,  // middle rung front
  
         80,  70, 200,  // left column back
         80,  70, 200,  // top rung back
         80,  70, 200,  // middle rung back
  
         70, 200, 210,  // top
        160, 160, 220,  // top rung right
         90, 130, 110,  // top rung bottom
        200, 200,  70,  // between top and middle rung
        210, 100,  70,  // middle rung top
        210, 160,  70,  // middle rung right
         70, 180, 210,  // middle rung bottom
        100,  70, 210,  // stem right
         76, 210, 100,  // bottom
        140, 210,  80,  // left
    ];
  
    const numVertices = indices.length;
    const vertexData = new Float32Array(numVertices * 4); // xyz + color
    vertexData.fill(-1);
    const colorData = new Uint8Array(vertexData.buffer);
    for (let i = 0; i < indices.length; ++i) {
      const positionNdx = indices[i] * 3;
      const position = positions.slice(positionNdx, positionNdx + 3);
      vertexData.set(position, i * 4);
  
      const quadNdx = (i / 6 | 0) * 3;
      const color = quadColors.slice(quadNdx, quadNdx + 3);
      colorData.set(color, i * 16 + 12);
      colorData[i * 16 + 15] = 255;
    }
  
    return {
      vertexData,
      numVertices,
    };
  }

function createHexagonVertices() {
    vertexCount += 7;
    vertexList.push(0.0);
    vertexList.push(0.0);
    vertexList.push(0.0);
    for (let i = 0; i < 6; i++) {
        let theta = i * Math.PI * 0.33333;
        vertexList.push(Math.cos(theta));
        vertexList.push(Math.sin(theta));
        vertexList.push(0.0);
    }
}

function createInstance() {
    instanceCount++;
    let x = Math.random() * 2 - 1;
    let y = Math.random() * 2 - 1;
    let s = Math.random() * 0.2 + 0.05;
    let r = Math.random() * Math.PI * 2;
    instanceList = instanceList.concat([x, y, s, r]);
}

async function loadWGSLShader(f) {
    let response = await fetch("shaders/" + f);
    return await response.text();
}

async function setupGPUDevice() {
    adapter = await navigator.gpu?.requestAdapter();
    if (!adapter) {
        alert("GPU does not support WebGPU")
    }
    device = await adapter?.requestDevice();
    if (!device) {
        alert("Browser does not support WebGPU");
        return false;
    }

    let presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context = canvas.getContext("webgpu");
    context.configure({
        device,
        format: presentationFormat
    });

    let shaderCode = await loadWGSLShader("vertfrag.wgsl");
    module = device.createShaderModule({
        label: "render shader",
        code: shaderCode
    });

    let v = createFVertices();
    
    for (let i = 0; i < 40; i++) {
        createInstance();
    }

    pipeline = device.createRenderPipeline({
        label: "render pipeline",
        layout: "auto",
        vertex: {
            entryPoint: "vs",
            buffers: [{
                arrayStride: 16,
                attributes: [
                    { shaderLocation: 0, offset: 0, format: "float32x3"},
                    { shaderLocation: 1, offset: 12, format: "unorm8x4"}
                ]
            }],
            module
        },
        fragment: {
            entryPoint: "fs",
            module,
            targets: [{ format: presentationFormat }]
        }
    });

    renderPassDescriptor = {
        label: "render pass",
        colorAttachments: [{
            clearValue: [0.3, 0.3, 0.3, 1],
            loadOp: "clear",
            storeOp: "store"
        }]
    }

    vertexBuffer = device.createBuffer({
        label: "vertex buffer",
        size: v.numVertices * 16,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    /*
    indexBuffer = device.createBuffer({
        label: "index buffer",
        size: 72,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });
    */

    const uniformBufferSize = (16) * 4;
    uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    objectsBindGroup = device.createBindGroup({
        label: "objects bind group",
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {binding: 0, resource: {buffer: uniformBuffer } }
        ]
    })

    let m = mat4.create();
    let v3 = vec3.fromValues(2, 5, 1);
    mat4.fromTranslation(m, v3);
    device.queue.writeBuffer(vertexBuffer, 0, new Float32Array(v.vertexData));
    device.queue.writeBuffer(uniformBuffer, 0, m)
    //device.queue.writeBuffer(indexBuffer, 0, new Uint32Array([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 1]));
    
    render(v.numVertices);
}

function render(vcount) {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

    const encoder = device.createCommandEncoder({ label: 'encoder' });

    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(vcount);
    //pass.setIndexBuffer(indexBuffer, "uint32");
    //pass.drawIndexed(18, instanceCount);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;



setupGPUDevice();
