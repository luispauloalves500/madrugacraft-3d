// Minimapa de baixo custo, sem acesso ao motor 3D.
export function createMinimap(canvas, getState) {
    const minimap = canvas;
    const mmCtx = minimap.getContext('2d');
    minimap.width = 140; minimap.height = 140;
    if (!mmCtx) return () => {};
    return function drawMinimap() {
        const {player,treeColliders,rockColliders,collectibles,healthPacks,speedBoosts,enemies,shrinePosition,playerYaw} = getState();
        const w = minimap.width, center = w / 2, scale = 1.2;
        mmCtx.clearRect(0, 0, w, w);
        mmCtx.fillStyle = '#173522'; mmCtx.fillRect(0, 0, w, w);
        const dot = (x,z,color,radius) => {
            const px = center + (x-player.position.x) * scale;
            const py = center + (z-player.position.z) * scale;
            if (px < 3 || py < 3 || px > w-3 || py > w-3) return;
            mmCtx.fillStyle = color; mmCtx.beginPath(); mmCtx.arc(px,py,radius,0,Math.PI*2); mmCtx.fill();
        };
        treeColliders.forEach(t => dot(t.x,t.z,'#315536',2));
        rockColliders.forEach(t => dot(t.x,t.z,'#617065',2));
        collectibles.forEach(c => dot(c.position.x,c.position.z,'#ffd46d',3));
        healthPacks.forEach(c => dot(c.position.x,c.position.z,'#51ef92',2.5));
        speedBoosts.forEach(c => dot(c.position.x,c.position.z,'#30ccff',2.5));
        enemies.forEach(e => dot(e.mesh.position.x,e.mesh.position.z,e.type==='boss'?'#ffda44':e.type==='shaman'?'#b883ff':'#ff7661',e.type==='boss'?5:3));
        dot(-4,-5,'#ffffff',3);
        dot(shrinePosition.x,shrinePosition.z,'#8affdb',4);
        mmCtx.save(); mmCtx.translate(center,center); mmCtx.rotate(-playerYaw);
        mmCtx.fillStyle = '#e1f1ff'; mmCtx.beginPath(); mmCtx.moveTo(0,-8); mmCtx.lineTo(-5,6); mmCtx.lineTo(5,6); mmCtx.closePath(); mmCtx.fill(); mmCtx.restore();
        mmCtx.fillStyle='#d1dfd1';mmCtx.font='bold 12px sans-serif';mmCtx.fillText('N',w-16,14);
        mmCtx.strokeStyle='rgba(240,246,236,.25)'; mmCtx.strokeRect(1,1,w-2,w-2);
    }
}
