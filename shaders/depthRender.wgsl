
struct vsOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f
}

@group(0) @binding(0) var tex: texture_depth_2d;
@group(0) @binding(1) var samp: sampler;

@vertex fn vs(@builtin(vertex_index) vertex_index: u32) -> vsOutput {
    var positions = array<vec2f, 3>(
        vec2f(-1.0, -1.0),
        vec2f( 3.0, -1.0),
        vec2f(-1.0,  3.0)
    );
    var vsOut: vsOutput;
    vsOut.position = vec4f(positions[vertex_index], 1.0, 1.0);
    vsOut.uv = positions[vertex_index] * 0.5 + 0.5;
    //vsOut.uv.y *= -1.0;
    return vsOut;
}

@fragment fn fs(fsIn: vsOutput) -> @location(0) vec4f {
    let d = textureSample(tex, samp, fsIn.uv);
    return vec4f(d, d, d, 1.0);
}
