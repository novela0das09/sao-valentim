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
    central: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/><path d="M3.5 12H5M19 12h1.5M12 3.5V5"/></svg>',
    sino: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    lapis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/></svg>',
    mapa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></svg>',
    fichas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="1.5"/><circle cx="12" cy="9" r="2.6"/><path d="M8 16.5c.8-2 2.2-3 4-3s3.2 1 4 3"/></svg>',
    mesa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>',
    sons: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
    notas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M9 3v18"/><path d="M12 8h4M12 12h4M12 16h3"/></svg>',
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
  const D = { users: {}, online: {}, fichas: {}, npcs: {}, pecas: {}, pecasGM: {}, travas: {}, cena3d: null, mural: {}, pedidos: {}, rolagens: {}, regras: null, modo: '', banidos: {}, arteLib: {}, posicoes: {} };
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
      avisa('fichas'); render.voz(); publicaPerfis();
    };
    if (SV.isGM) db.on('fichas', fichas); else db.query('fichas', 'dono', me, fichas);
    db.on('npcs', v => { D.npcs = v || {}; avisa('npcs'); render.mesa(); });
    db.on('pecas', v => { D.pecas = v || {}; avisa('pecas'); SV.M && SV.M.sincArte && SV.M.sincArte(); SV.voz.mix && SV.voz.mix(); render.voz(); });
    if (SV.isGM) db.on('pecas_gm', v => { D.pecasGM = v || {}; avisa('pecas'); SV.M && SV.M.sincArte && SV.M.sincArte(); });
    db.on('mesa/travas', v => { D.travas = v || {}; avisa('pecas'); });
    /* a arte das peças fica guardada no caderno de cada um (só a pessoa lê), para voltar quando a peça sai e entra no mapa */
    if (SV.isGM) db.on('notas/' + me + '/posicoes', v => { D.posicoes = v && typeof v === 'object' ? v : {}; avisa('posicoes'); });
    db.on('notas/' + me + '/arte', v => { D.arteLib = v && typeof v === 'object' ? v : {}; avisa('arteLib'); SV.M && SV.M.sincArte && SV.M.sincArte(); });
    db.on('mesa/cena3d', v => { D.cena3d = v || null; avisa('cena3d'); });
    db.on('mesa/regras', v => { const j = v && v.json ? v.json : null, m = (v && typeof v.modo === 'string' && v.modo) || ''; if (j !== D.regras || !D.regrasOk) { D.regras = j; D.regrasOk = true; avisa('regras'); } if (m !== D.modo) { D.modo = m; avisa('modo'); } });
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
    db.on('rolagens', v => { D.rolagens = v || {}; render.mesa(); avisa('rolagens'); });
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
  /* nome curto da peça: sem "Seu", "Dona", "Dr."; o NPC do catálogo traz o dele */
  const HONRA = /^(seu|dona|dr\.?|dra\.?|padre|pe\.|soldado|cabo|prof\.?|professora|sr\.?|sra\.?)$/i;
  function nomeCurto(f) {
    if (f.npc && f.npc.curto) return String(f.npc.curto).slice(0, 22);
    const p = String(f.nome || 'Sem nome').trim().split(/\s+/);
    while (p.length > 1 && HONRA.test(p[0])) p.shift();
    return (p[0] || 'Sem nome').slice(0, 22);
  }
  /* peça de NPC ou inimigo só aparece para os jogadores quando o mestre libera (pecaVisivel);
     fichas antigas, sem essa marca, seguem o "Visível" como antes */
  const pecaPublica = f => f.papel === 'pj' || !!(f.pecaVisivel ?? f.visivel);
  function atualizaPecaDaFicha(f) {
    const id = 'f_' + f.id, p = D.pecas[id] || D.pecasGM[id];
    if (!p) return;
    const nome = nomeCurto(f), cor = f.cor || p.cor;
    const pub = pecaPublica(f);
    if (SV.isGM && pub !== !!D.pecas[id]) { M.setVisivel(id, pub, true); return; }
    const muda = {};
    if (p.nome !== nome || p.cor !== cor) Object.assign(muda, { nome, cor });
    const est = estadoPeca(f); if ((p.estado || 'normal') !== est) muda.estado = est;
    if (Object.keys(muda).length) SV.M.editar(id, muda);
  }
  /* a figura no mapa muda com a ficha: ferida com PV baixo, em pavor com o dado de pavor ou PD no fim */
  function estadoPeca(f) {
    if (f.morto || f.perdido) return 'morto';
    const r = x => (x && +x.m > 0 ? +x.v / +x.m : 1), pv = r(f.pv), pd = r(f.pd);
    if (f.moribundo || pv <= 0.25) return 'ferido';
    if (f.pavorD || pd <= 0.25) return 'pavor';
    return pv <= 0.5 ? 'ferido' : 'normal';
  }
  let perfisEnviados = null;
  function publicaPerfis() {
    const me = SV.me && SV.me.uid; if (!me) return;
    const out = {};
    for (const { f } of Object.values(D.fichas)) {
      if (!f || f.dono !== me || (f.papel || 'pj') !== 'pj') continue;
      out[f.id] = { nome: String(f.nome || 'Sem nome'), idade: String(f.idade || ''), aparencia: String(f.aparencia || ''),
        resumo: String(f.resumo || ''), retrato: f.retrato || '', cor: f.cor || '', criado: f.criado || 0 };
    }
    const j = JSON.stringify(out);
    if (j === perfisEnviados) return;
    perfisEnviados = j;
    (Object.keys(out).length ? SV.db.set('users/' + me + '/pj', out) : SV.db.remove('users/' + me + '/pj')).catch(() => { perfisEnviados = null; });
  }
  /* grava uma ficha no banco, só se mudou */
  function grava(f) {
    const me = SV.me.uid;
    if (!SV.isGM) { f.dono ||= me; f.papel = 'pj'; }
    f.papel ||= 'pj'; f.dono ??= ''; f.criado ||= Date.now();
    const json = JSON.stringify(f);
    if (enviado[f.id] === json) return false;
    if (!SV.isGM && f.dono !== me) return false;
    enviado[f.id] = json;
    const t = Date.now();
    SV.db.set('fichas/' + f.id, { dono: f.dono || '', papel: f.papel, visivel: !!f.visivel, nome: String(f.nome || ''), json, t })
      .catch(e => { delete enviado[f.id]; SV.toast('A ficha de ' + (f.nome || 'alguém') + ' não foi salva no banco (' + (e.code || e.message) + ').', 'err'); });
    D.fichas[f.id] = { meta: { dono: f.dono, t }, f: JSON.parse(json) };
    npcPublico(f); atualizaPecaDaFicha(f);
    return true;
  }
  let pedidoAbrir = null;
  SV.F = {
    /* o que os outros jogadores mostram dos personagens deles: nome, retrato, idade, aparência, breve descrição */
    outros() {
      const me = SV.me.uid, out = [];
      for (const [u, x] of Object.entries(D.users || {})) {
        if (u === me || !x || !x.pj || typeof x.pj !== 'object') continue;
        for (const [id, p] of Object.entries(x.pj)) if (p && p.nome) out.push(Object.assign({}, p, { id, dono: u, jogador: x.nome || 'Jogador' }));
      }
      return out.sort((a, b) => (a.criado || 0) - (b.criado || 0) || String(a.nome).localeCompare(b.nome));
    },
    onOutros(cb) { return ouve('users', () => cb()); },
    /* moradores que o mestre marcou como conhecidos: só nome e ocupação (a ficha e os segredos ficam com o mestre) */
    npcsConhecidos() { return Object.entries(D.npcs || {}).filter(([, n]) => n && n.nome && n.papel !== 'inimigo').map(([id, n]) => ({ id, nome: String(n.nome), ocupacao: String(n.ocupacao || '') })).sort((a, b) => a.nome.localeCompare(b.nome)); },
    onNpcs(cb) { return ouve('npcs', () => cb()); },
    onArte(cb) { return ouve('arteLib', () => cb()); },
    sessao() { return SV.isGM && SV.central && SV.central.sessao ? SV.central.sessao() : null; },
    reconhecer(npcId) { if (SV.isGM && SV.central && SV.central.reconhecer) SV.central.reconhecer(npcId); },
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
        grava(f);
      }
      setTimeout(publicaPerfis, 0);
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
      const fs = lista(), f = (e.fid && fs.find(x => x.id === e.fid)) || fs.find(x => x.nome === e.quem);
      if (SV.isGM && f && f.papel !== 'pj' && !f.visivel) return; // rolagem secreta do mestre
      const r = { quem: String(e.quem || ''), o: String(e.o || ''), tot: String(e.tot ?? '').slice(0, 12), v: e.v || '', vt: String(e.vt || ''), det: String(e.det || ''), t: e.t || Date.now(), por: SV.me.uid,
        fid: f ? f.id : '', cat: String(e.cat || ''), ex: Array.isArray(e.ex) ? e.ex.map(String).join(' · ') : String(e.ex || ''), custo: String(e.custo || ''), dpd: +e.dpd || 0, dpv: +e.dpv || 0 };
      SV.db.push('rolagens/' + SV.me.uid, r).catch(() => {});
    },
    porNoMapa(fid, focar = true, onde = null) {
      const f = D.fichas[fid] && D.fichas[fid].f;
      if (!f) { SV.toast('Salve a ficha antes de pôr no mapa.'); return; }
      const id = 'f_' + fid;
      if (!(D.pecas[id] || D.pecasGM[id])) {
        const a = D.arteLib[fid];
        SV.M.novaPeca(id, Object.assign({ nome: nomeCurto(f), cor: f.cor || '', dono: f.dono || '', tipo: f.papel || 'pj', ficha: fid, arte: a && arteVisivel(a.arte, estadoPeca(f)), alt: a && a.alt, estado: estadoPeca(f) }, onde || {}), pecaPublica(f));
      } else if (onde) { const p = D.pecas[id] || D.pecasGM[id]; p.x = onde.x; p.z = onde.z; p.cena = onde.cena || null; SV.M.editar(id, { x: onde.x, z: onde.z, cena: onde.cena || null }); avisa('pecas'); }
      if (focar) { SV.M.focar(id); irAba('mapa'); }
    },
    temPeca: fid => !!(D.pecas['f_' + fid] || D.pecasGM['f_' + fid]),
    /* onde está a peça da ficha: no mapa ou não, e se os jogadores veem */
    mapaDe(fid) { const id = 'f_' + fid, p = D.pecas[id] || D.pecasGM[id]; return { tem: !!p, visivel: !!D.pecas[id], posto: !!p && p.x != null }; },
    tirarDoMapa(fid) { M.remover('f_' + fid); },
    onPecas(cb) { return ouve('pecas', () => cb()); },
    /* a central pede para abrir uma ficha */
    abrir(fid) { pedidoAbrir = fid; avisa('abrir'); irAba('fichas'); },
    pedidoAbrir() { const x = pedidoAbrir; pedidoAbrir = null; return x; },
    onAbrir(cb) { return ouve('abrir', () => { const x = pedidoAbrir; if (x) { pedidoAbrir = null; cb(x); } }); },
    regras: () => D.regras,
    onRegras(cb) { return ouve('regras', () => cb(D.regras)); },
    tema: cor => SV.tema(cor),
    salvarRegras(json) { if (SV.isGM && json !== D.regras) { D.regras = json; SV.db.update('mesa/regras', { json, t: Date.now() }).catch(() => {}); } },
    /* modo da cena (livre, combate ou investigação): o mestre escolhe e a ficha de cada jogador se reorganiza */
    modo: () => D.modo || '',
    onModo(cb) { return ouve('modo', () => cb(D.modo || '')); },
    setModo(m) { m = m === 'combate' || m === 'invest' ? m : ''; if (!SV.isGM || m === (D.modo || '')) return; D.modo = m; avisa('modo'); SV.db.update('mesa/regras', { modo: m }).catch(() => {}); }
  };

  /* ---------- tema: a cor da ficha do jogador pinta o site inteiro ---------- */
  const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const rgbHex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mist = (a, b, k) => { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map((v, i) => v + (y[i] - v) * k)); };
  const luz = h => { const [r, g, b] = hexRgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contr = (a, b) => { const x = luz(a), y = luz(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  let temaAtual = '';
  SV.tema = cor => {
    cor = /^#[0-9a-f]{6}$/i.test(cor || '') ? cor.toLowerCase() : '#b3191f';
    if (cor === temaAtual) return; temaAtual = cor;
    for (let kb = 0.05; contr(cor, '#0a0808') < 2 && kb < 0.7; kb += 0.05) cor = mist(cor, '#ffffff', 0.05);
    let k = 0.22, red = mist(cor, '#ffffff', k);
    while (contr(red, '#1a1515') < 4.5 && k < 0.95) { k += 0.07; red = mist(cor, '#ffffff', k); }
    const on = contr('#ffffff', cor) >= contr('#140f0f', cor) ? '#ffffff' : '#140f0f';
    const t = { '--blood': cor, '--red': red, '--red-soft': cor + '24', '--on-blood': on, '--bg': mist('#0a0808', cor, 0.03), '--bg-2': mist('#0f0c0c', cor, 0.04),
      '--panel': mist('#131010', cor, 0.05), '--panel-2': mist('#1a1515', cor, 0.07), '--line': mist('#2c2222', cor, 0.14), '--line-2': mist('#3d2c2c', cor, 0.24) };
    for (const [n, v] of Object.entries(t)) document.documentElement.style.setProperty(n, v);
    SV.ls.set('tema', cor);
  };
  { const c0 = SV.ls.get('tema', ''); if (c0) SV.tema(c0); }

  /* ==========================================================
     ponte com o mapa (mapa.html chama parent.SV.M)
     ========================================================== */
  const ultimoEnvio = {};
  /* artes de estado (ferido, pavor, caído) são surpresa: ficam só nas notas do mestre e só entram na peça quando o estado acontece */
  const VARIANTE = { ferido: ['ferido'], pavor: ['pavor'], morto: ['caido', 'ferido'] };
  function arteVisivel(a, est) {
    if (!a) return null; const o = {};
    for (const k of ['frente', 'costas']) if (a[k]) o[k] = a[k];
    for (const k of VARIANTE[est] || []) if (a[k]) { o[k] = a[k]; break; }
    return Object.keys(o).length ? o : null;
  }
  const assinaA = o => o ? Object.keys(o).sort().map(k => k + ':' + o[k].length + o[k].slice(-16)).join('|') : '';
  let sincArteT = 0;
  function sincArteEstados() {
    if (!SV.isGM) return;
    clearTimeout(sincArteT);
    sincArteT = setTimeout(() => {
      for (const src of [D.pecas, D.pecasGM]) for (const [id, p] of Object.entries(src)) {
        if (!p || !p.nome) continue;
        const lib = D.arteLib[p.ficha || id]; if (!lib || !lib.arte) continue;
        const quer = arteVisivel(lib.arte, p.estado || 'normal');
        if (assinaA(quer) === assinaA(p.arte)) continue;
        p.arte = quer; const alt = +lib.alt || +p.alt || 1.75; p.alt = alt;
        SV.db.update((D.pecas[id] ? 'pecas/' : 'pecas_gm/') + id, { arte: quer, alt }).catch(() => {});
      }
    }, 120);
  }
  const CORES = ['#e0b45e', '#d35d6e', '#6cb37a', '#4f8fd6', '#9a77d0', '#d07b3f', '#5fb3b3', '#c9c9c9'];
  const M = (SV.M = {
    isGM: () => !!SV.isGM,
    me: () => SV.me.uid,
    pausado: () => aba !== 'mapa' || document.hidden,
    pecas() {
      /* peça sem nome é resto de uma peça apagada enquanto alguém a arrastava: o mestre limpa */
      if (SV.isGM) for (const [ref, src] of [['pecas/', D.pecas], ['pecas_gm/', D.pecasGM]]) for (const [id, p] of Object.entries(src)) if (p && !p.nome) { delete src[id]; SV.db.remove(ref + id).catch(() => {}); }
      const out = {};
      for (const [id, p] of Object.entries(D.pecas)) if (p && p.nome) out[id] = Object.assign({}, p, { id, visivel: true, trava: D.travas[id] === true });
      if (SV.isGM) for (const [id, p] of Object.entries(D.pecasGM)) if (p && p.nome) out[id] = Object.assign({}, p, { id, visivel: false, trava: D.travas[id] === true });
      return out;
    },
    onPecas(cb) { return ouve('pecas', () => cb(M.pecas())); },
    /* o mestre abre a arte da peça com todas as fases; o jogador só vê frente e costas */
    arteCompleta(id) { if (!SV.isGM) return null; const p = D.pecas[id] || D.pecasGM[id]; const x = p && D.arteLib[p.ficha || id]; return x && x.arte ? Object.assign({}, x.arte) : null; },
    caminho: id => (D.pecas[id] ? 'pecas/' : 'pecas_gm/') + id,
    podeMover(id) {
      const p = D.pecas[id] || D.pecasGM[id];
      if (!p) return false;
      if (SV.isGM) return true;
      return p.dono === SV.me.uid && D.travas[id] !== true;
    },
    mover(id, x, z, final, r) {
      if (!M.podeMover(id)) return;
      x = Math.round(x * 100) / 100; z = Math.round(z * 100) / 100;
      const alvo = D.pecas[id] || D.pecasGM[id];
      alvo.x = x; alvo.z = z;
      SV.voz.mix && SV.voz.mix();
      const agora = Date.now();
      clearTimeout(ultimoEnvio[id + 't']);
      const o = { x, z }; if (final && Number.isFinite(r)) o.r = alvo.r = Math.round(r * 100) / 100;
      const envia = () => { if (!(D.pecas[id] || D.pecasGM[id])) return; /* a peça saiu do mapa: não recria um fantasma só com x e z */ ultimoEnvio[id] = Date.now(); SV.db.update(M.caminho(id), o).catch(e => SV.toast('Não deu para mover a peça (' + (e.code || e.message) + ').', 'err')); };
      if (final || agora - (ultimoEnvio[id] || 0) > 150) envia();
      else ultimoEnvio[id + 't'] = setTimeout(envia, 160);
    },
    novaPeca(id, dados, publica = true) {
      if (!SV.isGM && dados.dono !== SV.me.uid) return null;
      id ||= 'p_' + SV.uid();
      const n = Object.keys(D.pecas).length + Object.keys(D.pecasGM).length;
      const p = { nome: String(dados.nome || 'Figura').slice(0, 22), cor: dados.cor || CORES[n % CORES.length], dono: dados.dono || '', tipo: dados.tipo || 'npc', ficha: dados.ficha || '', x: dados.x ?? null, z: dados.z ?? null, t: Date.now() };
      if (p.x == null) { delete p.x; delete p.z; }
      if (dados.arte && typeof dados.arte === 'object') { p.arte = dados.arte; p.alt = +dados.alt || 1.75; }
      if (dados.estado && dados.estado !== 'normal') p.estado = dados.estado;
      if (dados.cena === 'mata' || dados.cena === 'estrada') p.cena = dados.cena;
      (publica ? D.pecas : D.pecasGM)[id] = p;
      SV.db.set((publica ? 'pecas/' : 'pecas_gm/') + id, p).catch(e => SV.toast('Não deu para pôr a peça (' + (e.code || e.message) + ').', 'err'));
      avisa('pecas');
      return id;
    },
    /* arte da figura em pé: vai para a peça (os outros veem quando a peça está visível) e para o caderno de quem salvou */
    sincArte: () => sincArteEstados(),
    /* onde cada NPC fica de dia e de noite (só o mestre lê: fica nas notas dele) */
    posicoes: () => (SV.isGM ? D.posicoes || {} : {}),
    fichasPJ: () => (SV.isGM ? Object.values(D.fichas).map(x => x && x.f).filter(f => f && f.papel === 'pj').map(f => f.id) : []),
    porFicha: (fid, onde) => SV.F.porNoMapa(fid, false, onde),
    arteLib() { return Object.entries(D.arteLib || {}).filter(([, x]) => x && x.arte).map(([k, x]) => ({ chave: k, nome: String(x.nome || k), arte: x.arte, alt: x.alt })).sort((a, b) => a.nome.localeCompare(b.nome)); },
    async salvarArte(id, arte, alt) {
      const p = D.pecas[id] || D.pecasGM[id];
      if (!p || !(SV.isGM || p.dono === SV.me.uid)) throw new Error('sem permissão');
      const lados = SV.isGM ? ['frente', 'costas', 'ferido', 'pavor', 'caido'] : ['frente', 'costas'];
      const a = {}; for (const k of lados) if (arte && typeof arte[k] === 'string' && /^data:image\/(png|webp|jpeg);base64,/.test(arte[k])) a[k] = arte[k];
      const tem = Object.keys(a).length, h = Math.min(3.5, Math.max(0.4, +alt || 1.75)), chave = p.ficha || id;
      await SV.db.update(M.caminho(id), { arte: tem ? arteVisivel(a, p.estado || 'normal') : null, alt: h });
      if (tem) await SV.db.set('notas/' + SV.me.uid + '/arte/' + chave, { arte: a, alt: h, nome: p.nome, t: Date.now() });
      else await SV.db.remove('notas/' + SV.me.uid + '/arte/' + chave);
    },
    editar(id, o) { if (!(D.pecas[id] || D.pecasGM[id])) return; if (M.podeMover(id) || SV.isGM) SV.db.update(M.caminho(id), o).catch(() => {}); },
    remover(id) {
      const p = D.pecas[id] || D.pecasGM[id];
      if (!p || !(SV.isGM || p.dono === SV.me.uid)) return;
      clearTimeout(ultimoEnvio[id + 't']);
      SV.db.remove(M.caminho(id)).catch(() => {});
      delete D.pecas[id]; delete D.pecasGM[id]; avisa('pecas'); // some na hora, sem esperar o servidor
      if (SV.isGM) SV.db.remove('mesa/travas/' + id).catch(() => {});
    },
    setTrava(id, on) { if (SV.isGM) on ? SV.db.set('mesa/travas/' + id, true) : SV.db.remove('mesa/travas/' + id); },
    async setVisivel(id, on, deFicha) {
      if (!SV.isGM) return;
      const de = on ? 'pecas_gm/' : 'pecas/', para = on ? 'pecas/' : 'pecas_gm/';
      const p = (on ? D.pecasGM : D.pecas)[id];
      if (!p) return;
      await SV.db.set(para + id, p); await SV.db.remove(de + id);
      /* o mestre mostrou ou escondeu no mapa: a ficha guarda a decisão, para a próxima gravação não desfazer */
      if (!deFicha && String(id).startsWith('f_')) { const x = D.fichas[id.slice(2)]; if (x && x.f && x.f.papel !== 'pj' && pecaPublica(x.f) !== !!on) grava(Object.assign({}, x.f, { pecaVisivel: !!on })); }
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
    return e ? { x: +e[1].x, z: +e[1].z, cena: e[1].cena === 'mata' || e[1].cena === 'estrada' ? e[1].cena : 'vale' } : null;
  };

  /* ==========================================================
     abas
     ========================================================== */
  const ABAS = [['mapa', 'Mapa', I.mapa], ['fichas', 'Fichas', I.fichas], ['notas', 'Anotações', I.notas], ['mesa', 'Mesa', I.mesa], ['sons', 'Sons', I.sons]];
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
    if (a === 'mapa' && !carregado.mapa) { carregado.mapa = true; $('#f-mapa').src = 'mapa.html?v=26' + location.search.replace('?', '&'); }
    if (a === 'fichas' && !carregado.fichas) { carregado.fichas = true; $('#f-fichas').src = 'fichas.html?v=26' + location.search.replace('?', '&'); }
    if (a === 'mesa') { SV.ls.set('visto.mesa', Date.now()); badges(); }
    if (a === 'sons') render.sons();
    if (a === 'notas') abaNotas();
    if (a === 'central' && SV.central) SV.central.aba();
  }
  SV.irAba = irAba;
  function montaAbas() {
    if (SV.isGM && !ABAS.some(x => x[0] === 'central')) ABAS.splice(2, 0, ['central', 'Central', I.central]);
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
    addEventListener('keydown', e => { if (e.key === 'Escape') { $('#menu').hidden = true; $('#voz').hidden = true; fechaNotaRapida(); } });
    if (SV.isGM) {
      const s = $('#b-sino'), nb = $('#b-nota');
      if (s) { s.hidden = false; s.innerHTML = I.sino + '<span class="bolinha" hidden></span>'; s.onclick = () => { irAba('central'); SV.central && SV.central.ver('notif'); }; }
      if (nb) { nb.hidden = false; nb.innerHTML = I.lapis; nb.onclick = e => { e.stopPropagation(); notaRapida(); }; }
    }
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
      ${gm ? `<form class="compor" data-form="mural"><textarea name="t" rows="2" placeholder="Escreva um aviso para todos (cena, horário da próxima sessão, regra da casa)…"></textarea><button class="btn red" type="submit">Pregar</button></form>` : ''}
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
        ${p.feito ? '' : `<form class="compor" data-form="resp" data-u="${esc(p.u)}" data-id="${esc(p.id)}" style="margin-top:8px"><input class="campo" name="t" placeholder="Responder (opcional)"><button class="btn sm red" type="submit">Feito</button></form>`}</div>
        <div class="acoes"><button class="btn sm" type="button" data-apaga-ped="${esc(p.u)}/${esc(p.id)}" aria-label="Apagar pedido">×</button></div></div>`).join('') : '<p class="vazio">Os jogadores pedem aqui: usar um item, rolar algo em segredo, uma dúvida de regra.</p>'}</div></div>`;
    } else {
      const ps = Object.entries(D.pedidos).filter(([id, p]) => id !== '__ok' && p && p.t).map(([id, p]) => Object.assign({ id }, p)).sort((a, b) => b.t - a.t);
      pedHTML = `<div class="cartao"><h2>Pedir ao mestre <small>só ele vê</small></h2>
        <form class="compor" data-form="pedido"><textarea name="t" rows="2" placeholder="Ex.: quero procurar pistas no porão sem os outros saberem."></textarea><button class="btn red" type="submit">Enviar</button></form>
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


  /* ==========================================================
     anotações: cada pessoa tem o seu caderno (notas/<uid>), que só ela lê e escreve.
     Uma cópia fica no navegador: abre na hora e nada se perde se a conexão cair.
     ========================================================== */
  const N = { lista: {}, aberta: null, busca: '', cat: '', acesso: null, timers: {}, voo: {}, apagar: null, lendo: false, tApagar: 0 };
  const CATS_N = ['NPCs', 'Locais', 'Pistas', 'Segredos', 'Eventos', 'Combates', 'Ideias', 'Planejamento', 'Anotações gerais'];
  const chaveN = () => 'notas.' + SV.me.uid;
  const raizN = () => 'notas/' + SV.me.uid;
  const pathN = id => raizN() + '/n' + (id ? '/' + id : '');
  const guardaN = () => SV.ls.set(chaveN(), N.lista);
  const vaziaN = n => !n || (!String(n.titulo || '').trim() && !String(n.texto || '').trim());
  const semAcento = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const nPalavras = t => (String(t || '').match(/\S+/g) || []).length;
  const celular = () => matchMedia('(max-width: 700px)').matches;
  const dataHora = t => t ? new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const limpaN = n => ({ titulo: String(n.titulo || ''), texto: String(n.texto || ''), t: +n.t || 0, criado: +n.criado || +n.t || 0, cat: String(n.cat || ''), fixa: !!n.fixa, sessao: n.sessao === '' || n.sessao == null ? '' : +n.sessao || '' });

  /* o caderno mora em notas/<uid>/n; o que ficou no lugar antigo (notas/<uid>/<id>) muda de endereço uma vez */
  function ligaNotas() {
    const salvas = SV.ls.get(chaveN(), {});
    N.lista = salvas && typeof salvas === 'object' ? salvas : {};
    N.aberta = SV.ls.get('notas.aberta.' + SV.me.uid, null);
    SV.db.get(raizN()).then(async v => {
      N.acesso = true;
      const velhas = Object.entries(v || {}).filter(([k, x]) => k !== 'n' && k !== 'm' && x && typeof x === 'object' && ('texto' in x || 'titulo' in x));
      if (velhas.length) { const upd = {}; for (const [k, x] of velhas) { upd['n/' + k] = x; upd[k] = null; } try { await SV.db.update(raizN(), upd); } catch (e) { console.warn('[notas] mudança', e); } }
      juntaNotas(Object.assign({}, (v && v.n) || {}, Object.fromEntries(velhas)));
      SV.db.on(pathN(), x => { if (N.acesso === false) return; juntaNotas(x); });
    }, () => { N.acesso = false; desenhaNotas(); });
    desenhaNotas();
  }
  /* o banco manda o caderno; mudanças daqui que ainda não chegaram lá continuam valendo */
  function juntaNotas(remoto) {
    if (remoto) N.acesso = true;
    const out = {};
    for (const [id, n] of Object.entries(remoto || {})) if (n && typeof n === 'object') out[id] = limpaN(n);
    for (const [id, n] of Object.entries(N.lista)) {
      if (!n || !n.pend) continue;
      if (!out[id] || (n.t || 0) >= (out[id].t || 0)) {
        out[id] = n;
        if (!vaziaN(n) && !N.timers[id] && N.voo[id] !== n.t) agendaN(id, 80);
      }
    }
    N.lista = out; guardaN();
    desenhaNotas(); desenhaRapida();
  }
  const agendaN = (id, ms = 700) => { clearTimeout(N.timers[id]); N.timers[id] = setTimeout(() => enviaN(id), ms); };
  function enviaN(id) {
    clearTimeout(N.timers[id]); delete N.timers[id];
    const n = N.lista[id]; if (!n) return;
    if (N.acesso === false) { statusN(); return; }
    const t = n.t, dados = limpaN(n);
    N.voo[id] = t; statusN();
    SV.db.set(pathN(id), dados).then(() => {
      if (N.voo[id] === t) delete N.voo[id];
      const m = N.lista[id]; if (m && m.t === t) { delete m.pend; guardaN(); }
      statusN();
    }, e => {
      delete N.voo[id];
      if (/PERMISSION/i.test(String(e && (e.code || e.message) || ''))) { N.acesso = false; desenhaNotas(); }
      statusN(true);
    });
  }
  const descarregaN = () => { for (const id of Object.keys(N.timers)) enviaN(id); };
  function mexeN(id, campos) {
    const n = N.lista[id]; if (!n) return;
    Object.assign(n, campos, { t: Date.now(), pend: true }); guardaN();
    if (vaziaN(n)) { clearTimeout(N.timers[id]); delete N.timers[id]; } else agendaN(id);
    statusN();
  }
  function statusN(erro) {
    const pend = Object.keys(N.timers).length || Object.keys(N.voo).length;
    const txt = N.acesso === false ? 'Salva neste navegador' : erro ? 'Sem conexão: guardada neste navegador' : pend ? 'Salvando…' : 'Salva';
    for (const el of [$('#n-status'), $('#nr-status')]) { if (!el) continue; el.textContent = txt; el.classList.toggle('ok', !pend && N.acesso !== false && !erro); }
  }
  function apagaN(id) {
    clearTimeout(N.timers[id]); delete N.timers[id];
    delete N.lista[id]; guardaN();
    if (N.acesso !== false) SV.db.remove(pathN(id)).catch(() => {});
    if (N.aberta === id) { N.aberta = null; SV.ls.set('notas.aberta.' + SV.me.uid, null); }
  }
  function abreN(id, focar) {
    const antes = N.aberta;
    if (antes && antes !== id && vaziaN(N.lista[antes])) apagaN(antes);   // anotação vazia não fica largada no caderno
    N.aberta = id && N.lista[id] ? id : null; N.apagar = null;
    SV.ls.set('notas.aberta.' + SV.me.uid, N.aberta);
    if (N.aberta) N.lendo = true;
    const caixa = $('#notas'); if (caixa) caixa.classList.toggle('lendo', !!N.lendo);
    desenhaEditorN(true); desenhaListaN();
    if (focar) { const el = $(focar); if (el) el.focus(); }
  }
  const sessaoAtual = () => (SV.isGM && SV.central && SV.central.sessao()) || '';
  function novaN(base) {
    const id = SV.uid(), agora = Date.now();
    N.lista[id] = Object.assign({ titulo: '', texto: '', t: agora, criado: agora, cat: N.cat || '', fixa: false, sessao: sessaoAtual(), pend: true }, base || {});
    guardaN(); N.busca = ''; const b = $('#n-busca'); if (b) b.value = '';
    return id;
  }
  function ordemN() {
    const q = semAcento(N.busca).trim();
    return Object.entries(N.lista).filter(([, n]) => n && (!N.cat || (N.cat === '—' ? !n.cat : n.cat === N.cat)) && (!q || semAcento(n.titulo + ' ' + n.texto + ' ' + (n.cat || '')).includes(q)))
      .sort((a, b) => (!!b[1].fixa - !!a[1].fixa) || (b[1].t || 0) - (a[1].t || 0));
  }
  const catsUsadas = () => [...new Set([...CATS_N, ...Object.values(N.lista).map(n => n && n.cat).filter(Boolean)])];

  function montaNotas() {
    const box = $('#p-notas'); if (!box || box.dataset.ok) return;
    box.dataset.ok = '1';
    box.innerHTML = `<div class="titulo-pg"><h1>Anotações</h1><p id="n-sub"></p></div>
      <div class="notas" id="notas">
        <div class="cartao n-lista"><h2>Caderno <small id="n-conta"></small></h2>
          <button class="btn red" type="button" data-n="nova">+ Nova anotação</button>
          <input class="campo" type="search" id="n-busca" placeholder="Procurar nas anotações" aria-label="Procurar nas anotações" autocomplete="off">
          <select class="campo" id="n-filtro" aria-label="Filtrar por categoria"></select>
          <div class="n-itens" id="n-itens" role="list"></div></div>
        <div class="cartao n-edit" id="n-edit"></div>
      </div>
      <datalist id="n-cats"></datalist>`;
    box.addEventListener('click', e => {
      const it = e.target.closest('[data-nota]');
      if (it) { abreN(it.dataset.nota); return; }
      const b = e.target.closest('[data-n]'); if (!b) return;
      const a = b.dataset.n;
      if (a === 'nova') abreN(novaN(), '#n-titulo');
      if (a === 'voltar') { if (N.aberta && vaziaN(N.lista[N.aberta])) apagaN(N.aberta); N.lendo = false; desenhaNotas(); }
      if (a === 'fixar') { const n = N.lista[N.aberta]; if (n) { mexeN(N.aberta, { fixa: !n.fixa }); barraN(); desenhaListaN(); } }
      if (a === 'apagar') {
        if (N.apagar !== N.aberta) { N.apagar = N.aberta; clearTimeout(N.tApagar); N.tApagar = setTimeout(() => { N.apagar = null; barraN(); }, 5000); barraN(); return; }
        const nome = (N.lista[N.aberta] && N.lista[N.aberta].titulo) || 'A anotação';
        apagaN(N.aberta); N.apagar = null; N.lendo = false;
        const prox = ordemN()[0]; if (prox && !celular()) N.aberta = prox[0];
        desenhaNotas(); SV.toast(nome + ' foi apagada.');
      }
      if (a === 'cancelar') { N.apagar = null; barraN(); }
    });
    box.addEventListener('input', e => {
      const el = e.target;
      if (el.id === 'n-busca') { N.busca = el.value; desenhaListaN(); return; }
      if (!N.lista[N.aberta]) return;
      if (el.id === 'n-titulo') mexeN(N.aberta, { titulo: el.value });
      else if (el.id === 'n-texto') mexeN(N.aberta, { texto: el.value });
      else if (el.id === 'n-cat') mexeN(N.aberta, { cat: el.value.trim() });
      else if (el.id === 'n-sessao') mexeN(N.aberta, { sessao: el.value === '' ? '' : Math.max(0, +el.value || 0) });
      else return;
      metaN(); desenhaListaN();
    });
    box.addEventListener('change', e => {
      if (e.target.id === 'n-filtro') { N.cat = e.target.value; desenhaListaN(); }
      if (e.target.id === 'n-cat') { desenhaFiltroN(); }
    });
    box.addEventListener('keydown', e => {
      if (e.target.id === 'n-titulo' && e.key === 'Enter') { e.preventDefault(); const t = $('#n-texto'); if (t) t.focus(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && box.contains(e.target)) { e.preventDefault(); descarregaN(); }
    });
    box.addEventListener('focusout', () => setTimeout(() => { if (!box.contains(document.activeElement)) descarregaN(); }, 0));
    addEventListener('pagehide', descarregaN);
    document.addEventListener('visibilitychange', () => { if (document.hidden) descarregaN(); });
  }
  function abaNotas() {
    if (!N.aberta && !celular()) { const p = ordemN()[0]; if (p) N.aberta = p[0]; }
    desenhaNotas();
  }
  function desenhaFiltroN() {
    const sel = $('#n-filtro'), dl = $('#n-cats'); if (!sel) return;
    const cats = catsUsadas(), n = c => Object.values(N.lista).filter(x => x && (c === '—' ? !x.cat : x.cat === c)).length;
    sel.innerHTML = `<option value="">Todas as categorias</option>` + cats.map(c => `<option value="${esc(c)}"${N.cat === c ? ' selected' : ''}>${esc(c)}${n(c) ? ' (' + n(c) + ')' : ''}</option>`).join('') + `<option value="—"${N.cat === '—' ? ' selected' : ''}>Sem categoria</option>`;
    if (dl) dl.innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');
  }
  function desenhaNotas() {
    const box = $('#p-notas'); if (!box || !box.dataset.ok) return;
    if (N.aberta && !N.lista[N.aberta]) N.aberta = null;
    $('#n-sub').textContent = N.acesso === false
      ? 'Por enquanto, as anotações ficam salvas só neste navegador.'
      : 'Só você vê. Ficam salvas na sua conta e aparecem em qualquer aparelho em que você entrar.';
    $('#notas').classList.toggle('lendo', !!N.lendo);
    desenhaFiltroN(); desenhaListaN(); desenhaEditorN();
  }
  function desenhaListaN() {
    const box = $('#n-itens'); if (!box) return;
    const todas = Object.keys(N.lista).length, l = ordemN();
    $('#n-conta').textContent = todas === 1 ? '1 anotação' : todas + ' anotações';
    const st = box.scrollTop;
    box.innerHTML = l.length ? l.map(([id, n]) => {
      const prev = String(n.texto || '').split('\n').map(x => x.trim()).find(Boolean) || '';
      const meta = [n.cat, n.sessao ? 'sessão ' + n.sessao : '', quando(n.t)].filter(Boolean).join(' · ');
      return `<button type="button" role="listitem" class="n-it${id === N.aberta ? ' on' : ''}${n.fixa ? ' fixa' : ''}" data-nota="${esc(id)}"${id === N.aberta ? ' aria-current="true"' : ''}>
        <b>${n.fixa ? '<i class="n-pino" aria-label="Fixada"></i>' : ''}${esc(String(n.titulo || '').trim() || 'Sem título')}</b>${prev ? `<span>${esc(prev)}</span>` : ''}<small>${esc(meta)}</small></button>`;
    }).join('') : `<p class="vazio">${todas ? 'Nada encontrado.' : 'Nenhuma anotação ainda.'}</p>`;
    box.scrollTop = st;
  }
  function barraN() {
    const el = $('#n-acoes'), n = N.lista[N.aberta]; if (!el || !n) return;
    const conf = N.apagar && N.apagar === N.aberta;
    el.innerHTML = `<button class="btn sm${n.fixa ? ' on' : ''}" type="button" data-n="fixar" aria-pressed="${n.fixa ? 'true' : 'false'}">${n.fixa ? 'Fixada' : 'Fixar'}</button><button class="btn sm${conf ? ' red' : ''}" type="button" data-n="apagar">${conf ? 'Confirmar: apagar?' : 'Apagar'}</button>${conf ? '<button class="btn sm" type="button" data-n="cancelar">Cancelar</button>' : ''}`;
  }
  function metaN() {
    const el = $('#n-meta'), n = N.lista[N.aberta]; if (!el || !n) return;
    const p = nPalavras(n.texto);
    el.textContent = (p === 1 ? '1 palavra' : p + ' palavras') + (n.criado ? ' · criada em ' + dataHora(n.criado) : '') + (n.t && n.t - (n.criado || 0) > 60e3 ? ' · editada em ' + dataHora(n.t) : '');
  }
  function desenhaEditorN(forcar) {
    const ed = $('#n-edit'); if (!ed) return;
    const id = N.aberta, n = id && N.lista[id];
    if (!n) {
      ed.dataset.id = '';
      ed.innerHTML = `<div class="n-vazia"><button class="btn sm n-voltar" type="button" data-n="voltar">← Anotações</button>
        <p>${Object.keys(N.lista).length ? 'Escolha uma anotação ao lado ou comece outra.' : (SV.isGM ? 'Seu caderno de mestre está vazio. Anote NPCs, locais, pistas, segredos e ideias. Só você vê.' : 'Seu caderno está vazio. Anote pistas, nomes, lugares, teorias e o que o mestre contou. Só você vê.')}</p>
        <button class="btn red" type="button" data-n="nova">+ Nova anotação</button></div>`;
      return;
    }
    const ti = $('#n-titulo'), tx = $('#n-texto'), ca = $('#n-cat'), se = $('#n-sessao');
    if (!forcar && ed.dataset.id === id && ti && tx) {
      /* chegou mudança de outro aparelho: só atualiza o campo que não está sendo digitado */
      if (document.activeElement !== ti && ti.value !== n.titulo) ti.value = n.titulo;
      if (document.activeElement !== tx && tx.value !== n.texto) tx.value = n.texto;
      if (ca && document.activeElement !== ca && ca.value !== (n.cat || '')) ca.value = n.cat || '';
      if (se && document.activeElement !== se && se.value !== String(n.sessao ?? '')) se.value = n.sessao ?? '';
      metaN(); statusN(); barraN(); return;
    }
    ed.dataset.id = id;
    ed.innerHTML = `<div class="n-barra"><button class="btn sm n-voltar" type="button" data-n="voltar">← Anotações</button><span class="n-meta" id="n-meta"></span><span class="n-status" id="n-status" aria-live="polite"></span><span class="n-acoes" id="n-acoes"></span></div>
      <div class="n-campos"><label>Categoria <input class="campo" id="n-cat" list="n-cats" placeholder="Sem categoria" autocomplete="off"></label>${SV.isGM ? '<label>Sessão <input class="campo" id="n-sessao" type="number" min="0" inputmode="numeric" placeholder="—"></label>' : ''}</div>
      <input class="n-titulo" id="n-titulo" placeholder="Título" aria-label="Título da anotação" autocomplete="off">
      <textarea class="n-texto" id="n-texto" placeholder="${SV.isGM ? 'Escreva aqui: NPCs, locais, pistas, segredos, ideias para a próxima sessão…' : 'Escreva aqui: pistas, nomes, lugares, teorias, o que o mestre contou…'}" aria-label="Texto da anotação"></textarea>`;
    $('#n-titulo').value = n.titulo || ''; $('#n-texto').value = n.texto || ''; $('#n-cat').value = n.cat || '';
    if ($('#n-sessao')) $('#n-sessao').value = n.sessao ?? '';
    metaN(); statusN(); barraN();
  }

  /* nota rápida do mestre: uma janelinha que salva sozinha, sem sair da tela em que está */
  function notaRapida() {
    let p = $('#nota-rapida');
    if (p && !p.hidden) { fechaNotaRapida(); return; }
    if (!p) {
      p = document.createElement('div'); p.id = 'nota-rapida'; p.className = 'nota-rapida'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Nota rápida');
      p.innerHTML = `<div class="nr-topo"><b>Nota rápida</b><span class="n-status" id="nr-status" aria-live="polite"></span><button class="btn sm" type="button" data-nr="nova" title="Começar outra nota rápida">Nova</button><button class="btn sm" type="button" data-nr="abrir">Abrir no caderno</button><button class="nr-x" type="button" data-nr="fechar" aria-label="Fechar">×</button></div>
        <textarea id="nr-texto" placeholder="Escreva. Salva sozinho." aria-label="Texto da nota rápida"></textarea><small id="nr-meta"></small>`;
      document.body.append(p);
      p.addEventListener('input', e => { if (e.target.id !== 'nr-texto') return; const id = rapidaId(true); mexeN(id, { texto: e.target.value }); desenhaListaN(); metaRapida(); });
      p.addEventListener('click', e => {
        const b = e.target.closest('[data-nr]'); if (!b) return;
        if (b.dataset.nr === 'fechar') fechaNotaRapida();
        if (b.dataset.nr === 'nova') { SV.ls.set('nota.rapida', null); desenhaRapida(true); $('#nr-texto').focus(); }
        if (b.dataset.nr === 'abrir') { const id = SV.ls.get('nota.rapida', null); fechaNotaRapida(); irAba('notas'); if (id && N.lista[id]) abreN(id); }
      });
      document.addEventListener('click', e => { const q = $('#nota-rapida'); if (q && !q.hidden && !q.contains(e.target) && !e.target.closest('#b-nota')) fechaNotaRapida(); });
    }
    p.hidden = false; desenhaRapida(true);
    setTimeout(() => { const t = $('#nr-texto'); if (t) { t.focus(); t.selectionStart = t.selectionEnd = t.value.length; } }, 20);
  }
  function fechaNotaRapida() { const p = $('#nota-rapida'); if (!p || p.hidden) return; descarregaN(); p.hidden = true; }
  /* a nota rápida continua a mesma por 3 horas; depois disso começa outra */
  function rapidaId(criar) {
    let id = SV.ls.get('nota.rapida', null);
    if (id && N.lista[id] && Date.now() - (N.lista[id].criado || 0) < 3 * 3600e3) return id;
    if (!criar) return null;
    const agora = Date.now();
    id = novaN({ titulo: 'Nota rápida · ' + dataHora(agora), cat: 'Anotações gerais', criado: agora });
    SV.ls.set('nota.rapida', id);
    return id;
  }
  function metaRapida() { const m = $('#nr-meta'), id = rapidaId(false); if (m) m.textContent = id && N.lista[id] ? 'Vai para o caderno, em Anotações gerais' + (N.lista[id].sessao ? ' · sessão ' + N.lista[id].sessao : '') + '.' : 'Vai para o caderno, em Anotações gerais.'; }
  function desenhaRapida(forcar) {
    const p = $('#nota-rapida'), t = $('#nr-texto'); if (!p || p.hidden || !t) return;
    const id = rapidaId(false), txt = id && N.lista[id] ? N.lista[id].texto || '' : '';
    if (forcar || (document.activeElement !== t && t.value !== txt)) t.value = txt;
    metaRapida(); statusN();
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
    montaNotas(); ligaNotas();
    SV._iniciou = true; if (SV.isGM && SV.central) SV.central.inicia();
    render.voz(); render.mesa(); badges();
    irAba(SV.ls.get('aba', 'mapa'));
    setInterval(() => { if (aba === 'mesa') render.mesa(); }, 30000);
  }
  SV._ = { D, ouve, avisa, esc, quando, nomeDe, ehGM, avatar, ini, lista, grava, irAba: a => irAba(a), aba: () => aba, notaRapida: () => notaRapida(), notas: { novaN, abreN, mexeN } };
  SV.entrar(inicia);
})();
