# Registro de engenharia — MadrugaCraft v0.8

**Base:** código-fonte da v0.7, sem mudança de arquitetura de distribuição ou schema de save.

## Sistemas novos

1. `src/render/visibility.js`: visibilidade de árvores/rochas dependente de distância, 3 perfis, histerese para reduzir popping e desligamento de sombras distantes. Colisores e seed permanecem intactos.
2. `src/render/camera-rig.js`: câmera orbital com seleção geométrica de obstáculos próximos ao segmento câmera/jogador e raio reduzido quando bloqueado. Origem e cache dos obstáculos calculados após `forest.generate()` e `shrine.create()`.
3. `src/characters/enemy-animation.js`: poses procedurais para rig dos inimigos, movimento, antecipação de ataque, oscilação de cabeça e aura do chefe enfurecido.
4. `src/characters/enemy-factory.js`: rig visual articulado com braços/pernas e máscara, integrando cabeça, olhos, chifres e coroa.
5. `src/main.js`: chama novos sistemas, zoom por scroll, medição de draw calls/árvores visíveis em F3 e descarte de materiais sem duplicidade.

## Invariantes e limites

- Salvamento e dados da campanha permanecem com o schema v1 da v0.7; a seed da floresta não mudou.
- A ocultação de árvores não remove colisões e não altera a inteligência artificial.
- Os perfis de renderização podem exibir popping em distâncias extremas; priorizar qualidade alta caso isso seja perceptível.
- A câmera considera árvores/pedras/colunas próximos do segmento, mantendo o terreno no raycast.
- Há mais geometrias para membros dos inimigos; otimizações de vegetação podem economizar draw calls, mas resultados líquidos de FPS dependem do hardware.

## Validação

- `npm test`: 52 verificações = 21 regressão + 5 módulos + 7 integração + 6 checkpoint + 3 floresta + 10 visuais.
- `npm run check`: verificação sintática de todos os módulos críticos.
- `tests/structure.mjs`: valida imports relativos em todos os módulos JS, inclusive os novos.
- Servidor HTTP: HTML, CSS, módulo principal, novos módulos e save-system retornaram HTTP 200 e MIME correto.
- GitHub Pages: paths relativos e workflow mantidos.
- **Limitação:** não houve validação completa da execução Three.js/WebGL nem medição comparativa real de FPS porque o CDN estava inacessível no ambiente de teste.
