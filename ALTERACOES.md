# Alterações — MadrugaCraft 3D v0.4

**Base:** v0.3; regras de campanha, XP, equipamentos, mapa, câmera e controles mantidos.

## Correções estruturais

1. **Direção da personagem:** o avatar, antes visualmente orientado para o lado oposto aos ataques calculados, foi virado 180° em relação ao eixo local do movimento. Agora modelo e hitbox frontal correspondem.
2. **Rig em vez de peças desconectadas:** botas seguem pivôs das pernas, mãos seguem braços e a arma acompanha o braço direito. A cabeça segue o tronco; animações de caminhada/ataque/esquiva integram rotação e inércia.
3. **Geração sem armadilhas de geometria:** as ruínas são instanciadas antes dos spawns de itens/inimigos; árvores e pedras não ocupam a clareira da arena; pilares possuem colisões apropriadas.
4. **Aviso do chefe:** um disco e contorno no chão acompanham sua posição; o raio efetivo coincide com a checagem de impacto, inclusive na fase 2. O disco some após o golpe ou a morte do chefe.
5. **Memória dos efeitos:** os arcos de combate são destruídos após a animação e os recursos gráficos não continuam acumulando.

## Conteúdo

- Personagem com rosto e roupas mais detalhadas, chapéu e arma aparente em movimento.
- Templo antigo com ruínas, colunas, pedestal, círculo rúnico, núcleo e iluminação animada.
- Guardião atrelado à localização do templo; câmera/minimapa e bússola permitem encontrar a luta.
- Fase 2 ao atingir menos de 50% de vida: ganho de velocidade, coloração modificada, dois reforços, recargas menores, ataques em leque e raio de impacto maior.
- Movimento de oscilação dos inimigos e efeito visual de golpes.

## Compatibilidade e limitações

- Permanecem: movimentação WASD, corrida, pulo, E, Q, clique/J, troca 1/2/3, pausa, qualidade gráfica, fragmentos, níveis, drops e vitória ao cumprir as três missões.
- Os pacotes são **código-fonte** e **jogo para navegador Windows**; o iniciador BAT apenas abre o HTML, não é jogo nativo .exe.
- Three.js 0.160.0 continua carregado por CDN. Internet e WebGL necessários.
- **QA:** 21/21 conjuntos de testes Node passaram; sintaxe JS validada. Teste WebGL real não disponível no ambiente, portanto NÃO declarado como aprovado.
