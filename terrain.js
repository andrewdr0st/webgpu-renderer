function createTerrainMesh(count, initialWidth) {
    let vertices = new Float32Array(624 * count);
    let colors = new Uint8Array(vertices.buffer);
    let indices = new Uint32Array(890 * count + 150 * (count - 1));

    
}

/**
 * 
 * @param {Float32Array} vertices vertex array
 * @param {Uint32Array} indices index array
 * @param {Int} vIdx current index of vertex array
 * @param {Int} iIdx current index of index array
 * @param {Int} len square count
 * @param {Float} w square width in units
 */
function createTerrainBand(vertices, indices, vIdx, iIdx, len, w) {

}
