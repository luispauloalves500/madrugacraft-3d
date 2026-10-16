# MadrugaCraft 3D — v0.8

Projeto independente de aventura 3D em **Three.js**, evoluído incrementalmente a partir da v0.7. Preserva três capítulos, violão com dez peças, equipamentos, XP, inimigos e guardião final de duas fases.

## Jogar no Windows

1. Extraia todo o ZIP.
2. Execute `INICIAR-JOGO.bat` (abre um servidor PowerShell em `localhost`).
3. Jogue no Chrome/Edge; **mantenha a janela do iniciador aberta**.

O Three.js 0.160.0 é carregado pela internet (jsDelivr) e precisa estar disponível. Não abra `index.html` diretamente usando `file://`, pois os módulos JS exigem servidor HTTP.

## O que mudou na v0.8

- **Renderização da floresta por distância:** `src/render/visibility.js` reduz árvores e rochas desenhadas fora do raio do personagem sem remover as suas colisões. Perfis: mínimo (46 m), médio (72 m), alto (108 m) para árvores; inclui margem de histerese de 2–6 m para reduzir mudanças visuais bruscas.
- **Sombras dinâmicas próximas:** árvores e pedras longe do jogador deixam de projetar sombras. O efeito usa o perfil gráfico existente e é calculado em intervalos de aproximadamente 0,2 segundo, não em todo frame.
- **Câmera desacoplada:** `src/render/camera-rig.js` faz raycasts contra o solo e obstáculos próximos ao caminho entre jogador e câmera. Aproxima imediatamente a câmera ao haver bloqueio e recupera a distância gradualmente.
- **Zoom:** role a roda do mouse durante a partida para ajustar a distância da câmera (4 a 11 m).
- **Inimigos articulados:** braços, pernas, máscara facial e cabeça para todos os cinco tipos, com animações procedurais de caminhada, antecipação de golpe e reação ao dano. O guardião mantém suas duas fases e ganha uma aura quando está enfurecido.
- **Diagnóstico F3:** FPS, draw calls e número de árvores visíveis em relação ao total. Isto permite medir desempenho no seu PC; **não significa que houve ganho quantitativo comprovado**.
- **Descartes:** ao remover personagens dinâmicos, geometrias e materiais compartilhados entre suas partes são liberados uma só vez.
- **Sem quebrar o progresso:** o sistema de save da v0.7, as três missões, os controles anteriores e a organização para GitHub Pages continuam funcionando.

## Salvamento e compatibilidade

- **Salvamento real de campanha em `localStorage`:** nível, XP, vida, KOs, missões, armas, localização, peças, vida extra, bônus, inimigos, vida/fase do chefe e tipo de qualidade.
- **Autosave** a cada ~15 segundos de jogo ativo, ao pausar, ocultar a aba ou fechar a página. **P** grava manualmente durante a partida; botão **Salvar progresso** também aparece na pausa.
- **Continuar partida salva** na tela inicial quando houver um checkpoint. **Nova aventura** começa do zero e substitui o save local anterior.
- **Mundo estável por seed:** rochas e árvores permanecem nas mesmas posições após recarregar, evitando conflitos entre obstáculos e checkpoints.
- **`src/world/forest.js`:** a criação de árvores, pedras, grama, flores, arbustos e acampamento saiu do arquivo principal.
- **Menos chamadas de desenho:** flores e arbustos são agrupados em `InstancedMesh` por material, em vez de criar uma malha individual para cada item de decoração.
- **Validadores de save:** formato, dados numéricos, estados e tamanho de listas são verificados; arquivo de progresso incorreto é ignorado sem bloquear o menu.
- Mantidos os imports relativos, o GitHub Pages, o servidor Windows e o sistema de testes.

O save **não é sincronizado entre aparelhos, navegadores, perfis ou domínios**. Limpar os dados do site pode apagar o progresso. É um save de navegador, não um arquivo físico exportável. A v0.8 usa o **mesmo schema de checkpoint da v0.7**. Progresso salvo no mesmo navegador e na mesma URL/origem pode ser lido; trocar o endereço do site pode alterar o armazenamento usado.

## Publicar no GitHub Pages

1. Envie **o conteúdo** do ZIP `FONTE-GITHUB` para a raiz do repositório (não uma pasta contendo o projeto inteiro).
2. Em `Settings → Pages → Build and deployment`, selecione **GitHub Actions**.
3. Faça push na branch `main`. O workflow executa os testes e a verificação de sintaxe antes do deploy.
4. Acesse a URL do GitHub Pages. O jogo funciona em subcaminhos, por exemplo `usuario.github.io/repositorio/`.

Não existe backend nem compilação de produção: são módulos ES servidos como arquivos estáticos. O jogo precisa de acesso ao CDN da biblioteca Three.js.

## Desenvolver

Requer Node.js 18+ apenas para desenvolvimento:

```sh
npm run dev
npm test
npm run check
```

`npm test` executa **52 verificações**: 21 testes de regressão, cinco de módulos, sete de integração, seis para saves, três testes do cenário e dez testes de câmera, animação e visibilidade. Os testes de lógica não substituem uma partida real usando WebGL.

### Pastas principais

```text
index.html                       Entrada e importmap do Three.js
styles/main.css                  HUD e menus
src/main.js                      Estado, missões, entrada e loop de jogo
src/world/forest.js              Floresta, decoração e integração do culling
src/world/random.js              Geração determinística por seed
src/world/terrain.js             Terreno procedural
src/world/collisions.js          Índice espacial de colisão
src/world/shrine.js              Arena do chefe
src/world/nature-assets.js       Malhas e materiais compartilhados
src/characters/                 Avatar, inimigos e animações procedurais
src/gameplay/combat.js           Golpes e efeitos
src/gameplay/enemy-ai.js         Padrões dos inimigos/guardião
src/gameplay/projectiles.js      Projéteis
src/gameplay/equipment.js        Armas
src/gameplay/save-system.js      Validação e persistência local
src/audio/                       Som
src/render/                      Qualidade, câmera, visibilidade e sombras
src/ui/                          Minimapa
scripts/                         Servidores para Windows e Node.js
tests/                           Regressão e integrações
.github/workflows/pages.yml      CI e publicação
```

## Controles

WASD: mover · mouse: câmera · scroll: zoom · Shift: correr · Espaço: pular · J/clique: atacar · E: especial · Q: esquiva · 1/2/3: trocar arma · **P: salvar** · Esc: pausar · F3: FPS e chamadas de renderização.

## Limitações de validação

Passaram os testes automatizados e o servidor local serviu corretamente HTML, CSS e JavaScript dos novos módulos. Neste ambiente, não foi possível concluir o teste de jogo WebGL por indisponibilidade do CDN externo, portanto **a execução 3D/WebGL completa e uma comparação real de FPS ainda não foram validadas**. Não é possível afirmar ganho quantitativo de FPS sem essas medições.
