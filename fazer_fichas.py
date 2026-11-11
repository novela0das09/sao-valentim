"""Gera sv_site/fichas.html a partir do protótipo (scratchpad/fichas/index.html),
ligando as fichas ao site (parent.SV.F). Sem o site em volta, a página continua
funcionando sozinha, como o protótipo."""
import pathlib, sys

base = pathlib.Path(__file__).resolve().parent
src = (base.parent / 'fichas' / 'index.html').read_text()
s = src

def troca(a, b, n=1):
    global s
    c = s.count(a)
    if c != n:
        sys.exit(f'esperava {n}x, achei {c}x: {a[:90]!r}')
    s = s.replace(a, b)

# 1. cabeçalho de página de verdade (o protótipo vinha embrulhado como artifact)
i = s.index('<title>')
j = s.index('\n', i)
s = ('<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
     '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
     '<title>Fichas · São Valentim do Vale</title>' + s[j:])
troca('<style>\n/* layout: barra da cena no topo;', '<style>\n[hidden] { display: none !important; }\n/* layout: barra da cena no topo;')
troca('</style>\n\n<div class="app" id="app">', '''
/* ---------- dentro do site ---------- */
.na-mesa .brand { display: none; }
.na-mesa.pj #cena { display: none; }
.ponte { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 10px 12px; margin: 0 0 14px; border: 1px solid var(--line); border-left: 3px solid var(--red); border-radius: 4px; background: var(--panel-2); font-size: 13px; color: var(--paper-2); }
.ponte b { color: var(--paper); font-weight: 600; }
.ponte label { display: inline-flex; align-items: center; gap: 6px; }
.ponte select { background: var(--panel); border: 1px solid var(--line-2); color: var(--paper); padding: 5px 6px; font: 13px var(--f-body); max-width: 180px; }
.ponte input[type=checkbox] { accent-color: var(--red); width: 16px; height: 16px; }
.ponte .sp { flex: 1; }
.perfil-outro .po-corpo { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 20px; padding: 16px 4px; align-items: start; }
.perfil-outro .retrato { width: 180px; }
.perfil-outro h2 { margin: 0 0 4px; font: 30px/1.1 var(--f-display); color: var(--paper); }
.perfil-outro .po-idade { margin: 0 0 14px; color: var(--muted); font: 14px var(--f-type); }
.perfil-outro .po-k { font: 11px var(--f-type); letter-spacing: .1em; text-transform: uppercase; color: var(--red); margin-top: 12px; }
.perfil-outro p { margin: 4px 0 0; white-space: pre-wrap; line-height: 1.55; }
@media (max-width: 640px) { .perfil-outro .po-corpo { grid-template-columns: 1fr; } .perfil-outro .retrato { width: 140px; } }
.ponte .tag-papel { font: 11px var(--f-type); letter-spacing: .08em; padding: 3px 7px; border: 1px solid var(--line-2); border-radius: 3px; color: var(--paper-2); }
.ponte .tag-papel.inimigo { border-color: var(--red); color: var(--red); }
.sem-ficha { max-width: 460px; margin: 8vh auto 0; text-align: center; display: flex; flex-direction: column; gap: 12px; align-items: center; }
.sem-ficha h2 { margin: 0; font: 30px/1.1 var(--f-display); color: var(--paper); }
.sem-ficha p { margin: 0; color: var(--paper-2); }
.sem-ficha .row { justify-content: center; }
</style>

<div class="app" id="app">''')

# 0. fichas novas já nascem com todos os campos (antes só a normalização completava)
# (a ficha em branco com todos os campos agora vem do protótipo)

troca("  kids.push(h('p', { class: 'nota-proto' }, 'Protótipo: a call,", "  if (!PONTE) kids.push(h('p', { class: 'nota-proto' }, 'Protótipo: a call,")

# 2. estado: guardado à parte e, dentro do site, as fichas vêm do banco
troca("const KEY = 'op2proto.v1';", """const KEY = 'svsite.fichas.v1';
const PONTE = (() => { try { return window.parent !== window && window.parent.SV && window.parent.SV.F ? window.parent.SV.F : null; } catch (e) { return null; } })();
if (PONTE) document.documentElement.classList.add('na-mesa', PONTE.isGM() ? 'gm' : 'pj');""")
troca("S.sel ||= S.fichas[0].id;", """if (PONTE) { S.fichas = JSON.parse(JSON.stringify(PONTE.lista())); S.hist = (S.hist || []).slice(0, 60); }
S.sel ||= S.fichas[0]?.id;""")
troca("for (const f of S.fichas) {\n  if (!Array.isArray(f.rel)) {", "function normaliza(f) {\n  if (!Array.isArray(f.rel)) {")
troca("  for (const r of f.rel) { r.desc ??= ''; r.fid ??= ''; r.log ||= []; }\n}",
      "  for (const r of f.rel) { r.desc ??= ''; r.fid ??= ''; r.log ||= []; }\n  f.papel ||= 'pj'; f.dono ??= ''; f.visivel = !!f.visivel;\n}\nfor (const f of S.fichas) normaliza(f);")
troca("S.regras ||= { versao: 'beta'", "if (PONTE && PONTE.regras()) { try { const R = JSON.parse(PONTE.regras()); if (R.regras) S.regras = R.regras; if (R.habCustom) S.habCustom = R.habCustom; if (R.vocCustom) S.vocCustom = R.vocCustom; } catch (e) {} }\nS.regras ||= { versao: 'beta'")
troca("const salvar = (() => { let t;", "const salvarLocal = (() => { let t;")
troca("const F = () => S.fichas.find(f => f.id === S.sel) || S.fichas[0];",
      "const salvar = () => { salvarLocal(); if (PONTE) ponteSalvar(); };\nconst F = () => S.fichas.find(f => f.id === S.sel) || S.fichas[0];")

