class Scene {
    constructor(camera) {
        this.camera = camera;
        this.lightPosition = new Float32Array([0, 100, 0]);
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
        this.lightPosition = new Float32Array([100, 100, -30]);
        this.ambient = 0.4;

        this.addMaterial(new Material(0.8, 0.05, 2, 1, 0, 1));
        this.addMaterial(new Material(0.7, 0.7, 50, 0, 1, 0));

        let floor = new SceneObject(this.meshList[0].getMesh());
        floor.scale = [50, 1, 25];
        floor.tileTexture(8, 4);
        floor.materialId = 0;
        this.addObject(floor);

        let floor2 = new SceneObject(this.meshList[0].getMesh());
        floor2.scale = [50, 1, 25];
        floor2.position = [0, 1.25, 49.9];
        floor2.tileTexture(8, 4);
        floor2.rotation = [degToRad(-3), 0, 0];
        floor2.materialId = 0;
        this.addObject(floor2);

        let cube = new SceneObject(this.meshList[1].getMesh());
        cube.position = [0, 0.5, 1];
        cube.scale = [5, 0.5, 3];
        cube.materialId = 1;
        this.addObject(cube);
    }
}