
class Mesh {
    constructor() {
        let vertices = [];
        let indices = [];
        let textureCoords = [];
        let normals = [];
    }

    async parseObjFile(filename, invert=false) {
        const response = await fetch("objects/obj" + filename);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
    }
}