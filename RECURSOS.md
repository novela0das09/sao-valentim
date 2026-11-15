# Mapa 3D, modelos, texturas e trilha sonora

Este guia diz onde cada coisa mora e como acrescentar recursos sem quebrar o que já existe.

## Atenção antes de mexer
- `mapa.html` e `fichas.html` foram **gerados por scripts** (`fazer_mapa.py` e `fazer_fichas.py`), mas as fontes desses scripts não estão no repositório.
- **Não rode `fazer_fichas.py`:** ele lê `../fichas/index.html`, que não existe aqui, e apagaria as mudanças.
- Hoje a fonte de verdade são os próprios `mapa.html` e `fichas.html`. Edite direto neles.
- Depois de mudar um arquivo, suba a versão dele onde ele é carregado, para os navegadores não usarem a cópia velha:
  - `app.js?v=` e `sons.js?v=`, em `index.html`;
  - `mapa.html?v=` e `fichas.html?v=`, em `app.js`.

## Mapa 3D (`mapa.html`)
- **Biblioteca:** three.js 0.160, carregado do jsDelivr. O cache de arquivos (`THREE.Cache`) está ligado.
- **Cenas:** a cidade (`scene`) e quatro mapas à parte, cada um com o seu grupo e a sua câmera inicial: Remanso (`remCena`), Mata (`mataCena`), Estrada com o ônibus (`estrCena`) e O Sonho (`sonho`). Quem troca de cena são as funções `entrarRemanso`, `entrarMata`, `entrarEstrada` e `entrarSonho`.
- **Estado compartilhado:** o mestre grava em `mesa/cena3d` o que `estadoCena()` devolve: `nivel` (seca, normal ou cheia), `rem`, `mata`, `estr`, `sonho`, `noite`, `nevoa`, `navio`, câmera travada e susto. Os jogadores aplicam com `aplicaCena()`. Os sons automáticos leem esse mesmo estado.
- **Água:** `NIVEIS = { seca: -10.6, normal: -2, cheia: 7.2 }`. Na seca, Remanso mostra mais da cidade velha (`aplicaRemSeca`).
- **Lugares:** os botões de lugar da cidade estão em `LUG_M` e na barra de câmeras (`#cams`). Os de Remanso ficam em `REM_CAMS` (`#cams-rem`).
  - Para criar um lugar: some uma entrada com `pos` (posição da câmera) e `alvo` (ponto que ela olha) na lista da cena certa.
  - Para os NPCs irem até o lugar, ponha o nome também em `LUGARES_NPC`.
- **Pistas (brilho âmbar):** `pista(título, x, y, z, texto)` em Remanso, `pistaM(...)` na Mata. Só o mestre vê e clica (botão Pistas).
  - O `mapa.html` é público. Por isso título e texto de pista, as notas de lugar do mestre e o Lacre **não ficam no código**: ali fica só uma chave (`'§p001'`, `'§n058'`), e `seg()` busca o texto em `mestre/textos`, que só o mestre lê.
  - Os textos ficam em `segredos-mestre.json`, **só no computador do mestre** (está no `.gitignore`). Para criar uma pista nova: escolha uma chave nova, use `'§chave'` no código, ponha `"chave": "texto"` no JSON e importe de novo na aba Mesa → Textos secretos.
- **Câmera:**
  - `colideCamera()` impede a câmera de atravessar construções.
  - Para um objeto **não** bloquear a câmera, deixe o material transparente ou marque `userData.standee`.
  - Objetos com mais de 6000 triângulos, mais de 60 m de largura ou menos de 1,2 m de altura não entram na colisão.
- **Teste local:** com `?local`, `window.__mapaTeste` dá acesso à câmera, aos controles e à colisão, para testes automáticos. Esse gancho não existe no site publicado.

## Modelos (`modelos.js` e `modelos/`)
- **Onde estão:** `modelos.js` guarda 147 modelos GLB dentro do próprio arquivo, em base64 (`window.MODELOS`), com a chave `kit/nome`.
- **Kits:** são os de `KITS`, em `mapa.html`.

| Kit | Pasta | Escala | Texturas |
|---|---|---|---|
| `u` | `modelos/urbano/` | `R` | várias, em `Textures/` |
| `r` | `modelos/ruas/` | 7 | `colormap.png` |
| `c` | `modelos/carros/` | 1,75 | `colormap.png` |
| `m` | `modelos/moveis/` | 2,1 | nenhuma (cor no vértice) |
| `n` | `modelos/natureza/` | 6,5 | nenhuma (cor no vértice) |
| `k` | `modelos/comercial/` | 6,6 | `colormap.png` |
| `w` | `modelos/barcos/` | 2,1 | `colormap.png` |
| `g` | `modelos/cemiterio/` | 2,4 | `colormap.png` |

