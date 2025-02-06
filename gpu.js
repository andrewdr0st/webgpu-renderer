let adapter;
let device;
let presentationFormat;

let canvas = document.getElementById("canvas");;
let context;
let canvasTexture;

let scalingFactor = 1;
let aspectRatio;

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
    let w = Math.ceil(window.innerWidth / scalingFactor);
    let h = Math.ceil(window.innerHeight / scalingFactor);
    canvas.width = w;
    canvas.height = h;
    aspectRatio = canvas.clientWidth / canvas.clientHeight;
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
      size: MAT4_SIZE * 3 + 16,
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
        /*
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
        */
        c.set(colors[4], i * VERTEX_SIZE + 32);
    }

    device.queue.writeBuffer(vertexBuffer, 0, v);
    device.queue.writeBuffer(indexBuffer, 0, new Uint32Array(cube.indices));
    
    device.queue.writeBuffer(uniformBuffer, MAT4_SIZE * 3 - 16, new Float32Array([3, 10, -1]));

    indexCount = cube.indexCount;
}

function render(scene) {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

    let m = mat4.translation([0, 0, 0]);
    //m = mat4.rotateX(m, cubeTheta);
    //m = mat4.scale(m, [1, 3, 0.75]);

    let nm = mat3.fromMat4(m);
    nm = mat3.inverse(nm);
    nm = mat3.transpose(nm);

    device.queue.writeBuffer(uniformBuffer, 0, m);
    device.queue.writeBuffer(uniformBuffer, MAT4_SIZE, scene.camera.viewProjectionMatrix());
    device.queue.writeBuffer(uniformBuffer, MAT4_SIZE * 2, nm);
    device.queue.writeBuffer(uniformBuffer, MAT4_SIZE * 3, scene.camera.position);
    
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
