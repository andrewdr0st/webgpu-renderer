class Camera {
    constructor() {
        this.position = [0, 0, 0];
        this.lookAt = [0, 0, 0];
        this.up = [0, 1, 0];
        this.zNear = 1;
        this.zFar = 200;
        this.fov;
        this.setFov(60);
    }

    viewProjectionMatrix() {
        const projection = mat4.perspective(this.fov, aspectRatio, this.zNear, this.zFar);
        const view = mat4.lookAt(this.position, this.lookAt, this.up);
        return mat4.multiply(projection, view);
    }

    setFov(theta) {
        this.fov = degToRad(theta);
    }

    setClipPlanes(near, far) {
        this.zNear = near;
        this.zFar = far;
    }
}