# 3. a ponte em si, antes do primeiro desenho
PONTE_JS = r"""
/* ===================== ponte com o site (mapa, mesa e banco) ===================== */
let ultimoHist = S.hist[0]?.t || Date.now();
const sincronizado = {};
let ultimaRegra = PONTE ? PONTE.regras() : null;
function ponteSalvar(ja) {
  clearTimeout(ponteSalvar.t);
  const vai = () => {
    try {
      const novas = S.hist.filter(e => e && e.t > ultimoHist).reverse();
      for (const e of S.hist) if (e && e.t > ultimoHist) ultimoHist = e.t;
      for (const e of novas) PONTE.rolou(e);
      PONTE.salvar(S.fichas);
      for (const f of S.fichas) sincronizado[f.id] = JSON.stringify(f);
      if (PONTE.isGM()) { const r = JSON.stringify({ regras: S.regras, habCustom: S.habCustom, vocCustom: S.vocCustom || {} }); if (r !== ultimaRegra) { ultimaRegra = r; PONTE.salvarRegras(r); } }
    } catch (e) { console.warn('[fichas] ponte', e); }
  };
  if (ja) vai(); else ponteSalvar.t = setTimeout(vai, 250);
}
function recebe(l) {
  l = JSON.parse(JSON.stringify(l || []));
  const ids = new Set(l.map(f => f.id));
  let mudou = false;
  for (const nf of l) {
    const js = JSON.stringify(nf), atual = S.fichas.find(f => f.id === nf.id);
    if (sincronizado[nf.id] === js) continue;
    if (atual && JSON.stringify(atual) === js) { sincronizado[nf.id] = js; continue; }
    if (atual) { for (const k of Object.keys(atual)) delete atual[k]; Object.assign(atual, nf); normaliza(atual); }
    else { normaliza(nf); S.fichas.push(nf); }
    sincronizado[nf.id] = js; mudou = true;
  }
  const antes = S.fichas.length;
  S.fichas = S.fichas.filter(f => ids.has(f.id) || !sincronizado[f.id]);
  for (const id of Object.keys(sincronizado)) if (!ids.has(id)) delete sincronizado[id];
  if (mudou || S.fichas.length !== antes) {
    if (!S.fichas.some(f => f.id === S.sel)) { S.sel = S.fichas[0]?.id || null; UIS.roll = null; UIS.res = null; }
    salvarLocal(); renderTudo();
  }
}
function semFicha() {
  const gm = PONTE && PONTE.isGM();
  const box = h('div', { class: 'sem-ficha' },
    h('h2', null, gm ? 'Nenhuma ficha na mesa' : 'Você ainda não tem ficha'),
    h('p', null, gm ? 'Crie fichas para os jogadores, NPCs e inimigos. Os jogadores também podem criar as próprias.' : 'Monte o seu personagem passo a passo. O mestre vê a ficha e pode ajustar com você.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn red', type: 'button', onclick: () => irModo('criar') }, 'Criar passo a passo'),
      h('button', { class: 'btn', type: 'button', onclick: () => novaComo('pj') }, 'Ficha em branco'),
      gm ? h('button', { class: 'btn', type: 'button', onclick: () => novaComo('npc') }, '+ NPC') : null,
      gm ? h('button', { class: 'btn', type: 'button', onclick: () => novaComo('inimigo') }, '+ Inimigo') : null));
  fill($('#ficha'), box);
  fill($('#dados'), h('h3', null, 'Mesa de dados'), h('p', { class: 'nota-proto' }, 'Os testes aparecem aqui quando houver uma ficha.'));
  if (UIS.modo === 'jogar') fill($('#guia'), box.cloneNode(true));
}
function novaComo(papel) {
  novaFicha();
  const f = F();
  f.papel = papel;
  if (papel === 'npc') f.nome = 'Novo NPC';
  if (papel === 'inimigo') f.nome = 'Nova ameaça';
  salvar(); renderTudo();
}
if (PONTE) {
  const renderTudo0 = renderTudo;
  renderTudo = function () {
    if (S.fichas.length) return renderTudo0();
    renderModos(); renderCena(); renderLista(); if (!verOutro()) semFicha();
    if (UIS.modo === 'criar') renderCriar();
    if (UIS.modo === 'regras') renderRegras();
  };
  renderLista = function () {
    const gm = PONTE.isGM();
    const item = f => h('button', { class: 'ficha-it' + (f.id === S.sel ? ' on' : ''), type: 'button', style: f.cor ? { '--cor-f': f.cor, '--red': clara(f.cor, 0.22) } : null, onclick: () => { S.sel = f.id; UIS.outro = null; UIS.roll = null; salvarLocal(); irAba('ficha'); renderTudo(); } },
      h('span', { class: 'av', html: f.retrato ? `<img src="${esc(f.retrato)}" alt="">` : esc(ini(f.nome)) }),
      h('span', null, h('b', null, f.nome || 'Sem nome'), h('small', null, [(PERFIS[f.perfil]?.[0] || ''), f.ocupacao, 'nv ' + f.nivel].filter(Boolean).join(' · ') +
        (gm && f.papel === 'pj' ? ' · ' + (f.dono ? PONTE.nomeDe(f.dono).split(' ')[0] : 'sem jogador') : '') + (gm && f.papel !== 'pj' && !f.visivel ? ' · oculto' : ''))));
    const grupos = gm
      ? [['Personagens dos jogadores', S.fichas.filter(f => f.papel === 'pj')], ['NPCs', S.fichas.filter(f => f.papel === 'npc')], ['Inimigos', S.fichas.filter(f => f.papel === 'inimigo')]]
      : [['Suas fichas', S.fichas]];
    const outros = gm ? [] : PONTE.outros();
    const itemOutro = o => h('button', { class: 'ficha-it outro' + (UIS.outro === o.id ? ' on' : ''), type: 'button', style: o.cor ? { '--cor-f': o.cor } : null, onclick: () => { UIS.outro = o.id; irAba('ficha'); renderTudo(); } },
      h('span', { class: 'av', html: o.retrato ? `<img src="${esc(o.retrato)}" alt="">` : esc(ini(o.nome)) }),
      h('span', null, h('b', null, o.nome), h('small', null, [o.idade, 'de ' + String(o.jogador).split(' ')[0]].filter(Boolean).join(' · '))));
    fill($('#lista'),
      h('h3', null, 'Fichas'),
      ...grupos.filter(([, l]) => l.length).map(([g, l]) => [h('div', { class: 'grp-t' }, g), ...l.map(item)]),
      outros.length ? [h('div', { class: 'grp-t' }, 'Outros personagens'), ...outros.map(itemOutro)] : null,
      h('div', { class: 'row', style: { marginTop: '10px' } },
        h('button', { class: 'btn red sm', type: 'button', onclick: () => irModo('criar') }, 'Criar passo a passo'),
        h('button', { class: 'btn sm', type: 'button', onclick: () => novaComo('pj') }, '+ Em branco'),
        gm ? h('button', { class: 'btn sm', type: 'button', onclick: () => novaComo('npc') }, '+ NPC') : null,
        gm ? h('button', { class: 'btn sm', type: 'button', onclick: () => novaComo('inimigo') }, '+ Inimigo') : null),
      h('p', { class: 'nota-proto' }, gm ? 'Você vê todas as fichas da mesa. NPCs e inimigos ficam escondidos dos jogadores até você marcar “Visível”.' : 'Suas fichas ficam guardadas na mesa. O mestre vê e pode ajustar.'));
  };
  /* jogador olhando o personagem de outro: só nome, retrato, idade, aparência e breve descrição */
  function verOutro() {
    if (PONTE.isGM() || !UIS.outro) return false;
    const o = PONTE.outros().find(x => x.id === UIS.outro);
    if (!o) { UIS.outro = null; return false; }
    fill($('#ficha'), h('div', { class: 'perfil-outro', style: o.cor ? { '--cor-f': o.cor } : null },
      h('div', { class: 'ponte' }, h('span', { class: 'tag-papel' }, 'PERSONAGEM DE ' + String(o.jogador).split(' ')[0].toUpperCase()), h('span', null, 'Você vê só a apresentação. O resto da ficha é do jogador e do mestre.'), h('span', { class: 'sp' }),
        S.fichas.length ? h('button', { class: 'btn sm', type: 'button', onclick: () => { UIS.outro = null; renderTudo(); } }, 'Voltar para a sua ficha') : null),
      h('div', { class: 'po-corpo' },
        h('div', { class: 'retrato' }, o.retrato ? h('img', { src: o.retrato, alt: 'Retrato de ' + o.nome }) : h('div', { class: 'ini' }, ini(o.nome))),
        h('div', { class: 'po-txt' }, h('h2', null, o.nome), o.idade ? h('p', { class: 'po-idade' }, o.idade) : null,
          h('div', { class: 'po-k' }, 'Aparência'), h('p', null, o.aparencia || 'O jogador ainda não descreveu.'),
          h('div', { class: 'po-k' }, 'Quem é'), h('p', null, o.resumo || 'O jogador ainda não escreveu.')))));
    return true;
  }
  /* a cor é pessoal: cada um vê o site na cor da PRÓPRIA ficha. Abrir a ficha de outra pessoa (o mestre abrindo a do
     jogador, por exemplo) não muda nada. O mestre, sem ficha própria, fica no vermelho padrão. */
  function minhaCor() {
    const me = PONTE.me().uid, f = F();
    const minha = f && f.dono === me ? f : S.fichas.find(x => x.dono === me && (x.papel || 'pj') === 'pj');
    return minha && /^#[0-9a-f]{6}$/i.test(minha.cor || '') ? minha.cor : '';
  }
  function temaPessoal() {
    const c = minhaCor();
    try { aplicarTema(c); } catch (e) {}
    try { PONTE.tema && PONTE.tema(c || '#b3191f'); } catch (e) {}
  }
  pintarFicha = function () { temaPessoal(); };
  setTimeout(temaPessoal, 0);
  const renderFicha0 = renderFicha;
  renderFicha = function () {
    if (verOutro()) return;
    renderFicha0();
    temaPessoal();
    const f = F(); if (!f) return;
    const gm = PONTE.isGM(), noMapa = PONTE.temPeca(f.id);
    /* apagar: dois cliques (o primeiro pede confirmação, volta sozinho em 5 s) */
    const confirmando = UIS.apagarP === f.id;
    const apagarBt = h('button', { class: 'btn sm' + (confirmando ? ' red' : ' ghost'), type: 'button', id: 'apagar-ficha',
      title: 'Apaga a ficha da mesa. Não dá para desfazer.',
      onclick: () => {
        if (!confirmando) { UIS.apagarP = f.id; renderFicha(); setTimeout(() => { if (UIS.apagarP === f.id) { UIS.apagarP = null; renderFicha(); } }, 5000); return; }
        const nome = f.nome || 'Sem nome';
        UIS.apagarP = null; UIS.edit = false; UIS.roll = null; UIS.res = null;
        S.fichas = S.fichas.filter(x => x.id !== f.id);
        S.sel = S.fichas[0]?.id || null;
        salvar(); ponteSalvar(true); renderTudo(); toast(nome + ' foi apagada.');
      } }, confirmando ? 'Confirmar: apagar ' + (f.nome || 'esta ficha') + '?' : 'Apagar ficha');
    const cancelarBt = confirmando ? h('button', { class: 'btn sm', type: 'button', onclick: () => { UIS.apagarP = null; renderFicha(); } }, 'Cancelar') : null;
    const mapa = h('button', { class: 'btn sm', type: 'button', onclick: () => { ponteSalvar(true); PONTE.porNoMapa(f.id); } }, noMapa ? 'Ver no mapa' : 'Pôr no mapa');
    let barra;
    if (gm) {
      const papel = h('select', { 'aria-label': 'Papel na mesa', onchange: e => { f.papel = e.target.value; salvar(); renderTudo(); } },
        [['pj', 'Personagem de jogador'], ['npc', 'NPC'], ['inimigo', 'Inimigo']].map(([v, n]) => h('option', { value: v, selected: f.papel === v || null }, n)));
      const extra = f.papel === 'pj'
        ? h('label', null, 'Jogador', h('select', { onchange: e => { f.dono = e.target.value; salvar(); renderTudo(); } },
            h('option', { value: '', selected: !f.dono || null }, '— ninguém ainda —'),
            PONTE.jogadores().map(j => h('option', { value: j.uid, selected: f.dono === j.uid || null }, j.nome)),
            f.dono && !PONTE.jogadores().some(j => j.uid === f.dono) ? h('option', { value: f.dono, selected: true }, PONTE.nomeDe(f.dono)) : null))
        : h('label', { title: 'Mostra o nome, a foto e a peça no mapa para os jogadores. A ficha continua só sua.' }, h('input', { type: 'checkbox', checked: f.visivel || null, onchange: e => { f.visivel = e.target.checked; salvar(); renderTudo(); } }), 'Visível para os jogadores');
      barra = h('div', { class: 'ponte' }, h('label', null, 'Na mesa', papel), extra, h('span', { class: 'sp' }), mapa, apagarBt, cancelarBt);
    } else {
      barra = h('div', { class: 'ponte' }, h('span', { class: 'tag-papel' }, 'SUA FICHA'), h('span', null, 'Salva na mesa. O mestre vê as mudanças na hora.'), h('span', { class: 'sp' }), mapa, apagarBt, cancelarBt);
    }
    $('#ficha').prepend(barra);
  };
  const off = PONTE.onMuda(recebe);
  const off3 = PONTE.onOutros && PONTE.onOutros(() => { if (!PONTE.isGM()) { renderLista(); if (UIS.outro) renderTudo(); } });
  const off2 = PONTE.onRegras(r => {
    if (!r || r === ultimaRegra) return;
    ultimaRegra = r;
    try { const R = JSON.parse(r); if (R.regras) S.regras = R.regras; S.habCustom = R.habCustom || {}; for (const [k, x] of Object.entries(S.habCustom)) HAB[k] = x; S.vocCustom = R.vocCustom || {}; refazVoc(); aplicarVersao(); salvarLocal(); renderTudo(); } catch (e) {}
  });
  addEventListener('pagehide', () => { try { off(); off2(); } catch (e) {} });
  for (const f of S.fichas) sincronizado[f.id] = JSON.stringify(f);
}
"""
troca("$('#app').dataset.modo = UIS.modo; UIS.aba = ABA_INICIAL[UIS.modo];\nrenderTudo(); irAba(UIS.aba);",
      PONTE_JS + "$('#app').dataset.modo = UIS.modo; UIS.aba = ABA_INICIAL[UIS.modo];\nrenderTudo(); irAba(UIS.aba);")


