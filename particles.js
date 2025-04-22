let particlesRenderModule;
let particlesRenderPipeline;
let particlesSimModule;
let particlesSimPipeline;

async function setupParticlePipelines() {
    let renderShader = await loadWGSLShader("particle.wgsl");
    particlesRenderModule = device.createShaderModule({
        label: "paricle render shader",
        code: renderShader
    });
    
}