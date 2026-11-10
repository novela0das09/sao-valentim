# São Valentim do Vale · como pôr o site no ar

> Este site é separado do Névoa Sobre Apogeu: use um projeto NOVO no Firebase e um repositório NOVO no GitHub. Assim uma mesa nunca enxerga as fichas, os mapas ou a call da outra.

O site é feito de 5 arquivos que ficam juntos na mesma pasta:

| Arquivo | Para que serve |
|---|---|
| `index.html` | A mesa inteira (mapa, fichas de Ordem Paranormal 2, call com proximidade, sons, mural, luz e clima) |
| `fb-adapter.js` | Login com Google e ligação com o banco de dados |
| `firebase-config.js` | **Você edita este**: a "chave" do seu projeto do Firebase |
| `cidade.jpg` | A imagem da cidade (troque pelo mapa de verdade quando tiver) |
| `database.rules.json` | As regras de quem pode mexer em quê (vai colado no Firebase) |

Tudo é gratuito (plano Spark do Firebase + GitHub Pages).

---

## 1. Criar o projeto no Firebase (uns 10 minutos)

1. Entre em **console.firebase.google.com** com uma conta do Google e clique em **Criar projeto**. Dê um nome (ex.: `sao-valentim-op2`). O Google Analytics pode ficar desligado.
2. **Login com Google**: no menu da esquerda, *Criação* → **Authentication** → **Vamos começar** → aba *Método de login* → **Google** → ative, escolha o e-mail de suporte e **Salvar**.
3. **Banco de dados**: *Criação* → **Realtime Database** → **Criar banco de dados** → local nos Estados Unidos → **Iniciar no modo bloqueado**.
4. Ainda no Realtime Database, abra a aba **Regras**, apague tudo o que estiver lá, cole o conteúdo inteiro do arquivo `database.rules.json` e clique em **Publicar**.
5. **Pegar a configuração**: clique na engrenagem ao lado de *Visão geral do projeto* → **Configurações do projeto** → lá embaixo, em *Seus apps*, clique no ícone **`</>`** (Web). Dê um apelido (ex.: `site`), **não** marque o Firebase Hosting, e clique em **Registrar app**.
6. Vai aparecer um bloco `const firebaseConfig = { ... }`. Copie os valores para dentro do arquivo `firebase-config.js` (abre no Bloco de Notas), trocando cada `COLE_AQUI`.
   - Se o `databaseURL` não aparecer no bloco, copie o endereço que aparece no topo da página do Realtime Database (algo como `https://sao-valentim-op2-default-rtdb.firebaseio.com`).

> Esses valores não são senha: é normal eles ficarem visíveis no site. Quem protege a mesa são as regras do passo 4.

## 2. Publicar o site

**Jeito mais fácil:** conecte o seu GitHub ao Claude e mande o conteúdo do `firebase-config.js` no chat. O Claude cria o repositório e publica no GitHub Pages para você.

**Fazendo sozinho no GitHub Pages:**
1. Em **github.com**, crie um repositório público (ex.: `sao-valentim-op2`).
2. Clique em **Add file → Upload files** e arraste os 5 arquivos. **Commit changes**.
3. *Settings* → **Pages** → em *Branch*, escolha `main` e `/ (root)` → **Save**. Em 1–2 minutos o site fica em `https://SEU-USUARIO.github.io/sao-valentim/`.

## 3. Autorizar o endereço do site no Firebase

No Firebase: **Authentication** → aba **Configurações** → **Domínios autorizados** → **Adicionar domínio** → coloque `SEU-USUARIO.github.io` (sem `https://` e sem a barra). Sem isso, o botão *Entrar com Google* dá erro.

## 4. Primeira vez na mesa

- **O mestre entra primeiro.** Na primeira vez, o site pergunta quem é o mestre: ele toca em **Eu sou o mestre desta mesa**. Daí em diante só ele mexe no mapa, nas peças, no mural, na luz e nas notas.
- **Os jogadores** entram pelo mesmo endereço, fazem login com o Google e tocam em **Fichas → Criar minha ficha**. Cada um só consegue editar a própria ficha; o mestre vê e edita todas.
- As rolagens dos jogadores aparecem na tela do mestre na hora.
- Se a pessoa errada virar mestre: ela abre o botão de conta (ícone de pessoas, no topo), toca em **Tornar mestre** na pessoa certa e depois em **Deixar de ser mestre**.

## Mudanças depois

Para mudar alguma coisa no site, é só pedir ao Claude. Ele edita os arquivos e, com o GitHub conectado, publica a nova versão no mesmo endereço. As fichas, mapas e o mural ficam guardados no Firebase e não se perdem quando o site é atualizado.
