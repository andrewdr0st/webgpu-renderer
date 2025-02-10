class Material {
    constructor(diffuse, specular, shininess) {
        this.diffuse = diffuse;
        this.specular = specular;
        this.shininess = shininess;
    }

    getValues() {
        return new Float32Array([this.diffuse, this.specular, this.shininess]);
    }
}