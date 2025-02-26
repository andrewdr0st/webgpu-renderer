class SceneObject {
    constructor(mesh) {
        this.mesh = mesh;
        this.position = [0, 0, 0];
        this.rotation = [0, 0, 0];
        this.scale = [1, 1, 1];
        this.worldMatrix;
        this.normalMatrix;
        this.materialId = 0;
    }

    calculateMatrices() {
        let m = mat4.translation(this.position);
        let mx = mat4.rotateX(m, this.rotation[0]);
        let my = mat4.rotateY(mx, this.rotation[1]);
        let mz = mat4.rotateZ(my, this.rotation[2]);
        this.worldMatrix = mat4.scale(mz, this.scale);
        let nm = mat3.fromMat4(this.worldMatrix);
        nm = mat3.inverse(nm);
        this.normalMatrix = mat3.transpose(nm);
    }

    tileTexture(x, y) {
        for (let i = 0; i < this.mesh.vertexCount; i++) {
            let offset = i * 9 + 3;
            this.mesh.vertices[offset] *= x;
            this.mesh.vertices[offset + 1] *= y;
        }
    }
}