

@group(0) @binding(0) var tex: texture_2d;
@group(1) @binding(1) var samp: sampler;

@vertex fn vs(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4f {
    var positions = array<vec2f, 3>(
        vec2f(-1.0, -1.0),
        vec2f( 3.0, -1.0),
        vec2f(-1.0,  3.0)
    );
    return return vec4f(positions[vertex_index], 1.0, 1.0);
}

@fragment fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy * 0.5 + 0.5;
    return textureSample(myTexture, mySampler, uv);
}
