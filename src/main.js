// MadrugaCraft v0.8 — sistemas de câmera, animação e visibilidade desacoplados.
import { createNatureAssets } from './world/nature-assets.js';
import { createCameraRig } from './render/camera-rig.js';
import { createForest } from './world/forest.js';
import { readSave, writeSave, clearSave } from './gameplay/save-system.js';
import { createTerrain } from './world/terrain.js';
import { createMinimap } from './ui/minimap.js';
import { weaponTypes } from './gameplay/equipment.js';
import { applyGraphicsSettings } from './render/quality.js';
import { initAudio, sfx } from './audio/sfx.js';
import * as THREE from 'three';
import { createPlayerModel } from './characters/player-model.js';
import { createEnemySpawner } from './characters/enemy-factory.js';
import { createEnemyAI } from './gameplay/enemy-ai.js';
import { createCombatSystem } from './gameplay/combat.js';
import { createProjectileSystem } from './gameplay/projectiles.js';
import { createShrineSystem } from './world/shrine.js';
import { createCollisionWorld } from './world/collisions.js';


// ========== SCENE ==========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 300);
let graphicsQuality = 'medium'; // low, medium, high

const renderer = new THREE.WebGLRenderer({ antialias: !window.matchMedia('(max-width: 700px)').matches, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xfff8e7, 1.3);
sun.position.set(70, 100, 50);
let dayTime = 0;
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 250;
sun.shadow.camera.left = sun.shadow.camera.bottom = -100;
sun.shadow.camera.right = sun.shadow.camera.top = 100;
sun.shadow.bias = -0.0005;
scene.add(sun);

const ground = createTerrain(THREE, scene, getGroundHeight);

// Obstáculos físicos e visuais da câmera.
const rockColliders = [];
const collisionWorld = createCollisionWorld();
const allColliders = collisionWorld.colliders;
const cameraObstacles = [ground];
const natureAssets = createNatureAssets(THREE);

// ========== PERSONAGEM ==========
const {player,avatar,torso,headRig,leftLeg,rightLeg,leftArm,rightArm,weapon,hammerHead,spearHead} =
    createPlayerModel(THREE,scene);

// ========== CONTROLS ==========
// Terceira pessoa: não use PointerLockControls sobre a mesma câmera,
// pois ele também aplica rotação e conflita com camera.lookAt().
const controls = {
    get isLocked() { return document.pointerLockElement === renderer.domElement; },
    lock() {
        try {
            const promise = renderer.domElement.requestPointerLock?.();
            promise?.catch(() => showPauseMenu('Clique em continuar para capturar o mouse.'));
        } catch (_) { showPauseMenu('Clique em continuar para capturar o mouse.'); }
    },
    unlock() { if (this.isLocked) document.exitPointerLock?.(); }
};

// ========== GAME STATE ==========
let health = 100;
let maxHealth = 100;
let level = 1, xp = 0, kills = 0;
// Fases distintas de campanha; o último capítulo exige o chefe derrotado.
let questStage = 0, bossDefeated = false, bossSpawned = false;
const shrinePosition = Object.freeze({x:32,z:-28});


let currentWeapon = 0, unlockedWeaponCount = 1;
let dashCooldown = 0, dashTimer = 0;
const dashDirection = new THREE.Vector3();

const xpRequired = () => 4 + level * 3;
let invulnerableTimer = 0, elapsed = 0;
let spawnTimer = 4;
let mousePitch = 0.18;
let cameraZoom = 7.6;
let toastTimer = null;
let score = 0;
const goalScore = 10;
let wave = 1;
let gameActive = false;

let speedBoost = 1;
let speedBoostTimer = 0;
const keys = {};
const baseSpeed = 7.5;
const runMultiplier = 1.65;
const velocity = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const moveDir = new THREE.Vector3();
let playerYaw = 0;
let verticalVelocity = 0;
let isGrounded = true;
const gravity = -25;
const jumpForce = 8.5;

const collectibles = [];
const enemies = [];
const healthPacks = [];
const speedBoosts = [];
const trees = [];
const particles = [];
const treeColliders = [];

const forest = createForest({THREE,scene,natureAssets,getGroundHeight,shrinePosition,
    collisionWorld,rockColliders,treeColliders,cameraObstacles,trees});
const cameraRig=createCameraRig({THREE,camera,player,raycaster,getGroundHeight,cameraObstacles,scene});

function getGroundHeight(x, z) {
    return Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.6 + Math.sin(x * 0.3) * 0.15;
}

function updateHUD() {
    document.getElementById('health-bar').style.width = Math.max(0, health / maxHealth * 100) + '%';
    document.getElementById('level-display').textContent = `Nível ${level} · XP ${xp}/${xpRequired()} · KOs ${kills}`;
    document.getElementById('xp-bar').style.width = `${100 * xp / xpRequired()}%`;
    const ability = document.getElementById('ability-display');
    ability.textContent = combat.specialCooldown > 0 ? `E · Giratório: ${combat.specialCooldown.toFixed(1)}s` : 'E · Golpe giratório pronto';
    ability.classList.toggle('ready', combat.specialCooldown <= 0);
    document.getElementById('score-display').textContent = `Peças do violão: ${score}/${goalScore}`;
    {
        let closest=Infinity, dx=0, dz=0;
        const trackBoss=questStage===2 && !bossDefeated;
        const bossTarget=enemies.find(e=>e.type==='boss');
        const targets=trackBoss?[bossTarget?bossTarget.mesh.position:shrinePosition]:collectibles.map(c=>c.position);
        for (const target of targets) {
            const xx=target.x-player.position.x, zz=target.z-player.position.z;
            const d=Math.hypot(xx,zz);
            if (d<closest){closest=d;dx=xx;dz=zz;}
        }
        const forward=(-Math.sin(playerYaw)*dx-Math.cos(playerYaw)*dz)/Math.max(0.01,closest);
        const right=(Math.cos(playerYaw)*dx-Math.sin(playerYaw)*dz)/Math.max(0.01,closest);
        const eightArrows=['↑','↗','→','↘','↓','↙','←','↖'];
        const index=(Math.round(Math.atan2(right,forward)/(Math.PI/4))+8)%8;
        document.getElementById('quest-display').textContent = Number.isFinite(closest) ?
            `${eightArrows[index]} ${trackBoss?'Guardião do templo':'Próxima peça'}: ${Math.round(closest)} m` :
            'Todas as peças no inventário';
    }
    document.getElementById('wave-display').textContent = `Onda: ${wave}`;
    document.getElementById('enemies-left').textContent = `Inimigos: ${enemies.length}`;
    document.getElementById('boost-display').textContent = speedBoostTimer > 0 ? `⚡ Velocidade: ${speedBoostTimer.toFixed(1)}s` : '';
    document.getElementById('dodge-display').textContent = dashCooldown > 0 ? `Q · Esquiva: ${dashCooldown.toFixed(1)}s` : 'Q · Esquiva pronta';
    const chapterNames = ['Capítulo 1 · Fragmentos perdidos', 'Capítulo 2 · A resistência', 'Capítulo 3 · Guardião da floresta'];
    const goals = [
        `Encontre 4 peças do violão (${Math.min(4,score)}/4)`,
        `Derrote 6 monstros (${Math.min(6,kills)}/6)`,
        `Recupere 10 peças (${Math.min(10,score)}/10) e vença o guardião ${bossDefeated?'✓':'✗'}`
    ];
    document.getElementById('mission-title').textContent = chapterNames[questStage];
    document.getElementById('mission-goal').textContent = goals[questStage];
    document.getElementById('equipment-display').textContent = `Arma [${currentWeapon+1}]: ${weaponTypes[currentWeapon].name} · ` +
        (unlockedWeaponCount < 3 ? `[${unlockedWeaponCount+1}] bloqueada` : 'Todas desbloqueadas');
    document.getElementById('target-hint').textContent = questStage === 2 && !bossDefeated ? 'Siga a bússola até as ruínas · chefe amarelo no mapa' : 'Dourado no minimapa: fragmentos';
    const boss = enemies.find(e => e.type === 'boss');
    document.getElementById('boss-bar-wrapper').classList.toggle('hidden', !boss);
    if (boss) {
        document.getElementById('boss-bar').style.width = `${Math.max(0,100*boss.hp/boss.maxHp)}%`;
        document.getElementById('boss-name').textContent = boss.enraged ?
            'Guardião da Floresta · Fase 2 · Fúria' : 'Guardião da Floresta · Fase 1';
    }
}

function flashDamage() {
    const el = document.getElementById('damage-flash');
    el.style.opacity = '1';
    clearTimeout(el._flashTimer);
    el._flashTimer = setTimeout(() => el.style.opacity = '0', 160);
}
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message; toast.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.style.opacity = '0', 1800);
}
function gainXP(amount) {
    xp += amount;
    while (xp >= xpRequired()) {
        xp -= xpRequired(); level++;
        maxHealth += 12;
        health = Math.min(maxHealth, health + 30);
        sfx.heal(); showToast(`⭐ Nível ${level}! +vida e +força`);
    }
    updateHUD();
}
function equipWeapon(index) {
    if (index < 0 || index >= unlockedWeaponCount) {
        showToast('🔒 Arma liberada ao completar missões'); return false;
    }
    currentWeapon = index;
    const selected = weaponTypes[index];
    weapon.scale.set(1, selected.scale, 1);
    hammerHead.visible = index === 1;
    spearHead.visible = index === 2;
    weapon.material.color.setHex(selected.color);
    weapon.position.y = -1.17;
    showToast(`⚔ ${selected.name} equipada`);
    updateHUD(); return true;
}
function advanceQuestIfReady() {
    // Apenas eventos de missão alteram o progresso; combate e coleta chamam esta função.
    if (questStage === 0 && score >= 4) {
        questStage = 1; unlockedWeaponCount = Math.max(unlockedWeaponCount,2);
        equipWeapon(1);
        showToast('MISSÃO 2! Derrote 6 monstros · Marreta desbloqueada');
    }
    if (questStage === 1 && kills >= 6) {
        questStage = 2; unlockedWeaponCount = 3;
        equipWeapon(2);
        showToast('MISSÃO FINAL! Derrote o guardião e recupere as peças');
        if (!bossSpawned) { bossSpawned = true; spawnEnemy('boss'); }
    }
    if (questStage === 2 && score >= goalScore && bossDefeated && gameActive) winGame();
    updateHUD();
}
function doDodge() {
    if (!gameActive || !controls.isLocked || dashCooldown > 0) return false;
    const inputX = Number(!!(keys.KeyD || keys.ArrowRight)) - Number(!!(keys.KeyA || keys.ArrowLeft));
    const inputZ = Number(!!(keys.KeyS || keys.ArrowDown)) - Number(!!(keys.KeyW || keys.ArrowUp));
    const cos = Math.cos(playerYaw), sin = Math.sin(playerYaw);
    dashDirection.set(inputX*cos + inputZ*sin, 0, -inputX*sin + inputZ*cos);
    if (dashDirection.lengthSq() < 0.01) dashDirection.set(-sin,0,-cos);
    dashDirection.normalize();
    dashCooldown = 3.6; dashTimer = 0.24;
    invulnerableTimer = Math.max(invulnerableTimer,0.32);
    sfx.boost(); updateHUD(); return true;
}
function damagePlayer(amount, origin) {
    if (!gameActive || invulnerableTimer > 0) return false;
    health = Math.max(0,health-amount);
    invulnerableTimer = 0.86; flashDamage(); sfx.damage();
    const dx = player.position.x-origin.x, dz = player.position.z-origin.z;
    const d = Math.hypot(dx,dz)||1;
    const away = resolveCollision(player.position.x+dx/d*0.5,player.position.z+dz/d*0.5,0.46);
    player.position.x=away.x; player.position.z=away.z;
    updateHUD();
    if (health <= 0) loseGame();
    return true;
}
const projectileSystem = createProjectileSystem({THREE,scene,player,allColliders,isPositionFree,damagePlayer,
    removeMesh,isGameActive:()=>gameActive});

