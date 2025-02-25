let adapter;
let device;
let presentationFormat;

let canvas = document.getElementById("canvas");
let context;
let canvasTexture;
let debugCanvas = document.getElementById("debug-canvas");
let debugContext;
let debugTexture;

let scalingFactor = 1;
let aspectRatio;

let renderModule;
let renderPipeline;
let renderPassDescriptor;
let shadowModule;
let shadowPipeline;
let shadowPassDescriptor;
let debugModule;
let debugPipeline;
let debugPassDescriptor;

let vertexBuffer;
let indexBuffer;
let debugVertexBuffer;
let debugIndexBuffer;
let uniformBuffer;
let objectInfoBuffer;
let materialBuffer;
let objectsBindGroup;
let objectsBindGroupLayout;
let debugUniformBuffer;
let debugBindGroup;

let nearestSampler;
let linearSampler;
let textureArray16;
let textureArray64;
let texturesBindGroup;
let texturesBindGroupLayout;

let depthTexture;
let shadowDepthTexture;
let shadowView;
let shadowSampler;

let vertexCount = 0;
let indexCount = 0;

let enableShadows = false;
let debug = true;
let debugCamera;

const VERTEX_SIZE = 36;
const INDEX_SIZE = 4;
const MAT3_SIZE = 48;
const MAT4_SIZE = 64;
const UNIFORM_BUFFER_SIZE = 160;
const OBJECT_INFO_SIZE = 128;
const MATERIAL_SIZE = 24;
const SHADOW_MAP_SIZE = 2048;

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
    if (debug) {
        w = Math.floor(w / 2);
        debugCanvas.width = w;
        debugCanvas.height = h;
        debugContext = debugCanvas.getContext("webgpu");
        debugContext.configure({
            device,
            format: presentationFormat,
            alphaMode: 'premultiplied'
        });
        debugTexture = debugContext.getCurrentTexture();
        debugCanvas.style.visibility = "visible";
        debugCanvas.style.left = "75%";
        canvas.style.left = "25%";
    }
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
    if (debug) {
        debugCamera = new Camera();
        debugCamera.position = [0, 5, 100];
        debugCamera.setClipPlanes(1, 1000);
        debugCamera.updateLookAt();
    }
}

