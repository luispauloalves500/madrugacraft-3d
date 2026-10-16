import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = path => readFileSync(resolve(root,path),'utf8');
const html = load('index.html');
const main = load('src/main.js');
assert.match(html, /<script type="module" src="\.\/src\/main\.js"><\/script>/);
assert.match(html, /<link rel="stylesheet" href="\.\/styles\/main\.css">/);
assert.ok(!html.includes('<script type="module">'),'Jogo principal não pode estar embutido em HTML');
assert.ok(html.length < 10000,`index.html longo demais: ${html.length}`);
assert.match(html, /"three": "https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/build\/three\.module\.js"/);
let count=0;
for (const [from,code] of [['src/main.js',main],
    ...['src/audio/sfx.js','src/render/quality.js','src/world/nature-assets.js',
    'src/world/terrain.js','src/ui/minimap.js','src/gameplay/equipment.js',
    'src/characters/player-model.js','src/characters/enemy-factory.js',
    'src/gameplay/enemy-ai.js','src/gameplay/combat.js','src/gameplay/projectiles.js','src/world/shrine.js',
    'src/world/collisions.js']
      .map(path=>[path,load(path)])]) {
  for (const [,rel] of code.matchAll(/from ['"](\.[^'"]+)['"]/g)) {
    assert.ok(existsSync(resolve(root,dirname(from),rel)),`Import quebrado: ${from} -> ${rel}`);
    count++;
  }
}
for (const id of main.matchAll(/getElementById\('([\w-]+)'\)/g)) {
  assert.ok(html.includes(`id="${id[1]}"`),`Falta o elemento ${id[1]}`);
}
assert.match(main,/minimapTick >= 0\.10/,'Limite de frequência no minimapa ausente');
assert.match(main,/if \(document\.hidden\) return/,'Aba oculta não deve renderizar');
assert.match(main,/const natureAssets = createNatureAssets/,'Geometrias não foram compartilhadas');
assert.match(load('src/world/nature-assets.js'),/leafGeometry/);
assert.match(load('scripts/serve.ps1'),/TcpListener/);
assert.ok(existsSync(resolve(root,'.nojekyll')));
console.log(`OK estrutura estática, ${count} imports locais e GitHub Pages`);