function removeMesh(mesh) {
    scene.remove(mesh);
    const disposed=new Set();
    mesh.traverse(node => {
        if (!node.isMesh) return;
        // Recursos partilhados entre braços/pernas de um mesmo inimigo são descartados uma só vez.
        if (node.geometry && !disposed.has(node.geometry)) {
            disposed.add(node.geometry);node.geometry.dispose();
        }
        for (const m of (Array.isArray(node.material) ? node.material : [node.material])) {
            if (m && !disposed.has(m)) {disposed.add(m);m.dispose();}
        }
    });
}

const particleGeometry = new THREE.SphereGeometry(0.07, 6, 6);
function spawnParticle(pos, color, count = 8) {
    for (let i = 0; i < count; i++) {
        const p = new THREE.Mesh(
            particleGeometry,
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
        );
        p.position.copy(pos);
        p.userData = {
            vel: new THREE.Vector3((Math.random()-0.5)*5, 2 + Math.random()*3.5, (Math.random()-0.5)*5),
            life: 1
        };
        scene.add(p);
        particles.push(p);
    }
}


function isPositionFree(x, z, radius = 0.9) {
    return collisionWorld.isPositionFree(x,z,radius);
}
function resolveCollision(x, z, radius = 0.45) {
    return collisionWorld.resolveCollision(x,z,radius);
}
function findSpawnPoint(minRange = 10, maxRange = 70, radius = 1) {
    for (let i = 0; i < 100; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = minRange + Math.random() * (maxRange - minRange);
        const x = THREE.MathUtils.clamp(player.position.x + Math.sin(angle) * distance, -103, 103);
        const z = THREE.MathUtils.clamp(player.position.z + Math.cos(angle) * distance, -103, 103);
        if (isPositionFree(x, z, radius) && Math.hypot(x - player.position.x, z - player.position.z) > minRange - 0.1) return {x, z};
    }
    // Nunca criar um item ou inimigo dentro de uma árvore em caso de falha.
    for (let x = -100; x <= 100; x += 5) for (let z = -100; z <= 100; z += 5) {
        if (isPositionFree(x, z, radius) && Math.hypot(x-player.position.x,z-player.position.z)>minRange) return {x, z};
    }
    return { x: 0, z: 0 };
}
function spawnCollectible(at = null) {
    // Fragmento dourado do violão, em vez de um anel genérico.
    const item = new THREE.Group();
    const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.3), new THREE.MeshStandardMaterial({
        color: 0xfbd270, emissive: 0xb56c09, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.5
    }));
    shard.rotation.z = 0.4; shard.castShadow = true; item.add(shard);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.028, 6, 22),
        new THREE.MeshBasicMaterial({color: 0xffdf70}));
    halo.rotation.x = Math.PI / 3; item.add(halo);
    const spot = at || findSpawnPoint(8, 72);
    item.position.set(spot.x, getGroundHeight(spot.x, spot.z) + 0.85, spot.z);
    item.userData.baseY = item.position.y;
    scene.add(item);
    collectibles.push(item);
}

