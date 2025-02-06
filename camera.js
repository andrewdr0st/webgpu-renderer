class Camera {
    constructor() {
        this.position = [0, 0, 0];
        this.lookTo = [0, 0, -1];
        this.lookAt = [0, 0, 0];
        this.up = [0, 1, 0];
        this.forward;
        this.right;
        this.setClipPlanes(1, 1000);
        this.setFov(60);
        this.updateLookAt();
    }

    viewProjectionMatrix() {
        const projection = mat4.perspective(this.fov, aspectRatio, this.zNear, this.zFar);
        const view = mat4.lookAt(this.position, this.lookAt, this.up);
        return mat4.multiply(projection, view);
    }

    updateLookAt() {
        this.lookTo = vec3.normalize(this.lookTo);
        //this.lookAt = vec3.add(this.position, this.lookTo);
        this.right = vec3.normalize(vec3.cross(this.lookTo, this.up));
        this.forward = vec3.normalize(vec3.cross(this.up, this.right));
    }

    setFov(theta) {
        this.fov = degToRad(theta);
    }

    setClipPlanes(near, far) {
        this.zNear = near;
        this.zFar = far;
    }
}