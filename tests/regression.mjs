// QA de regras centrais, sem depender de Three.js, WebGL ou internet.
// Executar no terminal: node testes.mjs
import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';
import assert from 'node:assert/strict';
import { isInAttackArc as actualAttackArc } from '../src/gameplay/combat.js';
import { createCollisionWorld } from '../src/world/collisions.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = [
  'src/main.js', 'src/world/terrain.js', 'src/world/nature-assets.js',
  'src/render/quality.js', 'src/ui/minimap.js', 'src/audio/sfx.js',
  'src/gameplay/equipment.js', 'src/characters/player-model.js',
  'src/characters/enemy-factory.js','src/gameplay/enemy-ai.js',
  'src/gameplay/projectiles.js','src/gameplay/combat.js','src/world/shrine.js',
  'src/world/collisions.js'
].map(path => readFileSync(new URL('../'+path, import.meta.url),'utf8')).join('\n');
assert.ok(script, 'Arquivos JS não encontrados');
const fnNames = ['getGroundHeight', 'resolveCollision', 'isPositionFree',
                 'findSpawnPoint','gainXP'];
function extract(name) {
  const begin = script.search(new RegExp(`function ${name}\\(`));
  assert.ok(begin >= 0, `Função ausente: ${name}`);
  const open = script.indexOf('{',begin);
  let level=0, end=open;
  for (;end<script.length;end++) {
    if (script[end]==='{') level++;
    if (script[end]==='}' && --level===0) break;
  }
  assert.ok(end<script.length,`Função inválida: ${name}`);
  return script.slice(begin,end+1);
}

const ctx = createContext({
  ARCFUNCTION: actualAttackArc, collisionWorld:createCollisionWorld(),
  THREE: { MathUtils:{clamp:(x,min,max)=>Math.max(min,Math.min(max,x))}},
  player: {position:{x:0,y:0,z:0}}, playerYaw:0, allColliders:[],
  level:1, xp:0, maxHealth:100, health:55,
  sfx:{heal(){}}, showToast(){},updateHUD(){},
});
new Script('const xpRequired = () => 4 + level * 3;\n' + fnNames.map(extract).join('\n') + '\nfunction isInAttackArc(target,radius,threshold){return ARCFUNCTION(player.position,playerYaw,target,radius,threshold)}').runInContext(ctx);
const run = str => new Script(str).runInContext(ctx);
let tests=0;
function check(label,callback){callback();tests++;console.log(`OK ${tests}: ${label}`);}
check('terreno analítico no plano',()=>{
 assert.ok(Math.abs(run('getGroundHeight(0,0)'))<1e-9);
 assert.ok(Number.isFinite(run('getGroundHeight(30,-15)')));
 assert.ok(script.includes('posAttr.setZ(i, '), 'Geometria deve deslocar eixo Z local');
 assert.ok(!script.includes('posAttr.setY(i,'), 'Não deslocar eixo Y do plano');
});
check('ataque só alcança o arco frontal',()=>{
 assert.equal(run('isInAttackArc({x:0,z:-2},2.5,0.3)'),true);
 assert.equal(run('isInAttackArc({x:0,z: 2},2.5,0.3)'),false);
 assert.equal(run('isInAttackArc({x:2,z:0},2.5,0.3)'),false);
 assert.equal(run('isInAttackArc({x:0,z:-9},2.5,0.3)'),false);
 run('playerYaw=Math.PI/2');
 assert.equal(run('isInAttackArc({x:-2,z:0},2.5,0.3)'),true);
 run('playerYaw=0');
});
check('separação de colisão segura',()=>{
 ctx.collisionWorld.add({x:0,z:0,radius:1});
 const result=run('resolveCollision(0.2,0.2,0.46)');
 assert.ok(Math.hypot(result.x,result.z)>=1.46-1e-6,JSON.stringify(result));
 assert.equal(run('isPositionFree(0,0,0.46)'),false);
 assert.equal(run('isPositionFree(10,10,0.46)'),true);
});
check('spawn não cai dentro do obstáculo',()=>{
 for(let i=0;i<50;i++) {
  const point=run('findSpawnPoint(15,35,0.8)');
  const dist=Math.hypot(point.x,point.z);
  assert.ok(dist>=14.9&&dist<=35.1,JSON.stringify(point));
  assert.ok(Math.hypot(point.x,point.z)>1.8);
 }
});
check('progressão RPG aumenta vida e nível corretamente',()=>{
 run('gainXP(7)');
 assert.equal(run('level'),2); assert.equal(run('xp'),0);
 assert.equal(run('maxHealth'),112);assert.equal(run('health'),85);
 run('gainXP(23)');
 assert.equal(run('level'),4);assert.equal(run('xp'),0);
});
check('marcação HTML/UI válida',()=>{
 for(const match of script.matchAll(/getElementById\('([\w-]+)'\)/g)){
  assert.ok(html.includes(`id="${match[1]}"`),`ID ausente: ${match[1]}`);
 }
 assert.ok(html.includes('id="pause-menu"'));
 assert.ok(html.includes('id="minimap"'));
 assert.ok(script.includes('controls.isLocked && health > 0'));
});
// Integração de missões/equipamentos em VM: simula eventos reais do jogo sem WebGL.
const stats={ bossSpawns:0, wins:0, loses:0, sounds:0 };
const vector = {x:0,y:0,z:0, set(x,y,z){this.x=x;this.y=y;this.z=z;return this;},
  lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z;},
  normalize(){const m=Math.sqrt(this.lengthSq())||1;this.x/=m;this.y/=m;this.z/=m;return this;}};
