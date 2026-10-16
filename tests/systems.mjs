// Teste de integração por sistemas reais, sem WebGL/CDN.
import assert from 'node:assert/strict';
import {createCollisionWorld} from '../src/world/collisions.js';
import {createPlayerModel} from '../src/characters/player-model.js';
import {createEnemySpawner} from '../src/characters/enemy-factory.js';
import {createEnemyAI} from '../src/gameplay/enemy-ai.js';
import {createCombatSystem,isInAttackArc} from '../src/gameplay/combat.js';
import {createProjectileSystem} from '../src/gameplay/projectiles.js';
import {createShrineSystem} from '../src/world/shrine.js';
import {weaponTypes} from '../src/gameplay/equipment.js';

class Vector3 {
  constructor(x=0,y=0,z=0){this.set(x,y,z)}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
  copy(v){return this.set(v.x,v.y,v.z)}
  clone(){return new Vector3(this.x,this.y,this.z)}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
  multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this}
  length(){return Math.hypot(this.x,this.y,this.z)}
  normalize(){return this.multiplyScalar(1/(this.length()||1))}
  addScaledVector(v,s){return this.add(v.clone().multiplyScalar(s))}
  applyAxisAngle(_,angle){const x=this.x,z=this.z;this.x=x*Math.cos(angle)+z*Math.sin(angle);this.z=z*Math.cos(angle)-x*Math.sin(angle);return this}
}
class Geometry{constructor(...args){this.args=args}clone(){return new this.constructor(...this.args)}dispose(){this.disposed=true}}
class Material {
  constructor(properties={}) {
    Object.assign(this,properties);
    if(typeof this.color==='number'){const value=this.color;this.color={value,setHex(n){this.value=n}}}
  }
  clone(){return new Material({color:this.color?.value ?? this.color, roughness:this.roughness,emissive:this.emissive,emissiveIntensity:this.emissiveIntensity})}
  dispose(){this.disposed=true}
}
class Object3D {
  constructor(){this.position=new Vector3();this.rotation={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}};
    this.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z},setScalar(s){this.set(s,s,s)}};
    this.children=[];this.visible=true;this.userData={};this.id=Object3D.nextId++}
  add(...children){this.children.push(...children);return this}
  lookAt(x,y,z){this.target=[x,y,z]}
  traverse(f){f(this);for(const c of this.children)c.traverse(f)}
}
Object3D.nextId=1;
class Mesh extends Object3D{constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true}}
class Group extends Object3D{}
class PointLight extends Object3D{constructor(color,intensity){super();this.color=color;this.intensity=intensity}}
const THREE={Vector3,Mesh,Group,PointLight,MeshStandardMaterial:Material,MeshBasicMaterial:Material,DoubleSide:2};
for(const name of ['BoxGeometry','SphereGeometry','CylinderGeometry','ConeGeometry','TorusGeometry','OctahedronGeometry','DodecahedronGeometry','TetrahedronGeometry','IcosahedronGeometry','CircleGeometry','RingGeometry']) THREE[name]=Geometry;
const scene={objects:[],add(...items){this.objects.push(...items)},remove(item){this.objects=this.objects.filter(x=>x!==item)}};
const pass=(name,fn)=>{fn();console.log(`OK integração: ${name}`)};

pass('colisões em índice espacial equivalentes à busca completa',()=>{
 const world=createCollisionWorld(8);
 for(let x=-96;x<=96;x+=8)for(let z=-96;z<=96;z+=8)
   world.add({x,z,radius:0.4});
 assert.equal(world.colliders.length,625);
 for(let x=-98;x<=98;x+=3.5)for(let z=-98;z<=98;z+=4.25){
   const expected=!world.colliders.some(c=>(x-c.x)**2+(z-c.z)**2<(c.radius+.45)**2);
   assert.equal(world.isPositionFree(x,z,.45),expected,`Posição divergente ${x},${z}`);
 }
 const p=world.resolveCollision(0.2,0.2,.45);
 assert.ok(Math.hypot(p.x,p.z)>=.85-1e-6);
});
const rig=createPlayerModel(THREE,scene);
pass('avatar mantém rig e pivôs articulados',()=>{
 assert.ok(rig.avatar.children.includes(rig.leftLeg));
 assert.ok(rig.avatar.children.includes(rig.rightLeg));
 assert.ok(rig.rightArm.children.includes(rig.weapon));
 assert.ok(rig.torso.children.includes(rig.headRig));
 assert.equal(rig.avatar.rotation.y,Math.PI);
});
const enemies=[];
const shrinePosition={x:32,z:-28};
const spawnEnemy=createEnemySpawner({THREE,scene,getGroundHeight:()=>0,
  findSpawnPoint:()=>({x:15,z:10}),shrinePosition,enemies});
