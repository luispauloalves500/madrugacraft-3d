// Ajustes por perfil para GitHub Pages e hardware modesto.
export function applyGraphicsSettings(THREE, graphicsQuality, renderer, scene, sun) {
    if (graphicsQuality === 'low') {
        renderer.setPixelRatio(1);
        renderer.shadowMap.enabled = false;
        scene.fog.density = 0.012;
    } else if (graphicsQuality === 'medium') {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        sun.shadow.mapSize.set(1024, 1024);
        scene.fog.density = 0.008;
    } else { // high
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        sun.shadow.mapSize.set(2048, 2048);
        scene.fog.density = 0.006;
    }
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    sun.shadow.needsUpdate = true;
    // Recompile materiais após mudar shadowMap em tempo de execução.
    scene.traverse(obj => { if (obj.material) {
        for (const mat of (Array.isArray(obj.material)?obj.material:[obj.material])) mat.needsUpdate=true;
    }});
}
