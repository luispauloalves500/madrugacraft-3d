import assert from 'node:assert/strict';
import {createForest} from '../src/world/forest.js';
import {createNatureAssets} from '../src/world/nature-assets.js';
import {createCollisionWorld} from '../src/world/collisions.js';
class Geometry{constructor(...args){this.args=args}}
class Material{constructor(o){Object.assign(this,o)}}
class Obj{
 constructor(){this.position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}};
 this.rotation={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}};
 this.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z},setScalar(s){this.set(s,s,s)}};
 this.matrix={};this.children=[];this.visible=true;this.userData={};}
 add(child){this.children.push(child)}
 updateMatrix(){this.matrix={x:this.position.x,y:this.position.y,z:this.position.z,sx:this.scale.x,sy:this.scale.y,sz:this.scale.z,ry:this.rotation.y,
 clone(){return {...this}}};}
}
class Mesh extends Obj {constructor(geometry,material){super();this.geometry=geometry;this.material=material}}
class InstancedMesh extends Mesh {
 constructor(g,m,count){super(g,m);this.count=count;this.matrices=[];this.instanceMatrix={needsUpdate:false}}
 setMatrixAt(i,m){this.matrices[i]={...m}}
 computeBoundingSphere(){this.boundingSphereReady=true}
}
const THREE={Mesh,Group:Obj,Object3D:Obj,InstancedMesh,PointLight:class extends Obj{},
 MeshBasicMaterial:Material,MeshStandardMaterial:Material,CanvasTexture:class{constructor(canvas){this.canvas=canvas}},DoubleSide:2};
for(const n of ['SphereGeometry','BoxGeometry','PlaneGeometry','ConeGeometry','CylinderGeometry','DodecahedronGeometry']) THREE[n]=Geometry;
const oldDoc=globalThis.document;
globalThis.document={createElement(){return {width:0,height:0,getContext(){return {fillRect(){},strokeRect(){},fillText(){}}}}}};
const build=(quality,seed)=>{
 const scene={objects:[],add(...o){this.objects.push(...o)},updateMatrixWorld(){this.updated=true}};
 const rocks=[],trees=[],treeColliders=[],cameraObstacles=[];
 const collisionWorld=createCollisionWorld();
 const forest=createForest({THREE,scene,natureAssets:createNatureAssets(THREE),
 getGroundHeight:(x,z)=>Math.sin(x*.08)*.6,
 shrinePosition:{x:32,z:-28},collisionWorld,rockColliders:rocks,treeColliders,cameraObstacles,trees});
 forest.generate(quality,seed);
 assert.ok(scene.updated);
 return {scene,rocks,trees,treeColliders,collisionWorld};
};
let total=0;
function check(label,fn){fn();total++;console.log(`OK cenário ${total}: ${label}`)}
check('gera floresta mínima com arbustos e flores instanciados',()=>{
 const {scene,rocks,trees,collisionWorld}=build('low',1989);
 assert.ok(rocks.length>0 && trees.length>0);
 assert.equal(collisionWorld.colliders.length,rocks.length+trees.length);
 const batches=scene.objects.filter(o=>o instanceof InstancedMesh);
 assert.ok(batches.length>=5);
 assert.ok(batches.every(o=>o.boundingSphereReady||o.count<=30));
});
check('semente e perfil iguais restauram obstáculos idênticos',()=>{
 const a=build('medium',100),b=build('medium',100);
 assert.deepEqual(a.collisionWorld.colliders,b.collisionWorld.colliders);
 assert.equal(a.trees.length,b.trees.length);
 assert.equal(JSON.stringify(a.scene.objects.filter(x=>x instanceof InstancedMesh).map(x=>x.matrices)),
  JSON.stringify(b.scene.objects.filter(x=>x instanceof InstancedMesh).map(x=>x.matrices)));
});
check('alta qualidade tem mais vegetação que qualidade mínima',()=>{
 const low=build('low',30),high=build('high',30);
 assert.ok(high.trees.length>low.trees.length);
 assert.ok(high.scene.objects.length>low.scene.objects.length);
});
globalThis.document=oldDoc;
console.log(`${total} verificações de floresta concluídas.`);
