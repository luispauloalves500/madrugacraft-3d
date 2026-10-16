# MadrugaCraft 3D — Registro v0.6

Base de comparação: v0.5. Nenhuma reescrita do jogo do zero.

## Implementações

- `src/characters/player-model.js`: esqueleto do personagem e armas articuladas.
- `src/characters/enemy-factory.js`: modelos e atributos iniciais de inimigos.
- `src/gameplay/enemy-ai.js`: perseguição, ataques, xamã e chefe de duas fases.
- `src/gameplay/combat.js`: hitboxes de golpes, dano e efeitos com reciclagem.
- `src/gameplay/projectiles.js`: criação, atualização, impacto e remoção.
- `src/world/shrine.js`: templo e indicador de área de impacto.
- `src/world/collisions.js`: índice espacial de obstáculos com consultas locais.

## Compatibilidade

- Sem build de npm, HTML em raiz e ES modules com caminhos relativos.
- Servidor Windows via PowerShell e GitHub Pages mantidos.
- Regras de missões, progresso de XP, teclas e chefe preservados.
- Biblioteca Three.js 0.160.0 ainda é importada por CDN.

## Testes

Execute `npm test` e `npm run check`.
Abrangência: 21 regressões, 5 testes de módulos, 7 testes de integração
(avatar, fabricante de inimigos, IA, combate, projéteis, arena e colisões).
O teste WebGL completo não pôde ser feito devido às restrições do navegador neste ambiente.
