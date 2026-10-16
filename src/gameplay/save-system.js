// Checkpoint da campanha (apenas valores simples, sem serializar objetos Three.js).
// Dados locais são não confiáveis: tamanho, formatos e limites são validados antes de restaurar.
export const SAVE_KEY = 'madrugacraft.save.v1';
const validNumber = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
const validInteger = (n, min, max) => Number.isInteger(n) && validNumber(n, min, max);
const validPoint = p => p && validNumber(p.x,-109,109) && validNumber(p.z,-109,109);
const validPoints = (items,max) => Array.isArray(items) && items.length<=max && items.every(validPoint);
const types = new Set(['normal','fast','tank','shaman','boss']);
export function validateSave(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    if (data.version !== 1 || !validInteger(data.seed,0,0xffffffff) ||
        !['low','medium','high'].includes(data.graphicsQuality)) return null;
    if (!validInteger(data.level,1,100) || !validInteger(data.xp,0,100000) ||
        !validInteger(data.kills,0,100000) || !validNumber(data.maxHealth,100,1300) ||
        !validNumber(data.health,1,data.maxHealth) ||
        !validInteger(data.score,0,10) || !validInteger(data.questStage,0,2) ||
        typeof data.bossDefeated!=='boolean' || typeof data.bossSpawned!=='boolean' ||
        !validInteger(data.unlockedWeaponCount,1,3) ||
        !validInteger(data.currentWeapon,0,data.unlockedWeaponCount-1) ||
        !validInteger(data.wave,1,6) || !validNumber(data.elapsed,0,1000000)) return null;
    if (!validPoint(data.player) || !validNumber(data.player.yaw,-1e9,1e9)) return null;
    if (!validPoints(data.collectibles,18) || !validPoints(data.healthPacks,20) ||
        !validPoints(data.speedBoosts,18) || !Array.isArray(data.enemies) ||
        data.enemies.length>30 || !data.enemies.every(e => validPoint(e) && types.has(e.type) &&
            validInteger(e.hp,1,e.type==='boss'?24:4) && typeof e.enraged==='boolean')) return null;
    if (data.enemies.filter(e=>e.type==='boss').length>1) return null;
    if ((data.questStage===0 && (data.score>=4 || data.unlockedWeaponCount!==1)) ||
        (data.questStage===1 && (data.kills>=6 || data.unlockedWeaponCount<2)) ||
        (data.questStage===2 && data.unlockedWeaponCount!==3)) return null;
    return data;
}
export function readSave(storage) {
    try {
        const raw = storage?.getItem(SAVE_KEY);
        if (!raw || raw.length > 24000) return null;
        return validateSave(JSON.parse(raw));
    } catch (_) { return null; }
}
export function writeSave(storage, data) {
    try {
        const parsed = validateSave({version:1,...data});
        if (!parsed || !storage) return false;
        storage.setItem(SAVE_KEY,JSON.stringify(parsed));
        return true;
    } catch (_) { return false; }
}
export function clearSave(storage) {
    try {storage?.removeItem(SAVE_KEY);return true;} catch (_) {return false;}
}
