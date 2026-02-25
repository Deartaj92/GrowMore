// Script to generate simple GLB models for FluidGlass
const THREE = require('three');
const { GLTFExporter } = require('three/examples/jsm/exporters/GLTFExporter.js');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'public', 'assets', '3d');

function exportGLB(scene, filename) {
    return new Promise((resolve, reject) => {
        const exporter = new GLTFExporter();
        exporter.parse(scene, (result) => {
            const buffer = Buffer.from(result);
            fs.writeFileSync(path.join(outputDir, filename), buffer);
            console.log(`Created ${filename}`);
            resolve();
        }, (error) => reject(error), { binary: true });
    });
}

async function generateModels() {
    // Bar model - wide flat box
    const barScene = new THREE.Scene();
    const barGeo = new THREE.BoxGeometry(12, 0.8, 0.3, 32, 8, 4);
    const barMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const barMesh = new THREE.Mesh(barGeo, barMat);
    barMesh.name = 'Cube';
    barScene.add(barMesh);
    await exportGLB(barScene, 'bar.glb');

    // Lens model - cylinder/disc
    const lensScene = new THREE.Scene();
    const lensGeo = new THREE.CylinderGeometry(1, 1, 0.1, 64);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const lensMesh = new THREE.Mesh(lensGeo, lensMat);
    lensMesh.name = 'Cylinder';
    lensScene.add(lensMesh);
    await exportGLB(lensScene, 'lens.glb');

    // Cube model
    const cubeScene = new THREE.Scene();
    const cubeGeo = new THREE.BoxGeometry(1, 1, 1, 8, 8, 8);
    const cubeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
    cubeMesh.name = 'Cube';
    cubeScene.add(cubeMesh);
    await exportGLB(cubeScene, 'cube.glb');

    console.log('All models generated!');
}

generateModels().catch(console.error);
