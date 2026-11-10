# São Valentim do Vale · mesa online

Site da campanha de Ordem Paranormal 2 (2016, Alto Uruguai). Separado do Névoa Sobre Apogeu: outro repositório, outro projeto no Firebase (`sao-valentim-op2`).

Endereço: https://novela0das09.github.io/sao-valentim/

## O que tem

- **Entrada**: crachá da equipe temporária da Usina Vale Alto. Login com Google.
- **Mapa**: o vale em 3D, com Remanso debaixo da represa e o Sonho. Cada jogador arrasta a própria peça; o mestre move tudo, prende peças (cadeado) e esconde NPCs e ameaças. Água, Remanso, Sonho, noite, neblina e o vapor são do mestre e mudam para todos. Notas de lugar e pistas só aparecem para o mestre.
- **Fichas**: as mesmas fichas do protótipo, salvas na mesa. O jogador vê e edita só as dele; o mestre vê todas, cria NPCs e inimigos, escolhe de quem é cada ficha e o que os jogadores podem ver.
- **Mesa**: mural do mestre, pedidos ao mestre (só ele vê, e pode responder), rolagens de todos, NPCs apresentados, quem está online, e as regras da call.
- **Sons**: ambientes em loop e efeitos que o mestre toca para todos; arquivos próprios até 3 MB.
- **Call**: voz por proximidade usando as peças do mapa. O mestre ouve e é ouvido por todos.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | entrada e casca do site |
| `config.js` | identificação do projeto no Firebase e do botão do Google |
| `core.js` | banco (Firebase ou modo de teste) e login |
| `app.js` | abas, mesa, sons, call e as pontes com o mapa e as fichas |
| `voz.js`, `sons.js` | motor da call e dos sons |
| `fichas.html` | as fichas (gerado do protótipo por `fazer_fichas.py`) |
| `mapa.html`, `modelos.js`, `modelos/`, `texturas/` | o mapa 3D (gerado por `fazer_mapa.py`) |
| `database.rules.json` | regras do Realtime Database (gerado por `fazer_regras.py`) |

## Regras do banco

Cole o conteúdo de `database.rules.json` em Firebase → Realtime Database → Regras e publique. Sem isso o banco recusa as fichas, as peças e os pedidos.

## Primeiro acesso

A primeira pessoa que entrar escolhe "Eu sou o mestre". Depois disso, só um mestre pode tornar outra pessoa mestre (aba Mesa → Na mesa).

## Testar sem internet

Abra `index.html?local` num servidor local (`python3 -m http.server`). Cada aba do navegador vira uma pessoa; tudo fica guardado só nesse navegador.
