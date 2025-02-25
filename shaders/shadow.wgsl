struct sceneInfo {
    view: mat4x4f,
    view_pos: vec3f,
    light_view: mat4x4f,
    light_pos: vec3f,
    ambient: f32
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

@group(0) @binding(0) var<uniform> scene: sceneInfo;
@group(0) @binding(1) var<storage, read> objects: array<objectInfo>;
//@group(0) @binding(2) var<storage, read> materials: array<materialInfo>;

@vertex fn vs(vert: vertex) -> @builtin(position) vec4f {
    let obj = objects[vert.id];
    return scene.light_view * obj.world_matrix * vert.pos;
}