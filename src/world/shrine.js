// Arena, colunas sólidas e aviso de impacto sincronizado com a hitbox do chefe.
export function createShrineSystem({THREE,scene,shrinePosition,getGroundHeight,addCollider,cameraObstacles,getGraphicsQuality}) {
let shrineCore=null, shrineLight=null, bossDangerDisc=null, bossDangerOutline=null;
// ========== TEMPLO: MARCO DA CAMPANHA / ARENA DO GUARDIÃO ==========
function createShrine(){
    const graphicsQuality=getGraphicsQuality();
    const {x,z}=shrinePosition;
    const floorY=getGroundHeight(x,z);
    const stone=new THREE.MeshStandardMaterial({color:0x727b76,roughness:.94});
    const trim=new THREE.MeshStandardMaterial({color:0x9ba7a1,roughness:.85});
    const rune=new THREE.MeshStandardMaterial({color:0x7cf7da,emissive:0x3ceac7,emissiveIntensity:1.45,metalness:.2,roughness:.32});
    // A arena não tem obstáculo no centro: o jogador pode esquivar sem ficar preso.
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(6.9,7.1,.18,48),
        new THREE.MeshStandardMaterial({color:0x464f4c,roughness:1}));
    disc.position.set(x,floorY-.20,z);disc.receiveShadow=true;scene.add(disc);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(6.45,.10,5,64),trim);
    ring.rotation.x=-Math.PI/2;ring.position.set(x,floorY+.03,z);scene.add(ring);
    const axis=new THREE.Group();axis.position.set(x,floorY,z);scene.add(axis);
    for(let i=0;i<8;i++){
        const angle=i*Math.PI/4,px=Math.sin(angle)*7.4,pz=Math.cos(angle)*7.4;
        const pillar=new THREE.Group();pillar.position.set(px, getGroundHeight(x+px,z+pz)-floorY,pz);
        axis.add(pillar);
        const height=(i%3===0?3.35:2.5)+(i%2)*.35;
        const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.42,.55,height,7),stone);
        shaft.position.y=height/2;shaft.castShadow=true;pillar.add(shaft);
        for(const h of [.18,height-.2]){
            const cap=new THREE.Mesh(new THREE.CylinderGeometry(.65,.65,.24,7),trim);
            cap.position.y=h;cap.castShadow=true;pillar.add(cap);
        }
        // Obstáculos explícitos coincidem com as colunas visíveis.
        addCollider({x:x+px,z:z+pz,radius:.65});
        cameraObstacles.push(shaft);
    }
    const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(.63,.72,.52,8),stone);
    pedestal.position.set(0,.1,0);pedestal.receiveShadow=true;axis.add(pedestal);
    shrineCore=new THREE.Group();shrineCore.position.set(x,floorY+1.14,z);scene.add(shrineCore);
    const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.45),rune);
    gem.castShadow=true;shrineCore.add(gem);
    const halo=new THREE.Mesh(new THREE.TorusGeometry(.75,.032,6,32),
        new THREE.MeshBasicMaterial({color:0x80ffe5,transparent:true,opacity:.8}));
    halo.rotation.x=Math.PI/2;shrineCore.add(halo);
    shrineLight=new THREE.PointLight(0x4df8d7,graphicsQuality==='low'?.45:2.2,13,2);
    shrineLight.position.set(x,floorY+2,z);scene.add(shrineLight);
    // Um círculo rúnico colorido denuncia o alcance REAL do golpe.
    bossDangerDisc=new THREE.Mesh(new THREE.CircleGeometry(1,48),
        new THREE.MeshBasicMaterial({color:0xf14e39,transparent:true,opacity:.20,depthWrite:false,side:THREE.DoubleSide}));
    bossDangerDisc.rotation.x=-Math.PI/2;scene.add(bossDangerDisc);
    bossDangerOutline=new THREE.Mesh(new THREE.RingGeometry(.965,1,48),
        new THREE.MeshBasicMaterial({color:0xffb84c,transparent:true,opacity:.82,depthWrite:false,side:THREE.DoubleSide}));
    bossDangerOutline.rotation.x=-Math.PI/2;scene.add(bossDangerOutline);
    bossDangerDisc.visible=bossDangerOutline.visible=false;
}
function showBossTelegraph(enemy){
    if(!bossDangerDisc || !bossDangerOutline)return;
    const radius=enemy.enraged?4.3:3.7;
    const y=getGroundHeight(enemy.mesh.position.x,enemy.mesh.position.z)+.065;
    for(const ring of [bossDangerDisc,bossDangerOutline]){
        ring.visible=true;
        ring.position.set(enemy.mesh.position.x,y,enemy.mesh.position.z);
        ring.scale.set(radius,radius,1);
    }
    bossDangerOutline.position.y+=.012;
    bossDangerDisc.material.opacity=.12+.15*(1-Math.min(1,enemy.windup/.95));
}
function hideBossTelegraph(){
    if(bossDangerDisc)bossDangerDisc.visible=false;
    if(bossDangerOutline)bossDangerOutline.visible=false;
}


function update(dt,elapsed){
    if(!shrineCore) return;
    shrineCore.rotation.y+=dt*.82;
    shrineCore.position.y=getGroundHeight(shrinePosition.x,shrinePosition.z)+1.15+
        Math.sin(elapsed*2.6)*.14;
    shrineLight.intensity=(getGraphicsQuality()==='low'?.45:2.2)*(.8+Math.sin(elapsed*2.5)*.15);
}
return {create:createShrine,showBossTelegraph,hideBossTelegraph,update};
}