# jogador não vê nem mexe nas regras do mestre (versão, catálogo, cadastro de vocações, regras complementares)
troca("[['mesa', 'Fichas'], ['criar', 'Criar personagem'], ['jogar', 'Como jogar'], ['regras', 'Regras']].map(",
      "[['mesa', 'Fichas'], ['criar', 'Criar personagem'], ['jogar', 'Como jogar'], ['regras', 'Regras']].filter(([k]) => k !== 'regras' || !PONTE || PONTE.isGM()).map(")
troca("function irModo(m) {\n", "function irModo(m) {\n  if (m === 'regras' && PONTE && !PONTE.isGM()) m = 'mesa';\n")
troca("$('#app').dataset.modo = UIS.modo; UIS.aba = ABA_INICIAL[UIS.modo];\nrenderTudo(); irAba(UIS.aba);",
      "if (UIS.modo === 'regras' && PONTE && !PONTE.isGM()) UIS.modo = 'mesa';\n$('#app').dataset.modo = UIS.modo; UIS.aba = ABA_INICIAL[UIS.modo];\nrenderTudo(); irAba(UIS.aba);")

troca("oninput: e => aplicarTema(e.target.value), onchange:", "oninput: e => { if (!PONTE || f.dono === PONTE.me().uid) aplicarTema(e.target.value); }, onchange:")