function spawnHealthPack(at = null) {
    const geo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, emissive: 0x1abc9c, emissiveIntensity: 0.4, roughness: 0.4 });
    const pack = new THREE.Mesh(geo, mat);
    const spot = at || findSpawnPoint(9, 65);
    pack.position.set(spot.x, getGroundHeight(spot.x, spot.z) + 0.55, spot.z);
    pack.castShadow = true;
    scene.add(pack);
    healthPacks.push(pack);
}

function spawnSpeedBoost(at = null) {
    const geo = new THREE.OctahedronGeometry(0.28);
    const mat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x0099cc, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.3 });
    const boost = new THREE.Mesh(geo, mat);
    const spot = at || findSpawnPoint(10, 65);
    boost.position.set(spot.x, getGroundHeight(spot.x, spot.z) + 0.7, spot.z);
    boost.userData.baseY = boost.position.y;
    boost.castShadow = true;
    scene.add(boost);
    speedBoosts.push(boost);
}

const spawnEnemy = createEnemySpawner({THREE,scene,getGroundHeight,findSpawnPoint,shrinePosition,enemies});
const shrine = createShrineSystem({THREE,scene,shrinePosition,getGroundHeight,
    addCollider:collisionWorld.add,cameraObstacles,getGraphicsQuality:()=>graphicsQuality});
