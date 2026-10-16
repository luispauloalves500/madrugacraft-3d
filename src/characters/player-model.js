// Modelo procedural articulado. As malhas e pivôs pertencem ao mesmo avatar.
export function createPlayerModel(THREE, scene) {
// ========== PERSONAGEM ARTICULADO ==========
// Direção frontal local +Z; avatar gira 180° para acompanhar o eixo -Z
// de ataque/movimento. Corpo e arma compartilham o mesmo esqueleto simples.
const player = new THREE.Group();
const avatar = new THREE.Group();
avatar.rotation.y = Math.PI;
player.add(avatar);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x39343b, roughness: 0.91 });
const skinMat = new THREE.MeshStandardMaterial({ color: 0xdca986, roughness: 0.87 });
const hatMat = new THREE.MeshStandardMaterial({ color: 0x4479c2, roughness: 0.7 });
const jeanMat = new THREE.MeshStandardMaterial({ color: 0x273752, roughness: 0.87 });
const shoeMat = new THREE.MeshStandardMaterial({ color: 0x745140, roughness: 0.88 });
const whiteMat = new THREE.MeshStandardMaterial({color:0xe8e0d1,roughness:0.95});
const leatherMat = new THREE.MeshStandardMaterial({color:0x684b32,roughness:0.9});
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1c1414, roughness: 0.5 });
const torso = new THREE.Group();torso.position.y=1.15;avatar.add(torso);
const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.04, 0.38), bodyMat);
body.castShadow=true;torso.add(body);
const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.49,0.18,0.43),whiteMat);
shirt.position.set(0,0.40,0.02);torso.add(shirt);
const belt = new THREE.Mesh(new THREE.BoxGeometry(0.73,0.12,0.43),leatherMat);
belt.position.y=-0.43;torso.add(belt);
const buckle=new THREE.Mesh(new THREE.BoxGeometry(.18,.11,.035),new THREE.MeshStandardMaterial({color:0xd5b46d,metalness:.6}));
buckle.position.set(0,-.43,.24);torso.add(buckle);
const scarf = new THREE.Mesh(new THREE.BoxGeometry(.24,.2,.46),
    new THREE.MeshStandardMaterial({color:0xb14842,roughness:.9}));
scarf.position.set(-.17,.38,.04);torso.add(scarf);
const headRig = new THREE.Group();headRig.position.y=.86;torso.add(headRig);
const head = new THREE.Mesh(new THREE.SphereGeometry(0.305,18,14),skinMat);
head.castShadow=true;headRig.add(head);
for (const x of [-.117,.117]) {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(.073,10,8),whiteMat);
    eyeWhite.position.set(x,.028,.263);headRig.add(eyeWhite);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.041,8,8),eyeMat);
    eye.position.set(x,.028,.326);headRig.add(eye);
    const eyebrow = new THREE.Mesh(new THREE.BoxGeometry(.13,.038,.05),bodyMat);
    eyebrow.position.set(x,.158,.275);headRig.add(eyebrow);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(.096,8,8),skinMat);
    ear.position.set(x>0?.30:-.30,0,0);headRig.add(ear);
}
const nose = new THREE.Mesh(new THREE.SphereGeometry(.088,12,10),skinMat);
nose.position.set(0,-.044,.310);nose.scale.z=1.3;headRig.add(nose);
const mustache = new THREE.Mesh(new THREE.BoxGeometry(.36,.075,.078),bodyMat);
mustache.position.set(0,-.145,.270);headRig.add(mustache);
const hat = new THREE.Mesh(new THREE.CylinderGeometry(.36,.39,.25,14),hatMat);
hat.position.y=.37;hat.castShadow=true;headRig.add(hat);
const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(.396,.397,.052,14),leatherMat);
hatBand.position.y=.245;headRig.add(hatBand);
const brim = new THREE.Mesh(new THREE.CylinderGeometry(.52,.52,.035,14),hatMat);
brim.position.y=.23;headRig.add(brim);
const legGeo = new THREE.BoxGeometry(.24,.66,.28);
const footGeo = new THREE.BoxGeometry(.28,.16,.42);
function makeLeg(x){
    const pivot=new THREE.Group();pivot.position.set(x,.73,0);avatar.add(pivot);
    const lower=new THREE.Mesh(legGeo,jeanMat);lower.position.y=-.34;lower.castShadow=true;pivot.add(lower);
    const foot=new THREE.Mesh(footGeo,shoeMat);foot.position.set(0,-.68,.07);foot.castShadow=true;pivot.add(foot);
    return pivot;
}
const leftLeg=makeLeg(-.19),rightLeg=makeLeg(.19);
function makeArm(x){
    const pivot=new THREE.Group();pivot.position.set(x,.40,0);torso.add(pivot);
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(.215,.68,.25),bodyMat);
    sleeve.position.y=-.34;sleeve.castShadow=true;pivot.add(sleeve);
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(.22,.10,.26),whiteMat);
    cuff.position.y=-.62;pivot.add(cuff);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.115,10,8),skinMat);
    hand.position.y=-.72;pivot.add(hand);
    return pivot;
}
const leftArm=makeArm(-.47),rightArm=makeArm(.47);
const weapon = new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,1.15,7),
    new THREE.MeshStandardMaterial({color:0x8B4513,roughness:.78}));
weapon.position.set(0,-1.17,.17);
weapon.rotation.z=-.12;
rightArm.add(weapon);
const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(.57,.27,.27),
    new THREE.MeshStandardMaterial({color:0xc2d0d8,roughness:.52,metalness:.65}));
hammerHead.position.y=-.55;hammerHead.visible=false;weapon.add(hammerHead);
const spearHead = new THREE.Mesh(new THREE.ConeGeometry(.13,.42,7),
    new THREE.MeshStandardMaterial({color:0xe7dfc5,roughness:.38,metalness:.72}));
spearHead.rotation.z=Math.PI;spearHead.position.y=-.76;spearHead.visible=false;weapon.add(spearHead);
player.position.set(0,0,0);
scene.add(player);

return {player, avatar, torso, headRig, leftLeg, rightLeg, leftArm, rightArm, weapon, hammerHead, spearHead};
}
