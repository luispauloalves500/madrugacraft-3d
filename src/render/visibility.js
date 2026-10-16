// Culling por distância com histerese, sem interferir nas colisões físicas.
// A câmera do Three.js continua responsável pelo frustum culling normal.
export const VISIBILITY_PROFILES = Object.freeze({
    low: Object.freeze({trees:46, rocks:48, shadow:25}),
    medium: Object.freeze({trees:72, rocks:73, shadow:38}),
    high: Object.freeze({trees:108, rocks:108, shadow:58})
});

export function shouldBeVisible(distanceSq, wasVisible, range) {
    const threshold = range + (wasVisible ? 6 : -2);
    return distanceSq <= threshold * threshold;
}

// Separar esta operação do update de física impede alocações e varreduras por frame.
export function createDistanceVisibility({trees, rocks=[]}) {
    let accumulator = Infinity;
    const stats={visibleTrees:0,visibleRocks:0,totalTrees:trees.length,totalRocks:rocks.length};
    function update(position, quality='medium', dt=0, force=false) {
        accumulator += Math.max(0,dt);
        if (!force && accumulator < 0.2) return false;
        accumulator = 0;
        const profile = VISIBILITY_PROFILES[quality] ?? VISIBILITY_PROFILES.medium;
        stats.visibleTrees=0;stats.visibleRocks=0;
        stats.totalTrees=trees.length;stats.totalRocks=rocks.length;
        for (const entry of trees) {
            const dx=entry.position.x-position.x,dz=entry.position.z-position.z;
            const d2=dx*dx+dz*dz;
            entry.visible=shouldBeVisible(d2,entry.visible,profile.trees);
            if (entry.visible) {
                stats.visibleTrees++;
                const shadows=d2 <= profile.shadow*profile.shadow;
                // Sombras dos galhos somente perto do jogador, preservando o modelo.
                if (entry.userData.shadowEnabled!==shadows) {
                    entry.traverse(node=>{if(node.isMesh)node.castShadow=shadows});
                    entry.userData.shadowEnabled=shadows;
                }
            }
        }
        for (const entry of rocks) {
            const dx=entry.position.x-position.x,dz=entry.position.z-position.z;
            const d2=dx*dx+dz*dz;
            entry.visible=shouldBeVisible(d2,entry.visible,profile.rocks);
            entry.castShadow=entry.visible && d2<=profile.shadow*profile.shadow;
            if(entry.visible)stats.visibleRocks++;
        }
        return true;
    }
    return {update,stats};
}