- **Texturas dos modelos:** cada GLB aponta para `Textures/<arquivo>.png`, procurado dentro da pasta do kit. Não renomeie nem mova esses PNGs.
- **Usar um modelo:** `inst('<kit>', '<nome>', x, y, z, ângulo, escala, ...)`. Modelos repetidos viram `InstancedMesh`.
- **Acrescentar um modelo:** converta o GLB para base64 e ponha em `window.MODELOS` com a chave `kit/nome`. Se ele usar PNG, ponha o arquivo em `modelos/<kit>/Textures/`. Prefira modelos do mesmo estilo (low-poly, paleta da Kenney) para a cidade, a mata e Remanso continuarem parecendo o mesmo mundo.

## Texturas de cenário (`texturas/`)
- **Quais carregam:** só as da lista `TEXTURAS`, em `mapa.html`: grama, lodo, lama, terra, calçamento, reboco, reboco_amarelo, reboco_velho, madeira, tábua, telha e concreto. Todas em JPG, carregadas por `carregaTex()`.
- **Paredes e telhados dos modelos:** `PAREDE_TEX` troca o material deles (`wall_lines` vira reboco, `roof` vira telha e assim por diante).
- **Acrescentar uma textura:** ponha `texturas/<nome>.jpg`, de preferência sem emenda visível e com até 512 KB, some o nome em `TEXTURAS` e use `TEX['<nome>']` (com `repetida()` para ladrilhar).
- **Achados da auditoria (nada foi apagado):**
  - `lodo.jpg` e `lama_folhas.jpg` são o mesmo arquivo.
  - Sem uso: `mata.jpg`, `lama_folhas.jpg`, `cidade.jpg` (na raiz) e `asphalt.png`, `grass.png` e `rock.png` (no kit urbano).

## Imagens (`img/`)
`comedia.png`, `tragedia.png`, `vazia.png` (as máscaras) e `neblina.jpg` são usadas pela entrada do site (`index.html`).

## Trilha sonora (`sons.js` e a aba Sons em `app.js`)

| Caminho no banco | O que guarda | Quem lê | Quem escreve |
|---|---|---|---|
| `sons/lib/<id>` | sons enviados pelo mestre (nome, tipo `ambiente` ou `efeito`) | todos | mestre |
| `sons_arq/<id>` | o arquivo de áudio (até 3 MB) | todos | mestre |
| `sons/estado/loops` | ambientes tocando agora | todos | mestre |
| `sons/estado/efeito` | último efeito disparado (toca uma vez) | todos | mestre |
| `sons/estado/auto` | o que as regras automáticas ligaram | todos | mestre |
| `sons/auto/regras/<id>` | regras automáticas | todos | mestre |
| `sons/auto/ligado` | liga e desliga o automático | todos | mestre |
| `sons_priv/<uid>` | último som privado para aquela pessoa | ela e o mestre | mestre |

- **Sons prontos:** gerados no navegador, sem arquivo. Estão em `AMB` (ambientes em loop) e `EFE` (efeitos). A lista com os nomes é `SV.SONS_PRONTOS`.
  - Para criar um som pronto: escreva a função em `AMB` ou `EFE` e some `['chave', 'Nome', 'ambiente' | 'efeito']` na lista.
- **Sons do mestre:** a aba Sons tem upload de MP3 ou OGG (até 3 MB). O som fica disponível para todos.
- **Volume e mudo:** são de cada aparelho (guardados no navegador) e não mexem na call.
- **Regras automáticas:**
  - Cada regra tem `{ nome, mapa, periodo, clima, agua, sons }`. Campo vazio vale qualquer.
  - Quem aplica é o navegador do mestre (`autoAplica`), toda vez que a cena ou o estado do som muda. Ele só desliga o que a própria regra ligou.
- **Som privado:** `SV.sons.privado([uids], id)`. Vem pelo cartão "Som só para alguém" da aba Sons ou pela mensagem particular da Mesa. O mestre ouve junto.

## Regras do banco (`database.rules.json`)
Cole o arquivo em Firebase → Realtime Database → Regras e publique. Os caminhos novos desta versão são:
- `sons_priv`;
- `mesa/cheia`;
- a validação de `pedidos` (só o mestre manda mensagem marcada como dele);
- as travas de `fichas/<id>`: jogador não muda `nivel`, `nex`, `perfil` nem `ocupacao`, e ficha nova de jogador nasce com nível 1 e NEX 0.
