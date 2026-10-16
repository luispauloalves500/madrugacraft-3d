// Construção procedural de inimigos, centralizada e testável.
export function createEnemySpawner({THREE,scene,getGroundHeight,findSpawnPoint,shrinePosition,enemies}) {
function spawnEnemy(type = 'normal') {
    let size = 0.9, color = 0xe74c3c, speed = 3.2, hp = 2, damage = 12;
    if (type === 'fast') {
        size = 0.65; color = 0xff6b00; speed = 5.8; hp = 1; damage = 7;
    } else if (type === 'tank') {
        size = 1.3; color = 0x8b0000; speed = 2.0; hp = 4; damage = 20;
    } else if (type === 'shaman') {
        size = 0.93; color = 0x6839b1; speed = 2.65; hp = 3; damage = 11;
    } else if (type === 'boss') {
        size = 2.9; color = 0xa41c35; speed = 2.5; hp = 24; damage = 25;
    }
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.62, emissive: color, emissiveIntensity: 0 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size*.81, size*.74, size*.78), material);
    const limbMat = new THREE.MeshStandardMaterial({color,roughness:.78});
    const rig={};
    for (const side of [-1,1]) {
        const arm=new THREE.Group();
        arm.position.set(side*size*.47,size*.12,0);
        const armShape=new THREE.Mesh(new THREE.BoxGeometry(size*.22,size*.46,size*.25),limbMat);
        armShape.position.y=-size*.19; arm.add(armShape); mesh.add(arm);
        rig[side<0?'leftArm':'rightArm']=arm;
        const leg=new THREE.Group();
        leg.position.set(side*size*.21,-size*.24,0);
        const legShape=new THREE.Mesh(new THREE.BoxGeometry(size*.28,size*.48,size*.32),limbMat);
        legShape.position.y=-size*.19;leg.add(legShape);mesh.add(leg);
        rig[side<0?'leftLeg':'rightLeg']=leg;
    }
    const head=new THREE.Group();head.position.y=size*.29;mesh.add(head);rig.head=head;
    const mask=new THREE.Mesh(new THREE.BoxGeometry(size*.47,size*.27,size*.12),
        new THREE.MeshStandardMaterial({color:type==='shaman'?0x311d67:0x4b2227,roughness:.8}));
    mask.position.z=size*.43;head.add(mask);
    const aura=new THREE.Mesh(new THREE.TorusGeometry(size*.65,size*.025,5,20),
        new THREE.MeshBasicMaterial({color:0xff8e40,transparent:true,opacity:.75}));
    aura.rotation.x=Math.PI/2;aura.visible=false;aura.position.y=-size*.38;mesh.add(aura);rig.aura=aura;
    mesh.userData.rig=rig;
    const eyeMat = new THREE.MeshBasicMaterial({color: type==='shaman'?0x66eaff:0xfff4ac});
    const eyeGeo = new THREE.SphereGeometry(size * 0.09, 8, 6);
    for (const offset of [-0.2, 0.2]) {
        const eye = new THREE.Mesh(eyeGeo.clone(), eyeMat.clone());
        eye.position.set(offset * size, -size * 0.16, size * 0.54);
        head.add(eye);
    }
    for (const offset of [-0.25, 0.25]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(size * 0.14, size * 0.38, 6),
            new THREE.MeshStandardMaterial({color: 0x3d1b27}));
        horn.position.set(offset * size, size * 0.33, 0);
        horn.rotation.z = offset * 0.7;
        head.add(horn);
    }
    if (type==='shaman') {
        const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.05,1.4,6),
            new THREE.MeshStandardMaterial({color:0x523827}));
        staff.position.set(-size*0.64,0.15,0);mesh.add(staff);
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16),
            new THREE.MeshStandardMaterial({color:0x62dbff,emissive:0x6c39d9,emissiveIntensity:0.9}));
        gem.position.set(-size*0.64,0.90,0);mesh.add(gem);
    }
    if (type==='boss') {
        const crown = new THREE.Mesh(new THREE.TorusGeometry(size*0.37,0.10,8,24),
            new THREE.MeshStandardMaterial({color:0xf2ad46,emissive:0x5a2506,metalness:0.6}));
        crown.rotation.x=Math.PI/2;crown.position.y=size*0.34;head.add(crown);
        const chest = new THREE.Mesh(new THREE.OctahedronGeometry(0.36),
            new THREE.MeshStandardMaterial({color:0xffd056,emissive:0xdb4c10,emissiveIntensity:1.05}));
        chest.position.set(0,0,size*0.52);mesh.add(chest);
    }
    const spot = type === 'boss' ? shrinePosition : findSpawnPoint(19, 48, size * 0.65);
    mesh.position.set(spot.x, getGroundHeight(spot.x, spot.z) + size/2, spot.z);
    mesh.castShadow = true;
    scene.add(mesh);
    enemies.push({ mesh, type, speed, hp, maxHp:hp, damage, size,
        attackTimer: type === 'boss' ? 1.5 : 0.55 + Math.random() * 0.5,
        windup:0, knockback:0, enraged:false, phaseNotice:false, strafe:Math.random()<0.5?-1:1 });
}

return spawnEnemy;
}