let worldSeed = Math.floor(Math.random() * 0x100000000);
function initWorld() {
    applyGraphicsSettings(THREE,graphicsQuality,renderer,scene,sun);
    forest.generate(graphicsQuality,worldSeed);
    // Primeiro a arena e os obstáculos; depois os elementos dinâmicos.
    shrine.create();
    cameraRig.refreshObstacles();
    forest.updateVisibility(player.position,graphicsQuality,0,true);
    for (let i=0; i<12; i++) spawnCollectible();
    for (let i=0; i<4; i++) spawnHealthPack();
    for (let i=0; i<3; i++) spawnSpeedBoost();
    for (let i=0; i<4; i++) spawnEnemy('normal');
    for (let i=0; i<2; i++) spawnEnemy('fast');
    spawnEnemy('tank');spawnEnemy('shaman');
    updateHUD();
}

// Checkpoints. localStorage é específico da origem/domínio do GitHub Pages.
const progressStorage = (()=>{try{return window.localStorage;}catch(_){return null;}})();
let availableSave = readSave(progressStorage);
let saveTick=0;
function serializeProgress() {
    return {
        seed:worldSeed,graphicsQuality,level,xp,kills,health,maxHealth,score,questStage,
        bossDefeated,bossSpawned,currentWeapon,unlockedWeaponCount,wave,elapsed,
        player:{x:player.position.x,z:player.position.z,yaw:playerYaw},
        collectibles:collectibles.map(item=>({x:item.position.x,z:item.position.z})),
        healthPacks:healthPacks.map(item=>({x:item.position.x,z:item.position.z})),
        speedBoosts:speedBoosts.map(item=>({x:item.position.x,z:item.position.z})),
        enemies:enemies.map(enemy=>({type:enemy.type,x:enemy.mesh.position.x,z:enemy.mesh.position.z,
            hp:enemy.hp,enraged:enemy.enraged}))
    };
}
function saveProgress(manual=false) {
    if (!worldInitialized || !gameActive || health<=0) return false;
    const saved = writeSave(progressStorage,serializeProgress());
    if (saved) {availableSave=readSave(progressStorage);if (manual) showToast('💾 Progresso salvo neste navegador');}
    else if (manual) showToast('⚠ Armazenamento indisponível. Não foi possível salvar.');
    return saved;
}
function replaceItems(items, data, create) {
    for (const item of items) removeMesh(item);
    items.length=0;
    for (const at of data) create(at);
}
function restoreProgress(data) {
    level=data.level;xp=data.xp;kills=data.kills;maxHealth=data.maxHealth;health=data.health;
    score=data.score;questStage=data.questStage;bossDefeated=data.bossDefeated;
    bossSpawned=data.bossSpawned;unlockedWeaponCount=data.unlockedWeaponCount;
    wave=data.wave;elapsed=data.elapsed;spawnTimer=4;
    const location=resolveCollision(data.player.x,data.player.z,.46);
    player.position.set(location.x,getGroundHeight(location.x,location.z),location.z);
    playerYaw=data.player.yaw;player.rotation.y=playerYaw;
    replaceItems(collectibles,data.collectibles,spawnCollectible);
    replaceItems(healthPacks,data.healthPacks,spawnHealthPack);
    replaceItems(speedBoosts,data.speedBoosts,spawnSpeedBoost);
    for(const enemy of enemies) removeMesh(enemy.mesh);
    enemies.length=0;
    for(const savedEnemy of data.enemies) {
        spawnEnemy(savedEnemy.type);
        const enemy=enemies[enemies.length-1];
        enemy.mesh.position.set(savedEnemy.x,getGroundHeight(savedEnemy.x,savedEnemy.z)+enemy.size/2,savedEnemy.z);
        enemy.hp=Math.min(enemy.maxHp,savedEnemy.hp);
        if (savedEnemy.type==='boss' && savedEnemy.enraged) {
            enemy.enraged=true;enemy.speed*=1.28;
            enemy.mesh.material.color.setHex(0xe24629);
        }
    }
    // Proteção para checkpoint antigo/inconsistente: não deixar a missão final sem chefe.
    if (questStage===2 && !bossDefeated && !enemies.some(e=>e.type==='boss'))
        spawnEnemy('boss');
    equipWeapon(Math.min(data.currentWeapon,unlockedWeaponCount-1));
    invulnerableTimer=.75;dashCooldown=0;dashTimer=0;
    velocity.set(0,0,0);verticalVelocity=0;isGrounded=true;
    updateHUD();
}
function updateContinueButton() {
    const button=document.getElementById('load-btn');
    button.classList.toggle('hidden',!availableSave);
    if(availableSave) button.textContent=`Continuar partida salva · Nível ${availableSave.level} · Capítulo ${availableSave.questStage+1}`;
}

