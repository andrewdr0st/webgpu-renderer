let adapter;
let device;

let canvas;
let context;

let module;
let pipeline;
let renderPassDescriptor;

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
            module
        },
        fragment: {
            entryPoint: "fs",
            module,
            targets: [{ format: presentationFormat }]
        }
    });

    renderPassDescriptor = {
        label: 'render pass',
        colorAttachments: [{
            clearValue: [0.3, 0.3, 0.3, 1],
            loadOp: 'clear',
            storeOp: 'store'
        }]
    }

    render();
}

function render() {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

    const encoder = device.createCommandEncoder({ label: 'encoder' });

    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.draw(3);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

canvas = document.getElementById("canvas");

setupGPUDevice();