# na mesa, apagar a última ficha não pode trazer os personagens de exemplo de volta
troca("if (!S.fichas.length) S.fichas = EXEMPLOS(); S.sel = S.fichas[0].id; UIS.apagar = null;", "if (!S.fichas.length && !PONTE) S.fichas = EXEMPLOS(); S.sel = S.fichas[0]?.id || null; UIS.apagar = null;")
# ---------------------------------------------------------------- central do mestre: rolagem com a ficha e condições
troca("""      for (const e of novas) PONTE.rolou(e);
      PONTE.salvar(S.fichas);""", """      for (const e of novas) { if (!e.fid) { const q = S.fichas.find(f => f.nome === e.quem); if (q) e.fid = q.id; } PONTE.rolou(e); }
      /* o estado em palavras (morto, pavor, passos...) vai junto, para a central do mestre não precisar recalcular */
      for (const f of S.fichas) { try { f._cond = condicoes(f).map(c => c[0]); f._habN = (f.hab || []).map(k => (HAB[k] && HAB[k].nome) || k); f._ritN = (f.rit || []).map(k => (RITUAIS[k] && RITUAIS[k].nome) || k); } catch (e) {} }
      PONTE.salvar(S.fichas);""")
troca("  f.papel = papel;\n  if (papel === 'npc') f.nome = 'Novo NPC';", "  f.papel = papel; if (papel !== 'pj') f.pecaVisivel = false;\n  if (papel === 'npc') f.nome = 'Novo NPC';")

# ---------------------------------------------------------------- catálogo de NPCs (só o mestre tem NPCs na lista)
troca("""    const grupos = gm
      ? [['Personagens dos jogadores', S.fichas.filter(f => f.papel === 'pj')], ['NPCs', S.fichas.filter(f => f.papel === 'npc')], ['Inimigos', S.fichas.filter(f => f.papel === 'inimigo')]]
      : [['Suas fichas', S.fichas]];""", """    const npcs = gm ? S.fichas.filter(f => f.papel === 'npc') : [];
    const grupos = gm
      ? [['Personagens dos jogadores', S.fichas.filter(f => f.papel === 'pj')], ['NPCs', npcs], ['Inimigos', S.fichas.filter(f => f.papel === 'inimigo')]]
      : [['Suas fichas', S.fichas]];""")
troca("""      ...grupos.filter(([, l]) => l.length).map(([g, l]) => [h('div', { class: 'grp-t' }, g), ...l.map(item)]),""",
      """      ...grupos.filter(([g, l]) => l.length || (g === 'NPCs' && gm)).map(([g, l]) => g === 'NPCs' && gm
        ? [h('div', { class: 'grp-t' }, 'NPCs', npcs.length ? h('small', null, ' · ' + npcs.length) : null), ferramentasNPC(npcs), h('div', { id: 'npc-itens' }, itensNPC(npcs))]
        : [h('div', { class: 'grp-t' }, g), ...l.map(item)]),""")
troca("""  renderFicha = function () {
    if (verOutro()) return;
    renderFicha0();""", """  renderFicha = function () {
    if (verOutro()) return;
    const fN = F();
    if (PONTE.isGM() && fN && fN.papel === 'npc' && (UIS.npcVista || 'interpretar') !== 'ficha') { renderNPC(fN); temaPessoal(); return; }
    renderFicha0();""")
troca("""    $('#ficha').prepend(barra);
  };""", """    $('#ficha').prepend(barra);
    if (gm && f.papel === 'npc') $('#ficha').prepend(cabNPC(f));
  };""")
troca("  const off3 = PONTE.onOutros", """  const off4 = PONTE.onAbrir && PONTE.onAbrir(abrirFicha);
  const off5 = PONTE.onPecas && PONTE.onPecas(() => { if (PONTE.isGM()) atualizaMapaNPC(); });
  setTimeout(() => { const x = PONTE.pedidoAbrir && PONTE.pedidoAbrir(); if (x) abrirFicha(x); }, 0);
  const off3 = PONTE.onOutros""")

