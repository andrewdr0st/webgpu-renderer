class Scene {
    constructor(camera) {
        this.camera = camera;
        this.lightPosition = new Float32Array([0, 100, 0]);
        this.objectList = [];
        this.numObjects = 0;
        this.numVertices = 0;
        this.numIndices = 0;
    }

    addObject(o) {
        this.objectList.push(o);
        this.numObjects++;
        this.numVertices += o.mesh.vertexCount;
        this.numIndices += o.mesh.indexCount;
    }

    async init() {

    }
}

class TestScene extends Scene {
    async init() {
        this.camera.position = [0, 2.5, -5];

        let planeMesh = new Mesh();
        await planeMesh.parseObjFile("plane.obj");
        let floor = new SceneObject(planeMesh);
        floor.scale = [10, 1, 10];
        this.addObject(floor);

        let cubeMesh = new Mesh();
        await cubeMesh.parseObjFile("testcube.obj");
        let cube = new SceneObject(cubeMesh);
        this.addObject(cube);
    }
}