// ========== INPUT / COMBATE / PAUSA ==========
const overlay = document.getElementById('overlay');
const pauseMenu = document.getElementById('pause-menu');
function showPauseMenu(message = '') {
    if (!gameActive) return;
    pauseMenu.classList.remove('hidden');
    if (message) pauseMenu.querySelector('p').textContent = message;
    Object.keys(keys).forEach(key => { keys[key] = false; });
}
function resumeGame() { pauseMenu.classList.add('hidden'); initAudio(); controls.lock(); }
document.addEventListener('keydown', e => {
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    keys[e.code] = true;
    if (e.code === 'F3') e.preventDefault();
    if (e.code === 'F3' && !e.repeat) {
        showFps = !showFps;
        fpsDisplay.classList.toggle('hidden', !showFps);
    }
    if (!gameActive || !controls.isLocked || e.repeat) return;
    if (e.code === 'Space' && isGrounded) {
        verticalVelocity = jumpForce; isGrounded = false; sfx.boost();
    }
    if (e.code === 'KeyJ') combat.attack();
    if (e.code === 'KeyE') combat.special();
    if (e.code === 'KeyQ') doDodge();
    if (e.code === 'Digit1') equipWeapon(0);
    if (e.code === 'Digit2') equipWeapon(1);
    if (e.code === 'Digit3') equipWeapon(2);
    if (e.code === 'KeyP') saveProgress(true);
});
document.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { Object.keys(keys).forEach(key => keys[key] = false); if (controls.isLocked) controls.unlock(); });

function setGfx(q, activeBtn) {
    graphicsQuality = q;
    document.querySelectorAll('.gfx-btn').forEach(b => b.style.background = '#555');
    activeBtn.style.background = '#e74c3c';
    try { localStorage.setItem('madrugacraft.gfx', q); } catch (_) {}
}
document.getElementById('gfx-low').onclick = () => setGfx('low', document.getElementById('gfx-low'));
document.getElementById('gfx-med').onclick = () => setGfx('medium', document.getElementById('gfx-med'));
document.getElementById('gfx-high').onclick = () => setGfx('high', document.getElementById('gfx-high'));
        try {
            const savedQuality = localStorage.getItem('madrugacraft.gfx');
            if (['low','medium','high'].includes(savedQuality))
                setGfx(savedQuality, document.getElementById('gfx-'+(savedQuality==='medium'?'med':savedQuality)));
        } catch (_) {}
