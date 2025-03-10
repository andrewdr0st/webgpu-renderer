
const TWO_PI: f32 = 6.28318530718;

@group(0) @binding(0) var tex: texture_storage_2d<r32float, write>;

@compute @workgroup_size(8, 8, 1) fn perlinNoise(@builtin(global_invocation_id) g_id: vec3u, @builtin(workgroup_id) w_id: vec3u, @builtin(local_invocation_id) l_id: vec3u) {
    let pos = vec2f(f32(l_id.x), f32(l_id.y)) * 0.125 + vec2f(0.0625, 0.0625);
    let hash00 = wangHash(w_id.x, w_id.y) * TWO_PI;
    let hash01 = wangHash(w_id.x, w_id.y + 1) * TWO_PI;
    let hash10 = wangHash(w_id.x + 1, w_id.y) * TWO_PI;
    let hash11 = wangHash(w_id.x + 1, w_id.y + 1) * TWO_PI;
    let v00 = vec2f(cos(hash00), sin(hash00));
    let v01 = vec2f(cos(hash01), sin(hash01));
    let v10 = vec2f(cos(hash10), sin(hash10));
    let v11 = vec2f(cos(hash11), sin(hash11));
    let d00 = dot(v00, vec2f(0.0, 0.0) - pos);
    let d01 = dot(v01, vec2f(0.0, 1.0) - pos);
    let d10 = dot(v10, vec2f(1.0, 0.0) - pos);
    let d11 = dot(v11, vec2f(1.0, 1.0) - pos);
    let u = smoothstep(pos.x);
    let v = smoothstep(pos.y);
    let xlerp1 = mix(d00, d10, u);
    let xlerp2 = mix(d01, d11, u);
    let lerp = mix(xlerp1, xlerp2, v);
    textureStore(tex, g_id.xy, vec4f(lerp * 0.5 + 0.5, 0.0, 0.0, 1.0));
}

fn wangHash(x: u32, y: u32) -> f32 {
    var seed: u32 = x * 1664525u + y * 1013904223u;
    seed ^= (seed >> 16u);
    seed *= 2246822519u;
    seed ^= (seed >> 13u);
    seed *= 3266489917u;
    seed ^= (seed >> 16u);
    return f32(seed) / f32(0x10000000);
}

fn smoothstep(t: f32) -> f32 {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

