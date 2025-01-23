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

let vertexCount = 0;
let vertexList = [];

let instanceCount = 0;
let instanceList = [];

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

    createHexagonVertices();
    
    for (let i = 0; i < 40; i++) {
        createInstance();
    }

    pipeline = device.createRenderPipeline({
        label: "render pipeline",
        layout: "auto",
        vertex: {
            entryPoint: "vs",
            buffers: [{
                arrayStride: 12,
                attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3"}]
            }, {
                arrayStride: 4,
                attributes: [{ shaderLocation: 1, offset: 0, format: "unorm8x4"}]
            }, {
                arrayStride: 16,
                stepMode: "instance",
                attributes: [
                    { shaderLocation: 2, offset: 0, format: "float32x2" },
                    { shaderLocation: 3, offset: 8, format: "float32" },
                    { shaderLocation: 4, offset: 12, format: "float32" }
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
        size: vertexCount * 12,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    vertexColorBuffer = device.createBuffer({
        label: "vertex color buffer",
        size: 28,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    instanceBuffer = device.createBuffer({
        label: "instance buffer",
        size: instanceCount * 16,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    indexBuffer = device.createBuffer({
        label: "index buffer",
        size: 72,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(vertexBuffer, 0, new Float32Array(vertexList));
    device.queue.writeBuffer(vertexColorBuffer, 0, new Uint8Array([255, 255, 255, 255, 255, 0, 0, 255, 255, 255, 0, 255, 0, 255, 0, 255, 0, 255, 255, 255, 0, 0, 255, 255, 255, 0, 255, 255]));
    device.queue.writeBuffer(instanceBuffer, 0, new Float32Array(instanceList));
    device.queue.writeBuffer(indexBuffer, 0, new Uint32Array([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 1]));
    
    render();
}

function render() {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

    const encoder = device.createCommandEncoder({ label: 'encoder' });

    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setVertexBuffer(1, vertexColorBuffer);
    pass.setVertexBuffer(2, instanceBuffer);
    pass.setIndexBuffer(indexBuffer, "uint32");
    pass.drawIndexed(18, instanceCount);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

setupGPUDevice();