async function setupRenderPipeline() {
    createBindGroupLayouts();

    let shaderCode = await loadWGSLShader("main.wgsl");
    let shadowShader = await loadWGSLShader("shadow.wgsl");
    let debugCode = await loadWGSLShader("debug.wgsl");

    renderModule = device.createShaderModule({
        label: "render shader",
        code: shaderCode
    });

    shadowModule = device.createShaderModule({
        label: "shaow shader",
        code: shadowShader
    });

    debugModule = device.createShaderModule({
        label: "debug shader",
        code: debugCode
    })

    depthTexture = device.createTexture({
        size: [canvasTexture.width, canvasTexture.height],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    shadowDepthTexture = device.createTexture({
        size: [SHADOW_MAP_SIZE, SHADOW_MAP_SIZE],
        format: "depth32float",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
    });

    const shadowPipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [
            objectsBindGroupLayout
        ]
    });

    debugPipeline = device.createRenderPipeline({
        label: "debug pipeline",
        layout: shadowPipelineLayout,
        vertex: {
            entryPoint: "vs",
            buffers: [{
                arrayStride: 16,
                attributes: [
                    { shaderLocation: 0, offset: 0, format: "float32x3"},
                    { shaderLocation: 1, offset: 12, format: "unorm8x4"}
                ]
            }],
            module: debugModule
        },
        fragment: {
            entryPoint: "fs",
            module: debugModule,
            targets: [{
                format: presentationFormat,
                blend: {
                    color: {
                        srcFactor: 'one',
                        dstFactor: 'one-minus-src-alpha'
                    },
                    alpha: {
                        srcFactor: 'one',
                        dstFactor: 'one-minus-src-alpha'
                    },
                }
            }]
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus'
        }
    });

    shadowPipeline = device.createRenderPipeline({
        label: "shadow pipeline",
        layout: shadowPipelineLayout,
        vertex: {
            entryPoint: "vs",
            buffers: [{
                arrayStride: VERTEX_SIZE,
                attributes: [
                    { shaderLocation: 0, offset: 0, format: "float32x3"},
                    { shaderLocation: 1, offset: 12, format: "float32x2"},
                    { shaderLocation: 2, offset: 20, format: "float32x3"},
                    { shaderLocation: 3, offset: 32, format: "uint32"}
                ]
            }],
            module: shadowModule
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth32float'
        }
    });

    const renderPipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [
            objectsBindGroupLayout,
            texturesBindGroupLayout
        ]
    });

    renderPipeline = device.createRenderPipeline({
        label: "render pipeline",
        layout: renderPipelineLayout,
        vertex: {
            entryPoint: "vs",
            buffers: [{
                arrayStride: VERTEX_SIZE,
                attributes: [
                    { shaderLocation: 0, offset: 0, format: "float32x3"},
                    { shaderLocation: 1, offset: 12, format: "float32x2"},
                    { shaderLocation: 2, offset: 20, format: "float32x3"},
                    { shaderLocation: 3, offset: 32, format: "uint32"}
                ]
            }],
            module: renderModule
        },
        fragment: {
            entryPoint: "fs",
            module: renderModule,
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

    shadowView = shadowDepthTexture.createView();

    shadowPassDescriptor = {
        label: "shadow pass",
        colorAttachments: [],
        depthStencilAttachment: {
            view: shadowView,
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store"
        }
    }

    debugPassDescriptor = {
        label: "debug pass",
        colorAttachments: [{
            view: debugTexture.createView(),
            loadOp: "load",
            storeOp: "store"
        }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthLoadOp: "load",
            depthStoreOp: "store"
        }
    }
}

function setupBuffers(scene) {
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
        label: "uniform buffer",
        size: UNIFORM_BUFFER_SIZE,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    debugUniformBuffer = device.createBuffer({
        label: "debug uniform",
        size: UNIFORM_BUFFER_SIZE,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    debugVertexBuffer = device.createBuffer({
        label: "debug vertex buffer",
        size: 32 * 4,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    debugIndexBuffer = device.createBuffer({
        label: "debug index buffer",
        size: 36 * 4,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
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
        layout: objectsBindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: { buffer: objectInfoBuffer } },
            { binding: 2, resource: { buffer: materialBuffer } }
        ]
    });

    debugBindGroup = device.createBindGroup({
        label: "debug bind group",
        layout: objectsBindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: debugUniformBuffer } },
            { binding: 1, resource: { buffer: objectInfoBuffer } },
            { binding: 2, resource: { buffer: materialBuffer } }
        ]
    });

    let debugIndexList = new Uint32Array([
        0, 1, 2, 1, 2, 3,
        0, 1, 4, 1, 4, 5,
        0, 2, 4, 2, 4, 6,
        4, 5, 6, 5, 6, 7,
        2, 3, 6, 3, 6, 7,
        1, 3, 5, 3, 5, 7
    ]);
    device.queue.writeBuffer(debugIndexBuffer, 0, debugIndexList);

    let vertexList = new Float32Array(scene.numVertices * 9);
    let indexList = new Uint32Array(scene.numIndices);
    let c = new Uint8Array(vertexList.buffer);

    let vIdx = 0;
    let iIdx = 0;
    for (let i = 0; i < scene.numObjects; i++) {
        let m = scene.objectList[i].mesh;
        vertexList.set(m.vertices, vIdx);
        for (let j = 0; j < m.vertexCount; j++) {
            let idx = ((vIdx / 9) + j) * VERTEX_SIZE;
            c.set([i], idx + 32);
        }
        for (let j = 0; j < m.indexCount; j++) {
            m.indices[j] += vIdx / 9;
        }
        vIdx += m.vertexCount * 9;
        indexList.set(m.indices, iIdx);
        iIdx += m.indexCount;
    }

    device.queue.writeBuffer(vertexBuffer, 0, vertexList);
    device.queue.writeBuffer(indexBuffer, 0, indexList);
}

async function setupTextures() {
    testBitmap = await loadImage("testf.png");
    brickBitmap = await loadImage("brick16x16.png");
    grassBitmap = await loadImage("grassbad64x64.png");

    nearestSampler = device.createSampler({
        minFilter: "nearest",
        magFilter: "nearest"
    });

    linearSampler = device.createSampler({
        minFilter: "linear",
        magFilter: "linear"
    });

    shadowSampler = device.createSampler({
        compare: "less"
    });

    textureArray16 = device.createTexture({
        size: [16, 16, 2],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });
    device.queue.copyExternalImageToTexture({ source: testBitmap }, { texture: textureArray16, origin: { z: 0 } }, [16, 16]);
    device.queue.copyExternalImageToTexture({ source: brickBitmap }, { texture: textureArray16, origin: { z: 1 } }, [16, 16]);

    textureArray64 = device.createTexture({
        size: [64, 64, 2],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });
    device.queue.copyExternalImageToTexture({ source: grassBitmap }, { texture: textureArray64, origin: { z: 0 } }, [64, 64]);

    texturesBindGroup = device.createBindGroup({
        label: "textures bind group",
        layout: texturesBindGroupLayout,
        entries: [
            { binding: 0, resource: nearestSampler },
            { binding: 1, resource: linearSampler },
            { binding: 2, resource: textureArray16.createView() },
            { binding: 3, resource: textureArray64.createView() },
            { binding: 4, resource: shadowSampler },
            { binding: 5, resource: shadowView }
        ]
    });
}

function createBindGroupLayouts() {
    objectsBindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "uniform" }
            }, {
                binding: 1,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "read-only-storage" }
            }, {
                binding: 2,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "read-only-storage" }
            }
        ]
    });

    texturesBindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: { type: "filtering" }
            }, {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: { type: "filtering" }
            }, {
                binding: 2,
                visibility: GPUShaderStage.FRAGMENT,
                texture: { sampleType: "float", viewDimension: "2d-array" }
            }, {
                binding: 3,
                visibility: GPUShaderStage.FRAGMENT,
                texture: { sampleType: "float", viewDimension: "2d-array" }
            }, {
                binding: 4,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: { type: "comparison" }
            }, {
                binding: 5,
                visibility: GPUShaderStage.FRAGMENT,
                texture: { sampleType: "depth" }
            }
        ]
    });
}