NPC_JS = r"""
  /* ===================== catálogo de NPCs: interpretar, segredos, história, relações, notas e mapa ===================== */
  function abrirFicha(fid) {
    if (!S.fichas.some(f => f.id === fid)) return;
    S.sel = fid; UIS.outro = null; UIS.roll = null; salvarLocal();
    if (UIS.modo !== 'mesa') irModo('mesa');
    irAba('ficha'); renderTudo();
  }
  const semAc = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const ND = 'Não definido.';
  const ITENS_N = ['Nome', 'Idade', 'Profissão', 'Aparência', 'Personalidade', 'Maneirismos', 'Voz e interpretação', 'História', 'Rotina', 'Relações', 'Objetivos', 'Medos', 'Segredos',
    'O que sabe sobre 1979', 'O que sabe sobre o mistério', 'O que esconde', 'Como reage aos jogadores', 'Primeira aparição', 'Participação nos atos', 'Falas prontas', 'Possíveis destinos', 'Se os jogadores interferirem'];
  const RAPIDA = [['profissao', 'Profissão'], ['personalidade', 'Personalidade'], ['comportamento', 'Comportamento'], ['papel', 'Papel na vila'], ['interpretar', 'Como interpretar']];
  const NPC_VISTAS = [['interpretar', 'Interpretar'], ['segredos', 'Segredos'], ['historia', 'História completa'], ['relacoes', 'Relações'], ['notas', 'Notas do mestre'], ['ficha', 'Ficha de jogo']];
  function npcDe(f) { f.npc ||= {}; const n = f.npc; n.rapida ||= {}; n.itens ||= {}; if (!Array.isArray(n.falas)) n.falas = []; n.notas ??= ''; return n; }
  const it = (n, i) => String((n.itens && n.itens[i]) || '').trim();
  const SUBS = ['Público e pessoal', 'Oculto e paranormal', 'Pessoal \\(a versão dele\\)', 'Público', 'Pessoal', 'Oculto', 'Paranormal', 'Engano', 'O que faria revelar', 'Ato 2 em diante', 'Ato 3 e 4', 'Ato 1', 'Ato 2', 'Ato 3', 'Ato 4'];
  const RE_SUB = new RegExp('(^|[.;]\\s+)(' + SUBS.join('|') + '):', 'g');
  function rico(t) {
    if (!String(t || '').trim()) return '<span class="npc-nd">' + ND + '</span>';
    return esc(t).replace(RE_SUB, (m, a, b) => (a ? a.trim() + '<br>' : '') + '<b>' + b + ':</b>').replace(/✚/g, '<span class="mk novo" title="Ideia nova, pode cortar">✚</span>').replace(/✔/g, '<span class="mk livro" title="Do Livro do Mestre">✔</span>');
  }
  const outrosNPC = f => S.fichas.filter(g => g.papel === 'npc' && g.id !== f.id);
  const curtoDe = g => (g.npc && g.npc.curto) || String(g.nome || '').split(/\s+/).find(p => !/^(seu|dona|dr\.?|dra\.?|padre|soldado|cabo)$/i.test(p)) || g.nome;
  function escondidas(n) { return String(it(n, 10)).split(/(?<=[.;])\s+/).filter(x => /escondid/i.test(x)).join(' '); }
  /* quem cita quem: as outras fichas que falam deste NPC */
  function citam(f) {
    const nome = semAc(curtoDe(f)).split(/\s+/).pop(); if (!nome || nome.length < 3) return [];
    const re = new RegExp('(^|[^a-z])' + nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)');
    return outrosNPC(f).filter(g => re.test(semAc(Object.values((g.npc && g.npc.itens) || {}).join(' '))));
  }
  let tNPC = 0;
  const salvarNPC = () => { clearTimeout(tNPC); tNPC = setTimeout(() => { salvar(); const st = $('#npc-st-notas'); if (st) st.textContent = 'Salvo'; }, 600); };
  function mapaNPC(f) {
    const m = PONTE.mapaDe ? PONTE.mapaDe(f.id) : { tem: PONTE.temPeca(f.id), visivel: false, posto: false };
    const st = !m.tem ? 'Fora do mapa' : m.visivel ? 'No mapa · os jogadores veem' : 'No mapa · só você vê';
    return h('div', { class: 'npc-mapa' + (m.tem ? (m.visivel ? ' vis' : ' tem') : '') }, h('span', { class: 'npc-st' }, h('i', { class: 'npc-pino' + (m.tem ? (m.visivel ? ' vis' : ' tem') : '') }), st),
      m.tem ? [h('button', { class: 'btn sm', type: 'button', onclick: () => { ponteSalvar(true); PONTE.porNoMapa(f.id); } }, 'Ver no mapa'),
          h('button', { class: 'btn sm', type: 'button', id: 'npc-ver-jog', onclick: () => { f.pecaVisivel = !m.visivel; salvar(); ponteSalvar(true); } }, m.visivel ? 'Esconder dos jogadores' : 'Mostrar aos jogadores'),
          h('button', { class: 'btn sm ghost', type: 'button', id: 'npc-tirar', onclick: () => { PONTE.tirarDoMapa(f.id); toast(f.nome + ' saiu do mapa. O cadastro continua.'); } }, 'Tirar do mapa')]
        : h('button', { class: 'btn sm red', type: 'button', id: 'npc-por', title: 'Põe a peça no mapa, escondida dos jogadores. Arraste para o lugar.', onclick: () => { if (f.pecaVisivel === undefined) f.pecaVisivel = false; salvar(); ponteSalvar(true); setTimeout(() => PONTE.porNoMapa(f.id), 60); } }, 'Pôr no mapa'));
  }
  function atualizaMapaNPC() {
    const box = $('#npc-itens'); if (box) fill(box, itensNPC(S.fichas.filter(f => f.papel === 'npc')));
    const f = F(), el = $('#ficha .npc-mapa');
    if (f && f.papel === 'npc' && el) el.replaceWith(mapaNPC(f));
  }
  function cabNPC(f) {
    const n = npcDe(f), vista = UIS.npcVista || 'interpretar';
    const conhecido = h('label', { class: 'npc-chk', title: 'Mostra só o nome, a foto e a profissão na Mesa, em "Quem vocês conhecem". Não mostra a peça no mapa nem nada da ficha.' },
      h('input', { type: 'checkbox', id: 'npc-conhecido', checked: f.visivel || null, onchange: e => { if (f.pecaVisivel === undefined) f.pecaVisivel = !!(PONTE.mapaDe && PONTE.mapaDe(f.id).visivel); f.visivel = e.target.checked; salvar(); renderTudo(); } }), 'Conhecido pelos jogadores');
    return h('div', { class: 'npc-cab' },
      h('div', { class: 'npc-tit' },
        h('span', { class: 'av', html: f.retrato ? `<img src="${esc(f.retrato)}" alt="">` : esc(ini(f.nome)) }),
        h('div', null, h('h2', null, f.nome || 'Sem nome'), h('p', null, [f.ocupacao || n.rapida.profissao, n.funcao, f.idade].filter(Boolean).join(' · '))),
        n.canon ? h('span', { class: 'npc-tag ' + (n.canon === 'livro' ? 'livro' : 'novo'), title: n.canon === 'livro' ? 'Personagem do Livro do Mestre' : 'Criado para o elenco' }, n.canon === 'livro' ? 'Do Livro' : 'Novo') : null,
        h('span', { class: 'sp' }),
        vista !== 'ficha' ? h('button', { class: 'btn sm' + (UIS.npcEdit ? ' red' : ''), type: 'button', id: 'npc-editar', onclick: () => { UIS.npcEdit = !UIS.npcEdit; renderFicha(); } }, UIS.npcEdit ? 'Pronto' : 'Editar informações') : null),
      h('div', { class: 'npc-linha' }, mapaNPC(f), conhecido),
      h('nav', { class: 'secoes npc-abas', role: 'tablist', 'aria-label': 'Partes do NPC' }, NPC_VISTAS.map(([k, nome]) => h('button', { type: 'button', role: 'tab', id: 'npc-v-' + k, class: vista === k ? 'on' : '', 'aria-selected': vista === k ? 'true' : 'false', onclick: () => { UIS.npcVista = k; try { localStorage.setItem(KEY + '.npcv', k); } catch (e) {} renderFicha(); } }, nome))));
  }
  function campoNPC(n, chave, rot, ed, rows) {
    const [grupo, k] = chave.split('.');
    const val = grupo === 'rapida' ? n.rapida[k] : n.itens[k];
    return h('div', { class: 'npc-campo' }, h('div', { class: 'npc-k' }, rot),
      ed ? h('textarea', { rows: rows || 3, 'data-npc': chave, 'aria-label': rot, oninput: e => { if (grupo === 'rapida') n.rapida[k] = e.target.value; else n.itens[k] = e.target.value; n.editado = true; salvarNPC(); } }, val || '')
        : h('p', { html: rico(val) }));
  }
  function falasNPC(n, ed) {
    if (ed) return h('div', { class: 'npc-campo' }, h('div', { class: 'npc-k' }, 'Falas prontas (uma por linha, "Tipo: fala")'),
      h('textarea', { rows: 8, 'data-npc': 'falas', oninput: e => { n.falas = e.target.value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const i = l.indexOf(':'); return i > 0 && i < 30 ? { tipo: l.slice(0, i).trim(), texto: l.slice(i + 1).trim() } : { tipo: '', texto: l }; }); n.editado = true; salvarNPC(); } },
        n.falas.map(x => (x.tipo ? x.tipo + ': ' : '') + x.texto).join('\n')));
    return h('div', { class: 'npc-campo' }, h('div', { class: 'npc-k' }, 'Falas prontas'),
      n.falas.length ? h('ul', { class: 'npc-falas' }, n.falas.map(x => h('li', null, x.tipo ? h('b', null, x.tipo) : null, h('span', { html: rico(x.texto) })))) : h('p', { class: 'npc-nd' }, ND));
  }
  function corpoNPC(f) {
    const n = npcDe(f), vista = UIS.npcVista || 'interpretar', ed = !!UIS.npcEdit;
    if (vista === 'interpretar') return h('div', { class: 'npc-corpo' },
      h('div', { class: 'npc-rapida' }, RAPIDA.map(([k, rot]) => campoNPC(n, 'rapida.' + k, rot, ed, 2))),
      falasNPC(n, ed),
      h('details', { class: 'npc-mais', open: UIS.npcMais || null, ontoggle: e => { UIS.npcMais = e.target.open; } }, h('summary', null, 'Voz, maneirismos e como reage'),
        campoNPC(n, 'itens.6', ITENS_N[5], ed), campoNPC(n, 'itens.7', ITENS_N[6], ed), campoNPC(n, 'itens.17', ITENS_N[16], ed), campoNPC(n, 'itens.18', ITENS_N[17], ed)));
    if (vista === 'segredos') {
      const SEG = [['Segredos pessoais', 'itens.13'], ['O que está escondendo e o que é mentira no que diz', 'itens.16'], ['O que sabe sobre 1979', 'itens.14'],
        ['O que sabe sobre o mistério, os sumiços e as coisas estranhas', 'itens.15'], ['Motivações reais e objetivos', 'itens.11'], ['Medos e arrependimentos', 'itens.12'], ['O que pode ser revelado, conforme as decisões dos jogadores', 'itens.22']];
      return h('div', { class: 'npc-corpo npc-secreto' },
        h('div', { class: 'npc-aviso', role: 'note' }, h('b', null, 'Confidencial · só o mestre'), ' Nada daqui aparece para os jogadores: a ficha do NPC fica guardada só para você.'),
        SEG.map(([rot, k]) => campoNPC(n, k, rot, ed)),
        h('div', { class: 'npc-campo' }, h('div', { class: 'npc-k' }, 'Relações que os jogadores ainda não descobriram'), h('p', { html: rico(escondidas(n)) })));
    }
    if (vista === 'historia') return h('div', { class: 'npc-corpo' }, ITENS_N.map((rot, i) => i === 19 ? falasNPC(n, ed) : campoNPC(n, 'itens.' + (i + 1), (i + 1) + '. ' + rot, ed, i === 7 ? 6 : 3)));
    if (vista === 'relacoes') {
      const cit = citam(f);
      return h('div', { class: 'npc-corpo' }, campoNPC(n, 'itens.10', 'Relações', ed, 6),
        h('div', { class: 'npc-campo' }, h('div', { class: 'npc-k' }, 'Relações escondidas'), h('p', { html: rico(escondidas(n)) })),
        h('div', { class: 'npc-campo' }, h('div', { class: 'npc-k' }, 'Aparece na ficha de'),
          cit.length ? h('div', { class: 'npc-citam' }, cit.map(g => h('button', { class: 'btn sm', type: 'button', onclick: () => { S.sel = g.id; salvarLocal(); renderTudo(); } }, g.nome))) : h('p', { class: 'npc-nd' }, 'Nenhuma outra ficha cita este NPC.')));
    }
    if (vista === 'notas') return h('div', { class: 'npc-corpo' },
      h('div', { class: 'npc-campo' }, h('div', { class: 'npc-k' }, 'Notas do mestre ', h('small', { id: 'npc-st-notas' }, n.notasT ? 'Salvo' : '')),
        h('p', { class: 'npc-dica' }, 'Ideias e acontecimentos da campanha. Ficam separadas da história oficial do NPC.'),
        h('textarea', { rows: 12, id: 'npc-notas', 'aria-label': 'Notas do mestre sobre ' + (f.nome || 'o NPC'), placeholder: 'Ex.: na sessão 3 ele mentiu sobre o túmulo; o Ícaro desconfia.', oninput: e => { n.notas = e.target.value; n.notasT = Date.now(); const st = $('#npc-st-notas'); if (st) st.textContent = 'Salvando…'; salvarNPC(); } }, n.notas || '')));
    return null;
  }
  function renderNPC(f) {
    fill($('#ficha'), cabNPC(f), corpoNPC(f));
  }
  /* lista: procurar, filtrar por função e por mapa */
  function filtraNPC(l) {
    const q = semAc(UIS.npcBusca).trim();
    return l.filter(f => {
      const n = f.npc || {};
      if (q && !semAc([f.nome, f.ocupacao, n.rapida && n.rapida.profissao, n.curto, n.funcao].join(' ')).includes(q)) return false;
      if (UIS.npcFuncao && n.funcao !== UIS.npcFuncao) return false;
      const m = PONTE.mapaDe ? PONTE.mapaDe(f.id) : { tem: PONTE.temPeca(f.id), visivel: false };
      if (UIS.npcMapa === 'no' && !m.tem) return false;
      if (UIS.npcMapa === 'vis' && !(m.tem && m.visivel)) return false;
      if (UIS.npcMapa === 'fora' && m.tem) return false;
      return true;
    }).sort((a, b) => ((a.npc && a.npc.num) || 999) - ((b.npc && b.npc.num) || 999) || String(a.nome).localeCompare(b.nome));
  }
  function itensNPC(npcs) {
    const l = filtraNPC(npcs);
    if (!npcs.length) return h('p', { class: 'nota-proto' }, 'Nenhum NPC ainda. Crie com "+ NPC" ou importe o elenco.');
    if (!l.length) return h('p', { class: 'nota-proto' }, 'Nenhum NPC com esse filtro.');
    return l.map(f => {
      const m = PONTE.mapaDe ? PONTE.mapaDe(f.id) : { tem: PONTE.temPeca(f.id), visivel: false };
      const prof = f.ocupacao || (f.npc && f.npc.rapida && f.npc.rapida.profissao) || '';
      return h('button', { class: 'ficha-it npc' + (f.id === S.sel ? ' on' : ''), type: 'button', style: f.cor ? { '--cor-f': f.cor } : null, onclick: () => { S.sel = f.id; UIS.outro = null; UIS.roll = null; UIS.npcEdit = false; salvarLocal(); irAba('ficha'); renderTudo(); } },
        h('span', { class: 'av', html: f.retrato ? `<img src="${esc(f.retrato)}" alt="">` : esc(ini(f.nome)) }),
        h('span', null, h('b', null, f.nome || 'Sem nome'), h('small', null, [prof.length > 60 ? prof.slice(0, 58) + '…' : prof, f.visivel ? 'conhecido' : ''].filter(Boolean).join(' · '))),
        h('i', { class: 'npc-pino' + (m.tem ? (m.visivel ? ' vis' : ' tem') : ''), title: m.tem ? (m.visivel ? 'No mapa: os jogadores veem' : 'No mapa: só você vê') : 'Fora do mapa', role: 'img', 'aria-label': m.tem ? (m.visivel ? 'No mapa, visível' : 'No mapa, escondido') : 'Fora do mapa' }));
    });
  }
  function ferramentasNPC(npcs) {
    const funcoes = [...new Set(npcs.map(f => f.npc && f.npc.funcao).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return h('div', { class: 'npc-tools' },
      npcs.length ? h('input', { type: 'search', id: 'npc-busca', placeholder: 'Procurar NPC', 'aria-label': 'Procurar NPC por nome ou profissão', value: UIS.npcBusca || '', autocomplete: 'off', oninput: e => { UIS.npcBusca = e.target.value; const box = $('#npc-itens'); if (box) fill(box, itensNPC(S.fichas.filter(f => f.papel === 'npc'))); } }) : null,
      npcs.length ? h('div', { class: 'npc-filtros' },
        h('select', { id: 'npc-funcao', 'aria-label': 'Filtrar por função na vila', onchange: e => { UIS.npcFuncao = e.target.value; renderLista(); } }, h('option', { value: '' }, 'Todas as funções'), funcoes.map(x => h('option', { value: x, selected: UIS.npcFuncao === x || null }, x))),
        h('select', { id: 'npc-mapa-f', 'aria-label': 'Filtrar por mapa', onchange: e => { UIS.npcMapa = e.target.value; renderLista(); } }, [['', 'Mapa: todos'], ['no', 'No mapa'], ['vis', 'Visíveis no mapa'], ['fora', 'Fora do mapa']].map(([v, nm]) => h('option', { value: v, selected: (UIS.npcMapa || '') === v || null }, nm)))) : null,
      h('label', { class: 'btn sm ghost npc-import', title: 'Cadastra os NPCs de um arquivo .json do elenco. Quem já está cadastrado não é duplicado.' }, 'Importar NPCs',
        h('input', { type: 'file', accept: '.json,application/json', class: 'vh', id: 'npc-import', onchange: e => { const a = e.target.files && e.target.files[0]; if (a) importarNPCs(a); e.target.value = ''; } })));
  }
  /* importar: um NPC por registro, sem duplicar quem já existe (mesma chave ou mesmo nome) */
  const tokens = t => semAc(t).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w && !/^(seu|dona|dr|dra|padre|pe|soldado|cabo|nonna|sr|sra|da|de|do|dos|das|dal|e)$/.test(w));
  function mesmoNPC(a, b) {
    const x = tokens(a), y = tokens(b);
    if (!x.length || !y.length || x[0] !== y[0]) return false;
    return x.every(w => y.includes(w)) || y.every(w => x.includes(w));
  }
  function importarNPCs(arq) {
    const leitor = new FileReader();
    leitor.onload = () => {
      let dados; try { dados = JSON.parse(leitor.result); } catch (e) { toast('Esse arquivo não é um elenco válido.'); return; }
      const lista = Array.isArray(dados) ? dados : dados && dados.npcs;
      if (!Array.isArray(lista) || !lista.length) { toast('O arquivo não tem NPCs.'); return; }
      let novos = 0, atual = 0, mantidos = 0, prim = null;
      for (const d of lista) {
        if (!d || !d.nome) continue;
        let f = S.fichas.find(x => x.papel === 'npc' && x.npc && d.chave && x.npc.chave === d.chave) || S.fichas.find(x => x.papel === 'npc' && mesmoNPC(x.nome, d.nome));
        if (f && f.npc && f.npc.editado) { mantidos++; continue; }
        if (!f) {
          f = P({ nome: d.nome, perfil: 'executor', ocupacao: d.ocupacao || '', atr: { fisico: 'd6', mente: 'd6', emocao: 'd6' }, per: per(), apt: apt(), pv: { v: 10, m: 10 }, pd: { v: 10, m: 10 }, hab: [] });
          normaliza(f); f.papel = 'npc'; f.dono = ''; f.visivel = false; f.pecaVisivel = false;
          S.fichas.push(f); novos++;
        } else atual++;
        const antigo = f.npc || {};
        f.npc = { chave: d.chave || '', num: +d.num || 0, curto: d.curto || '', funcao: d.funcao || '', canon: d.canon || '', rapida: d.rapida || {}, itens: d.itens || {}, falas: Array.isArray(d.falas) ? d.falas : [],
          notas: antigo.notas || '', notasT: antigo.notasT || 0, fonte: d.fonte || '' };
        if (d.ocupacao) f.ocupacao = d.ocupacao;
        if (d.idade && !f.idade) f.idade = d.idade;
        if (d.aparencia && !f.aparencia) f.aparencia = d.aparencia;
        prim ||= f;
      }
      if (prim) { S.sel = prim.id; UIS.npcVista = 'interpretar'; UIS.npcEdit = false; }
      salvar(); ponteSalvar(true); renderTudo();
      toast([novos ? novos + (novos === 1 ? ' NPC cadastrado' : ' NPCs cadastrados') : '', atual ? atual + ' atualizado' + (atual > 1 ? 's' : '') : '', mantidos ? mantidos + ' mantido' + (mantidos > 1 ? 's' : '') + ' como você editou' : ''].filter(Boolean).join(', ') + '. Nenhum foi posto no mapa.');
    };
    leitor.readAsText(arq);
  }
  try { UIS.npcVista = localStorage.getItem(KEY + '.npcv') || 'interpretar'; } catch (e) {}
"""
troca("  /* jogador olhando o personagem de outro: só nome, retrato, idade, aparência e breve descrição */",
      NPC_JS + "  /* jogador olhando o personagem de outro: só nome, retrato, idade, aparência e breve descrição */")