const extraCtx=createContext({
  stats, collisionWorld:createCollisionWorld(), THREE:{MathUtils:{clamp:(x,mi,ma)=>Math.max(mi,Math.min(ma,x))}},
  weapon:{scale:{set(){}},material:{color:{setHex(){}}},position:{}},
  hammerHead:{visible:false}, spearHead:{visible:false},
  player:{position:{x:0,y:0,z:0}}, controls:{isLocked:true}, keys:{KeyW:true},allColliders:[],
  dashDirection:vector,sfx:{boost(){stats.sounds++},damage(){stats.sounds++}},
  flashDamage(){}, updateHUD(){}, showToast(){},
  spawnEnemy(type){if(type==='boss')stats.bossSpawns++},
  winGame(){stats.wins++; new Script('gameActive=false').runInContext(extraCtx)},
  loseGame(){stats.loses++},
});
const boot=`
let questStage=0,bossDefeated=false,bossSpawned=false,score=0,kills=0;
const goalScore=10;
const weaponTypes=[
 {name:'Cabo',damage:1,range:2.35,cooldown:.41,arc:.38,scale:1,color:1},
 {name:'Marreta',damage:2,range:2.85,cooldown:.63,arc:.32,scale:1.32,color:2},
 {name:'Lança',damage:2,range:4.1,cooldown:.45,arc:.18,scale:1.75,color:3}
];
let currentWeapon=0,unlockedWeaponCount=1;
let gameActive=true,dashCooldown=0,dashTimer=0,invulnerableTimer=0,playerYaw=0,health=100;
`;
new Script(boot + ['resolveCollision','equipWeapon','advanceQuestIfReady','doDodge','damagePlayer'].map(extract).join('\n')).runInContext(extraCtx);
const campaign = str => new Script(str).runInContext(extraCtx);
check('arma bloqueada e seleção válida',()=>{
 assert.equal(campaign('equipWeapon(1)'),false);
 assert.equal(campaign('currentWeapon'),0);
 assert.equal(campaign('equipWeapon(0)'),true);
});
check('missão 1: quatro peças desbloqueiam marreta',()=>{
 campaign('score=4;advanceQuestIfReady()');
 assert.equal(campaign('questStage'),1);
 assert.equal(campaign('unlockedWeaponCount'),2);
 assert.equal(campaign('currentWeapon'),1);
 assert.equal(stats.bossSpawns,0);
});
check('missão 2: seis KOs geram um único chefe e liberam lança',()=>{
 campaign('kills=6;advanceQuestIfReady();advanceQuestIfReady()');
 assert.equal(campaign('questStage'),2);
 assert.equal(campaign('currentWeapon'),2);
 assert.equal(stats.bossSpawns,1);
});
check('vitória só depois de dez peças e guardião derrotado',()=>{
 campaign('score=10;advanceQuestIfReady()');
 assert.equal(stats.wins,0);
 campaign('bossDefeated=true;advanceQuestIfReady();advanceQuestIfReady()');
 assert.equal(stats.wins,1);
});
check('esquiva respeita recarga e direção',()=>{
 campaign('gameActive=true;dashCooldown=0');
 assert.equal(campaign('doDodge()'),true);
 assert.ok(campaign('dashDirection.z')<0);
 assert.equal(campaign('dashCooldown'),3.6);
 assert.equal(campaign('doDodge()'),false);
});
check('invulnerabilidade impede dano múltiplo e zero vida encerra partida',()=>{
 campaign('health=100;invulnerableTimer=0');
 assert.equal(campaign('damagePlayer(20,{x:0,z:2})'),true);
 assert.equal(campaign('health'),80);
 assert.equal(campaign('damagePlayer(20,{x:0,z:2})'),false);
 assert.equal(campaign('health'),80);
 campaign('health=10;invulnerableTimer=0');
 assert.equal(campaign('damagePlayer(30,{x:0,z:2})'),true);
 assert.equal(campaign('health'),0);
 assert.equal(stats.loses,1);
});
check('HUD da missão, armas e chefe possui destinos válidos',()=>{
 for(const id of ['mission-title','mission-goal','equipment-display','boss-bar','boss-bar-wrapper','dodge-display','campaign-hud']){
  assert.ok(html.includes(`id="${id}"`),`Falta interface ${id}`);
 }
 assert.ok(script.includes('updateProjectiles(dt)'));
 assert.ok(script.includes("type === 'shaman'"));
 assert.ok(script.includes("type === 'boss'"));
});
console.log(`\n${tests} conjuntos de testes passaram.`);

