[[group(0), binding(0)]] var gridSampler: sampler;
[[group(0), binding(1)]] var gridTexture: texture_2d<f32>;

[[block]] struct DataBuffer {
    data: array<u32>;
};
[[group(0), binding(0)]] var<storage_buffer> myData: DataBuffer;

[[stage(fragment)]]
fn main([[builtin(frag_coord)]] fragCoord: vec4<f32>) -> [[location(0)]] vec4<f32> {
    let coord = fragCoord.xy;
    let currentState = textureSample(gridTexture, gridSampler, coord);

    // ... Wireworld logic similar to the GLSL version ...

    return nextState;
}
