# MadrugaCraft 3D — v0.6

Fangame **não oficial** em Three.js, evoluído incrementalmente sobre a versão v0.5.
O jogo continua sendo uma aventura 3D de navegador: três capítulos, 10 peças do violão,
armas desbloqueáveis, evolução por XP, esquiva, ruínas e guardião com duas fases.

## Abrir no Windows sem instalar dependências

Extraia **todo** o ZIP e execute `INICIAR-JOGO.bat`. O iniciador abre
`http://127.0.0.1:8765/` (ou uma das portas alternativas) no navegador por meio de um
servidor PowerShell **local**. Não feche a janela do iniciador enquanto joga.
É necessária internet apenas para baixar o módulo Three.js 0.160.0 (CDN jsDelivr).
Se o motor 3D não carregar, o próprio menu mostra o erro após alguns segundos.
**Não abra `index.html` com `file://`**: módulos ES importados de arquivos locais
geralmente são bloqueados pela política de segurança do navegador.

### Desenvolver

Com Node.js 18+ (não é necessário para jogar):

```bash
npm run dev
npm test
npm run check
```

Acesse `http://127.0.0.1:8765/`. Não há dependências de npm e nem build.

## GitHub Pages

1. Envie **o conteúdo da pasta do projeto** para a **raiz** do repositório,
   preservando `index.html`, `src/`, `styles/`, `scripts/` e `.github/`.
2. Em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions**.
3. Faça push na branch **main**. O workflow executa `npm test` e publica o projeto.
4. Abra a URL do GitHub Pages do repositório (pode estar em subpasta
   `https://usuario.github.io/nome-do-repo/`). Imports e recursos usam
   **caminhos relativos**, compatíveis com projetos hospedados em subpastas.

Se preferir publicar pela opção **Deploy from a branch**, a raiz do projeto
também funciona: basta selecionar `main` / `/(root)` nas configurações do Pages.
**Não configure as duas formas de publicação ao mesmo tempo.**

## Estrutura de pastas v0.6

```text
index.html                      Página inicial + mapa de imports Three.js
styles/main.css                 Menus, HUD e responsividade
src/main.js                     Inicialização, missões, controles e loop principal
src/characters/player-model.js  Avatar procedural com rig simples
src/characters/enemy-factory.js Criação de inimigos de cada classe
src/gameplay/enemy-ai.js        Perseguição, magias e duas fases do chefe
src/gameplay/combat.js          Ataques, dano, animação de golpes e efeitos
src/gameplay/projectiles.js     Disparo, impacto e descarte de projéteis
src/gameplay/equipment.js       Estatísticas das armas
src/world/shrine.js             Arena do guardião e avisos de ataque
src/world/collisions.js         Índice espacial para obstáculos próximos
src/world/terrain.js            Terreno procedural
src/world/nature-assets.js      Malhas e materiais naturais reutilizáveis
src/audio/sfx.js                Efeitos sonoros
src/render/quality.js           Perfis low/medium/high
src/ui/minimap.js               Minimapa com atualização de 10 Hz
scripts/serve.ps1               Servidor local Windows
scripts/dev-server.mjs          Servidor local Node.js
.github/workflows/pages.yml     Teste e deploy automático no Pages
tests/                         Regressão, estrutura e integração dos sistemas
```

### Melhorias da v0.6

- **Modularização real:** seis sistemas grandes foram extraídos de `src/main.js` para
  arquivos próprios, preservando os controles, campanha, lógica de XP e habilidades.
- **Colisões:** novo índice espacial em células de 8 m consulta obstáculos próximos,
  em vez de percorrer toda a floresta em cada movimento do personagem e dos inimigos.
  Também é utilizado pelas magias para consultar possíveis obstáculos.
- **IA:** passou para `enemy-ai.js` e evita copiar a lista inteira de inimigos a cada quadro.
- **Responsabilidades isoladas:** construção de inimigos, avatar, arena, golpes e
  projéteis podem evoluir sem alteração direta no loop principal.
- **Testes:** 21 regressões históricas + 5 testes de módulos + 7 integrações diretas,
  mais verificação estática dos imports. Executar `npm test`.
- **Publicação:** módulos ES com caminhos relativos; funciona como site estático em
  `usuario.github.io/repositorio/`, sem bundler ou dependências npm.

**Validação:** os testes executam lógica real sem Three.js remoto. O teste visual/WebGL
completo não foi concluído neste ambiente de execução; recomenda-se validar também
em Chrome/Edge após publicar no GitHub Pages. Não há dados de FPS obtidos em hardware
real, portanto nenhum ganho percentual de desempenho é prometido.

**Pendência:** o loop de exploração e a montagem da vegetação permanecem em `src/main.js`;
podem ser isolados em versões futuras. Ainda não existe sistema de salvamento.

## Controles

WASD/setas: mover • mouse: olhar • Shift: correr • Espaço: pular •
clique/J: atacar • E: especial • Q: esquiva • 1/2/3: armas •
Esc: pausar • F3: exibir FPS.

## Observações

- A biblioteca Three.js continua vindo do CDN fixado em `0.160.0`;
  a hospedagem GitHub Pages é estática, sem backend e sem compilação.
- A v0.6 **não tem salvamento de progresso**: fechar a aba reinicia a campanha.
- Scripts de teste conferem lógica e estrutura, mas não substituem um teste
  completo do WebGL com a biblioteca carregada em um navegador real.
