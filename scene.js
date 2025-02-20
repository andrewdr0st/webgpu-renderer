class Scene {
    constructor(camera) {
        this.camera = camera;
        this.lightPosition = new Float32Array([0, 100, 0]);
        this.ambient = 0.25;
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

    async init() {

    }
}

class TestScene extends Scene {
    async init() {
        this.camera.position = [0, 2.5, -5];
        this.lightPosition = new Float32Array([100, 100, -30]);
        this.ambient = 0.4;

        this.addMaterial(new Material(0.8, 0.05, 2, 1, 0, 1));
        this.addMaterial(new Material(0.7, 0.7, 50, 0, 1, 0));

        let planeMesh = new Mesh();
        let planeMeshBruh = new Mesh();
        await planeMeshBruh.parseObjFile("plane.obj");
        await planeMesh.parseObjFile("plane.obj");
        let floor = new SceneObject(planeMesh);
        floor.scale = [50, 1, 25];
        floor.tileTexture(8, 4);
        floor.materialId = 0;
        this.addObject(floor);

        let floor2 = new SceneObject(planeMeshBruh);
        floor2.scale = [50, 1, 25];
        floor2.position = [0, 1.25, 49.9];
        floor2.tileTexture(8, 4);
        floor2.rotation = [degToRad(-3), 0, 0];
        floor2.materialId = 0;
        this.addObject(floor2);


        let cubeMesh = new Mesh();
        await cubeMesh.parseObjFile("testcube.obj");
        let cube = new SceneObject(cubeMesh);
        cube.position = [0, 0.5, 1];
        cube.scale = [5, 0.5, 3];
        cube.materialId = 1;
        this.addObject(cube);
    }
}