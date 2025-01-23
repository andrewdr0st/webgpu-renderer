
struct vertex {
    @location(0) pos: vec3f,
    @location(1) color: vec3f
}

struct vsOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f
};


@vertex fn vs(vert: vertex) -> vsOutput {
    var vsOut: vsOutput;
    vsOut.position = vec4f(vert.pos, 1.0);
    vsOut.color = vec4f(vert.color, 1.0);
    return vsOut;
}

@fragment fn fs(fsIn: vsOutput) -> @location(0) vec4f {
    return fsIn.color;
}
