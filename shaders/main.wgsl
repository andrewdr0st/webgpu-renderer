
struct sceneInfo {
    view: mat4x4f,
    view_pos: vec3f,
    light_dir: vec3f,
    ambient: f32,
    light_view: array<mat4x4f, 3>,
    frustum_depths: vec3f
};

struct objectInfo {
    world_matrix: mat4x4f,
    normal_matrix: mat3x3f,
    material: u32
};

struct materialInfo {
    diffuse: f32,
    specular: f32,
    shininess: f32,
    samp: u32,
    tex: u32,
    tex_array: u32
};

struct vertex {
    @location(0) pos: vec4f,
    @location(1) tc: vec2f,
    @location(2) normal: vec3f,
    @location(3) id: u32
};

struct vsOutput {
    @builtin(position) position: vec4f,
    @location(0) tc: vec2f,
    @location(1) normal: vec3f,
    @location(2) surface_to_view: vec3f,
    @location(3) world_pos: vec3f,
    @location(4) @interpolate(flat) material: u32,
};

const SHADOW_BIAS = vec3f(0.00005, 0.0001, 0.00025);
const SHADOW_MAP_SIZE = 2048.0;
const SHADOW_SAMPLE_OFFSET = vec3f(1.0 / SHADOW_MAP_SIZE, 0.5 / SHADOW_MAP_SIZE, 0.25 / SHADOW_MAP_SIZE);

@group(0) @binding(0) var<uniform> scene: sceneInfo;
@group(0) @binding(1) var<storage, read> objects: array<objectInfo>;
@group(0) @binding(2) var<storage, read> materials: array<materialInfo>;
@group(1) @binding(0) var n_sampler: sampler;
@group(1) @binding(1) var l_sampler: sampler;
@group(1) @binding(2) var textures16: texture_2d_array<f32>;
@group(1) @binding(3) var textures64: texture_2d_array<f32>;
@group(1) @binding(4) var shadow_sampler: sampler_comparison;
@group(1) @binding(5) var shadow_map: texture_depth_2d_array;

@vertex fn vs(vert: vertex) -> vsOutput {
    let obj = objects[vert.id];
    let world_pos = (obj.world_matrix * vert.pos).xyz;
    let view_pos = scene.view * obj.world_matrix * vert.pos;
    var vsOut: vsOutput;
    vsOut.position = view_pos;
    vsOut.tc = vert.tc;
    vsOut.normal = obj.normal_matrix * vert.normal;
    vsOut.surface_to_view = scene.view_pos - world_pos;
    vsOut.material = obj.material;
    vsOut.world_pos = world_pos;
    return vsOut;
}

@fragment fn fs(fsIn: vsOutput) -> @location(0) vec4f {
    let material = materials[fsIn.material];
    let normal = normalize(fsIn.normal);
    let half_vector = normalize(scene.light_dir + fsIn.surface_to_view);

    let ambient = scene.ambient;
    let diffuse = max(dot(normal, scene.light_dir), 0) * material.diffuse;
    let specular = select(0, pow(max(0, dot(normal, half_vector)), material.shininess) * material.specular, diffuse > 0);
    
    let z = abs((scene.view * vec4f(fsIn.world_pos, 1.0)).z);
    let cascade = select(2, select(1, 0, z < scene.frustum_depths[0]), z < scene.frustum_depths[1]);
    let light_space_pos = scene.light_view[cascade] * vec4f(fsIn.world_pos, 1.0);
    let shadow_pos = vec3(light_space_pos.xy * vec2(0.5, -0.5) + vec2(0.5), light_space_pos.z);
    let c = sampleTexture(fract(fsIn.tc), material.samp, material.tex, material.tex_array);
    let color = c * (ambient + (diffuse + specular) * inShadow(cascade, shadow_pos));
    return color;
    //return vec4f(0, 0, z * 0.01, 1.0);
}

fn inShadow(cascade: i32, shadow_pos: vec3f) -> f32 {
    var visibility = 0.0;
    for (var y = -2.0; y <= 2.01; y += 1) {
        for (var x = -2.0; x <= 2.01; x += 1) {
            let offset = vec2f(x, y) * SHADOW_SAMPLE_OFFSET[cascade];
            visibility += textureSampleCompare(shadow_map, shadow_sampler, shadow_pos.xy + offset, cascade, shadow_pos.z - SHADOW_BIAS[cascade]);
        }
    }
    return visibility * 0.04;
}

fn sampleTexture(tc: vec2f, samp: u32, t: u32, arr: u32) -> vec4f {
    return select(
        select(
            textureSample(textures16, n_sampler, tc, t),
            textureSample(textures64, n_sampler, tc, t),
            arr == 1
        ),
        select(
            textureSample(textures16, l_sampler, tc, t),
            textureSample(textures64, l_sampler, tc, t),
            arr == 1
        ),
        samp == 1
    );
}
