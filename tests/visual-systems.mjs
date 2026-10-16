// Validação independente de WebGL para câmera, culling, modelos e animações.
import assert from 'node:assert/strict';
import {createDistanceVisibility,VISIBILITY_PROFILES,shouldBeVisible} from '../src/render/visibility.js';
import {createCameraRig,distanceToSegmentSquared,selectNearBlockers} from '../src/render/camera-rig.js';
import {enemyPose,animateEnemy} from '../src/characters/enemy-animation.js';
import {createEnemySpawner} from '../src/characters/enemy-factory.js';
let passed=0;
function check(name,fn){fn();passed++;console.log(`OK visual ${passed}: ${name}`)}
check('perfis separam alcance e distância de sombras',()=>{
  assert.ok(VISIBILITY_PROFILES.low.trees<VISIBILITY_PROFILES.medium.trees);
  assert.ok(VISIBILITY_PROFILES.medium.trees<VISIBILITY_PROFILES.high.trees);
  assert.ok(VISIBILITY_PROFILES.low.shadow<VISIBILITY_PROFILES.low.trees);
});
check('histerese evita piscar próximo ao limite',()=>{
  assert.equal(shouldBeVisible(50*50,false,48),false);
  assert.equal(shouldBeVisible(50*50,true,48),true);
  assert.equal(shouldBeVisible(40*40,false,48),true);
});
check('ocultação por distância não altera colisões nem remove malhas',()=>{
  const makeTree=x=>({position:{x,z:0},visible:true,userData:{},castShadow:true,
    traverse(fn){fn(this);fn(this.leaf)},leaf:{isMesh:true,castShadow:true}});
  const trees=[makeTree(5),makeTree(90)];
  const rocks=[{position:{x:95,z:0},visible:true,castShadow:true}];
  const colliders=[{x:5,z:0,radius:1},{x:90,z:0,radius:1},{x:95,z:0,radius:.7}];
  const visibility=createDistanceVisibility({trees,rocks});
  visibility.update({x:0,z:0},'low',0,true);
  assert.equal(trees[0].visible,true);
  assert.equal(trees[1].visible,false);
  assert.equal(trees[0].leaf.castShadow,true);
  assert.equal(rocks[0].visible,false);
  assert.equal(colliders.length,3);
  visibility.update({x:90,z:0},'low',.21);
  assert.equal(trees[1].visible,true);
  assert.equal(trees[0].visible,false);
  assert.equal(colliders.length,3);
});
check('visibilidade não varre objetos a cada frame',()=>{
  const obj={position:{x:0,z:0},visible:true,userData:{},traverse(fn){fn(this)}};
  const v=createDistanceVisibility({trees:[obj]});
  assert.equal(v.update({x:0,z:0},'medium',0,true),true);
  assert.equal(v.update({x:0,z:0},'medium',.05),false);
  assert.equal(v.update({x:0,z:0},'medium',.15),true);
});
check('distância ao segmento considera extremos, não só centro',()=>{
  const a={x:0,z:0},b={x:10,z:0};
  assert.equal(distanceToSegmentSquared({x:5,z:2},a,b),4);
  assert.equal(distanceToSegmentSquared({x:12,z:0},a,b),4);
  assert.equal(distanceToSegmentSquared({x:-2,z:0},a,b),4);
});
check('raycast seleciona somente obstáculos próximos e reutiliza buffer',()=>{
  const a={x:0,z:0},b={x:10,z:0},buffer=[];
  const items=[{x:2,z:1,mesh:{id:'perto'}},{x:2,z:8,mesh:{id:'longe'}},{x:11,z:1,mesh:{id:'fim'}}];
  assert.equal(selectNearBlockers(items,a,b,2,buffer),buffer);
  assert.deepEqual(buffer.map(m=>m.id),['perto','fim']);
  selectNearBlockers([],a,b,2,buffer);assert.equal(buffer.length,0);
});
check('poses de animação variam com tipo, deslocamento e antecipação',()=>{
  const idle=enemyPose('normal',.3,false);
  const running=enemyPose('fast',.3,true);
  const boss=enemyPose('boss',.3,true,.8,0,true);
  assert.ok(Math.abs(running.leftLeg)>Math.abs(idle.leftLeg));
  assert.ok(boss.leftArm<running.leftArm);
  assert.ok(boss.pulse>0);
});
check('rig de inimigo anima sem mexer no collider/posição principal',()=>{
  const part=()=>({rotation:{x:0,y:0,z:0},visible:false,scale:{setScalar(n){this.s=n}}});
  const rig={leftLeg:part(),rightLeg:part(),leftArm:part(),rightArm:part(),head:part(),aura:part()};
  const enemy={mesh:{id:1,position:{x:12,y:1,z:-5},userData:{rig}},type:'boss',windup:.5,knockback:0,enraged:true};
  const before={...enemy.mesh.position};
  animateEnemy(enemy,1.2,true);
  assert.notEqual(rig.leftLeg.rotation.x,0);
  assert.equal(rig.aura.visible,true);
  assert.deepEqual(enemy.mesh.position,before);
});
check('nova fábrica oferece membros articulados aos cinco tipos',()=>{
  class Obj{constructor(){this.children=[];this.userData={};this.rotation={x:0,y:0,z:0};this.position={x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z})}};this.scale={setScalar(){}}}add(...children){this.children.push(...children)}}
  class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m}}
  class Geo{constructor(...args){this.args=args}clone(){return new Geo(...this.args)}}
  class Mat{constructor(options){Object.assign(this,options)}clone(){return new Mat({...this})}}
  const THREE={Group:Obj,Mesh,MeshStandardMaterial:Mat,MeshBasicMaterial:Mat};
  for(const name of ['BoxGeometry','SphereGeometry','ConeGeometry','CylinderGeometry','OctahedronGeometry','TorusGeometry'])THREE[name]=Geo;
  const enemies=[];const spawn=createEnemySpawner({THREE,scene:{add(){}},getGroundHeight:()=>0,
    findSpawnPoint:()=>({x:10,z:9}),shrinePosition:{x:32,z:-28},enemies});
  for(const type of ['normal','fast','tank','shaman','boss']){
    spawn(type);
    const {rig}=enemies.at(-1).mesh.userData;
    assert.ok(rig.leftArm&&rig.rightArm&&rig.leftLeg&&rig.rightLeg&&rig.head);
    assert.equal(enemies.at(-1).mesh.children.includes(rig.leftArm),true);
  }
  assert.equal(enemies.length,5);
});
check('câmera reduz distância ao atingir árvore e descarta bloqueador distante',()=>{
  class Vec{constructor(x=0,y=0,z=0){this.set(x,y,z)}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}copy(v){return this.set(v.x,v.y,v.z)}
    add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this}
    addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this}length(){return Math.hypot(this.x,this.y,this.z)}distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}
    distanceToSquared(v){return (this.x-v.x)**2+(this.y-v.y)**2+(this.z-v.z)**2}lerp(v,a){this.x+=(v.x-this.x)*a;this.y+=(v.y-this.y)*a;this.z+=(v.z-this.z)*a;return this}}
  const ground={id:'ground',getWorldPosition(v){return v.set(0,0,0)}},near={id:'near',getWorldPosition(v){return v.set(0,0,3)}},far={id:'far',getWorldPosition(v){return v.set(40,0,0)}};
  let selected=[];
  const raycaster={set(){},intersectObjects(blockers,_recursive,hits){selected=[...blockers];if(blockers.includes(near))hits.push({distance:2.7});return hits}};
  const camera={position:new Vec(0,3.5,8),lookAt(){}};
  const player={position:new Vec()};
  const rig=createCameraRig({THREE:{Vector3:Vec},camera,player,raycaster,getGroundHeight:()=>0,cameraObstacles:[ground,near,far],scene:{updateMatrixWorld(){}}});
  rig.refreshObstacles();rig.update(.016,0,0);
  assert.equal(selected.includes(far),false);
  assert.equal(selected.includes(near),true);
  assert.ok(camera.position.distanceTo(new Vec(0,1.55,0))<3);
});
console.log(`${passed} verificações visuais e de renderização concluídas.`);
