let perlinPipeline;
let perlinBindGroupLayout;
let perlinBindGroup;
let perlinTexture;

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