struct sceneInfo {
    view: mat4x4f,
    view_pos: vec3f,
    light_dir: vec3f,
    ambient: f32,
    light_view: array<mat4x4f, 3>,
    frustum_depths: vec3f
};

struct vertex {
    @location(0) pos: vec3f,
    @location(1) uv: vec2f
};

struct vsOutput {
    @builtin(position) position: vec4f,
    @location(0) height: f32
};

const H = 3;

@group(0) @binding(0) var<uniform> scene: sceneInfo;
@group(1) @binding(0) var height_map: texture_2d<f32>;
@group(1) @binding(1) var samp: sampler;

@vertex fn vs(vert: vertex) -> vsOutput {
    var vsOut: vsOutput;
    vsOut.height = textureSample(height_map, sampler, vert.uv).r;
    vert.pos.y = H * vsOut.height;
    vsOut.position = scene.view * vec4f(vert.pos, 1.0);
    return vsOut;
}

@fragment fn fs(fsIn: vsOutput) -> @location(0) vec4f {
    return vec4f(fsIn.height, 0.8, 0.3, 1.0);
}
