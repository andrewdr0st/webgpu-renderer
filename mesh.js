const FLAG1 = 0x80;
const FLAG2 = 0x40;
const FLAG3 = 0x20;
const FLAG4 = 0x10;
const FLAG5 = 0x08;
const FLAG6 = 0x04;
const FLAG7 = 0x02;
const FLAG8 = 0x01;

class Mesh {
    constructor(v, vCount, i, iCount) {
        this.vertices = v;
        this.vertexCount = vCount;
        this.indices = i;
        this.indexCount = iCount;
    }
}

class MeshLoader {
    constructor() {
        this.positions = [];
        this.textureCoords = [];
        this.normals = [];
        this.vertices = [];
        this.vertexCount = 0;
        this.indices = [];
        this.indexCount = 0;
    }

    getMesh() {
        return new Mesh(new Float32Array(this.vertices), this.vertexCount, new Uint32Array(this.indices), this.indexCount);
    }

    async parseObjFile(filename, invert=false) {
        const response = await fetch("meshes/obj/" + filename);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const data = await response.text();
        const lines = data.split("\n");
        const vertexMap = new Map();

        for (let i = 0; i < lines.length; i++) {
            let parts = lines[i].trim().split(/\s+/);
            let type = parts[0];

            if (type == "v") {
                this.positions.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
            } else if (type == "vt") {
                this.textureCoords.push(parseFloat(parts[1]), parseFloat(parts[2]));
            } else if (type == "vn") {
                this.normals.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
            } else if (type == "f") {
                for (let j = 1; j <= 3; j++) {
                    let s = parts[j];
                    let idx = vertexMap.get(s);
                    if (idx == undefined) {
                        let v = parts[j].split("/");
                        let p = (parseInt(v[0]) - 1) * 3;
                        this.vertices.push(this.positions[p], this.positions[p + 1], this.positions[p + 2]);
                        let t = (parseInt(v[1]) - 1) * 2;
                        this.vertices.push(this.textureCoords[t], this.textureCoords[t + 1]);
                        let n = (parseInt(v[2]) - 1) * 3;
                        this.vertices.push(this.normals[n], this.normals[n + 1], this.normals[n + 2]);
                        this.vertices.push(0);
                        idx = this.vertexCount;
                        vertexMap.set(s, idx);
                        this.vertexCount++;
                    }
                    this.indices.push(idx);
                    this.indexCount++;
                }
            }
        }
    }

    async parseSnobFile(filename) {
        const response = await fetch("meshes/snob/" + filename);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        const data = await response.arrayBuffer();
        const byteArray = new Uint8Array(data);
        const signed = (byteArray[5] & FLAG1) != 0;
        const includeNormals = (byteArray[5] & FLAG2) != 0;
        const includeTc = (byteArray[5] & FLAG3) != 0;
        const includeTcBuffer = (byteArray[5] & FLAG4) != 0;
        const includeTris = (byteArray[5] & FLAG5) != 0;
        const includeQuads = (byteArray[5] & FLAG6) != 0;
        const includeRescale = (byteArray[5] & FLAG7) != 0;
        const setCount = (byteArray[8] << 8) | byteArray[9];
        const setArray = signed ? new Int8Array(setCount) : new Uint8Array(setCount);
    }
}