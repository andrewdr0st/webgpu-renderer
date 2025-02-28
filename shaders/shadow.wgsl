struct lightMatrix {
    light_view: mat4x4f
};

struct objectInfo {
    world_matrix: mat4x4f,
    normal_matrix: mat3x3f,
    material: u32
};

struct vertex {
    @location(0) pos: vec4f,
    @location(1) tc: vec2f,
    @location(2) normal: vec3f,
    @location(3) id: u32
};

@group(0) @binding(0) var<uniform> matrix: lightMatrix;
@group(0) @binding(1) var<storage, read> objects: array<objectInfo>;

@vertex fn vs(vert: vertex) -> @builtin(position) vec4f {
    let obj = objects[vert.id];
    return matrix.light_view * obj.world_matrix * vert.pos;
}