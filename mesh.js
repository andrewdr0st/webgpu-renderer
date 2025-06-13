const FLAG1 = 0x80;
const FLAG2 = 0x40;
const FLAG3 = 0x20;
const FLAG4 = 0x10;
const FLAG5 = 0x08;
const FLAG6 = 0x04;
const FLAG7 = 0x02;
const FLAG8 = 0x01;
const SINTM = 0.00787401574;
const UINTM = 0.00392156862;

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
        const setCompress = (byteArray[6] & FLAG1) != 0;
        const vertexCompress = (byteArray[6] & FLAG2) != 0;
        const triCompress = (byteArray[6] & FLAG3) != 0;
        const quadCompress = (byteArray[6] & FLAG4) != 0;
        const normalCompress = (byteArray[6] & FLAG5) != 0;
        const tcCompress = (byteArray[6] & FLAG6) != 0;
        let offset = 8;
        //set count and vertex count are 2 bytes, or 1 if compress flag is enabled
        const setCount = setCompress ? (byteArray[offset++] << 8) | byteArray[offset++] : byteArray[offset++];
        const vertexCount = vertexCompress ? (byteArray[offset++] << 8) | byteArray[offset++] : byteArray[offset++];
        //only read tri count or quad count if they are included
        const triCount = includeTris * (triCompress ? (byteArray[offset++] << 8) | byteArray[offset++] : byteArray[offset++]);
        const quadCount = includeQuads * (quadCompress ? (byteArray[offset++] << 8) | byteArray[offset++] : byteArray[offset++]);
        const vertexSize = 1 + vertexCompress + includeNormals * (1 + normalCompress) + includeTc * (1 + tcCompress);
        const setArray = signed ? new Int8Array(data, offset, setCount * 3) : new Uint8Array(setCount, offset, setCount * 3);
        offset += setCount * 3;
        const vertexArray = new Uint8Array(data, offset, vertexCount * vertexSize);
        offset += vertexCount * vertexSize;
        const triArray = new Uint16Array(data, offset, triCount * 3);
        offset += triCount * 3 * includeTris;
        const vertexBuffer = new Float32Array(vertexCount * 8);
        const indexBuffer = new Uint32Array(triCount * 3);
        for (let i = 0; i < vertexCount; i++) {
            let offset = i * 8;
            let vOffset = i * vertexSize;
            let pIdx = vertexArray[vOffset] * 3;
            let nIdx = vertexArray[vOffset + 1] * 3;
            let tIdx = vertexArray[vOffset + 2] * 3;
            vertexBuffer.set(setArray[pIdx] * SINTM, offset);
            vertexBuffer.set(setArray[pIdx + 1] * SINTM, offset + 1);
            vertexBuffer.set(setArray[pIdx + 2] * SINTM, offset + 2);
            vertexBuffer.set(setArray[nIdx] * SINTM, offset + 3);
            vertexBuffer.set(setArray[nIdx + 1] * SINTM, offset + 4);
            vertexBuffer.set(setArray[nIdx + 2] * SINTM, offset + 5);
            vertexBuffer.set(setArray[tIdx] * SINTM, offset + 6);
            vertexBuffer.set(setArray[tIdx + 1] * SINTM, offset + 7);
        }
        indexBuffer.set(triArray);
    }
}