let canvasList = [];
let scalingFactor = 1;

class canvasInfo {
    constructor(w, h, x, y, applyScaling = false) {
        this.canvas = document.createElement("canvas");
        document.body.appendChild(this.canvas);
        this.context = this.canvas.getContext("webgpu");
        this.w = Math.floor(w * window.innerWidth);
        this.h = Math.floor(h * window.innerHeight);
        this.canvas.width = this.w;
        this.canvas.height = this.h;
        if (applyScaling) {
            this.w = Math.ceil(this.w / scalingFactor);
            this.h = Math.ceil(this.h / scalingFactor);
            this.canvas.style.width = this.w * scalingFactor + "px";
            this.canvas.style.height = this.h * scalingFactor + "px";
        }
        this.aspectRatio = this.w / this.h;
        this.canvas.style.left = x * 100 + "%";
        this.canvas.style.top = y * 100 + "%";
    }

    configureContext(alphaMode = "premultiplied") {
        this.context.configure({
            device,
            format: presentationFormat,
            alphaMode
        });
    }
}
