import assert from 'node:assert/strict';
import { createNatureAssets } from '../src/world/nature-assets.js';
import { createMinimap } from '../src/ui/minimap.js';
import { applyGraphicsSettings } from '../src/render/quality.js';
import { weaponTypes } from '../src/gameplay/equipment.js';
import { createTerrain } from '../src/world/terrain.js';

let passed=0;
function test(name, fn) {fn();passed++;console.log(`OK modulo ${passed}: ${name}`);}
class Geometry { constructor(...args){this.args=args} }
class Material {constructor(data){Object.assign(this,data)} }
const THREE={
  CylinderGeometry:Geometry,ConeGeometry:Geometry,DodecahedronGeometry:Geometry,
  SphereGeometry:Geometry, MeshStandardMaterial:Material, PlaneGeometry:Geometry,
  PCFShadowMap:'pcf',PCFSoftShadowMap:'soft'
};
test('materiais e geometrias estáticos em cache',()=>{
  const assets=createNatureAssets(THREE);
  assert.equal(assets.leafMaterials.length,4);
  assert.equal(assets.rockMaterials.length,4);
  assert.equal(assets.flowerMaterials.length,5);
  assert.ok(assets.trunkGeometry instanceof Geometry);
  assert.ok(assets.leafMaterials.every(m=>m instanceof Material));
});
test('configurações dos perfis low / medium / high',()=>{
  let pixelRatio=0,shadowSize=0,materialUpdates=0;
  const renderer={setPixelRatio(v){pixelRatio=v},shadowMap:{enabled:true,type:null}};
  const scene={fog:{density:0},traverse(fn){const material={set needsUpdate(v){if(v) materialUpdates++}};fn({material})}};
  const sun={shadow:{mapSize:{set(a,b){shadowSize=a;assert.equal(a,b)}},map:null,needsUpdate:false}};
  globalThis.window={devicePixelRatio:2.5};
  applyGraphicsSettings(THREE,'low',renderer,scene,sun);
  assert.equal(pixelRatio,1);assert.equal(renderer.shadowMap.enabled,false);
  applyGraphicsSettings(THREE,'medium',renderer,scene,sun);
  assert.equal(pixelRatio,1.5);assert.equal(shadowSize,1024);
  applyGraphicsSettings(THREE,'high',renderer,scene,sun);
  assert.equal(pixelRatio,2);assert.equal(shadowSize,2048);
  assert.equal(renderer.shadowMap.type,'soft');assert.ok(materialUpdates>=3);
  delete globalThis.window;
});
test('minimapa continua desenhando alvos e jogador',()=>{
  let arcs=0;
  const ctx={clearRect(){},fillRect(){},beginPath(){},arc(){arcs++},fill(){},
    save(){},translate(){},rotate(){},moveTo(){},lineTo(){},closePath(){},restore(){},
    fillText(){},strokeRect(){}};
  const canvas={width:0,height:0,getContext(){return ctx}};
  const state={player:{position:{x:0,z:0}}, treeColliders:[],rockColliders:[],
    collectibles:[{position:{x:2,z:2}}],healthPacks:[],speedBoosts:[],enemies:[],
    shrinePosition:{x:32,z:-28},playerYaw:0};
  const draw=createMinimap(canvas,()=>state);
  draw();assert.equal(canvas.width,140);assert.ok(arcs>=3);
});
test('terreno reconstrói malha usando eixo local Z',()=>{
  const oldDocument=globalThis.document;
  const canvasContext={fillStyle:null,fillRect(){}};
  globalThis.document={createElement(){return {width:0,height:0,getContext(){return canvasContext}}}};
  const pos=[];
  for (let i=0;i<4;i++)pos.push([i*2,-i,0]);
  class FakePlaneGeometry {
    constructor(){this.attributes={position:{count:4,getX:i=>pos[i][0],getY:i=>pos[i][1],
      setZ(i,z){pos[i][2]=z}}}}
    computeVertexNormals(){this.normalsReady=true}
  }
  class FakeMesh {constructor(geometry,material){this.geometry=geometry;this.material=material;this.rotation={};}}
  const lib={...THREE,PlaneGeometry:FakePlaneGeometry,CanvasTexture:class {
      constructor(canvas){this.canvas=canvas;this.repeat={set(){}}}
    },Mesh:FakeMesh,RepeatWrapping:1,SRGBColorSpace:2};
  const scene={items:[],add(m){this.items.push(m)}};
  const calculate=(x,z)=>Math.sin(x*.08)*Math.cos(z*.08)*.6+Math.sin(x*.3)*.15;
  const mesh=createTerrain(lib,scene,calculate);
  assert.equal(mesh.geometry.normalsReady,true);
  assert.equal(scene.items[0],mesh);
  for(let i=0;i<4;i++)assert.ok(Math.abs(pos[i][2]-calculate(pos[i][0],-pos[i][1]))<1e-9);
  globalThis.document=oldDocument;
});
test('dados das armas mantêm sequência de desbloqueio',()=>{
  assert.equal(weaponTypes.length,3);
  assert.ok(weaponTypes[2].range>weaponTypes[0].range);
  assert.ok(weaponTypes[1].damage>=weaponTypes[0].damage);
});
console.log(`${passed} verificações de módulos concluídas.`);
