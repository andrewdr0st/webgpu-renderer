let perlinPipeline;
let perlinBindGroupLayout;
let perlinBindGroup;
let perlinTexture;

let displayPipeline;
let displayPassDescriptor;

const PERLIN_SIZE = 256;

async function setupPerlinPipeline() {
    let perlinShader = await loadWGSLShader("perlin.wgsl");
    const perlinModule = device.createShaderModule({
        label: "perlin shader",
        code: perlinShader
    });
    const perlinPipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [
            perlinBindGroupLayout
        ]
    });
    perlinPipeline = device.createComputePipeline({
        label: "perlin pipeline",
        layout: perlinPipelineLayout,
        compute: { module: perlinModule }
    });

    let texCode = await loadWGSLShader("imageRender.wgsl");
    let texModule = device.createShaderModule({
        label: "tex shader",
        code: texCode
    });
    const layout = device.createPipelineLayout({
        bindGroupLayouts: [
            depthTexBindGroupLayout
        ]
    });
    displayPipeline = device.createRenderPipeline({
        label: "depth tex pipeline",
        layout: layout,
        vertex: {
            entryPoint: "vs",
            module: texModule
        },
        fragment: {
            entryPoint: "fs",
            module: texModule,
            targets: [{ format: presentationFormat }]
        }
    });
    displayPassDescriptor = {
        label: "tex pass",
        colorAttachments: [{
            loadOp: "load",
            storeOp: "store"
        }]
    }
}

function createPerlinBindGroupLayout() {
    perlinBindGroupLayout = device.createBindGroupLayout({
        entries: [
            { 
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                storageTexture: { format: "r32float" }
            }
        ]
    });
}

function runPerlinPipeline() {
    perlinTexture = device.createTexture({
        size: [PERLIN_SIZE, PERLIN_SIZE, 1],
        format: "r32float",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });
    perlinBindGroup = device.createBindGroup({
        layout: perlinBindGroupLayout,
        entries: [
            { binding: 0, resource: perlinTexture.createView() }
        ]
    });


    const encoder = device.createCommandEncoder({ label: "encoder" });
    const noisePass = encoder.beginComputePass();
    noisePass.setPipeline(perlinPipeline);
    noisePass.setBindGroup(0, perlinBindGroup);
    noisePass.dispatchWorkgroups(PERLIN_SIZE / 8, PERLIN_SIZE / 8);
    noisePass.end();

    const displayBindGroup = device.createBindGroup({
        layout: depthTexBindGroupLayout,
        entries: [
            { binding: 0, resource: perlinTexture.createView() },
            { binding: 1, resource: nearestSampler }
        ]
    });
    displayPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    const displayPass = encoder.beginRenderPass(displayPassDescriptor);
    displayPass.setPipeline(displayPipeline)
    displayPass.setBindGroup(0, displayBindGroup);
    displayPass.draw(3);
    displayPass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}