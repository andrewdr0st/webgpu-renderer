let lastFrameTime = 0;

let inputMap = [0, 0, 0, 0];

let cameraSensitivity = 0.005;
let cameraTheta = 0;
let cameraPhi = 0;
let cameraPhiBound = Math.PI * 0.475;
let cameraSpeed = 5;
let cameraForwardVelocity = 0;
let cameraRightVelocity = 0;

let cubeTheta = 0;
let cubeVelocity = -0.3;

let camera = new Camera();
let scene = new Scene(camera);

async function init() {
    await setupGPUDevice();
    setupCanvas();
    await setupRenderPipeline();
    await setupBuffers();
    requestAnimationFrame(main);
}

function main(currentTime) {
    const deltaTime = (currentTime - lastFrameTime) * 0.001;
    lastFrameTime = currentTime;
    cubeTheta += cubeVelocity * deltaTime;
    cameraForwardVelocity = inputMap[0] - inputMap[1];
    cameraRightVelocity = inputMap[3] - inputMap[2];
    camera.lookTo = [Math.sin(cameraTheta) * Math.cos(cameraPhi), Math.sin(cameraPhi), Math.cos(cameraTheta) * Math.cos(cameraPhi)];
    camera.updateLookAt();
    let fVec = vec3.scale(camera.forward, cameraForwardVelocity);
    let rVec = vec3.scale(camera.right, cameraRightVelocity);
    let moveVec = vec3.normalize(vec3.add(fVec, rVec));
    camera.position = vec3.add(camera.position, vec3.scale(moveVec, deltaTime * cameraSpeed));
    render(scene);
    requestAnimationFrame(main);
}

canvas.onclick = () => {
    canvas.requestPointerLock();
}

document.addEventListener("keydown", (e) => {
    if (e.key == 'w') {
        inputMap[0] = 1;
    } else if (e.key == 's') {
        inputMap[1] = 1;
    } else if (e.key == 'a') {
        inputMap[2] = 1;
    } else if (e.key == 'd') {
        inputMap[3] = 1;
    }
});

document.addEventListener("keyup", (e) => {
    if (e.key == 'w') {
        inputMap[0] = 0;
    } else if (e.key == 's') {
        inputMap[1] = 0;
    } else if (e.key == 'a') {
        inputMap[2] = 0;
    } else if (e.key == 'd') {
        inputMap[3] = 0;
    }
});

document.addEventListener("mousemove", (e) => {
    let deltaTheta = -e.movementX * cameraSensitivity;
    cameraTheta += deltaTheta;
    if (cameraTheta < -Math.PI) {
        cameraTheta += Math.PI * 2;
    } else if (cameraTheta > Math.PI) {
        cameraTheta -= Math.PI * 2;
    }
    let deltaPhi = -e.movementY * cameraSensitivity;
    cameraPhi += deltaPhi;
    cameraPhi = Math.min(Math.max(cameraPhi, -cameraPhiBound), cameraPhiBound);
});

init();