NPC_CSS = """
/* ---------- catálogo de NPCs (só o mestre) ---------- */
.vh { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.grp-t small { color: var(--muted); font-weight: 400; }
.npc-tools { display: grid; gap: 6px; margin: 4px 0 8px; }
.npc-tools input[type=search], .npc-tools select { width: 100%; min-height: 34px; background: var(--panel-2); border: 1px solid var(--line-2); color: var(--paper); padding: 5px 8px; font: 13px var(--f-body); border-radius: 3px; }
.npc-filtros { display: grid; grid-template-columns: 1fr; gap: 6px; }
.npc-campo > p::first-letter, .npc-falas li span::first-letter { text-transform: uppercase; }
.npc-import { justify-self: start; cursor: pointer; }
.ficha-it.npc { grid-template-columns: auto minmax(0, 1fr) auto; }
.npc-pino { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid var(--muted); flex: none; align-self: center; }
.npc-pino.tem { border-color: var(--gold); background: color-mix(in srgb, var(--gold) 30%, transparent); }
.npc-pino.vis { border-color: var(--ok); background: var(--ok); }
.npc-cab { display: grid; gap: 10px; margin-bottom: 14px; }
.npc-tit { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.npc-tit .av { width: 54px; height: 54px; font-size: 20px; }
.npc-tit h2 { margin: 0; font: 28px/1.05 var(--f-display); color: var(--paper); }
.npc-tit p { margin: 2px 0 0; color: var(--muted); font-size: 13px; }
.npc-tit .sp { flex: 1; }
.npc-tag { font: 11px var(--f-type); letter-spacing: .08em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; border: 1px solid var(--line-2); color: var(--paper-2); }
.npc-tag.livro { border-color: var(--gold); color: var(--gold); }
.npc-linha { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; padding: 8px 10px; border: 1px solid var(--line); border-left: 3px solid var(--red); background: var(--panel-2); }
.npc-mapa { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; }
.npc-st { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--paper-2); margin-right: 4px; }
.npc-chk { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--paper-2); margin-left: auto; }
.npc-chk input { accent-color: var(--red); width: 16px; height: 16px; }
.npc-corpo { display: grid; gap: 14px; max-width: 900px; }
.npc-rapida { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px 18px; }
.npc-campo { display: grid; gap: 4px; }
.npc-k { font: 11px var(--f-type); letter-spacing: .1em; text-transform: uppercase; color: var(--red); }
.npc-k small { text-transform: none; letter-spacing: 0; color: var(--muted); margin-left: 6px; }
.npc-campo p { margin: 0; line-height: 1.6; color: var(--paper); white-space: pre-wrap; }
.npc-campo p b { color: var(--paper); }
.npc-campo textarea { width: 100%; background: var(--panel-2); border: 1px solid var(--line-2); color: var(--paper); padding: 8px 10px; font: 14px/1.5 var(--f-body); border-radius: 3px; resize: vertical; }
.npc-nd { color: var(--muted); font-style: italic; }
.npc-falas { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
.npc-falas li { padding: 6px 10px; border-left: 2px solid var(--line-2); background: var(--panel-2); line-height: 1.5; }
.npc-falas li b { display: block; font: 11px var(--f-type); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.npc-mais { border: 1px solid var(--line); background: var(--panel-2); padding: 0 12px; }
.npc-mais > summary { padding: 10px 0; cursor: pointer; font-weight: 600; }
.npc-mais > .npc-campo { margin-bottom: 12px; }
.npc-secreto .npc-aviso { padding: 10px 12px; border: 1px solid color-mix(in srgb, var(--red) 60%, transparent); background: color-mix(in srgb, var(--blood) 14%, transparent); color: var(--paper-2); font-size: 13px; }
.npc-secreto .npc-aviso b { color: var(--red); text-transform: uppercase; letter-spacing: .08em; font: 12px var(--f-type); margin-right: 6px; }
.npc-citam { display: flex; flex-wrap: wrap; gap: 6px; }
.npc-dica { margin: 0; color: var(--muted); font-size: 12.5px; }
.mk { font-size: .85em; } .mk.novo { color: var(--muted); } .mk.livro { color: var(--gold); }
@media (max-width: 700px) { .npc-filtros { grid-template-columns: 1fr; } .npc-chk { margin-left: 0; } .npc-tit h2 { font-size: 24px; } }
"""
troca(".sem-ficha .row { justify-content: center; }\n</style>", ".sem-ficha .row { justify-content: center; }\n" + NPC_CSS + "</style>")

(base / 'fichas.html').write_text(s)
print('fichas.html', len(s))