let worldInitialized = false;
function beginAdventure(restore=false) {
    const save = restore ? availableSave : null;
    if (!save) {clearSave(progressStorage);availableSave=null;}
    else {
        worldSeed=save.seed;
        graphicsQuality=save.graphicsQuality;
    }
    if (!worldInitialized) {initWorld();worldInitialized=true;}
    if (save) restoreProgress(save);
    overlay.classList.add('hidden');
    gameActive=true;saveTick=0;
    initAudio();controls.lock();
}
document.getElementById('start-btn').onclick = () => beginAdventure(false);
document.getElementById('load-btn').onclick = () => beginAdventure(true);
document.getElementById('save-btn').onclick = () => saveProgress(true);
updateContinueButton();
document.getElementById('resume-btn').onclick = resumeGame;
document.getElementById('restart-btn').onclick = () => location.reload();
document.addEventListener('pointerlockchange', () => {
    document.getElementById('instructions').style.opacity = controls.isLocked ? '0.6' : '1';
    if (controls.isLocked) pauseMenu.classList.add('hidden');
    else if (gameActive) {saveProgress();showPauseMenu();}
});
document.addEventListener('wheel', e => {
    if (!controls.isLocked || !gameActive) return;
    e.preventDefault();
    cameraZoom=THREE.MathUtils.clamp(cameraZoom+e.deltaY*.004,4.0,11.0);
    cameraRig.setDistance(cameraZoom);
}, {passive:false});
document.addEventListener('mousemove', e => {
    if (!controls.isLocked || !gameActive) return;
    playerYaw -= e.movementX * 0.003;
    mousePitch = THREE.MathUtils.clamp(mousePitch + e.movementY * 0.003, -0.30, 0.76);
});

const combat = createCombatSystem({THREE,scene,player,enemies,weaponTypes,healthPacks,speedBoosts,particles,
    getGroundHeight,resolveCollision,removeMesh,spawnParticle,gainXP,showToast,sfx,
    spawnEnemy,spawnHealthPack,spawnSpeedBoost,advanceQuestIfReady,updateHUD,
    onBossDefeated:()=>{bossDefeated=true;shrine.hideBossTelegraph();},
    onEnemyKilled:()=>{kills++;},
    getLevel:()=>level,getWeaponIndex:()=>currentWeapon,getPlayerYaw:()=>playerYaw,
    isGameActive:()=>gameActive,isLocked:()=>controls.isLocked});

const enemyAI = createEnemyAI({enemies,player,getGroundHeight,resolveCollision,
    showBossTelegraph:shrine.showBossTelegraph,hideBossTelegraph:shrine.hideBossTelegraph,
    damagePlayer,spawnParticle,throwProjectile:projectileSystem.throwProjectile,sfx,
    isGameActive:()=>gameActive});

document.addEventListener('mousedown', e => { if (e.button === 0 && controls.isLocked) combat.attack(); });

// ========== MINIMAPA ==========
const drawMinimap = createMinimap(document.getElementById('minimap'), () => ({
  player, treeColliders, rockColliders, collectibles, healthPacks, speedBoosts,
  enemies, shrinePosition, playerYaw
}));

