class SceneObject {
    constructor(mesh) {
        this.mesh = mesh;
        this.position = [0, 0, 0];
        this.scale = [1, 1, 1];
        this.worldMatrix;
        this.normalMatrix;
        this.materialId = 0;
    }

    calculateMatrices() {
        let m = mat4.translation(this.position);
        this.worldMatrix = mat4.scale(m, this.scale);
        let nm = mat3.fromMat4(this.worldMatrix);
        nm = mat3.inverse(nm);
        this.normalMatrix = mat3.transpose(nm);
    }
}