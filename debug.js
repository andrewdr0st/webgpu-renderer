let debugCamera;

function createFrustumVertices(camera, near, far, color) {
    let frustumCorners = camera.frustumCorners(near, far);
    let vertexList = new Float32Array(32);
    let colorList = new Uint8Array(vertexList.buffer);
    for (let i = 0; i < 8; i++) {
        vertexList.set(frustumCorners[i], i * 4);
        colorList.set(color, i * 16 + 12);
    }
    return vertexList;
}

function setupDebugVertexBuffer(scene) {
    let vList = new Float32Array(32 * 2);
    let c = [[64, 0, 0, 64], [0, 64, 0, 64], [0, 0, 64, 64]];
    for (let i = 0; i < scene.shadowMapCount; i++) {
        let v = createFrustumVertices(scene.camera, scene.shadowMapDivisions[i], scene.shadowMapDivisions[i + 1], c[i]);
        vList.set(v, 32 * i);
    }
    /*
    for (let i = 0; i < 8; i++) {
        vList.set(scene.lightCorners[i], 32 + i * 4);
        cList.set([0, 0, 64, 64], 140 + i * 16);
    }
    */
    device.queue.writeBuffer(debugVertexBuffer, 0, vList);
}

function setupDebugCanvas() {
    debugCanvas = new CanvasInfo(0.5, 1.0, 0.5, 0.0);
    debugCanvas.configureContext();
    debugContext = debugCanvas.context;
    debugTexture = debugContext.getCurrentTexture();
    debugCamera = new Camera(debugCanvas.aspectRatio);
    debugCamera.position = [40, 30, 0];
    debugCamera.lookTo = [-1, -0.7, 0];
    debugCamera.setClipPlanes(1, 1000);
    debugCamera.updateLookAt();
    texCanvas = new CanvasInfo(0.5, 0.33, 0.5, 0.67);
    texCanvas.configureContext();
    texContext = texCanvas.context;
}

function runDebugPipeline(encoder, scene) {
    //device.queue.writeBuffer(debugUniformBuffer, 0, scene.lightViewMatrices[0]);
    device.queue.writeBuffer(debugUniformBuffer, 0, debugCamera.viewProjectionMatrix);
    device.queue.writeBuffer(debugUniformBuffer, 64, scene.camera.position);
    device.queue.writeBuffer(debugUniformBuffer, 80, scene.lightViewMatrices[0]);
    device.queue.writeBuffer(debugUniformBuffer, 144, scene.lightDirection);
    device.queue.writeBuffer(debugUniformBuffer, 156, new Float32Array([scene.ambient]));

    renderPassDescriptor.colorAttachments[0].view = debugContext.getCurrentTexture().createView();
    const debugRenderPass = encoder.beginRenderPass(renderPassDescriptor);
    debugRenderPass.setPipeline(renderPipeline);
    debugRenderPass.setVertexBuffer(0, vertexBuffer);
    debugRenderPass.setIndexBuffer(indexBuffer, "uint32");
    debugRenderPass.setBindGroup(0, debugBindGroup);
    debugRenderPass.setBindGroup(1, texturesBindGroup);
    debugRenderPass.drawIndexed(scene.numIndices);
    debugRenderPass.end();

    debugPassDescriptor.colorAttachments[0].view = debugContext.getCurrentTexture().createView();
    const debugPass = encoder.beginRenderPass(debugPassDescriptor);
    debugPass.setPipeline(debugPipeline);
    debugPass.setVertexBuffer(0, debugVertexBuffer);
    debugPass.setIndexBuffer(debugIndexBuffer, "uint32");
    debugPass.setBindGroup(0, debugBindGroup);
    debugPass.drawIndexed(72);
    debugPass.end();

    /*
    texPassDescriptor.colorAttachments[0].view = texContext.getCurrentTexture().createView();
    const texPass = encoder.beginRenderPass(texPassDescriptor);
    texPass.setPipeline(texPipeline);
    texPass.setBindGroup(0, depthTexBindGroup);
    texPass.draw(3);
    texPass.end();
    */
}