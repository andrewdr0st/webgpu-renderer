class Camera {
    constructor(aspectRatio) {
        this.position = [0, 0, 0];
        this.lookTo = [0, 0, -1];
        this.lookAt = [0, 0, 0];
        this.up = [0, 1, 0];
        this.aspectRatio = aspectRatio;
        this.forward;
        this.right;
        this.viewMatrix;
        this.viewProjectionMatrix;
        this.setClipPlanes(0.2, 1000);
        this.setFov(60);
        this.updateLookAt();
    }

    updateLookAt() {
        this.lookTo = vec3.normalize(this.lookTo);
        this.lookAt = vec3.add(this.position, this.lookTo);
        this.right = vec3.normalize(vec3.cross(this.lookTo, this.up));
        this.forward = vec3.normalize(vec3.cross(this.up, this.right));
        const projection = mat4.perspective(this.fov, this.aspectRatio, this.zNear, this.zFar);
        this.viewMatrix = mat4.lookAt(this.position, this.lookAt, this.up);
        this.viewProjectionMatrix = mat4.multiply(projection, this.viewMatrix);
    }

    setFov(theta) {
        this.fov = degToRad(theta);
    }

    setClipPlanes(near, far) {
        this.zNear = near;
        this.zFar = far;
        this.zLen = far - near;
    }

    frustumCorners(near, far) {
        const projection = mat4.perspective(this.fov, this.aspectRatio, this.zNear + this.zLen * near, this.zNear + this.zLen * far);
        const vpMatrix = mat4.multiply(projection, this.viewMatrix);
        const inv = mat4.inverse(vpMatrix);
        let c = [];
        for (let x = -1; x < 2; x += 2) {
            for (let y = -1; y < 2; y += 2) {
                for (let z = 0; z < 2; z++) {
                    let v4 = vec4.transformMat4(new Float32Array([x, y, z, 1]), inv);
                    let v3 = vec3.divScalar([v4[0], v4[1], v4[2]], v4[3]);
                    c.push(v3);
                }
            }
        }
        return c;
    }
}