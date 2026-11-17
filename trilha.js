/* ==========================================================
   São Valentim do Vale · trilha sonora do mestre
   Painel na esquerda do mapa (só o mestre vê). O catálogo, com
   as sessões, os vilões e as notas de direção, fica no banco em
   mestre/trilha, que só o mestre lê; o código público não tem
   nenhum desses textos. O mestre importa o catálogo uma vez
   (segredos-trilha.json) e anexa o arquivo de cada música.
   ========================================================== */
(function () {
  'use strict';
  const SV = window.SV, esc = SV.esc, $ = s => document.querySelector(s);
  const T = (SV.trilha = { cat: null, aba: SV.ls.get('trAba', 'sessoes'), busca: '', abertos: new Set(SV.ls.get('trAbertos', [])), enviando: {}, repetir: SV.ls.get('trRepetir', true) });
  const arr = v => Array.isArray(v) ? v : v && typeof v === 'object' ? Object.keys(v).sort((a, b) => a - b).map(k => v[k]) : [];
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function faixas() { return (T.cat && T.cat.faixas) || {}; }
  function arqDe(fid) { const f = faixas()[fid]; return f && f.arq && SV.sons.item(f.arq) ? f.arq : ''; }
  function tocandoFid() { const m = SV.sons.musicaAtual(); if (!m) return ''; return Object.keys(faixas()).find(k => faixas()[k].arq === m.id) || ('#' + m.id); }

  function linha(fid, extra) {
    const f = faixas()[fid]; if (!f) return '';
    if (T.busca && !norm(f.nome + ' ' + f.origem + ' ' + f.uso).includes(norm(T.busca))) return '';
    const tem = arqDe(fid), on = tocandoFid() === fid, env = T.enviando[fid];
    return `<div class="tr-f${on ? ' on' : ''}">
      ${tem ? `<button class="tr-play" type="button" data-tocar="${esc(fid)}" aria-label="${on ? 'Parar' : 'Tocar'} ${esc(f.nome)}">${on ? '■' : '▶'}</button>`
        : `<label class="tr-anexa${env ? ' env' : ''}" title="Anexar o arquivo de áudio desta música"><input type="file" accept="audio/*" data-anexar="${esc(fid)}" hidden>${env ? '…' : '+'}</label>`}
      <div class="tr-txt"><b>${esc(f.nome)}</b>${extra ? `<i>${esc(extra)}</i>` : ''}<small>${esc(f.origem || '')}${f.origem ? ' · ' : ''}${esc(f.uso || '')}</small></div>
      ${tem ? `<button class="tr-x" type="button" data-desanexar="${esc(fid)}" aria-label="Tirar o arquivo de ${esc(f.nome)}" title="Tirar o arquivo">×</button>` : ''}
    </div>`;
  }
  const opcoes = sel => `<option value="">—</option>` + Object.entries(faixas()).sort((a, b) => a[1].nome.localeCompare(b[1].nome)).map(([k, f]) => `<option value="${esc(k)}"${k === sel ? ' selected' : ''}>${esc(f.nome)}${arqDe(k) ? '' : ' (sem arquivo)'}</option>`).join('');
  function slot(rotulo, desc, fid, caminho) {
    const tem = fid && arqDe(fid), on = fid && tocandoFid() === fid;
    return `<div class="tr-slot${on ? ' on' : ''}"><div><b>${esc(rotulo)}</b>${desc ? `<small>${esc(desc)}</small>` : ''}</div>
      <select class="campo" data-slot="${esc(caminho)}" aria-label="Música para ${esc(rotulo)}">${opcoes(fid)}</select>
      <button class="tr-play" type="button" ${tem ? `data-tocar="${esc(fid)}"` : 'disabled'} aria-label="Tocar ${esc(rotulo)}">${on ? '■' : '▶'}</button></div>`;
  }
  const bloco = (id, titulo, sub, corpo) => `<details class="tr-bl" data-bl="${esc(id)}"${T.abertos.has(id) || T.busca ? ' open' : ''}><summary><b>${esc(titulo)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</summary>${corpo}</details>`;

  const ABAS = [['sessoes', 'Sessões'], ['viloes', 'Vilões'], ['cats', 'Categorias'], ['pers', 'Personagens'], ['motivos', 'Motivos']];
  function corpoAba() {
    const C = T.cat;
    if (T.aba === 'sessoes') return arr(C.sessoes).map((s, i) => bloco('s:' + s.id, s.nome, s.tema,
      `<p class="tr-dir">${esc(s.direcao || '')}</p>${arr(s.faixas).map(f => linha(f)).join('')}`)).join('');
    if (T.aba === 'viloes') {
      const et = arr(C.etapas);
      return `<p class="tr-dir">Presença → Aparição → Manifestação → Confronto: a música cresce junto com o perigo. Escolha a faixa de cada etapa.</p>` +
        arr(C.viloes).map((v, i) => bloco('v:' + v.id, v.nome, v.nota,
          et.map(e => slot(e.nome, e.desc, (v.etapas || {})[e.id] || '', 'viloes/' + i + '/etapas/' + e.id)).join('') +
          (arr(v.candidatas).length ? `<p class="tr-sub">Candidatas</p>${arr(v.candidatas).map(f => linha(f)).join('')}` : ''))).join('');
    }
    if (T.aba === 'cats') return arr(C.cats).map(c => {
      const fs = Object.entries(faixas()).filter(([, f]) => arr(f.cats).includes(c.id)).sort((a, b) => (a[1].ordem ?? 999) - (b[1].ordem ?? 999));
      return bloco('c:' + c.id, c.nome + ' (' + fs.length + ')', c.desc, fs.map(([k]) => linha(k)).join('') || '<p class="vazio">Nenhuma faixa.</p>');
    }).join('');
    if (T.aba === 'pers') return `<p class="tr-dir">Cada personagem pode ter um motivo próprio; com o tempo, deforme-o ou misture com o tema de uma Máscara.</p>` +
      arr(C.personagens).map((p, i) => slot(p.nome, '', p.faixa || '', 'personagens/' + i + '/faixa')).join('') +
      `<p class="tr-sub">Sugestões por momento</p>` + arr(C.sugPersonagens).map(s => linha(s.faixa, s.momento)).join('');
    if (T.aba === 'motivos') return `<p class="tr-dir">Sons que ligam momentos da campanha. Use trechos antes; a música inteira quando a coisa surgir.</p>` +
      arr(C.motivos).map((m, i) => slot(m.nome, '', m.faixa || '', 'motivos/' + i + '/faixa')).join('');
    return '';
  }

  function render() {
    const box = $('#trilha'); if (!box || !SV.isGM) return;
    if (box.contains(document.activeElement) && document.activeElement.matches('input[type=search], select')) { T.pendente = true; return; }
    T.pendente = false;
    const S = SV.sons, m = S.musicaAtual(), loops = Object.keys((S.estado && S.estado.loops) || {});
    const nomeM = m ? ((faixas()[tocandoFid()] || {}).nome || (S.item(m.id) || {}).nome || 'Música') : '';
    const top = `<div class="tr-cab"><b>Trilha</b><button class="tr-x" type="button" data-fechar aria-label="Fechar o painel de trilha">×</button></div>
      <div class="tr-agora">${m ? `<span class="tr-eq" aria-hidden="true"></span><b>${esc(nomeM)}</b>` : '<span class="vazio">Sem música</span>'}</div>
      <div class="tr-ctl"><button class="btn sm red" type="button" data-cmd="cortar" title="Para a música na hora">Cortar música</button><button class="btn sm" type="button" data-cmd="silencio" title="Música e ambientes somem devagar; efeitos continuam">Silêncio</button><button class="btn sm" type="button" data-cmd="ambiente" title="Tira a música e volta para o ambiente do lugar">Ambiente</button></div>
      <label class="chave tr-rep"><input type="checkbox" data-repetir ${T.repetir ? 'checked' : ''}><span>Repetir a música</span></label>
      ${loops.length ? `<div class="tr-loops">${loops.map(id => `<span class="tr-chip">${esc((S.item(id) || { nome: 'Som' }).nome)}<button type="button" data-tiraloop="${esc(id)}" aria-label="Desligar ${esc((S.item(id) || { nome: 'som' }).nome)}">×</button></span>`).join('')}</div>` : ''}`;
    if (!T.cat || !T.cat.faixas) {
      box.innerHTML = top + `<div class="tr-imp"><p>O catálogo da trilha ainda não foi carregado. Importe o arquivo <b>segredos-trilha.json</b> (fica só no seu computador, como o dos textos secretos).</p>
        <form data-form="tr-imp"><input class="campo" type="file" name="arq" accept=".json,application/json"><button class="btn red sm" type="submit">Importar</button></form></div>`;
      return;
    }
    const sem = Object.keys(faixas()).filter(k => !arqDe(k)).length;
    box.innerHTML = top + `<input class="campo tr-busca" type="search" placeholder="Buscar música…" value="${esc(T.busca)}" aria-label="Buscar música">
      <div class="tr-abas" role="tablist">${ABAS.map(([k, n]) => `<button type="button" role="tab" aria-selected="${T.aba === k}" data-aba="${k}">${n}</button>`).join('')}</div>
      <div class="tr-corpo">${corpoAba()}</div>
      <div class="tr-pe">
        ${sem ? `<p class="vazio">${sem} de ${Object.keys(faixas()).length} músicas ainda sem arquivo: toque no <b>+</b> para anexar (MP3 até 15 MB).</p>` : ''}
        ${bloco('regras', 'Regras de ouro', '', `<ul class="tr-reg">${arr(T.cat.regras).map(r => `<li>${esc(r)}</li>`).join('')}</ul>`)}
        ${bloco('nova', 'Nova faixa', '', `<form data-form="tr-nova" class="tr-nova"><input class="campo" name="nome" placeholder="Nome da música" required><input class="campo" name="uso" placeholder="Onde usar"><select class="campo" name="cat">${arr(T.cat.cats).map(c => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join('')}</select><button class="btn sm red" type="submit">Adicionar</button></form>`)}
        ${bloco('reimp', 'Reimportar catálogo', '', `<form data-form="tr-imp"><p class="vazio">Mantém os arquivos já anexados e as escolhas de vilões, personagens e motivos.</p><input class="campo" type="file" name="arq" accept=".json,application/json"><button class="btn sm" type="submit">Importar</button></form>`)}
      </div>`;
  }

  async function anexar(fid, file) {
    const f = faixas()[fid]; if (!f || !file) return;
    T.enviando[fid] = 1; render(); SV.toast('Enviando ' + f.nome + '…');
    try {
      const id = await SV.sons.subir(file, 'musica', f.nome);
      if (id) { const velho = f.arq; await SV.db.set('mestre/trilha/faixas/' + fid + '/arq', id); if (velho && velho !== id) SV.sons.apagar(velho); SV.toast(f.nome + ' pronta.'); }
    } catch (e) { SV.toast('Não deu para enviar (' + (e.code || e.message) + ').', 'err'); }
    delete T.enviando[fid]; render();
  }
  async function importar(file) {
    let novo; try { novo = JSON.parse(await file.text()); } catch { SV.toast('Arquivo inválido.', 'err'); return; }
    if (!novo || typeof novo.faixas !== 'object') { SV.toast('Esse não é o arquivo da trilha.', 'err'); return; }
    const velho = T.cat || {};
    /* preserva o que o mestre já fez: arquivos anexados e escolhas de etapas, personagens e motivos */
    for (const [k, f] of Object.entries(velho.faixas || {})) { if (novo.faixas[k]) { if (f.arq) novo.faixas[k].arq = f.arq; } else if (f.nova) novo.faixas[k] = f; }
    arr(novo.viloes).forEach(v => { const o = arr(velho.viloes).find(x => x.id === v.id); if (o && o.etapas) v.etapas = Object.assign({}, v.etapas, o.etapas); });
    arr(novo.personagens).forEach(p => { const o = arr(velho.personagens).find(x => x.id === p.id); if (o && o.faixa) p.faixa = o.faixa; });
    arr(novo.motivos).forEach(p => { const o = arr(velho.motivos).find(x => x.id === p.id); if (o && o.faixa) p.faixa = o.faixa; });
    await SV.db.set('mestre/trilha', novo);
    SV.toast(Object.keys(novo.faixas).length + ' músicas no catálogo.');
  }

  function eventos(box) {
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.fechar != null) { abre(false); return; }
      if (b.dataset.cmd) { SV.sons.ctx(); SV.sons[b.dataset.cmd](); return; }
      if (b.dataset.tiraloop) { SV.sons.loop(b.dataset.tiraloop, false); return; }
      if (b.dataset.aba) { T.aba = b.dataset.aba; SV.ls.set('trAba', T.aba); render(); return; }
      if (b.dataset.tocar) { SV.sons.ctx(); const fid = b.dataset.tocar; if (tocandoFid() === fid) SV.sons.cortar(); else { const a = arqDe(fid); if (a) SV.sons.musica(a, T.repetir); } return; }
      if (b.dataset.desanexar) { const fid = b.dataset.desanexar, f = faixas()[fid]; if (f && f.arq && confirm('Tirar o arquivo de ' + f.nome + '?')) { SV.sons.apagar(f.arq); SV.db.remove('mestre/trilha/faixas/' + fid + '/arq'); } }
    });
    box.addEventListener('toggle', e => { const d = e.target; if (!d.dataset || !d.dataset.bl || T.busca) return; d.open ? T.abertos.add(d.dataset.bl) : T.abertos.delete(d.dataset.bl); SV.ls.set('trAbertos', [...T.abertos]); }, true);
    box.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.anexar) { anexar(t.dataset.anexar, t.files[0]); return; }
      if (t.dataset.repetir != null) { T.repetir = t.checked; SV.ls.set('trRepetir', T.repetir); return; }
      if (t.dataset.slot) { SV.db.set('mestre/trilha/' + t.dataset.slot, t.value || null); t.blur(); }
    });
    box.addEventListener('input', e => { if (e.target.classList.contains('tr-busca')) { T.busca = e.target.value; const c = box.querySelector('.tr-corpo'); if (c) c.innerHTML = corpoAba(); } });
    box.addEventListener('focusout', () => setTimeout(() => { if (T.pendente) render(); }, 0));
    box.addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target;
      if (f.dataset.form === 'tr-imp') { const a = f.elements.arq.files[0]; if (!a) { SV.toast('Escolha o arquivo segredos-trilha.json.'); return; } await importar(a); return; }
      if (f.dataset.form === 'tr-nova') {
        const nome = f.elements.nome.value.trim().slice(0, 60); if (!nome) return;
        await SV.db.set('mestre/trilha/faixas/n' + SV.db.key(), { nome, origem: '', uso: f.elements.uso.value.trim().slice(0, 200), cats: [f.elements.cat.value], nova: true, ordem: 999 });
        f.reset(); SV.toast(nome + ' entrou no catálogo. Agora anexe o arquivo.');
      }
    });
  }

  function abre(on) {
    const box = $('#trilha'), bt = $('#trilha-aba'); if (!box) return;
    box.hidden = !on; bt.setAttribute('aria-expanded', on); bt.classList.toggle('on', on); SV.ls.set('trAberto', on);
    if (on) render();
  }
  T.inicia = function () {
    if (!SV.isGM || T.ok) return; T.ok = true;
    const sec = $('#p-mapa'); if (!sec) return;
    sec.insertAdjacentHTML('beforeend', `<button class="trilha-aba" id="trilha-aba" type="button" aria-controls="trilha" aria-expanded="false" title="Trilha sonora">♪<span>Trilha</span></button><aside class="trilha" id="trilha" aria-label="Trilha sonora do mestre" hidden></aside>`);
    $('#trilha-aba').onclick = () => abre($('#trilha').hidden);
    eventos($('#trilha'));
    SV.db.on('mestre/trilha', v => { T.cat = v && typeof v === 'object' ? v : null; if (!$('#trilha').hidden) render(); });
    SV.sons.onChange(() => { if (!$('#trilha').hidden) render(); });
    if (SV.ls.get('trAberto', false)) abre(true);
  };
})();