// ========== GAME LOOP ==========
const clock = new THREE.Clock();
let walkTime = 0, hudTick = 0, minimapTick = 0, fpsTime = 0, fpsFrames = 0;
let showFps = false;
const fpsDisplay = document.getElementById('fps-display');
player.position.y = getGroundHeight(0,0);
camera.position.set(0, 3.8, 7.4);
camera.lookAt(0, 1.6, 0);

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (document.hidden) return;
    const running = gameActive && controls.isLocked && health > 0;

    if (running) {
        elapsed += dt;
        saveTick+=dt;
        if(saveTick>=15) {saveTick=0;saveProgress();}
        // Movimento relativo à direção de olhar. Aceleração e frenagem
        // independem da taxa de quadros; diagonal não aumenta a velocidade.
        moveDir.set(0, 0, 0);
        if (keys.KeyW || keys.ArrowUp) moveDir.z -= 1;
        if (keys.KeyS || keys.ArrowDown) moveDir.z += 1;
        if (keys.KeyA || keys.ArrowLeft) moveDir.x -= 1;
        if (keys.KeyD || keys.ArrowRight) moveDir.x += 1;
        moveDir.normalize();
        const currentSpeed = (baseSpeed + (level-1)*0.15) * speedBoost *
            ((keys.ShiftLeft || keys.ShiftRight) ? runMultiplier : 1);
        const cos = Math.cos(playerYaw), sin = Math.sin(playerYaw);
        dashCooldown=Math.max(0,dashCooldown-dt);
        dashTimer=Math.max(0,dashTimer-dt);
        const targetVX = dashTimer>0 ? dashDirection.x*19 : (moveDir.x*cos + moveDir.z*sin) * currentSpeed;
        const targetVZ = dashTimer>0 ? dashDirection.z*19 : (-moveDir.x*sin + moveDir.z*cos) * currentSpeed;
        const moveBlend = 1 - Math.exp(-13 * dt);
        velocity.x += (targetVX - velocity.x)*moveBlend;
        velocity.z += (targetVZ - velocity.z)*moveBlend;

        // Deslizar por paredes/troncos: eixos tratados separadamente.
        const cx = resolveCollision(player.position.x + velocity.x * dt, player.position.z, 0.46);
        const cz = resolveCollision(cx.x, player.position.z + velocity.z * dt, 0.46);
        player.position.x = cz.x;
        player.position.z = cz.z;
        const groundY = getGroundHeight(player.position.x, player.position.z);
        if (!isGrounded) {
            verticalVelocity += gravity * dt;
            player.position.y += verticalVelocity * dt;
            if (player.position.y <= groundY) {
                player.position.y = groundY; verticalVelocity = 0; isGrounded = true;
            }
        } else player.position.y = groundY;
        player.rotation.y = playerYaw;

        const movingSpeed = Math.hypot(velocity.x, velocity.z);
        const motionFactor = THREE.MathUtils.clamp(movingSpeed/baseSpeed,0,1.7);
        const stride = (movingSpeed > .4 && moveDir.lengthSq()>.01) ? motionFactor : 0;
        walkTime += dt * (8.5 + movingSpeed*.48) * (stride>0?1:0);
        const blend=1-Math.exp(-12*dt);
        const legSwing=Math.sin(walkTime)*.62*stride;
        leftLeg.rotation.x=THREE.MathUtils.lerp(leftLeg.rotation.x,legSwing,blend);
        rightLeg.rotation.x=THREE.MathUtils.lerp(rightLeg.rotation.x,-legSwing,blend);
        leftArm.rotation.x=THREE.MathUtils.lerp(leftArm.rotation.x,-legSwing*.68,blend);
        rightArm.rotation.x=THREE.MathUtils.lerp(rightArm.rotation.x,legSwing*.50-.20,blend);
        const hop=(stride>0?Math.abs(Math.sin(walkTime))*.055*stride:Math.sin(elapsed*2)*.014);
        torso.position.y=1.15+hop;
        torso.rotation.z=THREE.MathUtils.lerp(torso.rotation.z,
            (dashTimer>0?.13:-moveDir.x*.075),blend);
        torso.rotation.x=THREE.MathUtils.lerp(torso.rotation.x,dashTimer>0?-.20:.015*stride,blend);
        headRig.rotation.z=Math.sin(elapsed*1.2)*.027;
        combat.update(dt);
        if(combat.isAttacking){
            const progress=1-combat.attackAnimTimer/combat.attackAnimDuration;
            const arc=Math.sin(progress*Math.PI);
            rightArm.rotation.x=-.32-arc*2.05;
            rightArm.rotation.z=-.18-arc*.32;
            torso.rotation.y=-arc*.23;
        } else {
            rightArm.rotation.z=THREE.MathUtils.lerp(rightArm.rotation.z,-.08,blend);
            torso.rotation.y=THREE.MathUtils.lerp(torso.rotation.y,0,blend);
        }
        invulnerableTimer = Math.max(0, invulnerableTimer-dt);
        player.visible = invulnerableTimer<=0 || Math.floor(invulnerableTimer*12)%2 === 0;

        if (speedBoostTimer > 0) {
            speedBoostTimer = Math.max(0,speedBoostTimer-dt);
            if (speedBoostTimer===0) speedBoost = 1;
        }

        // Árvore distante fica invisível, mas mantém seu collider físico.
        forest.updateVisibility(player.position,graphicsQuality,dt);
        cameraRig.update(dt,playerYaw,mousePitch);

        // Peças do violão: altura da oscilação acompanha o chão real.
        for (let i=collectibles.length-1; i>=0; i--) {
            const item=collectibles[i];
            item.rotation.y += dt*2.1;
            item.position.y = item.userData.baseY + Math.sin(elapsed*3+i)*0.16;
            if (Math.hypot(player.position.x-item.position.x,player.position.z-item.position.z)<1.3 &&
                Math.abs(player.position.y-item.position.y)<2.3) {
                const position=item.position.clone();
                removeMesh(item); collectibles.splice(i,1); score++;
                spawnParticle(position,0xffd66e,14); sfx.collect();
                advanceQuestIfReady();
                if (!gameActive) break;
                if (collectibles.length<6 && score<goalScore) spawnCollectible();
                wave=Math.min(6,Math.floor(score/3)+1);
                showToast(`🎸 Peça encontrada! ${score}/${goalScore}`);
                updateHUD();
            }
        }
        // Vitória encerra a simulação imediatamente; inimigos não podem
        // causar Game Over depois que o último fragmento foi coletado.
        if (!gameActive) { drawMinimap(); renderer.render(scene,camera); return; }
        for (let i=healthPacks.length-1; i>=0 && gameActive; i--) {
            const pack=healthPacks[i]; pack.rotation.y+=dt*1.6;
            if (health<maxHealth && Math.hypot(player.position.x-pack.position.x,player.position.z-pack.position.z)<1.25) {
                const position=pack.position.clone();
                removeMesh(pack);healthPacks.splice(i,1);
                health=Math.min(maxHealth,health+28);
                sfx.heal();spawnParticle(position,0x2ecc71,9);updateHUD();
            }
        }
        for (let i=speedBoosts.length-1; i>=0 && gameActive; i--) {
            const boost=speedBoosts[i];boost.rotation.y+=dt*2.5;
            boost.position.y=boost.userData.baseY+Math.sin(elapsed*3+i)*0.13;
            if (Math.hypot(player.position.x-boost.position.x,player.position.z-boost.position.z)<1.3) {
                const position=boost.position.clone();removeMesh(boost);speedBoosts.splice(i,1);
                speedBoost=1.75;speedBoostTimer=7;
                sfx.boost();spawnParticle(position,0x00d4ff,10);updateHUD();
            }
        }

        enemyAI.update(dt,elapsed);
        projectileSystem.update(dt);
        if (!gameActive) { drawMinimap(); renderer.render(scene,camera); return; }
        // Spawn por SEGUNDOS, não por quadro: dificuldade coerente a 30/60/144 FPS.
        spawnTimer-=dt;
        if (spawnTimer<=0) {
            spawnTimer=Math.max(2.5,8-wave*0.7)+Math.random()*2;
            if (enemies.length<Math.min(15,7+wave*2)) {
                const r=Math.random();spawnEnemy(r<0.4?'normal':r<0.66?'fast':r<0.86?'tank':'shaman');
            }
        }
        hudTick+=dt;
        if (hudTick>0.12) { hudTick=0;updateHUD(); }

        // Dia/noite só evolui durante o jogo ativo.
        dayTime+=dt*0.08;
        const sunAngle=dayTime%(Math.PI*2);
        sun.position.set(Math.cos(sunAngle)*80,Math.sin(sunAngle)*60+40,Math.sin(sunAngle)*40);
        const intensity=Math.max(0.28,Math.sin(sunAngle)*0.8+0.6);
        sun.intensity=intensity*1.4;
        ambient.intensity=0.25+intensity*0.35;
        scene.background.setHSL(0.6,0.5,0.4+intensity*0.3);
        scene.fog.color.copy(scene.background);

        shrine.update(dt,elapsed);
        combat.tickEffects(dt);
    }
    if (showFps) {
        fpsTime += dt; fpsFrames++;
        if (fpsTime > .75) {
            fpsDisplay.textContent = `FPS: ${Math.round(fpsFrames/fpsTime)} · Draw calls: ${renderer.info.render.calls} · Árvores: ${forest.visibilityStats.visibleTrees}/${forest.visibilityStats.totalTrees}`;
            fpsTime=0; fpsFrames=0;
        }
    }
    minimapTick += dt;
    if (minimapTick >= 0.10) { minimapTick = 0; drawMinimap(); }
    renderer.render(scene,camera);
}

function winGame() {
    gameActive = false;
    clearSave(progressStorage);
    sfx.win();
    document.getElementById('go-title').textContent = 'Vitória!';
    document.getElementById('go-title').style.color = '#2ecc71';
    document.getElementById('go-msg').textContent = `Você completou os 3 capítulos, derrotou o guardião e reuniu ${score} peças do violão! Nível ${level} · ${kills} inimigos vencidos.`;
    document.getElementById('gameover').classList.remove('hidden');
    controls.unlock();
}

function loseGame() {
    gameActive = false;
    clearSave(progressStorage);
    sfx.lose();
    document.getElementById('go-title').textContent = 'Game Over';
    document.getElementById('go-title').style.color = '#e74c3c';
    document.getElementById('go-msg').textContent = `Você recuperou ${score} peças e derrotou ${kills} monstros. Tente novamente!`;
    document.getElementById('gameover').classList.remove('hidden');
    controls.unlock();
}

window.addEventListener('pagehide',()=>saveProgress());
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveProgress();});

// O mundo só é criado depois da escolha de qualidade, não antes.
updateHUD();
animate();
window.__madrugaReady = true;

window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});
