class Scene {
    constructor(camera) {
        this.camera = camera;
        this.lightPosition = new Float32Array([0, 100, 0]);
        this.lightDirection = new Float32Array([-0.25, -1, 0.5]);
        this.lightViewMatrices = [null, null, null];
        this.shadowMapCount = 1;
        this.shadowMapDivisions = [0, 1, 0.4, 1];
        this.minmax = [0, 0, 0, 0, 0, 0];
        this.ambient = 0.25;
        this.meshList = [];
        this.numMeshes = 0;
        this.objectList = [];
        this.numObjects = 0;
        this.numVertices = 0;
        this.numIndices = 0;
        this.materialList = [];
        this.numMaterials = 0;
    }

    addObject(o) {
        this.objectList.push(o);
        this.numObjects++;
        this.numVertices += o.mesh.vertexCount;
        this.numIndices += o.mesh.indexCount;
    }

    addMaterial(m) {
        this.materialList.push(m);
        this.numMaterials++;
    }

    updateLightViewMatrices() {
        for (let j = 0; j < this.shadowMapCount; j++) {
            let lightView = mat4.lookAt(vec3.scale(this.lightDirection, 5), [0, 0, 0], [0, 1, 0]);
            let frustumCorners = this.camera.frustumCorners([this.shadowMapDivisions[j], this.shadowMapDivisions[j + 1]]);
            for (let i = 0; i < 8; i++) {
                let c = frustumCorners[i];
                let v4 = [c[0], c[1], c[2], 1];
                //frustumCorners[i] = vec4.transformMat4(v4, lightView);
            }
            let minX = frustumCorners[0][0];
            let maxX = frustumCorners[0][0];
            let minY = frustumCorners[0][1];
            let maxY = frustumCorners[0][1];
            let minZ = frustumCorners[0][2];
            let maxZ = frustumCorners[0][2];
            for (let i = 1; i < 8; i++) {
                let c = frustumCorners[i];
                minX = Math.min(minX, c[0]);
                maxX = Math.max(maxX, c[0]);
                minY = Math.min(minY, c[1]);
                maxY = Math.max(maxY, c[1]);
                minZ = Math.min(minZ, c[2]);
                maxZ = Math.max(maxZ, c[2]);
            }
            this.minmax = [minX, maxX, minY, maxY, minZ, maxZ];
            let lightProj = mat4.ortho(minX, maxX, minY, maxY, -maxZ, -minZ);
            this.lightViewMatrices[j] = mat4.multiply(lightProj, lightView);
        }
    }

    async addMeshes(paths) {
        let promises = [];
        for(let i = 0; i < paths.length; i++) {
            let m = new MeshLoader();
            promises.push(m.parseObjFile(paths[i]));
            this.meshList.push(m);
        }
        await Promise.all(promises);
    }

    async init() {

    }
}

class TestScene extends Scene {
    async init() {
        await this.addMeshes(["plane.obj", "testcube.obj"]);

        this.camera.position = [0, 2.5, -5];
        this.camera.setClipPlanes(0.2, 20);
        this.camera.updateLookAt();
        this.lightPosition = new Float32Array([100, 100, -30]);
        this.lightDirection = vec3.normalize(vec3.negate(this.lightDirection));

        this.ambient = 0.3;

        this.addMaterial(new Material(0.8, 0.05, 2, 1, 0, 1));
        this.addMaterial(new Material(0.7, 0.7, 50, 0, 1, 0));

        let floor = new SceneObject(this.meshList[0].getMesh());
        floor.scale = [50, 1, 25];
        floor.tileTexture(8, 4);
        floor.materialId = 0;
        this.addObject(floor);

        let cube = new SceneObject(this.meshList[1].getMesh());
        cube.position = [0, 0.5, 1];
        cube.scale = [5, 0.5, 3];
        cube.materialId = 1;
        this.addObject(cube);

        let wall = new SceneObject(this.meshList[1].getMesh());
        wall.position = [-10, 6, -13];
        wall.scale = [15, 6, 0.5];
        wall.materialId = 1;
        this.addObject(wall);
    }
}