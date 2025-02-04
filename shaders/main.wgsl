
struct matrix {
    world: mat4x4f,
    view: mat4x4f,
    normal_matrix: mat3x3f,
    light_pos: vec3f,
    view_pos: vec3f
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
    @location(1) normal: vec3f,
    @location(2) surface_to_light: vec3f,
    @location(3) surface_to_view: vec3f
};

@group(0) @binding(0) var<uniform> m: matrix;

@vertex fn vs(vert: vertex) -> vsOutput {
    let world_pos = (m.world * vert.pos).xyz;
    var vsOut: vsOutput;
    vsOut.position = m.view * m.world * vert.pos;
    vsOut.color = vert.color;
    vsOut.normal = m.normal_matrix * vert.normal;
    vsOut.surface_to_light = m.light_pos - world_pos;
    vsOut.surface_to_view = m.view_pos - world_pos;
    return vsOut;
}

@fragment fn fs(fsIn: vsOutput) -> @location(0) vec4f {
    let normal = normalize(fsIn.normal);
    let surface_to_light = normalize(fsIn.surface_to_light);
    let half_vector = normalize(fsIn.surface_to_light + fsIn.surface_to_view);
    var specular = dot(normal, half_vector);
    specular = select(0.0, pow(specular, 5), specular > 0.0);
    let light = max(dot(normal, surface_to_light), 0);
    let color = fsIn.color.rgb * (light + 0.1) + specular * 0.3;
    return vec4f(color, fsIn.color.a);
}
