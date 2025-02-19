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
let objectInfoBuffer;
let materialBuffer;
let objectsBindGroup;

let nearestSampler;
let linearSampler;
let testTexture;
let texturesBindGroup;
let depthTexture;

let vertexCount = 0;
let indexCount = 0;

const VERTEX_SIZE = 40;
const INDEX_SIZE = 4;
const MAT3_SIZE = 48;
const MAT4_SIZE = 64;
const UNIFORM_BUFFER_SIZE = 96;
const OBJECT_INFO_SIZE = 128;
const MATERIAL_SIZE = 16;

async function loadWGSLShader(f) {
    let response = await fetch("shaders/" + f);
    return await response.text();
}

async function loadImage(path) {
    const response = await fetch("textures/" + path);
    const blob = await response.blob();
    return await createImageBitmap(blob);
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
                    { shaderLocation: 3, offset: 32, format: "unorm8x4"},
                    { shaderLocation: 4, offset: 36, format: "uint32"}
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
            cullMode: "back"
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

async function setupBuffers(scene) {
    vertexBuffer = device.createBuffer({
        label: "vertex buffer",
        size: scene.numVertices * VERTEX_SIZE,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    indexBuffer = device.createBuffer({
        label: "index buffer",
        size: scene.numIndices * INDEX_SIZE,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });

    uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: UNIFORM_BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    objectInfoBuffer = device.createBuffer({
        label: "object info buffer",
        size: scene.numObjects * OBJECT_INFO_SIZE,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    materialBuffer = device.createBuffer({
        label: "material buffer",
        size: scene.numMaterials * MATERIAL_SIZE,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    for (let i = 0; i < scene.numMaterials; i++) {
        device.queue.writeBuffer(materialBuffer, MATERIAL_SIZE * i, scene.materialList[i].getValues());
    }

    objectsBindGroup = device.createBindGroup({
        label: "objects bind group",
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: { buffer: objectInfoBuffer } },
            { binding: 2, resource: { buffer: materialBuffer } }
        ]
    });

    let vertexList = new Float32Array(scene.numVertices * 10);
    let indexList = new Uint32Array(scene.numIndices);
    let c = new Uint8Array(vertexList.buffer);
    let colors = [
        [30, 140, 90, 255],
        [180, 40, 90, 255],
        [120, 200, 170, 255],
        [200, 200, 100, 255],
        [200, 100, 200, 255],
        [90, 90, 180, 255]
    ];

    let vIdx = 0;
    let iIdx = 0;
    for (let i = 0; i < scene.numObjects; i++) {
        let m = scene.objectList[i].mesh;
        vertexList.set(m.vertices, vIdx);
        for (let j = 0; j < m.vertexCount; j++) {
            let idx = ((vIdx / 10) + j) * VERTEX_SIZE;
            c.set(colors[i], idx + 32);
            c.set([i], idx + 36);
        }
        for (let j = 0; j < m.indexCount; j++) {
            m.indices[j] += vIdx / 10;
        }
        vIdx += m.vertexCount * 10;
        indexList.set(m.indices, iIdx);
        iIdx += m.indexCount;
    }

    device.queue.writeBuffer(vertexBuffer, 0, vertexList);
    device.queue.writeBuffer(indexBuffer, 0, indexList);
}

async function setupTextures() {
    testBitmap = await loadImage("testf.png");

    testTexture = device.createTexture({
        size: [16, 16, 1],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });
    device.queue.copyExternalImageToTexture({ source: testBitmap }, { texture: testTexture}, [16, 16]);

    nearestSampler = device.createSampler({
        minFilter: "nearest",
        magFilter: "nearest"
    });

    linearSampler = device.createSampler({
        minFilter: "linear",
        magFilter: "linear"
    });

    texturesBindGroup = device.createBindGroup({
        label: "textures bind group",
        layout: pipeline.getBindGroupLayout(1),
        entries: [
            { binding: 0, resource: nearestSampler},
            { binding: 1, resource: linearSampler},
            { binding: 2, resource: testTexture.createView() }
        ]
    });
}

function render(scene) {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

    device.queue.writeBuffer(uniformBuffer, 0, scene.camera.viewProjectionMatrix());
    device.queue.writeBuffer(uniformBuffer, 64, scene.camera.position);
    device.queue.writeBuffer(uniformBuffer, 76, new Float32Array([scene.ambient]));
    device.queue.writeBuffer(uniformBuffer, 80, scene.lightPosition);

    for (let i = 0; i < scene.numObjects; i++) {
        let o = scene.objectList[i];
        o.calculateMatrices();
        device.queue.writeBuffer(objectInfoBuffer, i * OBJECT_INFO_SIZE, o.worldMatrix);
        device.queue.writeBuffer(objectInfoBuffer, i * OBJECT_INFO_SIZE + MAT4_SIZE, o.normalMatrix);
        device.queue.writeBuffer(objectInfoBuffer, i * OBJECT_INFO_SIZE + MAT4_SIZE + MAT3_SIZE, new Uint32Array([o.materialId, o.samplerId]));
    }
    
    const encoder = device.createCommandEncoder({ label: 'encoder' });

    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setIndexBuffer(indexBuffer, "uint32");
    pass.setBindGroup(0, objectsBindGroup);
    pass.setBindGroup(1, texturesBindGroup);
    pass.drawIndexed(scene.numIndices);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}