function render(scene) {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

    device.queue.writeBuffer(uniformBuffer, 0, scene.camera.viewProjectionMatrix);
    device.queue.writeBuffer(uniformBuffer, 64, scene.camera.position);
    device.queue.writeBuffer(uniformBuffer, 80, scene.lightViewMatrices[0]);
    device.queue.writeBuffer(uniformBuffer, 144, scene.lightDirection);
    device.queue.writeBuffer(uniformBuffer, 156, new Float32Array([scene.ambient]));

    if (debug) {
        device.queue.writeBuffer(debugUniformBuffer, 0, debugCamera.viewProjectionMatrix);
        device.queue.writeBuffer(debugUniformBuffer, 64, scene.camera.position);
        device.queue.writeBuffer(debugUniformBuffer, 80, scene.lightViewMatrices[0]);
        device.queue.writeBuffer(debugUniformBuffer, 144, scene.lightDirection);
        device.queue.writeBuffer(debugUniformBuffer, 156, new Float32Array([scene.ambient]));
    }
    

    for (let i = 0; i < scene.numObjects; i++) {
        let o = scene.objectList[i];
        o.calculateMatrices();
        device.queue.writeBuffer(objectInfoBuffer, i * OBJECT_INFO_SIZE, o.worldMatrix);
        device.queue.writeBuffer(objectInfoBuffer, i * OBJECT_INFO_SIZE + MAT4_SIZE, o.normalMatrix);
        device.queue.writeBuffer(objectInfoBuffer, i * OBJECT_INFO_SIZE + MAT4_SIZE + MAT3_SIZE, new Uint32Array([o.materialId]));
    }
    
    const encoder = device.createCommandEncoder({ label: 'encoder' });

    if (enableShadows) {
        const shadowPass = encoder.beginRenderPass(shadowPassDescriptor);
        shadowPass.setPipeline(shadowPipeline);
        shadowPass.setVertexBuffer(0, vertexBuffer);
        shadowPass.setIndexBuffer(indexBuffer, "uint32");
        shadowPass.setBindGroup(0, objectsBindGroup);
        shadowPass.drawIndexed(scene.numIndices);
        shadowPass.end();
    }

    const renderPass = encoder.beginRenderPass(renderPassDescriptor);
    renderPass.setPipeline(renderPipeline);
    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.setIndexBuffer(indexBuffer, "uint32");
    renderPass.setBindGroup(0, objectsBindGroup);
    renderPass.setBindGroup(1, texturesBindGroup);
    renderPass.drawIndexed(scene.numIndices);
    renderPass.end();

    if (debug) {
        renderPassDescriptor.colorAttachments[0].view = debugContext.getCurrentTexture().createView();
        const debugRenderPass = encoder.beginRenderPass(renderPassDescriptor);
        debugRenderPass.setPipeline(renderPipeline);
        debugRenderPass.setVertexBuffer(0, vertexBuffer);
        debugRenderPass.setIndexBuffer(indexBuffer, "uint32");
        debugRenderPass.setBindGroup(0, debugBindGroup);
        debugRenderPass.setBindGroup(1, texturesBindGroup);
        debugRenderPass.drawIndexed(scene.numIndices);
        debugRenderPass.end();

        debugPassDescriptor.colorAttachments[0].view = debugContext.getCurrentTexture().createView();
        const debugPass = encoder.beginRenderPass(debugPassDescriptor);
        debugPass.setPipeline(debugPipeline);
        debugPass.setVertexBuffer(0, debugVertexBuffer);
        debugPass.setIndexBuffer(debugIndexBuffer, "uint32");
        debugPass.setBindGroup(0, debugBindGroup);
        debugPass.drawIndexed(36);
        debugPass.end();
    }

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

function setupDebugVertexBuffer() {
    let frustumCorners = scene.camera.frustumCorners([0, 1]);
    let vList = new Float32Array(32);
    let cList = new Uint8Array(vList.buffer);
    for (let i = 0; i < 8; i++) {
        vList.set(frustumCorners[i], i * 4);
        cList.set([64, 0, 0, 64], i * 16 + 12);
    }
    device.queue.writeBuffer(debugVertexBuffer, 0, vList);
}