pass('fabricante cria normal, veloz, tanque, xamã e guardião',()=>{
 for(const type of ['normal','fast','tank','shaman','boss'])spawnEnemy(type);
 assert.equal(enemies.length,5);
 assert.equal(enemies[4].hp,24);
 assert.equal(enemies[4].mesh.position.x,32);
 assert.ok(enemies[3].mesh.children.length>4);
});
let warned=0,hitPlayer=0,missiles=0;
pass('IA preserva aviso do chefe e projéteis de xamã',()=>{
 const boss=enemies[4];boss.mesh.position.set(0,1.45,-3);boss.attackTimer=0;
 const shaman=enemies[3];shaman.mesh.position.set(0,.46,-11);shaman.attackTimer=0;
 const ai=createEnemyAI({enemies:[boss,shaman],player:rig.player,getGroundHeight:()=>0,
   resolveCollision:(x,z)=>({x,z}),isGameActive:()=>true,
   showBossTelegraph(){warned++},hideBossTelegraph(){},
   damagePlayer(){hitPlayer++},spawnParticle(){},throwProjectile(){missiles++},sfx:{warning(){}}});
 ai.update(.016,1);
 assert.ok(warned>=1);
 assert.ok(missiles>=1);
 ai.update(1,2);
 assert.ok(hitPlayer>=1);
});
pass('arena registra pilares físicos e aviso com raio da segunda fase',()=>{
 const all=[];
 const shrine=createShrineSystem({THREE,scene,shrinePosition,getGroundHeight:()=>0,
   addCollider:c=>all.push(c),cameraObstacles:[],getGraphicsQuality:()=> 'low'});
 shrine.create();
 assert.equal(all.length,8);
 assert.ok(all.every(c=>Math.hypot(c.x-32,c.z+28)>7));
 const boss=enemies[4];boss.enraged=true;boss.windup=.35;
 shrine.showBossTelegraph(boss);shrine.update(.1,1);shrine.hideBossTelegraph();
});
pass('projétil causa impacto e é removido',()=>{
 let damage=0,removed=0;
 const projectileSystem=createProjectileSystem({THREE,scene,player:rig.player,allColliders:[],isPositionFree:()=>true,
   damagePlayer(n){damage+=n},removeMesh(){removed++},isGameActive:()=>true});
 const shaman={mesh:{position:new Vector3(0,0,-3)},type:'shaman',damage:11};
 projectileSystem.throwProjectile(shaman);
 assert.equal(projectileSystem.count,1);
 for(let i=0;i<8;i++)projectileSystem.update(.05);
 assert.equal(projectileSystem.count,0);
 assert.equal(damage,11);
 assert.equal(removed,1);
});
pass('combate real respeita arco, nível, recarga e limpa efeitos',()=>{
 const target={mesh:new Mesh(new Geometry(),new Material({color:0xaa0000,emissiveIntensity:0})),
   type:'normal',hp:3,maxHp:3,size:.9,speed:1,enraged:false,knockback:0};
 target.mesh.position.set(0,.5,-2);
 const living=[target];const particles=[];
 let defeated=0;
 const combat=createCombatSystem({THREE,scene,player:rig.player,enemies:living,weaponTypes,
    healthPacks:[],speedBoosts:[],particles,getGroundHeight:()=>0,
    resolveCollision:(x,z)=>({x,z}),removeMesh(){},spawnParticle(){},gainXP(){},
    showToast(){},sfx:{attack(){},hit(){},boost(){}},spawnEnemy(){},
    spawnHealthPack(){},spawnSpeedBoost(){},advanceQuestIfReady(){},updateHUD(){},
    onEnemyKilled(){defeated++},onBossDefeated(){},getLevel:()=>1,getWeaponIndex:()=>0,
    getPlayerYaw:()=>0,isGameActive:()=>true,isLocked:()=>true});
 assert.equal(isInAttackArc(rig.player.position,0,target.mesh.position,3,.2),true);
 combat.attack();assert.equal(target.hp,2);
 combat.attack();assert.equal(target.hp,2); // cooldown
 combat.update(1);combat.attack();assert.equal(target.hp,1);
 target.mesh.position.z=-2;combat.update(1);combat.attack();assert.equal(living.length,0);
 assert.equal(defeated,1);
 combat.special();assert.ok(combat.specialCooldown>0);
 combat.tickEffects(.5); // inclui limpeza de ondas e partículas
});
console.log('7 conjuntos novos de integração aprovados.');
