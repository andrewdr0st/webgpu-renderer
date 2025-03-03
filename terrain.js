function createTerrainMesh() {
    let vertices = [];
    let indices = [];
    for (let i = 0; i < 10; i += 2) {
        vertices.push(i * 0.5, 0.0, 0.0, i * 0.5, 1.0, 0.0);
        layer.push(i + 1, i + 2, i + 4, i + 1, i + 4, i + 3);
    }
}