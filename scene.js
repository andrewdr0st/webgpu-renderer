class Scene {
    constructor(camera) {
        this.camera = camera;
        this.lightPosition = new Float32Array([0, 100, 0]);
        this.lightDirection = new Float32Array([-0.25, -1, 0.5]);
        this.lightViewMatrices = [null, null, null];
        this.shadowMapCount = 3;
        this.shadowMapDivisions = [0, 0.1, 0.4, 1];
        this.depthList = new Float32Array(3);
        this.lightCorners = [null, null, null, null, null, null, null, null];
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
            let frustumCorners = this.camera.frustumCorners(this.shadowMapDivisions[j], this.shadowMapDivisions[j + 1]);
            let center = [0, 0, 0];
            for (let i = 0; i < 8; i++) {
                center = vec3.add(center, frustumCorners[i]);
            }
            center = vec3.scale(center, 0.125);
            let lightView = mat4.lookAt(vec3.add(center, this.lightDirection), center, [0, 1, 0]);
            for (let i = 0; i < 8; i++) {
                let c = frustumCorners[i];
                let v4 = [c[0], c[1], c[2], 1];
                frustumCorners[i] = vec4.transformMat4(v4, lightView);
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
            maxZ += 20;
            minZ -= 20;
            maxX += 5;
            minX -= 5;
            let minmax = [minX, maxX, minY, maxY, minZ, maxZ];
            let inv = mat4.inverse(lightView);
            for (let x = 0; x < 2; x++) {
                for (let y = 0; y < 2; y++) {
                    for (let z = 0; z < 2; z++) {
                        let c = new Float32Array([minmax[x], minmax[y + 2], minmax[z + 4], 1]);
                        c = vec4.transformMat4(c, inv);
                        this.lightCorners[x * 4 + y * 2 + z] = c;
                    }
                }
            }
            let lightProj = mat4.ortho(minX, maxX, minY, maxY, minZ, maxZ);
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

    update() {

    }
}

class TestScene extends Scene {
    async init() {
        await this.addMeshes(["plane.obj", "testcube.obj", "hexring.obj"]);

        this.camera.position = [0, 2.5, -5];
        this.camera.setClipPlanes(0.2, 100);
        for (let i = 0; i < this.shadowMapCount; i++) {
            this.depthList.set([this.camera.zNear + this.camera.zLen * this.shadowMapDivisions[i + 1]], i);
        }
        this.camera.updateLookAt();
        this.lightPosition = new Float32Array([100, 100, -30]);
        this.lightDirection = vec3.normalize(vec3.negate(this.lightDirection));

        this.ambient = 0.3;

        this.addMaterial(new Material(0.8, 0.05, 2, 1, 0, 1));
        this.addMaterial(new Material(0.7, 0.7, 50, 0, 1, 0));
        this.addMaterial(new Material(0.4, 0.9, 100, 0, 1, 0));
        this.addMaterial(new Material(0.8, 0.5, 20, 0, 2, 0));

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

        let ring = new SceneObject(this.meshList[2].getMesh());
        ring.position = [5, 5, 5];
        ring.scale = [3, 3, 3];
        ring.materialId = 2;
        this.addObject(ring);

        this.ringTheta = 0;
        this.ringThetaV = 0.1;

        let board = new SceneObject(this.meshList[0].getMesh());
        board.position = [20, 3, 0];
        board.scale = [2, 1, 0.5];
        board.rotation = [0, 0, degToRad(90)];
        board.materialId = 3;
        this.addObject(board);
    }

    update(deltaTime) {
        this.ringTheta += this.ringThetaV * deltaTime;
        this.objectList[3].rotation = [0, 0, this.ringTheta];

        let b = vec3.normalize(vec3.subtract(this.camera.position, [20, 3, 0]));
        let theta = Math.atan2(-b[2], b[0]) + Math.PI;
        this.objectList[4].rotation[1] = theta;
    }
}