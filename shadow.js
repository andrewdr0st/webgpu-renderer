let shadowModule;
let shadowPipeline;

let shadowBindGroupLayout;
let shadowBindGroups = [];
let shadowUniforms = [];

let shadowDepthTexture;
let shadowMaps;
let shadowSampler;

async function setupShadowPipeline() {
    let shadowShader = await loadWGSLShader("shadow.wgsl");
    shadowModule = device.createShaderModule({
        label: "shaow shader",
        code: shadowShader
    });
    const shadowPipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [
            shadowBindGroupLayout
        ]
    });
    shadowPipeline = device.createRenderPipeline({
        label: "shadow pipeline",
        layout: shadowPipelineLayout,
        vertex: {
            entryPoint: "vs",
            buffers: [{
                arrayStride: VERTEX_SIZE,
                attributes: [
                    { shaderLocation: 0, offset: 0, format: "float32x3" },
                    { shaderLocation: 1, offset: 12, format: "float32x2" },
                    { shaderLocation: 2, offset: 20, format: "float32x3" },
                    { shaderLocation: 3, offset: 32, format: "uint32" }
                ]
            }],
            module: shadowModule
        },
        primitive: {
            cullMode: "back"
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth32float'
        }
    });
}

function setupShadowBuffers(scene) {
    for (let i = 0; i < scene.shadowMapCount; i++) {
        shadowUniforms.push(device.createBuffer({
            size: MAT4_SIZE,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        }));
        shadowBindGroups.push(device.createBindGroup({
            layout: shadowBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: shadowUniforms[i] } },
                { binding: 1, resource: { buffer: objectInfoBuffer } }
            ]
        }));
    }
}

function setupShadowMaps() {
    shadowSampler = device.createSampler({
        compare: "less"
    });

    shadowMaps = device.createTexture({
        size: [SHADOW_MAP_SIZE, SHADOW_MAP_SIZE, 3],
        format: "depth32float",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
        dimension: "2d"
    });
}

function createShadowBindGroupLayout() {
    shadowBindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: "uniform" }
            }, {
                binding: 1,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: "read-only-storage" }
            },
        ]
    });
}

function runShadowPipeline(encoder, scene) {
    for (let i = 0; i < scene.shadowMapCount; i++) {
        let shadowView = shadowMaps.createView({
            baseArrayLayer: i,
            arrayLayerCount: 1,
            dimension: "2d"
        });
        let shadowPassDescriptor = {
            label: "shadow pass",
            colorAttachments: [],
            depthStencilAttachment: {
                view: shadowView,
                depthClearValue: 1.0,
                depthLoadOp: "clear",
                depthStoreOp: "store"
            }
        }
        device.queue.writeBuffer(shadowUniforms[i], 0, scene.lightViewMatrices[i]);
        const shadowPass = encoder.beginRenderPass(shadowPassDescriptor);
        shadowPass.setPipeline(shadowPipeline);
        shadowPass.setVertexBuffer(0, vertexBuffer);
        shadowPass.setIndexBuffer(indexBuffer, "uint32");
        shadowPass.setBindGroup(0, shadowBindGroups[i]);
        shadowPass.drawIndexed(scene.numIndices);
        shadowPass.end();
    }
}
