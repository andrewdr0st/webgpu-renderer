
struct sceneInfo {
    view: mat4x4f,
    view_pos: vec3f,
    light_dir: vec3f,
    ambient: f32,
    light_view: array<mat4x4f, 3>,
    frustum_depths: vec3f
};

struct particleInfo {
    pos: vec3f,
    lifetime: f32
}

@group(0) @binding(0) var<uniform> scene: sceneInfo;
@group(1) @binding(0) var<storage, read> instances: array<particleInfo>;

@vertex fn vs(@builtin(position) pos: vec4f, @builtin(instance_index) i: u32) -> @builtin(position) vec4f {
    let p_info = instances[i];
    return pos p_info.pos;
}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    return vec4f(0.8, 0.8, 0.9, 1.0);
}
