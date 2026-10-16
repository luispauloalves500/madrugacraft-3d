// Materiais e geometrias compartilhados para decoração estática.
// Cada malha pode variar escala e orientação sem alocar buffers novos.
export function createNatureAssets(THREE) {
    const trunkGeometry = new THREE.CylinderGeometry(0.18, 0.28, 2.4, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.95 });
    const leafGeometry = new THREE.ConeGeometry(1, 1, 7);
    const leafMaterials = [0x2e7d32, 0x388e3c, 0x43a047, 0x1b5e20]
        .map(color => new THREE.MeshStandardMaterial({color, roughness: .75}));
    const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
    const rockMaterials = [0x646260,0x73716c,0x817d77,0x595e59]
        .map(color=>new THREE.MeshStandardMaterial({color,roughness:.85,metalness:.05}));
    const bushGeometry = new THREE.SphereGeometry(1, 8, 6);
    const bushMaterials = [0x346d34,0x3e8140,0x4a763a,0x315d34]
        .map(color=>new THREE.MeshStandardMaterial({color,roughness:.8}));
    const stemGeometry = new THREE.CylinderGeometry(.02,.02,.25,4);
    const stemMaterial = new THREE.MeshStandardMaterial({color:0x388e3c});
    const flowerGeometry = new THREE.SphereGeometry(.08,6,6);
    const flowerMaterials=[0xffeb3b,0xff5722,0xe91e63,0x9c27b0,0xffffff]
        .map(color=>new THREE.MeshStandardMaterial({color,emissive:0x333300,emissiveIntensity:.2}));
    return {trunkGeometry,trunkMaterial,leafGeometry,leafMaterials,
        rockGeometry,rockMaterials,bushGeometry,bushMaterials,
        stemGeometry,stemMaterial,flowerGeometry,flowerMaterials};
}
