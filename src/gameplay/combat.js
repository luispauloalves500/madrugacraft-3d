// Combate corpo a corpo, especial, dano em inimigos e efeitos temporários.
export function isInAttackArc(playerPosition, playerYaw, target, radius, cosineThreshold) {
    const dx = target.x - playerPosition.x;
    const dz = target.z - playerPosition.z;
    const dist = Math.hypot(dx, dz);
    if (dist > radius || dist < 0.001) return false;
    return (-Math.sin(playerYaw) * dx - Math.cos(playerYaw) * dz) / dist >= cosineThreshold;
}

export function createCombatSystem({THREE,scene,player,enemies,weaponTypes,healthPacks,speedBoosts,particles,
  getGroundHeight,resolveCollision,removeMesh,spawnParticle,gainXP,showToast,sfx,
  spawnEnemy,spawnHealthPack,spawnSpeedBoost,advanceQuestIfReady,updateHUD,
  onBossDefeated,onEnemyKilled,getLevel,getWeaponIndex,getPlayerYaw,isGameActive,isLocked}) {
let attackCooldown=0, specialCooldown=0, attackAnimTimer=0, attackAnimDuration=.2;
const slashEffects=[];
function damageEnemy(enemy, amount, knockback = 0.35) {
    if (!enemies.includes(enemy)) return;
    enemy.hp -= amount;
    enemy.knockback = 0.17;
    if(enemy.type==='boss' && enemy.hp>0 && enemy.hp<=enemy.maxHp*.5 && !enemy.enraged){
        enemy.enraged=true;enemy.speed*=1.28;
        enemy.mesh.material.color.setHex(0xe24629);
        enemy.attackTimer=Math.max(enemy.attackTimer,1.1);
        showToast('⚠ GUARDIÃO EM FÚRIA! Fase 2: novos ataques');
        sfx.boost();
        if(enemies.length<12){spawnEnemy('fast');spawnEnemy('normal');}
    }
    enemy.mesh.material.emissiveIntensity = 0.4;
    spawnParticle(enemy.mesh.position, 0xff6644, 6);
    const dx = enemy.mesh.position.x - player.position.x;
    const dz = enemy.mesh.position.z - player.position.z;
    const length = Math.hypot(dx, dz) || 1;
    const pushed = resolveCollision(enemy.mesh.position.x + dx / length * knockback,
        enemy.mesh.position.z + dz / length * knockback, enemy.size * 0.5);
    enemy.mesh.position.x = pushed.x; enemy.mesh.position.z = pushed.z;
    sfx.hit();
    if (enemy.hp <= 0) {
        const drop = {x: enemy.mesh.position.x, z: enemy.mesh.position.z};
        removeMesh(enemy.mesh);
        enemies.splice(enemies.indexOf(enemy), 1);
        onEnemyKilled();
        gainXP(enemy.type === 'boss' ? 22 : enemy.type === 'tank' ? 5 : enemy.type==='shaman'?4:2);
        if (enemy.type === 'boss') { onBossDefeated(); showToast('🏆 Guardião derrotado! Termine de juntar as peças!'); }
        advanceQuestIfReady();
        if (healthPacks.length < 12 && Math.random() < (enemy.type==='boss'?1:0.18)) spawnHealthPack(drop);
        if (speedBoosts.length < 9 && Math.random() < 0.1) spawnSpeedBoost(drop);
    }
    updateHUD();
}
function spawnSlashArc(selected){
    const halfAngle=Math.PI*selected.arc;
    const effect=new THREE.Group();
    effect.rotation.y=getPlayerYaw();
    effect.position.set(player.position.x,getGroundHeight(player.position.x,player.position.z)+.21,player.position.z);
    const mesh=new THREE.Mesh(new THREE.RingGeometry(selected.range*.72,selected.range*.82,
        28,1,Math.PI*.5-halfAngle,halfAngle*2),
        new THREE.MeshBasicMaterial({color:getWeaponIndex()===2?0x9efae8:0xffdf88,
            transparent:true,opacity:.78,side:THREE.DoubleSide,depthWrite:false}));
    mesh.rotation.x=-Math.PI/2;effect.add(mesh);scene.add(effect);
    slashEffects.push({effect,mesh,life:.24});
}
function doAttack() {
    if (attackCooldown > 0 || !isGameActive() || !isLocked()) return;
    const selected=weaponTypes[getWeaponIndex()];
    attackCooldown = Math.max(0.22, selected.cooldown - (getLevel()-1)*0.012);
    attackAnimDuration = attackAnimTimer = Math.min(.40,selected.cooldown*.78);
    
    sfx.attack();
    spawnSlashArc(selected);
    let hits = 0;
    for (const e of [...enemies]) {
        if (isInAttackArc(player.position, getPlayerYaw(),e.mesh.position, selected.range + e.size * 0.2, Math.cos(Math.PI * selected.arc)) &&
            Math.abs(e.mesh.position.y - player.position.y) < 2.6) {
            damageEnemy(e, selected.damage + Math.floor((getLevel() - 1) / 3)); hits++;
        }
    }
    if (hits) spawnParticle(player.position.clone().add(new THREE.Vector3(0,1,0)),0xffd07b,5);
}
const shockwaves = [];
function doSpecialAttack() {
    if (specialCooldown > 0 || !isGameActive() || !isLocked()) return;
    specialCooldown = Math.max(5, 9 - getLevel() * 0.35);
    attackAnimDuration = attackAnimTimer = 0.48;
    sfx.boost(); sfx.attack();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.83, 1.0, 48), new THREE.MeshBasicMaterial({
        color: 0xffd263, transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide
    }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(player.position); ring.position.y += 0.15;
    scene.add(ring); shockwaves.push({mesh:ring, life:0.40});
    for (const e of [...enemies]) {
        if (Math.hypot(e.mesh.position.x-player.position.x, e.mesh.position.z-player.position.z) < 3.8 + e.size * 0.3) {
            damageEnemy(e, 2 + Math.floor((getLevel()-1)/4), 1.4);
        }
    }
    updateHUD();
}

function update(dt){
    attackCooldown=Math.max(0,attackCooldown-dt);
    specialCooldown=Math.max(0,specialCooldown-dt);
    attackAnimTimer=Math.max(0,attackAnimTimer-dt);
}
function tickEffects(dt){
        for(let i=slashEffects.length-1;i>=0;i--){
            const f=slashEffects[i];f.life-=dt;
            f.mesh.material.opacity=Math.max(0,f.life/.24)*.78;
            f.effect.scale.setScalar(1+(1-f.life/.24)*.12);
            if(f.life<=0){removeMesh(f.effect);slashEffects.splice(i,1);}
        }
        // Partículas e ondas paradas ao abrir o menu de pausa.
        for (let i=particles.length-1;i>=0;i--) {
            const p=particles[i];p.userData.life-=dt*2.2;
            p.position.addScaledVector(p.userData.vel,dt);
            p.userData.vel.y-=9.8*dt;
            p.material.opacity=Math.max(0,p.userData.life);
            if (p.userData.life<=0) {scene.remove(p);p.material.dispose();particles.splice(i,1);}
        }
        for (let i=shockwaves.length-1;i>=0;i--) {
            const effect=shockwaves[i];effect.life-=dt;
            const fraction=1- Math.max(0,effect.life)/0.4;
            effect.mesh.scale.setScalar(1+fraction*3.6);
            effect.mesh.position.y=getGroundHeight(effect.mesh.position.x,effect.mesh.position.z)+0.14;
            effect.mesh.material.opacity=Math.max(0,effect.life/0.4)*0.85;
            if (effect.life<=0){removeMesh(effect.mesh);shockwaves.splice(i,1);}
        }

}
return {attack:doAttack,special:doSpecialAttack,damageEnemy,update,tickEffects,
    get specialCooldown(){return specialCooldown},
    get attackAnimTimer(){return attackAnimTimer},
    get attackAnimDuration(){return attackAnimDuration},
    get isAttacking(){return attackAnimTimer>0}};
}
