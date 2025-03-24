

function buildObjFile(positions, textureCoords, normals, faces) {
    let output = "";
    for (let i = 0; i < positions.length; i += 3) {
        output += "v " + positions[i] + " " + positions[i + 1] + " " + positions[i + 2] + "\n";
    }
    for (let i = 0; i < textureCoords.length; i += 2) {
        output += "vt " + textureCoords[i] + " " + textureCoords[i + 1] + "\n";
    }
    for (let i = 0; i < normals.length; i += 3) {
        output += "v " + normals[i] + " " + normals[i + 1] + " " + normals[i + 2] + "\n";
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
        let x1 = cos(theta);
        let x2 = x1 * (1 - thickness);
        let z1 = sin(theta);
        let z2 = z1 * (1 - thickness);
        let y1 = thickness;
        let y2 = -thickness;
        positions.push(x1, y1, z1, x1, y2, z1, x2, y2, z2, x2, y1, z2);
    }
    for (let i = 0; i < 6; i++) {
        let theta = (Math.PI * 2 * (i * 2 + 1)) / 12;
        let x = cos(theta);
        let z = sin(theta);
        normals.push(x, 0, z);
    }
    for (let i = 0; i < 5; i++) {
        let v = i * 4 + 1;
        faces.push(v, 1, 1, v + 3, 1, 1, v + 7, 1, 1);
        faces.push(v, 1, 1, v + 7, 1, 1, v + 4, 1, 1);
        faces.push(v + 1, 1, 2, v + 2, 1, 2, v + 6, 1, 2);
        faces.push(v + 1, 1, 2, v + 6, 1, 2, v + 5, 1, 2);
    }
}