// v0.4: testes adicionais do chefe, hitbox da telemetria e rig articulado.
check('direção visual do avatar corresponde ao arco de ataque',()=>{
 assert.match(script,/avatar\.rotation\.y\s*=\s*Math\.PI/);
 assert.match(script,/player\.rotation\.y\s*=\s*playerYaw/);
 // Frente do avatar = +Z local. 180° + yaw => (-sin(yaw), -cos(yaw)).
 for (const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
   const front={x:-Math.sin(angle),z:-Math.cos(angle)};
   run(`playerYaw=${angle}`);
   assert.equal(run(`isInAttackArc({x:${front.x*2},z:${front.z*2}},2.5,.85)`),true);
 }
 run('playerYaw=0');
});
check('pivôs do personagem mantêm membros e arma conectados',()=>{
 assert.match(script,/const leftLeg=makeLeg\(-\.19\),rightLeg=makeLeg\(\.19\)/);
 assert.match(script,/const leftArm=makeArm\(-\.47\),rightArm=makeArm\(\.47\)/);
 assert.match(script,/rightArm\.add\(weapon\)/);
 assert.match(script,/torso\.add\(headRig\)/);
 assert.match(script,/rightArm\.rotation\.x=-\.32-arc\*2\.05/);
});
check('arena do guardião possui espaço reservado sem obstáculos aleatórios',()=>{
 assert.ok(script.includes('Math.hypot(x-shrinePosition.x,z-shrinePosition.z)>10'));
 assert.ok(script.includes('createShrine()'));
 assert.ok(script.includes('const spot = type === \'boss\' ? shrinePosition'));
 assert.ok(script.includes('addCollider({x:x+px,z:z+pz,radius:.65})'));
});
check('sinalização de golpe é geométrica e acompanha raio real da fase',()=>{
 const visualCtx=createContext({
   getGroundHeight(){return .35},bossDangerDisc:{position:{set(x,y,z){this.x=x;this.y=y;this.z=z}},scale:{set(x,y,z){this.x=x;this.y=y;this.z=z}},material:{}},
   bossDangerOutline:{position:{set(x,y,z){this.x=x;this.y=y;this.z=z}},scale:{set(x,y,z){this.x=x;this.y=y;this.z=z}}},
 });
 new Script(extract('showBossTelegraph')+'\n'+extract('hideBossTelegraph')).runInContext(visualCtx);
 const v=x=>new Script(x).runInContext(visualCtx);
 const enemy={mesh:{position:{x:1,z:-5}},enraged:false,windup:.5};
 visualCtx.enemy=enemy;
 v('showBossTelegraph(enemy)');
 assert.equal(visualCtx.bossDangerDisc.scale.x,3.7);
 assert.equal(visualCtx.bossDangerDisc.position.y,.415);
 assert.equal(visualCtx.bossDangerOutline.visible,true);
 enemy.enraged=true;v('showBossTelegraph(enemy)');
 assert.equal(visualCtx.bossDangerDisc.scale.x,4.3);
 v('hideBossTelegraph()');
 assert.equal(visualCtx.bossDangerDisc.visible,false);
});
check('guardião muda uma única vez à fase 2 e invoca reforços',()=>{
 const boss={hp:13,maxHp:24,enraged:false,speed:2.5,type:'boss',size:2.9,
   mesh:{position:{x:20,z:-20},material:{color:{setHex(value){this.value=value}},emissiveIntensity:0}},attackTimer:0,knockback:0};
 const ph={created:0,phaseMessages:0};
 const testCtx=createContext({
   enemies:[boss],player:{position:{x:18,z:-20}},
   spawnParticle(){},sfx:{hit() {},boost() {}},resolveCollision(x,z){return {x,z}},
   showToast(msg){if(msg.includes('Fase 2'))ph.phaseMessages++},
   spawnEnemy(){ph.created++},removeMesh(){},gainXP(){},advanceQuestIfReady(){},
   updateHUD(){},spawnHealthPack(){},spawnSpeedBoost(){},
   onBossDefeated(){},onEnemyKilled(){},
   healthPacks:[],speedBoosts:[],bossDefeated:false,
 });
 new Script(extract('damageEnemy')).runInContext(testCtx);
 const hit=v=>{testCtx.hitAmount=v;return new Script('damageEnemy(enemies[0],hitAmount)').runInContext(testCtx);};
 hit(2);
 assert.equal(boss.hp,11);
 assert.equal(boss.enraged,true);
 assert.equal(boss.speed,3.2);
 assert.equal(ph.created,2);
 hit(1);
 assert.equal(ph.created,2);
 assert.equal(ph.phaseMessages,1);
});
check('projéteis da segunda fase têm leque e dano menor que impacto',()=>{
 assert.match(script,/for\(const spread of \[-\.22,0,\.22\]\)throwProjectile\(enemy,spread\)/);
 assert.match(script,/enemy\.type==='boss' \? \(enemy\.enraged\?15:12\) : enemy\.damage/);
 assert.match(script,/direction\.applyAxisAngle\(/);
});
check('efeitos de ataque são descartados após expirar',()=>{
 assert.ok(script.includes('spawnSlashArc(selected)'));
 assert.ok(script.includes('if(f.life<=0){removeMesh(f.effect);slashEffects.splice(i,1);}') );
 assert.ok(script.includes('shrineCore.rotation.y+=dt*.82'));
});
check('interface apresenta versão e segunda fase do guardião',()=>{
 assert.ok(html.includes('EDIÇÃO v0.6'));
 assert.ok(html.includes('id="boss-name"'));
 assert.ok(script.includes('Guardião da Floresta · Fase 2 · Fúria'));
});
console.log('Testes avançados v0.4 também concluídos.');
