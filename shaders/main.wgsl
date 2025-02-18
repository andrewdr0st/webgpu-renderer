
struct sceneInfo {
    view: mat4x4f,
    view_pos: vec3f,
    ambient: f32,
    light_pos: vec3f  
};

struct objectInfo {
    world_matrix: mat4x4f,
    normal_matrix: mat3x3f,
    material: u32
};

struct materialInfo {
    diffuse: f32,
    specular: f32,
    shininess: f32
};

struct vertex {
    @location(0) pos: vec4f,
    @location(1) tc: vec2f,
    @location(2) normal: vec3f,
    @location(3) color: vec4f,
    @location(4) id: u32
};

struct vsOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
    @location(1) normal: vec3f,
    @location(2) surface_to_light: vec3f,
    @location(3) surface_to_view: vec3f,
    @location(4) @interpolate(flat) material: u32,
    @location(5) tc: vec2f
};

@group(0) @binding(0) var<uniform> scene: sceneInfo;
@group(0) @binding(1) var<storage, read> objects: array<objectInfo>;
@group(0) @binding(2) var<storage, read> materials: array<materialInfo>;
@group(1) @binding(0) var tex_sampler: sampler;
@group(1) @binding(1) var tex: texture_2d<f32>;

@vertex fn vs(vert: vertex) -> vsOutput {
    let obj = objects[vert.id];
    let world_pos = (obj.world_matrix * vert.pos).xyz;
    var vsOut: vsOutput;
    vsOut.position = scene.view * obj.world_matrix * vert.pos;
    vsOut.color = vert.color;
    vsOut.normal = obj.normal_matrix * vert.normal;
    vsOut.surface_to_light = scene.light_pos - world_pos;
    vsOut.surface_to_view = scene.view_pos - world_pos;
    vsOut.material = obj.material;
    vsOut.tc = vert.tc;
    return vsOut;
}

@fragment fn fs(fsIn: vsOutput) -> @location(0) vec4f {
    let material = materials[fsIn.material];
    let normal = normalize(fsIn.normal);
    let surface_to_light = normalize(fsIn.surface_to_light);
    let half_vector = normalize(fsIn.surface_to_light + fsIn.surface_to_view);

    let ambient = scene.ambient;
    let diffuse = max(dot(normal, surface_to_light), 0) * material.diffuse;
    let specular = pow(max(0, dot(normal, half_vector)), material.shininess) * material.specular;
    
    let trgb = textureSample(tex, tex_sampler, fsIn.tc).rgb;
    let color = trgb * (ambient + diffuse + specular);
    return vec4f(color, fsIn.color.a);
}
