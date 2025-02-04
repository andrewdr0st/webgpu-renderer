const { mat4, vec3 } = wgpuMatrix;

let adapter;
let device;
let presentationFormat;

let canvas;
let context;
let canvasTexture;

let scalingFactor = 1;

let module;
let pipeline;
let renderPassDescriptor;

let vertexBuffer;
let vertexColorBuffer;
let instanceBuffer;
let indexBuffer;
let uniformBuffer;
let objectsBindGroup;

let depthTexture;

let vertexCount = 0;
let indexCount = 0;

const VERTEX_SIZE = 36;
const INDEX_SIZE = 4;
const MAT4_SIZE = 64;

let lastFrameTime = 0;

let cameraTheta = 0;
let cameraVelocity = 0.5;

async function init() {
    await setupGPUDevice();
    setupCanvas();
    await setupRenderPipeline();
    await setupBuffers();
    requestAnimationFrame(main);
}

function main(currentTime) {
    const deltaTime = (currentTime - lastFrameTime) * 0.001;
    lastFrameTime = currentTime;
    cameraTheta += cameraVelocity * deltaTime;
    render();
    requestAnimationFrame(main);
}


function degToRad(theta) {
    return theta * Math.PI / 180;
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
    presentationFormat = navigator.gpu.getPreferredCanvasFormat();
}

function setupCanvas() {
    canvas = document.getElementById("canvas");
    let w = Math.ceil(window.innerWidth / scalingFactor);
    let h = Math.ceil(window.innerHeight / scalingFactor);
    canvas.width = w;
    canvas.height = h;
    context = canvas.getContext("webgpu");
    context.configure({
        device,
        format: presentationFormat,
        alphaMode: 'premultiplied'
    });
    canvasTexture = context.getCurrentTexture();
    canvas.style.width = w * scalingFactor + "px";
    canvas.style.height = h * scalingFactor + "px";
}

async function setupRenderPipeline() {
    let shaderCode = await loadWGSLShader("main.wgsl");
    module = device.createShaderModule({
        label: "render shader",
        code: shaderCode
    });

    depthTexture = device.createTexture({
        size: [canvasTexture.width, canvasTexture.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    pipeline = device.createRenderPipeline({
        label: "render pipeline",
        layout: "auto",
        vertex: {
            entryPoint: "vs",
            buffers: [{
                arrayStride: VERTEX_SIZE,
                attributes: [
                    { shaderLocation: 0, offset: 0, format: "float32x3"},
                    { shaderLocation: 1, offset: 12, format: "float32x2"},
                    { shaderLocation: 2, offset: 20, format: "float32x3"},
                    { shaderLocation: 3, offset: 32, format: "unorm8x4"}
                ]
            }],
            module
        },
        fragment: {
            entryPoint: "fs",
            module,
            targets: [{ format: presentationFormat }]
        },
        primitive: {
            cullMode: 'back',
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus'
        }
    });

    renderPassDescriptor = {
        label: "render pass",
        colorAttachments: [{
            view: canvasTexture.createView(),
            clearValue: [0.25, 0.25, 0.25, 1],
            loadOp: "clear",
            storeOp: "store"
        }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store'
        }
    }
}

async function setupBuffers() {
    let cube = new Mesh();
    await cube.parseObjFile("testcube.obj");

    vertexBuffer = device.createBuffer({
        label: "vertex buffer",
        size: cube.vertexCount * VERTEX_SIZE,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    indexBuffer = device.createBuffer({
        label: "index buffer",
        size: cube.indexCount * INDEX_SIZE,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });

    uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: MAT4_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    objectsBindGroup = device.createBindGroup({
        label: "objects bind group",
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {binding: 0, resource: {buffer: uniformBuffer } }
        ]
    });

    let v = new Float32Array(cube.vertices);
    let c = new Uint8Array(v.buffer);
    let colors = [
        [200, 200, 100, 255],
        [120, 200, 170, 255],
        [200, 100, 200, 255],
        [30, 140, 90, 255],
        [180, 40, 90, 255],
        [90, 90, 180, 255]
    ];
    for (let i = 0; i < cube.vertexCount; i++) {
        let col;
        if (v[(i * 9) + 5] == -1) {
            col = 0;
        } else if (v[(i * 9) + 5] == 1) {
            col = 1;
        } else if (v[(i * 9) + 6] == -1) {
            col = 2;
        } else if (v[(i * 9) + 6] == 1) {
            col = 3;
        } else if (v[(i * 9) + 7] == -1) {
            col = 4;
        } else {
            col = 5;
        }
        c.set(colors[col], i * VERTEX_SIZE + 32);
    }

    device.queue.writeBuffer(vertexBuffer, 0, v);
    device.queue.writeBuffer(indexBuffer, 0, new Uint32Array(cube.indices));
    

    indexCount = cube.indexCount;
}

function render() {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(degToRad(70), aspect, 1, 200);
    const eye = [5 * Math.cos(cameraTheta), 3.5, 5 * Math.sin(cameraTheta)];
    const target = [0, 0, 0];
    const up = [0.0995037, 0.995937, 0];

    const viewMatrix = mat4.lookAt(eye, target, up);

    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);
    let m = mat4.translation([0, 1, 0]);
    m = mat4.multiply(viewProjectionMatrix, m);

    device.queue.writeBuffer(uniformBuffer, 0, m);
    
    const encoder = device.createCommandEncoder({ label: 'encoder' });

    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setIndexBuffer(indexBuffer, "uint32");
    pass.setBindGroup(0, objectsBindGroup);
    pass.drawIndexed(indexCount);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}



init();
