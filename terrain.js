let terrainPipeline;
let terrainBindGroupLayout;
let terrainBindGroup;
let terrainVertexBuffer;
let terrainIndexBuffer;

function createPlane(size, tileSize) {
    let vCount = (size + 1) * (size + 1) * 5;
    let iCount = size * size * 6;
    let vertexList = new Float32Array(vCount);
    let indexList = new Uint32Array(iCount);
    let mid = size * tileSize * 0.5;
    let uv = 1 / size;
    let half = uv * 0.5;
    for (let i = 0; i <= size; i++) {
        for (let j = 0; j <= size; j++) {
            vertexList.set([mid - tileSize * i, 0.0, mid - tileSize * j, i * uv + half, j * uv + half], (i * (size + 1) + j) * 5);
        }
    }
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            let i1 = i * (size + 1) + j;
            let i2 = (i + 1) * (size + 1) + j;
            indexList.set([i1, i2 + 1, i1 + 1, i1, i2, i2 + 1], (i * size + j) * 6);
        }
    }
    return new Mesh(vertexList, vCount, indexList, iCount);
} 

async function setupTerrainPipeline() {
    let terrainShader = loadWGSLShader("terrain.wgsl");
    const terrainModule = device.createShaderModule({
        label: "terrain module",
        code: terrainShader
    });
    terrainBindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                texture: { sampleType : "unfilterable-float" }
            }, {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: { type: "non-filtering" }
            }
        ]
    });
    const terrainPipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [
            objectsBindGroupLayout,
            terrainBindGroupLayout
        ]
    });
    terrainPipeline = device.createRenderPipeline({
        label: "terrain pipeline",
        layout: terrainPipelineLayout,
        vertex: {
            entryPoint: "vs",
            buffers: [{
                arrayStride: 20,
                attributes: [
                    { shaderLocation: 0, offset: 0, format: "float32x3" },
                    { shaderLocation: 1, offset: 12, format: "float32x2" }
                ]
            }],
            module: terrainModule
        },
        fragment: {
            entryPoint: "fs",
            module: terrainModule,
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
}