
struct matrix {
    world: mat4x4f,
    view: mat4x4f,
    light_dir: vec3f
};

struct vertex {
    @location(0) pos: vec4f,
    @location(1) tc: vec2f,
    @location(2) normal: vec3f,
    @location(3) color: vec4f
};

struct vsOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
    @location(1) normal: vec3f
};

@group(0) @binding(0) var<uniform> m: matrix;

@vertex fn vs(vert: vertex) -> vsOutput {
    var vsOut: vsOutput;
    vsOut.position = m.view * m.world * vert.pos;
    vsOut.color = vert.color;
    vsOut.normal = (m.world * vec4f(vert.normal, 0)).xyz;
    return vsOut;
}

@fragment fn fs(fsIn: vsOutput) -> @location(0) vec4f {
    let normal = normalize(fsIn.normal);
    let light = dot(normal, -m.light_dir);
    let color = fsIn.color.rgb * light;
    return vec4f(color, fsIn.color.a);
}
