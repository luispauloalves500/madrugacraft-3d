// Atualização de IA independente da renderização e dos controles.
export function createEnemyAI({enemies,player,getGroundHeight,resolveCollision,
  showBossTelegraph,hideBossTelegraph,damagePlayer,spawnParticle,throwProjectile,sfx,isGameActive}) {
function update(dt,elapsed){
        // IA por tipo: melee perseguidor, xamã de longo alcance e chefe com aviso de ataque.
        for (const enemy of enemies) {
            if (!isGameActive()) break;
            const mesh=enemy.mesh;
            const dx=player.position.x-mesh.position.x, dz=player.position.z-mesh.position.z;
            const dist=Math.hypot(dx,dz);
            enemy.attackTimer=Math.max(0,enemy.attackTimer-dt);
            enemy.knockback=Math.max(0,enemy.knockback-dt);
            const shaman=enemy.type==='shaman', boss=enemy.type==='boss';
            const meleeRadius=boss?2.65:1.85;
            const wantsToMove=shaman?dist>9.5:boss?dist>4.1:dist>meleeRadius*.8;
            if (wantsToMove && dist<52 && enemy.knockback===0 && enemy.windup===0) {
                const nx=dx/(dist||1),nz=dz/(dist||1);
                // Guardião contorna o alvo ao se aproximar: mais de uma rota.
                const orbit=boss && dist<12?enemy.strafe*(enemy.enraged?.48:.27):0;
                const steerX=nx-orbit*nz,steerZ=nz+orbit*nx;
                const steerLength=Math.hypot(steerX,steerZ)||1;
                let next=resolveCollision(mesh.position.x+steerX/steerLength*enemy.speed*dt,
                    mesh.position.z+steerZ/steerLength*enemy.speed*dt,enemy.size*0.48);
                if (Math.hypot(next.x-mesh.position.x,next.z-mesh.position.z)<enemy.speed*dt*0.16) {
                    const sign=mesh.id%2===0?1:-1;
                    next=resolveCollision(mesh.position.x-sign*nz*enemy.speed*dt,
                        mesh.position.z+sign*nx*enemy.speed*dt,enemy.size*0.48);
                }
                mesh.position.x=next.x;mesh.position.z=next.z;
            }
            mesh.position.y=getGroundHeight(mesh.position.x,mesh.position.z)+enemy.size/2+
                (dist<52?Math.sin(elapsed*(boss?3.2:6.2)+mesh.id)*0.035:0);
            mesh.scale.y=1+Math.sin(elapsed*(boss?3.2:7.4)+mesh.id)*(boss?.024:.055);
            mesh.rotation.z=Math.sin(elapsed*(boss?2.2:4.1)+mesh.id)*(boss?.018:.048);
            if (dist<52) mesh.lookAt(player.position.x,mesh.position.y,player.position.z);
            if (boss && enemy.windup>0) {
                enemy.windup=Math.max(0,enemy.windup-dt);
                showBossTelegraph(enemy);
                mesh.material.emissiveIntensity=.52+Math.sin(elapsed*24)*.35;
                if (enemy.windup===0) {
                    hideBossTelegraph();
                    // Golpe pega apenas alvos ainda dentro da área AVISADA.
                    const impactRadius=enemy.enraged?4.3:3.7;
                    if (Math.hypot(player.position.x-mesh.position.x,player.position.z-mesh.position.z)<impactRadius &&
                        Math.abs(player.position.y-mesh.position.y+enemy.size*.5)<2.8) {
                        damagePlayer(enemy.damage,mesh.position);
                    }
                    spawnParticle(mesh.position,0xffa14a,enemy.enraged?18:11);
                    if(enemy.enraged){
                        // O segundo estágio acrescenta duas ondas oblíquas.
                        throwProjectile(enemy,-.33);throwProjectile(enemy,.33);
                    }
                }
            } else if (enemy.attackTimer===0 && dist<52) {
                if (shaman && dist<28 && dist>2.1) {
                    throwProjectile(enemy);enemy.attackTimer=2.6;
                } else if (boss && dist<5.8) {
                    enemy.windup=enemy.enraged?.72:.98;
                    enemy.attackTimer=enemy.enraged?2.25:3.1;
                    showBossTelegraph(enemy);
                    sfx.warning();
                } else if (!shaman && !boss && dist<meleeRadius) {
                    enemy.attackTimer=1.15+(enemy.type==='fast'?-.15:enemy.type==='tank'?.45:0);
                    damagePlayer(enemy.damage,mesh.position);
                } else if (boss && dist<22) {
                    // Segunda fase: salva oblíqua com espaços para esquiva.
                    if(enemy.enraged){
                        for(const spread of [-.22,0,.22])throwProjectile(enemy,spread);
                        enemy.attackTimer=2.0;
                    } else {
                        throwProjectile(enemy);enemy.attackTimer=2.55;
                    }
                }
            }
            if (enemy.windup===0) mesh.material.emissiveIntensity=Math.max(0,mesh.material.emissiveIntensity-dt*2);
        }

}
return {update};
}
