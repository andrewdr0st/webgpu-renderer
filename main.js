let adapter;
let device;

let canvas;
let context;

let module;
let pipeline;
let renderPassDescriptor;

let vertexBuffer;
let vertexColorBuffer;
let indexBuffer;
let objectsBindGroup;

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

    pipeline = device.createRenderPipeline({
        label: "render pipeline",
        layout: "auto",
        vertex: {
            entryPoint: "vs",
            buffers: [{
                arrayStride: 12,
                attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3"}]
            }, {
                arrayStride: 12,
                attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3"}]
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
        size: 96,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    vertexColorBuffer = device.createBuffer({
        label: "vertex color buffer",
        size: 96,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    indexBuffer = device.createBuffer({
        label: "index buffer",
        size: 48,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(vertexBuffer, 0, new Float32Array([-0.5, -0.5, 0.0, 0.0, -0.5, 0.0, -0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.0]));
    device.queue.writeBuffer(vertexColorBuffer, 0, new Float32Array([1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0]));
    device.queue.writeBuffer(indexBuffer, 0, new Uint32Array([0, 1, 2, 1, 2, 3, 4, 5, 6, 5, 6, 7]));
    
    render();
}

function render() {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

    const encoder = device.createCommandEncoder({ label: 'encoder' });

    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setVertexBuffer(1, vertexColorBuffer);
    pass.setIndexBuffer(indexBuffer, "uint32");
    pass.drawIndexed(12);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

setupGPUDevice();
