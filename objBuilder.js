
function fToS(f) {
    return f.toFixed(5).replace(/(?:\.0*|(\.\d+?)0+)$/, "$1");
}

function buildObjFile(positions, textureCoords, normals, faces) {
    let output = "";
    for (let i = 0; i < positions.length; i += 3) {
        output += "v " + fToS(positions[i]) + " " + fToS(positions[i + 1]) + " " + fToS(positions[i + 2]) + "\n";
    }
    for (let i = 0; i < textureCoords.length; i += 2) {
        output += "vt " + fToS(textureCoords[i]) + " " + fToS(textureCoords[i + 1]) + "\n";
    }
    for (let i = 0; i < normals.length; i += 3) {
        output += "vn " + fToS(normals[i]) + " " + fToS(normals[i + 1]) + " " + fToS(normals[i + 2]) + "\n";
    }
    for (let i = 0; i < faces.length; i += 9) {
        output += "f " + faces[i] + "/" + faces[i + 1] + "/" + faces[i + 2] + " " + faces[i + 3] + "/" + faces[i + 4] + "/" + faces[i + 5] + " " + faces[i + 6] + "/" + faces[i + 7] + "/" + faces[i + 8] + "\n";
    }
    console.log(output);
}

function hexRingObj() {
    let positions = [];
    let textureCoords = [];
    let normals = [];
    let faces = [];
    let thickness = 0.1;
    textureCoords.push(0, 0);
    normals.push(0, 1, 0, 0, -1, 0);
    for (let i = 0; i < 6; i++) {
        let theta = (Math.PI * 2 * i) / 6;
        let x1 = Math.cos(theta);
        let x2 = x1 * (1 - thickness);
        let z1 = Math.sin(theta);
        let z2 = z1 * (1 - thickness);
        let y1 = thickness / 2;
        let y2 = -y1;
        positions.push(x1, y1, z1, x1, y2, z1, x2, y2, z2, x2, y1, z2);
    }
    for (let i = 0; i < 6; i++) {
        let theta = (Math.PI * 2 * (i * 2 + 1)) / 12;
        let x = Math.cos(theta);
        let z = Math.sin(theta);
        normals.push(x, 0, z);
    }
    for (let i = 0; i < 5; i++) {
        let v = i * 4 + 1;
        faces.push(v, 1, 1, v + 3, 1, 1, v + 7, 1, 1);
        faces.push(v, 1, 1, v + 7, 1, 1, v + 4, 1, 1);
        faces.push(v + 1, 1, 2, v + 6, 1, 2, v + 2, 1, 2);
        faces.push(v + 1, 1, 2, v + 5, 1, 2, v + 6, 1, 2);
        faces.push(v, 1, i + 3, v + 5, 1, i + 3, v + 1, 1, i + 3);
        faces.push(v, 1, i + 3, v + 4, 1, i + 3, v + 5, 1, i + 3);
        let n = (i + 3) % 6 + 3;
        faces.push(v + 3, 1, n, v + 2, 1, n, v + 6, 1, n);
        faces.push(v + 3, 1, n, v + 6, 1, n, v + 7, 1, n);
    }
    faces.push(21, 1, 1, 24, 1, 1, 4, 1, 1);
    faces.push(21, 1, 1, 4, 1, 1, 1, 1, 1);
    faces.push(22, 1, 2, 3, 1, 2, 23, 1, 2);
    faces.push(22, 1, 2, 2, 1, 2, 3, 1, 2);
    faces.push(21, 1, 8, 2, 1, 8, 22, 1, 8);
    faces.push(21, 1, 8, 1, 1, 8, 2, 1, 8);
    faces.push(24, 1, 3, 23, 1, 3, 3, 1, 3);
    faces.push(24, 1, 3, 3, 1, 3, 4, 1, 3);
    buildObjFile(positions, textureCoords, normals, faces);
}

