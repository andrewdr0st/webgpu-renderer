
struct sceneInfo {
    view: mat4x4f,
    view_pos: vec3f,
    light_view: mat4x4f,
    light_dir: vec3f,
    ambient: f32
};

struct vertex {
    @location(0) pos: vec4f,
    @location(1) color: vec4f
};

struct vsOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f
}

@group(0) @binding(0) var<uniform> scene: sceneInfo;

@vertex fn vs(vert: vertex) -> vsOutput {
    var vsOut: vsOutput;
    vsOut.position = scene.view * vert.pos;
    vsOut.color = vert.color;
    return vsOut;
}

@fragment fn fs(fsIn: vsOutput) -> @location(0) vec4f {
    return fsIn.color;
}
