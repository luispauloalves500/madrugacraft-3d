// Terreno procedural criado uma vez; sem arquivos de textura externos.
export function createTerrain(THREE, scene, getGroundHeight) {
    // Textura procedural: não depende de servidor externo e nunca fica faltando.
    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = grassCanvas.height = 128;
    const grassCtx = grassCanvas.getContext('2d');
    grassCtx.fillStyle = '#7d9d58'; grassCtx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 3500; i++) {
        const shade = Math.floor(40 + Math.random() * 70);
        grassCtx.fillStyle = `rgba(${shade},${120 + shade},${35 + Math.floor(shade * 0.4)},0.18)`;
        grassCtx.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 2 + Math.random() * 4);
    }
    const grassTexture = new THREE.CanvasTexture(grassCanvas);
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(32, 32);
    grassTexture.colorSpace = THREE.SRGBColorSpace;
    grassTexture.anisotropy = 16;

    const groundGeo = new THREE.PlaneGeometry(240, 240, 60, 60);
    const groundMat = new THREE.MeshStandardMaterial({ 
        map: grassTexture,
        color: 0xa5d6a7,
        roughness: 0.78,
        metalness: 0.0
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    const posAttr = ground.geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
        // Plano XY rotacionado -90°: X local->X mundial, Y local->-Z,
        // Z local->altura mundial. Alterar Y deformava a posição horizontal!
        const x = posAttr.getX(i), z = -posAttr.getY(i);
        posAttr.setZ(i, Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.6 + Math.sin(x * 0.3) * 0.15);
    }
    ground.geometry.computeVertexNormals();
    scene.add(ground);

    return ground;
}
