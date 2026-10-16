# MadrugaCraft 3D — v0.4 | Aventura RPG em Three.js

Evolução incremental da v0.3: o projeto **não foi refeito**. É um fangame **não oficial**, inspirado na temática de MadrugaCraft, não uma recriação fiel ou port oficial.

## Instalação e execução no Windows

1. Extraia **todos** os arquivos do ZIP jogável na mesma pasta.
2. Abra `INICIAR-JOGO.bat` ou `index.html` no Chrome ou Edge.
3. Mantenha conexão com a internet: a biblioteca **Three.js 0.160.0** é importada do CDN jsDelivr; não está incluída no ZIP.
4. Ative aceleração gráfica/WebGL no navegador, selecione qualidade mínima/média/alta e clique em **Começar aventura**.
5. Pressione **Esc** para pausar/liberar o mouse; clique em **Continuar aventura** para retomar.

O jogo roda **no navegador**, inclusive no Windows, **não é um EXE nativo** e não precisa de instalador. Se o motor 3D não carregar, aparecerá uma mensagem explicativa. Não há salvamento de progresso nesta versão.

## Controles

| Comando | Ação |
|---|---|
| WASD / setas | Mover (direção relativa à câmera) |
| Mouse | Olhar e orientar ataques |
| Shift | Correr |
| Espaço | Pular |
| Clique esquerdo / J | Atacar com a arma equipada |
| E | Golpe giratório, com recarga |
| Q | Esquiva curta com janela de invulnerabilidade e recarga |
| 1 / 2 / 3 | Alternar armas desbloqueadas |
| Esc | Pausar e liberar o mouse |

## Campanha

- **Capítulo 1: Fragmentos perdidos** — encontre 4 partes do violão; libera a **marreta reforçada**.
- **Capítulo 2: A resistência** — vença 6 monstros acumulados; libera a **lança da floresta**.
- **Capítulo 3: O guardião** — recupere 10 partes e derrote o guardião. As ruínas ficam a nordeste do acampamento (`x=32, z=-28`); acompanhe a **bússola** e o minimapa.

O cabo de vassoura tem golpes rápidos; a marreta provoca mais dano; a lança alcança mais longe em um arco frontal estreito. XP aumenta sua vida máxima e, em níveis específicos, seu dano. Itens verdes curam; itens azuis aumentam a velocidade temporariamente.

### Melhorias v0.4

- **Personagem:** modelo com roupa, cinto, lenço, rosto, chapéu e esqueleto articulado por pivôs. Braços, pernas, cabeça e arma passam a se mover de forma integrada. Direção visual corresponde à direção real de ataque.
- **Combate:** golpes frontais com arcos luminosos temporários e animação de arma sincronizada; mantidos especial e esquiva.
- **Cenário:** ruínas com colunas, altar, círculo rúnico, núcleo animado e luz própria; geração de árvores/rochas respeita a arena e a criação dos itens respeita as colunas.
- **Chefe:** aparece no altar, tem **duas fases** (fúria abaixo de 50% HP), movimento lateral, invocação única de reforços, orbes em leque, aviso de área antes do golpe e raios coerentes com o dano (3,7 m / 4,3 m); distância orientada pela bússola.
- **Movimento inimigo:** pequena animação procedural sem necessidade de arquivos externos.

## Testar código

Necessita Node.js 18 ou superior para os testes de lógica:

```bash
node --check jogo.mjs   # opcional, extraia o módulo do index.html
node testes.mjs         # 21 conjuntos de testes sem rede/WebGL
```

O pacote inclui apenas `index.html`, não um arquivo `jogo.mjs` pré-gerado. Para verificar a sintaxe do módulo, extraia o conteúdo entre `<script type="module">` e `</script>` para um arquivo `.mjs` temporário antes de executar `node --check`. O conjunto de testes verifica combate, movimentação, colisões, progressão, missões, dois estágios do chefe, raio de perigo, arco visual e estruturas da interface.

**Limitação:** os testes Node validam lógica; não equivalem a uma sessão 3D real. O ambiente de desenvolvimento não possui acesso ao CDN necessário para reproduzir a cena completa. Teste os gráficos, câmera, colisões e desempenho em seu computador.

## Publicação

Para GitHub Pages, envie o conteúdo do ZIP jogável à raiz do repositório e habilite Pages em **Settings > Pages**. Como o jogo usa importmap e o arquivo `index.html`, não há compilação nem backend.
