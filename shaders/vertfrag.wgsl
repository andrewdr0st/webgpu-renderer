
struct vertex {
    @location(0) pos: vec3f,
    @location(1) color: vec4f,
    @location(2) offset: vec2f,
    @location(3) scale: f32,
    @location(4) rotation: f32
}

struct vsOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f
};


@vertex fn vs(vert: vertex) -> vsOutput {
    var vsOut: vsOutput;
    let p = vec2f(vert.pos.x * cos(vert.rotation) - vert.pos.y * sin(vert.rotation), vert.pos.x * sin(vert.rotation) + vert.pos.y * cos(vert.rotation));
    vsOut.position = vec4f(p * vert.scale + vert.offset, 0.0, 1.0);
    vsOut.color = vert.color;
    return vsOut;
}

@fragment fn fs(fsIn: vsOutput) -> @location(0) vec4f {
    return fsIn.color;
}
