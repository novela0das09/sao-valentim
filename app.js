/* ==========================================================
   São Valentim do Vale · o site
   Junta o banco, as fichas (fichas.html), o mapa 3D (mapa.html),
   a call, os sons, o mural e os pedidos ao mestre.
   ========================================================== */
(function () {
  'use strict';
  const SV = window.SV;
  const $ = s => document.querySelector(s);
  const esc = SV.esc;
  const ini = n => String(n || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const quando = t => {
    if (!t) return '';
    const d = Date.now() - t;
    if (d < 60e3) return 'agora';
    if (d < 3600e3) return Math.floor(d / 60e3) + ' min';
    if (d < 86400e3) return Math.floor(d / 3600e3) + ' h';
    return new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };
  const I = {
    mapa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></svg>',
    fichas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="1.5"/><circle cx="12" cy="9" r="2.6"/><path d="M8 16.5c.8-2 2.2-3 4-3s3.2 1 4 3"/></svg>',
    mesa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>',
    sons: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    micOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 9V6a3 3 0 0 0-5.7-1.3M9 9v2a3 3 0 0 0 5 2.2M5 11a7 7 0 0 0 11.5 5.4M19 11a7 7 0 0 1-.6 2.8M12 18v3M3 3l18 18"/></svg>',
    fone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>'
  };

  /* ---------- avisos ---------- */
  SV.toast = (msg, tipo) => {
    if (!msg) return;
    const el = document.createElement('div');
    el.className = 'toast' + (tipo === 'err' ? ' err' : '');
    el.textContent = msg;
    $('#toasts').append(el);
    setTimeout(() => el.remove(), tipo === 'err' ? 6000 : 4200);
  };

  /* ---------- o que vem do banco ---------- */
  const D = { users: {}, online: {}, fichas: {}, npcs: {}, pecas: {}, pecasGM: {}, travas: {}, cena3d: null, mural: {}, pedidos: {}, rolagens: {}, regras: null, banidos: {} };
  const ouvintes = {};
  const ouve = (k, f) => { (ouvintes[k] ||= new Set()).add(f); return () => ouvintes[k].delete(f); };
  const avisa = k => { for (const f of [...(ouvintes[k] || [])]) { try { f(D[k]); } catch (e) { ouvintes[k].delete(f); console.warn(e); } } };

  const nomeDe = uid => {
    if (!uid) return '';
    if (uid === SV.me.uid) return SV.me.nome;
    return (D.users[uid] && D.users[uid].nome) || 'Alguém';
  };
  const fotoDe = uid => (uid === SV.me.uid ? SV.me.foto : D.users[uid] && D.users[uid].foto) || '';
  const avatar = (uid, nome) => { const f = fotoDe(uid); return `<span class="av">${f ? `<img src="${esc(f)}" alt="" referrerpolicy="no-referrer">` : esc(ini(nome || nomeDe(uid)))}</span>`; };
  const ehGM = uid => SV.mestres && SV.mestres[uid] === true;

  /* nome do personagem do jogador (a primeira ficha de jogador dele) */
  SV.meuNome = () => {
    const f = Object.values(D.fichas).map(x => x.f).find(f => f && f.dono === SV.me.uid && (f.papel || 'pj') === 'pj');
    return f ? String(f.nome).split(' ')[0] : SV.me.nome.split(' ')[0];
  };

  function assina() {
    const db = SV.db, me = SV.me.uid;
    db.on('users', v => { D.users = v || {}; avisa('users'); render.mesa(); render.voz(); });
    db.update('online/' + me, { t: Date.now() }).catch(() => {});
    db.onDisconnectRemove('online/' + me);
    db.on('online', v => { D.online = v || {}; render.mesa(); });
    db.on('mesa/mestres', v => { SV.mestres = v || {}; });
    const fichas = v => {
      const novo = {};
      for (const [id, x] of Object.entries(v || {})) {
        if (!x || typeof x.json !== 'string') continue;
        let f = null;
        try { f = JSON.parse(x.json); } catch { continue; }
        f.id = id; f.dono = x.dono || ''; f.papel = x.papel || 'pj'; f.visivel = !!x.visivel;
        novo[id] = { meta: x, f };
        enviado[id] = JSON.stringify(f);
      }
      D.fichas = novo;
      avisa('fichas'); render.voz();
    };
    if (SV.isGM) db.on('fichas', fichas); else db.query('fichas', 'dono', me, fichas);
    db.on('npcs', v => { D.npcs = v || {}; render.mesa(); });
    db.on('pecas', v => { D.pecas = v || {}; avisa('pecas'); SV.voz.mix && SV.voz.mix(); render.voz(); });
    if (SV.isGM) db.on('pecas_gm', v => { D.pecasGM = v || {}; avisa('pecas'); });
    db.on('mesa/travas', v => { D.travas = v || {}; avisa('pecas'); });
    db.on('mesa/cena3d', v => { D.cena3d = v || null; avisa('cena3d'); });
    db.on('mesa/regras', v => { D.regras = v && v.json ? v.json : null; avisa('regras'); });
    db.on('mesa/mural', v => {
      const antes = D.mural; D.mural = v || {};
      if (!SV.isGM && antes.__ok) for (const [id, m] of Object.entries(D.mural)) if (!antes[id] && m && m.texto) SV.toast('Novo aviso do mestre no mural.');
      D.mural.__ok = true; render.mesa(); badges();
    });
    const pedidos = v => {
      const antes = D.pedidos; D.pedidos = v || {};
      if (SV.isGM && antes.__ok) for (const [u, l] of Object.entries(D.pedidos)) for (const id of Object.keys(l || {})) if (!(antes[u] && antes[u][id])) SV.toast(nomeDe(u) + ' fez um pedido ao mestre.');
      if (!SV.isGM && antes.__ok) for (const [id, p] of Object.entries(D.pedidos)) if (p && p.resp && !(antes[id] && antes[id].resp)) SV.toast('O mestre respondeu o seu pedido.');
      D.pedidos.__ok = true; render.mesa(); badges();
    };
    if (SV.isGM) db.on('pedidos', pedidos); else db.on('pedidos/' + me, pedidos);
    db.on('rolagens', v => { D.rolagens = v || {}; render.mesa(); });
    if (SV.isGM) db.on('mesa/banidos', v => { D.banidos = v || {}; render.mesa(); });
  }

  /* ==========================================================
     ponte com as fichas (fichas.html chama parent.SV.F)
     ========================================================== */
  const enviado = {}; // id -> json da última versão que o banco tem
  const lista = () => Object.values(D.fichas).map(x => x.f).sort((a, b) => ((a.criado || 0) - (b.criado || 0)) || String(a.nome).localeCompare(b.nome));
  function npcPublico(f) {
    if (!SV.isGM) return;
    if (f.papel !== 'pj' && f.visivel) SV.db.set('npcs/' + f.id, { nome: f.nome || 'Sem nome', papel: f.papel, ocupacao: f.ocupacao || '', cor: f.cor || '', retrato: f.retrato || '', t: Date.now() }).catch(() => {});
    else if (D.npcs[f.id]) SV.db.remove('npcs/' + f.id).catch(() => {});
  }
  function atualizaPecaDaFicha(f) {
    const id = 'f_' + f.id, p = D.pecas[id] || D.pecasGM[id];
    if (!p) return;
    const nome = String(f.nome || 'Sem nome').split(' ')[0].slice(0, 22), cor = f.cor || p.cor;
    const pub = f.papel === 'pj' || f.visivel;
    if (SV.isGM && pub !== !!D.pecas[id]) { M.setVisivel(id, pub); return; }
    if (p.nome !== nome || p.cor !== cor) SV.M.editar(id, { nome, cor });
  }
  SV.F = {
    isGM: () => !!SV.isGM,
    me: () => ({ uid: SV.me.uid, nome: SV.me.nome }),
    lista,
    onMuda(cb) { return ouve('fichas', () => cb(lista())); },
    jogadores() { return Object.entries(D.users).filter(([u]) => !ehGM(u)).map(([uid, x]) => ({ uid, nome: x.nome || 'Sem nome' })); },
    nomeDe,
    salvar(fs) {
      const me = SV.me.uid, vistos = new Set();
      for (const f of fs) {
        if (!f || !f.id) continue;
        vistos.add(f.id);
        if (!SV.isGM) { f.dono ||= me; f.papel = 'pj'; }
        f.papel ||= 'pj'; f.dono ??= ''; f.criado ||= Date.now();
        const json = JSON.stringify(f);
        if (enviado[f.id] === json) continue;
        if (!SV.isGM && f.dono !== me) continue;
        enviado[f.id] = json;
        SV.db.set('fichas/' + f.id, { dono: f.dono || '', papel: f.papel, visivel: !!f.visivel, nome: String(f.nome || '').slice(0, 60), json, t: Date.now() })
          .catch(e => { delete enviado[f.id]; SV.toast('A ficha de ' + (f.nome || 'alguém') + ' não foi salva no banco (' + (e.code || e.message) + ').', 'err'); });
        D.fichas[f.id] = { meta: { dono: f.dono }, f: JSON.parse(json) };
        npcPublico(f); atualizaPecaDaFicha(f);
      }
      for (const id of Object.keys(D.fichas)) {
        if (vistos.has(id)) continue;
        const f = D.fichas[id].f;
        if (!SV.isGM && f.dono !== me) continue;
        delete D.fichas[id]; delete enviado[id];
        SV.db.remove('fichas/' + id).catch(() => {});
        if (SV.isGM) { SV.db.remove('npcs/' + id).catch(() => {}); }
        SV.M.remover('f_' + id);
      }
    },
    rolou(e) {
      if (!e) return;
      const f = lista().find(x => x.nome === e.quem);
      if (SV.isGM && f && f.papel !== 'pj' && !f.visivel) return; // rolagem secreta do mestre
      const r = { quem: String(e.quem || '').slice(0, 60), o: String(e.o || '').slice(0, 120), tot: String(e.tot ?? '').slice(0, 12), v: e.v || '', vt: String(e.vt || '').slice(0, 60), det: String(e.det || '').slice(0, 200), t: e.t || Date.now(), por: SV.me.uid };
      SV.db.push('rolagens/' + SV.me.uid, r).catch(() => {});
    },
    porNoMapa(fid) {
      const f = D.fichas[fid] && D.fichas[fid].f;
      if (!f) { SV.toast('Salve a ficha antes de pôr no mapa.'); return; }
      const id = 'f_' + fid;
      if (!(D.pecas[id] || D.pecasGM[id])) {
        SV.M.novaPeca(id, { nome: String(f.nome || 'Sem nome').split(' ')[0].slice(0, 22), cor: f.cor || '', dono: f.dono || '', tipo: f.papel || 'pj', ficha: fid }, f.papel === 'pj' || f.visivel);
      }
      SV.M.focar(id); irAba('mapa');
    },
    temPeca: fid => !!(D.pecas['f_' + fid] || D.pecasGM['f_' + fid]),
    regras: () => D.regras,
    onRegras(cb) { return ouve('regras', () => cb(D.regras)); },
    salvarRegras(json) { if (SV.isGM && json !== D.regras) { D.regras = json; SV.db.set('mesa/regras', { json, t: Date.now() }).catch(() => {}); } }
  };

  /* ==========================================================
     ponte com o mapa (mapa.html chama parent.SV.M)
     ========================================================== */
  const ultimoEnvio = {};
  const CORES = ['#e0b45e', '#d35d6e', '#6cb37a', '#4f8fd6', '#9a77d0', '#d07b3f', '#5fb3b3', '#c9c9c9'];
  const M = (SV.M = {
    isGM: () => !!SV.isGM,
    me: () => SV.me.uid,
    pausado: () => aba !== 'mapa' || document.hidden,
    pecas() {
      const out = {};
      for (const [id, p] of Object.entries(D.pecas)) if (p) out[id] = Object.assign({}, p, { id, visivel: true, trava: D.travas[id] === true });
      if (SV.isGM) for (const [id, p] of Object.entries(D.pecasGM)) if (p) out[id] = Object.assign({}, p, { id, visivel: false, trava: D.travas[id] === true });
      return out;
    },
    onPecas(cb) { return ouve('pecas', () => cb(M.pecas())); },
    caminho: id => (D.pecas[id] ? 'pecas/' : 'pecas_gm/') + id,
    podeMover(id) {
      const p = D.pecas[id] || D.pecasGM[id];
      if (!p) return false;
      if (SV.isGM) return true;
      return p.dono === SV.me.uid && D.travas[id] !== true;
    },
    mover(id, x, z, final) {
      if (!M.podeMover(id)) return;
      x = Math.round(x * 100) / 100; z = Math.round(z * 100) / 100;
      const alvo = D.pecas[id] || D.pecasGM[id];
      alvo.x = x; alvo.z = z;
      SV.voz.mix && SV.voz.mix();
      const agora = Date.now();
      clearTimeout(ultimoEnvio[id + 't']);
      const envia = () => { ultimoEnvio[id] = Date.now(); SV.db.update(M.caminho(id), { x, z }).catch(e => SV.toast('Não deu para mover a peça (' + (e.code || e.message) + ').', 'err')); };
      if (final || agora - (ultimoEnvio[id] || 0) > 150) envia();
      else ultimoEnvio[id + 't'] = setTimeout(envia, 160);
    },
    novaPeca(id, dados, publica = true) {
      if (!SV.isGM && dados.dono !== SV.me.uid) return null;
      id ||= 'p_' + SV.uid();
      const n = Object.keys(D.pecas).length + Object.keys(D.pecasGM).length;
      const p = { nome: String(dados.nome || 'Figura').slice(0, 22), cor: dados.cor || CORES[n % CORES.length], dono: dados.dono || '', tipo: dados.tipo || 'npc', ficha: dados.ficha || '', x: dados.x ?? null, z: dados.z ?? null, t: Date.now() };
      if (p.x == null) { delete p.x; delete p.z; }
      (publica ? D.pecas : D.pecasGM)[id] = p;
      SV.db.set((publica ? 'pecas/' : 'pecas_gm/') + id, p).catch(e => SV.toast('Não deu para pôr a peça (' + (e.code || e.message) + ').', 'err'));
      avisa('pecas');
      return id;
    },
    editar(id, o) { if (M.podeMover(id) || SV.isGM) SV.db.update(M.caminho(id), o).catch(() => {}); },
    remover(id) {
      const p = D.pecas[id] || D.pecasGM[id];
      if (!p || !(SV.isGM || p.dono === SV.me.uid)) return;
      SV.db.remove(M.caminho(id)).catch(() => {});
      if (SV.isGM) SV.db.remove('mesa/travas/' + id).catch(() => {});
    },
    setTrava(id, on) { if (SV.isGM) on ? SV.db.set('mesa/travas/' + id, true) : SV.db.remove('mesa/travas/' + id); },
    async setVisivel(id, on) {
      if (!SV.isGM) return;
      const de = on ? 'pecas_gm/' : 'pecas/', para = on ? 'pecas/' : 'pecas_gm/';
      const p = (on ? D.pecasGM : D.pecas)[id];
      if (!p) return;
      await SV.db.set(para + id, p); await SV.db.remove(de + id);
    },
    minhaPeca() {
      const ps = Object.entries(D.pecas).filter(([, p]) => p && p.dono === SV.me.uid);
      return (ps.find(([, p]) => p.tipo === 'pj') || ps[0] || [null])[0];
    },
    nomeDe,
    cena: () => D.cena3d,
    onCena(cb) { return ouve('cena3d', () => cb(D.cena3d)); },
    setCena(c) { if (SV.isGM) { D.cena3d = c; SV.db.set('mesa/cena3d', Object.assign({}, c, { t: Date.now() })).catch(() => {}); } },
    focar(id) { M._foco = id; avisa('foco'); },
    onFoco(cb) { return ouve('foco', () => cb(M._foco)); }
  });

  /* posição de cada pessoa para a call: a peça de jogador dela no mapa */
  SV.posDe = uid => {
    const e = Object.entries(D.pecas).find(([, p]) => p && p.dono === uid && p.tipo === 'pj' && p.x != null) || Object.entries(D.pecas).find(([, p]) => p && p.dono === uid && p.x != null);
    return e ? { x: +e[1].x, z: +e[1].z, cena: 'vale' } : null;
  };

  /* ==========================================================
     abas
     ========================================================== */
  const ABAS = [['mapa', 'Mapa', I.mapa], ['fichas', 'Fichas', I.fichas], ['mesa', 'Mesa', I.mesa], ['sons', 'Sons', I.sons]];
  let aba = 'mapa';
  const carregado = {};
  function irAba(a) {
    if (!ABAS.some(x => x[0] === a)) a = 'mapa';
    aba = a; SV.ls.set('aba', a);
    for (const [k] of ABAS) {
      const p = $('#p-' + k); p.classList.toggle('ativo', k === a);
      p.setAttribute('aria-hidden', k === a ? 'false' : 'true');
      p.inert = k !== a;
    }
    for (const b of $('#abas').children) b.setAttribute('aria-selected', String(b.dataset.aba === a));
    if (a === 'mapa' && !carregado.mapa) { carregado.mapa = true; $('#f-mapa').src = 'mapa.html' + location.search; }
    if (a === 'fichas' && !carregado.fichas) { carregado.fichas = true; $('#f-fichas').src = 'fichas.html' + location.search; }
    if (a === 'mesa') { SV.ls.set('visto.mesa', Date.now()); badges(); }
    if (a === 'sons') render.sons();
  }
  SV.irAba = irAba;
  function montaAbas() {
    $('#abas').innerHTML = ABAS.map(([k, n, ic]) => `<button type="button" role="tab" data-aba="${k}" aria-controls="p-${k}">${ic}<span class="t">${n}</span><span class="bolinha" hidden></span></button>`).join('');
    $('#abas').onclick = e => { const b = e.target.closest('[data-aba]'); if (b) irAba(b.dataset.aba); };
    $('#f-mapa').addEventListener('load', () => { const c = $('#p-mapa .carregando-mapa'); if (c) c.remove(); });
  }
  function badges() {
    const visto = SV.ls.get('visto.mesa', 0);
    let n = 0;
    if (SV.isGM) { for (const l of Object.values(D.pedidos)) if (l && typeof l === 'object') for (const p of Object.values(l)) if (p && p.t && !p.feito) n++; }
    else { for (const [id, m] of Object.entries(D.mural)) if (id !== '__ok' && m && m.t > visto) n++; for (const [id, p] of Object.entries(D.pedidos)) if (id !== '__ok' && p && p.resp && (p.tr || 0) > visto) n++; }
    if (aba === 'mesa' && !SV.isGM) n = 0;
    const b = $('#abas [data-aba="mesa"] .bolinha');
    if (b) { b.hidden = !n; b.textContent = n > 9 ? '9+' : n; }
  }

  /* ---------- topo: papel, call, conta ---------- */
  function montaTopo() {
    $('#papel').textContent = SV.isGM ? 'MESTRE' : 'JOGADOR';
    const c = $('#b-conta');
    c.innerHTML = SV.me.foto ? `<img src="${esc(SV.me.foto)}" alt="" referrerpolicy="no-referrer">` : esc(ini(SV.me.nome));
    c.onclick = e => { e.stopPropagation(); const m = $('#menu'); m.hidden = !m.hidden; c.setAttribute('aria-expanded', String(!m.hidden)); if (!m.hidden) render.menu(); };
    document.addEventListener('click', e => { const m = $('#menu'); if (!m.hidden && !m.contains(e.target) && e.target !== c) { m.hidden = true; c.setAttribute('aria-expanded', 'false'); } });
    $('#b-voz').onclick = () => { const v = $('#voz'); v.hidden = !v.hidden; $('#b-voz').setAttribute('aria-expanded', String(!v.hidden)); render.voz(); };
    addEventListener('keydown', e => { if (e.key === 'Escape') { $('#menu').hidden = true; $('#voz').hidden = true; } });
  }

  /* ==========================================================
     desenho das partes
     ========================================================== */
  const render = {};
  let tMesa = 0;
  render.mesa = () => { clearTimeout(tMesa); tMesa = setTimeout(desenhaMesa, 60); };

  function campoAberto(el) { return el && el.contains(document.activeElement) && /TEXTAREA|INPUT/.test(document.activeElement.tagName); }

  function desenhaMesa() {
    if (!SV.me) return;
    const box = $('#p-mesa');
    if (campoAberto(box)) { box.dataset.sujo = '1'; return; }
    delete box.dataset.sujo;
    const st = box.scrollTop;
    const gm = SV.isGM;
    /* mural */
    const mural = Object.entries(D.mural).filter(([id, m]) => id !== '__ok' && m && m.texto).sort((a, b) => b[1].t - a[1].t);
    const muralHTML = `<div class="cartao"><h2>Mural <small>${gm ? 'só o mestre escreve' : 'avisos do mestre'}</small></h2>
      ${gm ? `<form class="compor" data-form="mural"><textarea name="t" rows="2" maxlength="600" placeholder="Escreva um aviso para todos (cena, horário da próxima sessão, regra da casa)…"></textarea><button class="btn red" type="submit">Pregar</button></form>` : ''}
      <div class="lista">${mural.length ? mural.map(([id, m], i) => `<div class="aviso" style="--rot:${(i % 2 ? .5 : -.4)}deg"><p>${esc(m.texto)}</p><small>${quando(m.t)}</small>${gm ? `<button class="x" type="button" data-tira="${esc(id)}" aria-label="Tirar aviso">×</button>` : ''}</div>`).join('') : '<p class="vazio">Nada pregado no mural ainda.</p>'}</div></div>`;
    /* rolagens */
    const rols = [];
    for (const [u, l] of Object.entries(D.rolagens)) for (const [id, r] of Object.entries(l || {})) if (r && r.t) rols.push(Object.assign({ id, u }, r));
    rols.sort((a, b) => b.t - a.t);
    const cls = v => (v === 'ok' ? 'ok' : v === 'bad' ? 'bad' : v === 'crit' ? 'crit' : '');
    const rolHTML = `<div class="cartao"><h2>Rolagens <small>da mesa toda</small></h2>
      <div class="lista">${rols.length ? rols.slice(0, 40).map(r => `<div class="rol ${cls(r.v)}"><b>${esc(r.quem)} · ${esc(r.o)}</b><span class="tot">${esc(r.tot)}</span><small>${esc([r.vt, r.det].filter(Boolean).join(' · '))}${r.u !== SV.me.uid ? ' · ' + esc(nomeDe(r.u).split(' ')[0]) : ''} · ${quando(r.t)}</small></div>`).join('') : '<p class="vazio">Quando alguém rolar um teste nas fichas, aparece aqui para todos.</p>'}</div>
      ${gm && rols.length ? '<div class="acoes"><button class="btn sm" type="button" data-acao="limpar-rol">Limpar rolagens</button></div>' : ''}</div>`;
    /* pedidos */
    let pedHTML;
    if (gm) {
      const ps = [];
      for (const [u, l] of Object.entries(D.pedidos)) if (u !== '__ok') for (const [id, p] of Object.entries(l || {})) if (p && p.t) ps.push(Object.assign({ id, u }, p));
      ps.sort((a, b) => (a.feito ? 1 : 0) - (b.feito ? 1 : 0) || b.t - a.t);
      pedHTML = `<div class="cartao"><h2>Pedidos ao mestre <small>${ps.filter(p => !p.feito).length} em aberto</small></h2><div class="lista">${ps.length ? ps.map(p => `<div class="ped${p.feito ? ' feito' : ''}">${avatar(p.u)}<div><p>${esc(p.texto)}</p><small>${esc(nomeDe(p.u))} · ${quando(p.t)}${p.resp ? ' · você respondeu: ' + esc(p.resp) : ''}</small>
        ${p.feito ? '' : `<form class="compor" data-form="resp" data-u="${esc(p.u)}" data-id="${esc(p.id)}" style="margin-top:8px"><input class="campo" name="t" maxlength="300" placeholder="Responder (opcional)"><button class="btn sm red" type="submit">Feito</button></form>`}</div>
        <div class="acoes"><button class="btn sm" type="button" data-apaga-ped="${esc(p.u)}/${esc(p.id)}" aria-label="Apagar pedido">×</button></div></div>`).join('') : '<p class="vazio">Os jogadores pedem aqui: usar um item, rolar algo em segredo, uma dúvida de regra.</p>'}</div></div>`;
    } else {
      const ps = Object.entries(D.pedidos).filter(([id, p]) => id !== '__ok' && p && p.t).map(([id, p]) => Object.assign({ id }, p)).sort((a, b) => b.t - a.t);
      pedHTML = `<div class="cartao"><h2>Pedir ao mestre <small>só ele vê</small></h2>
        <form class="compor" data-form="pedido"><textarea name="t" rows="2" maxlength="400" placeholder="Ex.: quero procurar pistas no porão sem os outros saberem."></textarea><button class="btn red" type="submit">Enviar</button></form>
        <div class="lista">${ps.map(p => `<div class="ped${p.feito ? ' feito' : ''}">${avatar(SV.me.uid)}<div><p>${esc(p.texto)}</p><small>${quando(p.t)} · ${p.feito ? 'resolvido' : 'esperando o mestre'}</small>${p.resp ? `<p style="margin-top:6px;color:var(--gold)">Mestre: ${esc(p.resp)}</p>` : ''}</div><div class="acoes"><button class="btn sm" type="button" data-apaga-ped="${esc(SV.me.uid)}/${esc(p.id)}" aria-label="Apagar pedido">×</button></div></div>`).join('')}</div></div>`;
    }
    /* NPCs e inimigos conhecidos */
    const npcs = Object.entries(D.npcs).filter(([, n]) => n && n.nome).sort((a, b) => (a[1].papel === 'inimigo') - (b[1].papel === 'inimigo') || a[1].nome.localeCompare(b[1].nome));
    const npcHTML = `<div class="cartao"><h2>Quem vocês conhecem <small>${gm ? 'NPCs e inimigos visíveis' : 'NPCs e inimigos'}</small></h2>
      ${npcs.length ? `<div class="npcs">${npcs.map(([, n]) => `<div class="npc${n.papel === 'inimigo' ? ' inimigo' : ''}"><div class="ft" style="${n.cor ? 'color:' + esc(n.cor) : ''}">${n.retrato ? `<img src="${esc(n.retrato)}" alt="">` : esc(ini(n.nome))}</div><div class="tx"><b>${esc(n.nome)}</b><small>${n.papel === 'inimigo' ? 'Ameaça' : 'NPC'}${n.ocupacao ? ' · ' + esc(n.ocupacao) : ''}</small></div></div>`).join('')}</div>` : `<p class="vazio">${gm ? 'Crie NPCs e inimigos na aba Fichas e marque “Visível para os jogadores” para eles aparecerem aqui.' : 'O mestre ainda não apresentou ninguém.'}</p>`}</div>`;
    /* pessoas */
    const pessoas = Object.entries(D.users).filter(([u]) => !D.banidos[u]).sort((a, b) => (!!D.online[b[0]]) - (!!D.online[a[0]]) || String(a[1].nome).localeCompare(b[1].nome));
    const banidos = Object.keys(D.banidos).filter(u => D.banidos[u]);
    const pesHTML = `<div class="cartao"><h2>Na mesa <small>${Object.keys(D.online).length} online</small></h2><div>${pessoas.map(([u, x]) => `<div class="pessoa"><span class="ponto${D.online[u] ? ' on' : ''}" title="${D.online[u] ? 'online' : 'fora'}"></span>${avatar(u, x.nome)}<span class="nm">${esc(x.nome || 'Sem nome')}<small>${ehGM(u) ? 'mestre' : 'jogador'}${u === SV.me.uid ? ' · você' : ''}</small></span>
      ${gm && u !== SV.me.uid ? `<span class="acoes">${ehGM(u) ? `<button class="btn sm" type="button" data-tira-gm="${esc(u)}">Tirar de mestre</button>` : `<button class="btn sm" type="button" data-poe-gm="${esc(u)}" title="Também narra e vê tudo">Tornar mestre</button><button class="btn sm" type="button" data-bane="${esc(u)}">Tirar da mesa</button>`}</span>` : ''}</div>`).join('')}</div>
      ${gm && banidos.length ? `<p class="vazio">Fora da mesa: ${banidos.map(u => `${esc(nomeDe(u))} <button class="btn sm" type="button" data-desbane="${esc(u)}">Deixar voltar</button>`).join(' ')}</p>` : ''}
      ${gm ? '<p class="vazio">Para chamar alguém, mande o link do site. A pessoa entra com a conta do Google e aparece aqui.</p>' : ''}</div>`;
    /* call (mestre) */
    let callHTML = '';
    if (gm) {
      const c = SV.voz.C();
      callHTML = `<div class="cartao"><h2>Call de voz <small>regras da mesa</small></h2>
        <label class="chave"><input type="checkbox" data-cfg="aberta" ${c.aberta ? 'checked' : ''}><span>Call aberta<small>Fechada, só o mestre entra.</small></span></label>
        <label class="chave"><input type="checkbox" data-cfg="prox" ${c.prox ? 'checked' : ''}><span>Voz por proximidade<small>Quem está longe da sua peça no mapa fica baixo ou some. O mestre sempre ouve e é ouvido.</small></span></label>
        <div class="faixa"><span>Alcance</span><input type="range" min="3" max="80" step="1" value="${c.raio}" data-cfg="raio" aria-label="Alcance da voz"><b>${c.raio} m</b></div></div>`;
    }
    const titulo = `<div class="titulo-pg"><h1>A mesa</h1><p>${gm ? 'Você é o mestre. Pregue avisos, responda pedidos, controle a call e veja quem está online.' : 'Avisos do mestre, as rolagens de todos e o seu canal direto com o mestre.'}</p></div>`;
    box.innerHTML = titulo + `<div class="mesa"><div class="col">${muralHTML}${pedHTML}${rolHTML}</div><div class="col">${npcHTML}${pesHTML}${callHTML}</div></div>`;
    box.scrollTop = st;
  }

  function eventosMesa() {
    const box = $('#p-mesa');
    box.addEventListener('focusout', () => setTimeout(() => { if (box.dataset.sujo && !campoAberto(box)) desenhaMesa(); }, 0));
    box.addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target, t = (f.elements.t.value || '').trim(), tipo = f.dataset.form;
      if (tipo !== 'resp' && !t) return;
      f.querySelector('button[type=submit]').disabled = true;
      try {
        if (tipo === 'mural') await SV.db.push('mesa/mural', { texto: t, t: Date.now() });
        if (tipo === 'pedido') await SV.db.push('pedidos/' + SV.me.uid, { texto: t, t: Date.now() });
        if (tipo === 'resp') await SV.db.update('pedidos/' + f.dataset.u + '/' + f.dataset.id, t ? { feito: true, resp: t, tr: Date.now() } : { feito: true });
        f.reset(); document.activeElement && document.activeElement.blur();
        if (tipo === 'pedido') SV.toast('Pedido enviado ao mestre.');
      } catch (err) { SV.toast('Não foi (' + (err.code || err.message) + ').', 'err'); }
      f.querySelector('button[type=submit]') && (f.querySelector('button[type=submit]').disabled = false);
      desenhaMesa();
    });
    box.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.tagName === 'TEXTAREA') e.target.form.requestSubmit(); });
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.tira) SV.db.remove('mesa/mural/' + d.tira);
      if (d.apagaPed) SV.db.remove('pedidos/' + d.apagaPed);
      if (d.acao === 'limpar-rol') { if (b.dataset.certeza) SV.db.remove('rolagens'); else { b.dataset.certeza = '1'; b.textContent = 'Toque de novo para apagar'; setTimeout(() => desenhaMesa(), 3000); } }
      if (d.poeGm) SV.db.set('mesa/mestres/' + d.poeGm, true).then(() => render.mesa());
      if (d.tiraGm) SV.db.remove('mesa/mestres/' + d.tiraGm).then(() => render.mesa());
      if (d.bane) { if (b.dataset.certeza) SV.db.set('mesa/banidos/' + d.bane, true); else { b.dataset.certeza = '1'; b.textContent = 'Confirmar'; } }
      if (d.desbane) SV.db.remove('mesa/banidos/' + d.desbane);
    });
    box.addEventListener('change', e => {
      const k = e.target.dataset.cfg; if (!k) return;
      SV.voz.setCfg({ [k]: e.target.type === 'checkbox' ? e.target.checked : +e.target.value });
    });
    box.addEventListener('input', e => { if (e.target.dataset.cfg === 'raio') e.target.nextElementSibling.textContent = e.target.value + ' m'; });
  }

  /* ---------- sons ---------- */
  render.sons = () => {
    const box = $('#p-sons'); if (!SV.sons) return;
    const S = SV.sons, gm = SV.isGM, loops = (S.estado && S.estado.loops) || {};
    const todos = S.todos();
    const amb = todos.filter(x => x.tipo === 'ambiente'), efe = todos.filter(x => x.tipo !== 'ambiente');
    const pad = (x, modo) => `<button class="pad${loops[x.id] ? ' on' : ''}" type="button" data-som="${esc(x.id)}" data-modo="${modo}" ${gm ? '' : 'disabled'} aria-pressed="${!!loops[x.id]}"><b>${esc(x.nome)}</b><small>${modo === 'loop' ? (loops[x.id] ? 'tocando' : 'ambiente') : 'efeito'}${x.pronto ? '' : ' · arquivo'}</small>${gm && !x.pronto ? `<span class="del" role="button" tabindex="0" data-apaga-som="${esc(x.id)}" aria-label="Apagar ${esc(x.nome)}">×</span>` : ''}</button>`;
    const tocando = Object.keys(loops).map(id => (S.item(id) || { nome: 'Som' }).nome);
    box.innerHTML = `<div class="titulo-pg"><h1>Sons</h1><p>${gm ? 'O que você tocar aqui toca para todos ao mesmo tempo. Ambientes ficam em loop; efeitos tocam uma vez.' : 'O mestre controla os sons da mesa. Aqui você ajusta o volume no seu aparelho.'}</p></div>
      <div class="mesa"><div class="col">
      ${gm ? `<div class="cartao"><h2>Ambientes <small>toque para ligar ou desligar</small></h2><div class="pads">${amb.map(x => pad(x, 'loop')).join('')}</div>
        <div class="acoes"><button class="btn sm" type="button" data-acao="parar">Parar todos</button></div></div>
        <div class="cartao"><h2>Efeitos <small>tocam uma vez para todos</small></h2><div class="pads">${efe.map(x => pad(x, 'efeito')).join('')}</div></div>` :
        `<div class="cartao"><h2>Tocando agora</h2>${tocando.length ? `<div class="lista">${tocando.map(n => `<div class="rol"><b>${esc(n)}</b></div>`).join('')}</div>` : '<p class="vazio">Silêncio no vale.</p>'}</div>`}
      </div><div class="col">
      <div class="cartao"><h2>No seu aparelho</h2>
        <div class="faixa"><span>Volume</span><input type="range" min="0" max="1" step="0.05" value="${S.vol}" data-vol aria-label="Volume dos sons"><b>${Math.round(S.vol * 100)}%</b></div>
        <label class="chave"><input type="checkbox" data-mudo ${S.mudo ? 'checked' : ''}><span>Silenciar os sons da mesa<small>A call continua normal.</small></span></label>
        ${S.ac && S.ac.state === 'running' ? '' : '<p class="vazio">O navegador só libera o som depois do primeiro toque na página. Toque em qualquer lugar.</p>'}</div>
      ${gm ? `<div class="cartao"><h2>Seus arquivos <small>até 3 MB cada</small></h2>
        <p class="vazio">MP3 ou OGG curtos funcionam melhor. Ficam guardados na mesa e aparecem acima.</p>
        <form class="compor" data-form="som" style="flex-wrap:wrap"><input class="campo" type="file" name="arq" accept="audio/*" style="padding:7px"><select class="campo" name="tipo" style="flex:0 0 130px"><option value="ambiente">Ambiente</option><option value="efeito">Efeito</option></select><button class="btn red" type="submit">Enviar</button></form></div>` : ''}
      </div></div>`;
  };
  function eventosSons() {
    const box = $('#p-sons');
    box.addEventListener('click', e => {
      const del = e.target.closest('[data-apaga-som]');
      if (del) { e.stopPropagation(); SV.sons.apagar(del.dataset.apagaSom); return; }
      const b = e.target.closest('button'); if (!b || !SV.isGM) return;
      if (b.dataset.acao === 'parar') SV.sons.pararTudo();
      const id = b.dataset.som;
      if (id) { SV.sons.ctx(); if (b.dataset.modo === 'loop') SV.sons.loop(id, !(SV.sons.estado.loops || {})[id]); else SV.sons.efeito(id); }
    });
    box.addEventListener('input', e => { if (e.target.dataset.vol != null) { SV.sons.setVol(+e.target.value); e.target.nextElementSibling.textContent = Math.round(+e.target.value * 100) + '%'; } });
    box.addEventListener('change', e => { if (e.target.dataset.mudo != null) SV.sons.setMudo(e.target.checked); });
    box.addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target, arq = f.elements.arq.files[0];
      if (!arq) { SV.toast('Escolha um arquivo de áudio.'); return; }
      f.querySelector('button').disabled = true;
      try { await SV.sons.subir(arq, f.elements.tipo.value); } catch (err) { SV.toast('Não deu para enviar (' + (err.code || err.message) + ').', 'err'); }
      f.querySelector('button').disabled = false;
    });
  }

  /* ---------- call ---------- */
  render.voz = () => {
    const V = SV.voz, b = $('#b-voz');
    if (!b) return;
    const peers = Object.entries(V.peers || {}).filter(([, p]) => p && p.s);
    b.className = 'ic' + (V.joined ? (V.muted || V.semMic ? ' ao-vivo' : ' on') : '');
    b.innerHTML = (V.joined && (V.muted || V.semMic) ? I.micOff : I.mic) + `<span class="rot">${V.joined ? 'Na call' : 'Call'}${peers.length ? ' · ' + peers.length : ''}</span>`;
    b.setAttribute('aria-pressed', String(V.joined));
    const box = $('#voz'); if (box.hidden) return;
    if (!V.ok) { box.innerHTML = '<h3>Call <button class="x" type="button" data-fecha aria-label="Fechar">×</button></h3><p class="vazio">Este navegador não faz chamadas de voz. Tente o Chrome, o Edge ou o Safari atualizados.</p>'; return; }
    const c = V.C();
    const linhas = peers.filter(([u]) => u !== V.me).map(([u, p]) => {
      const l = V.link(V.me, u), pct = Math.round((l.g || 0) * 100);
      const vol = V.vol[u] ?? 1;
      return `<div class="par">${avatar(u, p.n).replace('class="av"', 'class="av' + (V.fala.has(u) ? ' fala' : '') + '"')}<div class="nm"><b>${esc(p.n || nomeDe(u))}</b><small>${p.mu ? 'mudo' : ''}${c.prox && !V.isGM(u) && !SV.isGM ? (p.mu ? ' · ' : '') + (l.g ? pct + '% de perto' : esc(l.why || 'longe')) : ''}</small></div>
        ${c.prox && !SV.isGM && !V.isGM(u) ? `<div class="dist" aria-hidden="true"><i style="width:${pct}%"></i></div>` : ''}
        <input type="range" min="0" max="2" step="0.05" value="${vol}" data-pvol="${esc(u)}" aria-label="Volume de ${esc(p.n || 'alguém')}"></div>`;
    }).join('');
    const minha = M.minhaPeca();
    box.innerHTML = `<h3>${I.fone} Call <button class="x" type="button" data-fecha aria-label="Fechar">×</button></h3>
      <p class="vazio" style="margin:0">${!c.aberta && !SV.isGM ? 'O mestre fechou a call por enquanto.' : c.prox ? (SV.isGM ? 'Proximidade ligada: você ouve todos e todos ouvem você.' : minha ? 'Proximidade ligada: quem está perto da sua peça no mapa soa mais alto.' : 'Proximidade ligada, mas você ainda não tem peça no mapa. Abra a sua ficha e toque em “Pôr no mapa”.') : 'Todos se ouvem igual.'}</p>
      <div class="e-row" style="display:flex;gap:8px">${V.joined ? `<button class="btn" type="button" data-mudo>${V.muted ? I.micOff + 'Abrir mic' : I.mic + 'Mutar'}</button><button class="btn red" type="button" data-sai>Sair</button>` : `<button class="btn red" type="button" data-entra ${V.joining ? 'disabled' : ''}>${V.joining ? 'Entrando…' : 'Entrar na call'}</button>`}</div>
      ${V.semMic && V.joined ? '<p class="vazio" style="margin:0">Você está só ouvindo (sem microfone).</p>' : ''}
      ${linhas || `<p class="vazio" style="margin:0">${V.joined ? 'Ninguém mais na call.' : peers.length ? peers.length + ' na call agora.' : 'Ninguém na call agora.'}</p>`}`;
  };
  function eventosVoz() {
    const box = $('#voz');
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.fecha != null) { box.hidden = true; return; }
      if (b.dataset.entra != null) SV.voz.join();
      if (b.dataset.sai != null) SV.voz.leave();
      if (b.dataset.mudo != null) SV.voz.toggleMute();
    });
    box.addEventListener('input', e => { const u = e.target.dataset.pvol; if (u) SV.voz.setVol(u, +e.target.value); });
    SV.voz.onChange(() => { if (!box.contains(document.activeElement) || document.activeElement.tagName !== 'INPUT') render.voz(); });
    setInterval(() => { if (!box.hidden && SV.voz.joined && document.activeElement.tagName !== 'INPUT') render.voz(); }, 1500);
  }

  /* ---------- menu da conta ---------- */
  render.menu = () => {
    $('#menu').innerHTML = `<div class="quem">${avatar(SV.me.uid, SV.me.nome)}<div><b>${esc(SV.me.nome)}</b><small>${SV.isGM ? 'Mestre da mesa' : 'Jogador'}${SV.db.local ? ' · modo de teste' : ''}</small></div></div>
      ${SV.db.local ? '<p class="vazio" style="margin:0">Modo de teste: tudo fica neste navegador. Abra outra aba para ser outra pessoa.</p>' : ''}
      <button class="btn" type="button" id="m-sair">${SV.db.local ? 'Trocar de pessoa' : 'Sair da conta'}</button>`;
    $('#m-sair').onclick = () => { try { SV.voz.leave(); } catch {} SV.sair(); };
  };

  /* ==========================================================
     começar
     ========================================================== */
  function inicia() {
    $('#app').hidden = false;
    document.title = 'São Valentim do Vale' + (SV.isGM ? ' · mestre' : '');
    montaAbas(); montaTopo(); eventosMesa(); eventosSons(); eventosVoz();
    SV.voz.init();
    SV.sons.init();
    SV.sons.onChange(() => { if (aba === 'sons' && !campoAberto($('#p-sons'))) render.sons(); });
    assina();
    render.voz(); render.mesa(); badges();
    irAba(SV.ls.get('aba', 'mapa'));
    setInterval(() => { if (aba === 'mesa') render.mesa(); }, 30000);
  }
  SV.entrar(inicia);
})();
