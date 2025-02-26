const screenWidth: f32;
const screenHeight: f32;

@group(0) @binding(0) var tex: texture_2d;
@group(1) @binding(1) var sampler: 

@vertex fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4f {
    var positions = array<vec2f, 3>(
        vec2f(-1.0, -1.0),
        vec2f( 3.0, -1.0),
        vec2f(-1.0,  3.0)
    );

    var output: VertexOutput;
    output.position = vec4f(positions[vertex_index], 0.0, 1.0);
    return output;
}

@fragment fn fs_main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / vec2f(screenWidth, screenHeight);
    return textureSample(myTexture, mySampler, uv);
}
