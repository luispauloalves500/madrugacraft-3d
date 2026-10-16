import assert from 'node:assert/strict';
import {createSeededRandom} from '../src/world/random.js';
import {validateSave,writeSave,readSave,clearSave,SAVE_KEY} from '../src/gameplay/save-system.js';
let cases=0;
const check=(name,fn)=>{fn();cases++;console.log(`OK checkpoint ${cases}: ${name}`)};
const fixture=()=>({
 seed:1989,graphicsQuality:'medium',level:4,xp:3,kills:7,health:98,maxHealth:136,
 score:7,questStage:2,bossDefeated:false,bossSpawned:true,currentWeapon:2,
 unlockedWeaponCount:3,wave:3,elapsed:400,
 player:{x:30,z:-26,yaw:-1},
 collectibles:[{x:12,z:3},{x:-15,z:-20}],
 healthPacks:[{x:3,z:18}],speedBoosts:[{x:4,z:-9}],
 enemies:[{type:'boss',x:32,z:-28,hp:10,enraged:true},
 {type:'shaman',x:16,z:-5,hp:3,enraged:false}]
});
function mockStorage() {
 const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
}
check('mesma seed reproduz terreno decorativo e seed distinta diverge',()=>{
 const a=createSeededRandom(123),b=createSeededRandom(123),c=createSeededRandom(124);
 const s1=Array.from({length:100},()=>a());const s2=Array.from({length:100},()=>b());
 assert.deepEqual(s1,s2);assert.notDeepEqual(s1,Array.from({length:100},()=>c()));
 assert.ok(s1.every(v=>v>=0&&v<1));
});
check('checkpoint válido inclui progresso, itens e fase 2 do guardião',()=>{
 const s=fixture();assert.ok(validateSave({version:1,...s}));
 const storage=mockStorage();assert.equal(writeSave(storage,s),true);
 assert.deepEqual(readSave(storage),{version:1,...s});
 assert.equal(clearSave(storage),true);assert.equal(readSave(storage),null);
});
check('load recusa JSON corrompido, versão antiga e objetos inesperados',()=>{
 const store=mockStorage();store.setItem(SAVE_KEY,'{');assert.equal(readSave(store),null);
 const f=fixture();store.setItem(SAVE_KEY,JSON.stringify({version:2,...f}));assert.equal(readSave(store),null);
 store.setItem(SAVE_KEY,'0'.repeat(24001));assert.equal(readSave(store),null);
});
check('coordenadas, progresso e classes de inimigos são validados',()=>{
 let s=fixture();s.player.x=Infinity;assert.equal(writeSave(mockStorage(),s),false);
 s=fixture();s.enemies[0].type='invalido';assert.equal(writeSave(mockStorage(),s),false);
 s=fixture();s.enemies[0].hp=999;assert.equal(writeSave(mockStorage(),s),false);
 s=fixture();s.questStage=0;assert.equal(writeSave(mockStorage(),s),false);
 s=fixture();s.seed=-1;assert.equal(writeSave(mockStorage(),s),false);
 s=fixture();s.graphicsQuality='ultra';assert.equal(writeSave(mockStorage(),s),false);
});
check('armazém bloqueado não impede o jogo e nem cria progresso falso',()=>{
 const storage={getItem(){throw Error('blocked')},setItem(){throw Error('quota')},removeItem(){throw Error('blocked')}};
 assert.equal(readSave(storage),null);
 assert.equal(writeSave(storage,fixture()),false);
 assert.equal(clearSave(storage),false);
});
check('arquivo de save não pode carregar milhares de inimigos ou ítens',()=>{
 let s=fixture();s.enemies=Array.from({length:31},()=>({type:'normal',x:1,z:1,hp:1,enraged:false}));
 assert.equal(writeSave(mockStorage(),s),false);
 s=fixture();s.collectibles=Array.from({length:19},()=>({x:1,z:1}));
 assert.equal(writeSave(mockStorage(),s),false);
});
console.log(`${cases} verificações de checkpoints concluídas.`);
