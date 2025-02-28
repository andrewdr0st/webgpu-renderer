let debugCamera;

function createFrustumVertices(camera, near, far, color) {
    let frustumCorners = camera.frustumCorners(near, far);
    let vertexList = new Float32Array(32);
    let colorList = new Uint8Array(vertexList.buffer);
    for (let i = 0; i < 8; i++) {
        vertexList.set(frustumCorners[i], i * 4);
        colorList.set(color, i * 16 + 12);
    }
    return vertexList;
}

function setupDebugBuffers(scene) {
    debugBindGroup = device.createBindGroup({
        label: "debug bind group",
        layout: objectsBindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: debugUniformBuffer } },
            { binding: 1, resource: { buffer: objectInfoBuffer } },
            { binding: 2, resource: { buffer: materialBuffer } }
        ]
    });
    
    debugVertexBuffer = device.createBuffer({
        label: "debug vertex buffer",
        size: 32 * 4 * scene.shadowMapCount,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    debugIndexBuffer = device.createBuffer({
        label: "debug index buffer",
        size: 36 * 4 * scene.shadowMapCount,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });

    let iList = new Uint32Array(36 * scene.shadowMapCount);
    for (let i = 0; i < scene.shadowMapCount; i++) {
        let j = 8 * i;
        iList.set([
            0 + j, 1 + j, 2 + j, 1 + j, 2 + j, 3 + j,
            0 + j, 1 + j, 4 + j, 1 + j, 4 + j, 5 + j,
            0 + j, 2 + j, 4 + j, 2 + j, 4 + j, 6 + j,
            4 + j, 5 + j, 6 + j, 5 + j, 6 + j, 7 + j,
            2 + j, 3 + j, 6 + j, 3 + j, 6 + j, 7 + j,
            1 + j, 3 + j, 5 + j, 3 + j, 5 + j, 7 + j],
            i * 36
        );
    }
    device.queue.writeBuffer(debugIndexBuffer, 0, iList);
}

function fillDebugVertexBuffer(scene) {
    let vList = new Float32Array(32 * scene.shadowMapCount);
    let c = [[64, 0, 0, 64], [0, 64, 0, 64], [0, 0, 64, 64]];
    for (let i = 0; i < scene.shadowMapCount; i++) {
        let v = createFrustumVertices(scene.camera, scene.shadowMapDivisions[i], scene.shadowMapDivisions[i + 1], c[i]);
        vList.set(v, 32 * i);
    }
    device.queue.writeBuffer(debugVertexBuffer, 0, vList);
}

function setupDebugCanvas() {
    debugCanvas = new CanvasInfo(0.5, 1.0, 0.5, 0.0);
    debugCanvas.configureContext();
    debugContext = debugCanvas.context;
    debugTexture = debugContext.getCurrentTexture();
    debugCamera = new Camera(debugCanvas.aspectRatio);
    debugCamera.position = [40, 30, 0];
    debugCamera.lookTo = [-1, -0.7, 0];
    debugCamera.setClipPlanes(1, 1000);
    debugCamera.updateLookAt();
    texCanvas = new CanvasInfo(0.5, 0.33, 0.5, 0.67);
    texCanvas.configureContext();
    texContext = texCanvas.context;
}

async function setupDebugPipeline() {
    let debugCode = await loadWGSLShader("debug.wgsl");
    debugModule = device.createShaderModule({
        label: "debug shader",
        code: debugCode
    });
    const debugPipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [
            objectsBindGroupLayout
        ]
    });
    debugPipeline = device.createRenderPipeline({
        label: "debug pipeline",
        layout: debugPipelineLayout,
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

function runDebugPipeline(encoder, scene) {
    device.queue.writeBuffer(debugUniformBuffer, 0, scene.lightViewMatrices[2]);
    //device.queue.writeBuffer(debugUniformBuffer, 0, debugCamera.viewProjectionMatrix);
    device.queue.writeBuffer(debugUniformBuffer, 64, scene.camera.position);
    device.queue.writeBuffer(debugUniformBuffer, 80, scene.lightDirection);
    device.queue.writeBuffer(debugUniformBuffer, 92, new Float32Array([scene.ambient]));
    device.queue.writeBuffer(debugUniformBuffer, 96, scene.lightViewMatrices[0]);
    device.queue.writeBuffer(debugUniformBuffer, 160, scene.lightViewMatrices[1]);
    device.queue.writeBuffer(debugUniformBuffer, 224, scene.lightViewMatrices[2]);
    device.queue.writeBuffer(debugUniformBuffer, 240, scene.depthList);

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
    debugPass.drawIndexed(36 * scene.shadowMapCount);
    debugPass.end();

    /*
    texPassDescriptor.colorAttachments[0].view = texContext.getCurrentTexture().createView();
    const texPass = encoder.beginRenderPass(texPassDescriptor);
    texPass.setPipeline(texPipeline);
    texPass.setBindGroup(0, depthTexBindGroup);
    texPass.draw(3);
    texPass.end();
    */
}