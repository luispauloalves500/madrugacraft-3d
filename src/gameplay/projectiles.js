// Projéteis de xamãs e guardião, com atualização e limpeza isoladas.
export function createProjectileSystem({THREE,scene,player,allColliders,isPositionFree,damagePlayer,removeMesh,isGameActive}) {
const projectiles=[];
function throwProjectile(enemy, spread = 0) {
    const origin = enemy.mesh.position.clone(); origin.y += 0.45;
    const direction = player.position.clone().add(new THREE.Vector3(0,1,0)).sub(origin).normalize();
    direction.applyAxisAngle(new THREE.Vector3(0,1,0),spread);
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.23,0),
        new THREE.MeshStandardMaterial({color:0x8b59e8,emissive:0x623ed9,emissiveIntensity:1.25}));
    orb.position.copy(origin);scene.add(orb);
    projectiles.push({mesh:orb, velocity: direction.multiplyScalar(enemy.type==='boss'?11:12),
        age:0, damage:enemy.type==='boss' ? (enemy.enraged?15:12) : enemy.damage});
}
function updateProjectiles(dt) {
    for (let i=projectiles.length-1;i>=0;i--) {
        const p=projectiles[i]; p.age+=dt;
        p.mesh.position.addScaledVector(p.velocity,dt);
        p.mesh.rotation.y+=dt*6;
        const collided = isPositionFree ? !isPositionFree(p.mesh.position.x,p.mesh.position.z,0.16) :
            allColliders.some(c => (c.x-p.mesh.position.x)**2+(c.z-p.mesh.position.z)**2 < (c.radius+0.16)**2);
        const hitPlayer = Math.hypot(player.position.x-p.mesh.position.x,player.position.z-p.mesh.position.z)<0.83 &&
            Math.abs(player.position.y+1-p.mesh.position.y)<1.2;
        if (hitPlayer) damagePlayer(p.damage,p.mesh.position);
        if (p.age>4 || collided || hitPlayer || !isGameActive()) {
            removeMesh(p.mesh);projectiles.splice(i,1);
        }
    }
}
return {throwProjectile, update:updateProjectiles, get count(){return projectiles.length;}};
}
