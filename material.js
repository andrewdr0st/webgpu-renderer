class Material {
    constructor(diffuse, specular, shininess, samplerId, textureId, textureArray) {
        this.diffuse = diffuse;
        this.specular = specular;
        this.shininess = shininess;
        this.samplerId = samplerId;
        this.textureId = textureId;
        this.textureArray = textureArray;
        this.valuesF = new Float32Array(6);
        this.valuesU = new Uint32Array(this.valuesF.buffer);
        this.updateValues();
    }

    getValues() {
        return this.valuesF;
    }

    updateValues() {
        this.valuesF.set([this.diffuse, this.specular, this.shininess], 0);
        this.valuesU.set([this.samplerId, this.textureId, this.textureArray], 3);
    }
}