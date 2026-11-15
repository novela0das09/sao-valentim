/* ==========================================================
   São Valentim do Vale · central do mestre
   Alertas automáticos (PV, PD, habilidades, condições, relações, itens), central de notificações,
   histórico da sessão, combate em cartões e configurações.
   Tudo fica no caderno privado do mestre (notas/<uid>/m), que só ele lê e escreve:
     cfg   limites de alerta e sessão atual
     est   último estado de PV e PD de cada personagem (para não repetir alerta)
     cur   última rolagem lida de cada jogador
     ev    acontecimentos: a central mostra os ativos; o histórico guarda todos, para sempre
   ========================================================== */
(function () {
  'use strict';
  const SV = window.SV;
  const $ = s => document.querySelector(s);
  const CATS = [['combate', 'Combate'], ['recursos', 'Recursos'], ['habilidades', 'Habilidades'], ['condicoes', 'Condições'], ['relacoes', 'Relacionamentos'], ['outros', 'Outros']];
  const CAT_N = Object.fromEntries(CATS);
  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICO = {
    combate: svg('<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/>'),
    recursos: svg('<path d="M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10z"/>'),
    habilidades: svg('<path d="M12 3l2.2 5.6L20 9l-4.5 3.8L17 19l-5-3.2L7 19l1.5-6.2L4 9l5.8-.4z"/>'),
    condicoes: svg('<circle cx="12" cy="12" r="8"/><path d="M12 8v4M12 16h.01"/>'),
    relacoes: svg('<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3 19c.8-3 2.8-4.5 5-4.5s4.2 1.5 5 4.5M11 19c.8-3 2.8-4.5 5-4.5s4.2 1.5 5 4.5"/>'),
    outros: svg('<circle cx="12" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>')
  };
  const PADRAO = { pvBaixo: 50, pvCrit: 25, pdBaixo: 50, pdCrit: 25, sessao: 1, aviso: true };
  const VISTAS = [['geral', 'Visão geral'], ['combate', 'Combate'], ['jogadores', 'Jogadores'], ['relacoes', 'Relações'], ['notif', 'Notificações'], ['notas', 'Anotações'], ['hist', 'Histórico da sessão'], ['config', 'Configurações']];
  const C = { cfg: Object.assign({}, PADRAO), ev: {}, est: {}, cur: {}, prev: {}, recentes: [], pronto: false, base: '', tDiff: 0, tDes: 0,
    vista: 'geral', f: { fid: '', cat: '', modo: 'ativas' }, hf: { fid: '', cat: '', s: '' }, abertos: {}, extras: false, sessaoConf: false, naoLidas: 0,
    rf: { npc: '', fid: '', d: '1', ve: '', vis: false, motivo: '', estado: '', nota: '' }, rconf: '', rfil: '', rab: {}, rnotas: {} };
  let _ = null;
  try { C.vista = localStorage.getItem('sv.central.vista') || 'geral'; } catch (e) {}

  const esc = s => SV.esc(s);
  const ORD = { ok: 0, baixo: 1, crit: 2, zero: 3 };
  const NOME_NV = { ok: 'normal', baixo: 'baixo', crit: 'crítico', zero: 'zerado' };
  const nivel = (v, m, baixo, crit) => { if (v <= 0) return 'zero'; const p = m ? v / m * 100 : 100; return p < crit ? 'crit' : p < baixo ? 'baixo' : 'ok'; };
  const pct = (v, m) => m ? Math.round(Math.max(0, v) / m * 100) : 0;
  const hora = t => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dia = t => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const fnv = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };
  const prettyHab = k => String(k || '').replace(/-/g, ' ');

  const pjs = () => Object.values(_.D.fichas).map(x => x.f).filter(f => f && (f.papel || 'pj') === 'pj').sort((a, b) => (a.criado || 0) - (b.criado || 0));
  const fichaDe = fid => { const x = _.D.fichas[fid]; return x && x.f; };
  const ativo = e => e && !e.h && !e.limpa && !e.arq;
  const evs = () => Object.entries(C.ev).filter(([, e]) => e && typeof e === 'object').sort((a, b) => (b[1].t || 0) - (a[1].t || 0));

  /* ---------------------------------------------------------- começo */
  function inicia() {
    if (!SV.isGM || C.base || !SV._) return;
    _ = SV._;
    C.base = 'notas/' + SV.me.uid + '/m';
    monta();
    Promise.all([SV.db.get(C.base + '/est').catch(() => null), SV.db.get(C.base + '/cur').catch(() => null)]).then(([est, cur]) => {
      C.est = est && typeof est === 'object' ? est : {}; C.cur = cur && typeof cur === 'object' ? cur : {}; C.pronto = true;
      lerRolagens(); agendaDiff();
    });
    SV.db.on(C.base + '/cfg', v => { C.cfg = Object.assign({}, PADRAO, v && typeof v === 'object' ? v : {}); agendaDesenho(); });
    SV.db.on(C.base + '/ev', v => { C.ev = v && typeof v === 'object' ? v : {}; sino(); agendaDesenho(); });
    SV.db.on('notas/' + SV.me.uid + '/r', v => { C.rnotas = v && typeof v === 'object' ? v : {}; if (C.vista === 'relacoes') agendaDesenho(); });
    _.ouve('fichas', () => { agendaDiff(); agendaDesenho(); });
    _.ouve('rolagens', () => { lerRolagens(); agendaDesenho(); });
    _.ouve('users', () => agendaDesenho());
    setInterval(() => { if (_.aba() === 'central' && !document.hidden) agendaDesenho(); }, 30000);
  }

  /* ---------------------------------------------------------- acontecimentos */
  function emite(id, ev) {
    if (!C.base || C.ev[id]) return;
    ev = Object.assign({ t: Date.now(), s: +C.cfg.sessao || 1, lida: false }, ev);
    C.ev[id] = ev;
    SV.db.set(C.base + '/ev/' + id, ev).catch(() => {});
    if (ev.nv === 'alerta' && C.cfg.aviso && !ev.h) SV.toast(ev.quem + ': ' + ev.txt);
    sino(); agendaDesenho();
  }
  const patchEv = (ids, campos) => {
    const upd = {};
    for (const id of ids) { if (!C.ev[id]) continue; Object.assign(C.ev[id], campos); for (const [k, v] of Object.entries(campos)) upd[id + '/' + k] = v; }
    if (Object.keys(upd).length) SV.db.update(C.base + '/ev', upd).catch(() => {});
    sino(); desenha();
  };

  /* as rolagens dos jogadores: habilidade, ritual, item, pavor e PD perdido viram notificação; o resto vai só para o histórico */
  function lerRolagens() {
    if (!C.pronto) return;
    const R = _.D.rolagens || {};
    for (const [uid, l] of Object.entries(R)) {
      if (!l || typeof l !== 'object' || _.ehGM(uid)) continue;
      const ks = Object.keys(l).sort();
      if (!ks.length) continue;
      const cur = C.cur[uid];
      if (cur == null) { C.cur[uid] = ks[ks.length - 1]; SV.db.set(C.base + '/cur/' + uid, C.cur[uid]).catch(() => {}); continue; }
      const novos = ks.filter(k => k > cur);
      if (!novos.length) continue;
      for (const k of novos) daRolagem(uid, k, l[k]);
      C.cur[uid] = novos[novos.length - 1];
      SV.db.set(C.base + '/cur/' + uid, C.cur[uid]).catch(() => {});
    }
  }
  function daRolagem(uid, k, r) {
    if (!r || typeof r !== 'object') return;
    const f = (r.fid && fichaDe(r.fid)) || pjs().find(x => x.nome === r.quem);
    if (f && (f.papel || 'pj') !== 'pj') return;
    const cat = String(r.cat || ''), quem = String(r.quem || (f && f.nome) || _.nomeDe(uid)), o = String(r.o || '');
    if (r.dpd || r.dpv) C.recentes.push({ fid: f ? f.id : '', t: Date.now(), dpd: +r.dpd || 0, dpv: +r.dpv || 0 });
    const custo = r.custo ? ' (' + r.custo + ')' : '';
    const res = r.tot && r.tot !== '•' && r.tot !== '+' ? ' — ' + r.tot + (r.vt && r.vt !== 'PD' ? ' · ' + r.vt : '') : '';
    const extras = r.ex ? ' · com ' + r.ex : '';
    const base = { fid: f ? f.id : '', quem, t: +r.t || Date.now() };
    const minus = t => t ? t[0].toLowerCase() + t.slice(1) : t;
    let ev;
    if (cat === 'hab') ev = { cat: 'habilidades', txt: 'usou ' + o + custo + (r.det ? ': ' + r.det : ''), nv: 'aviso' };
    else if (cat === 'ritual') ev = { cat: 'habilidades', txt: minus(o) + custo + extras + res, nv: 'aviso' };
    else if (cat === 'item') ev = { cat: 'outros', txt: minus(o), nv: 'info' };
    else if (cat === 'pavor') ev = { cat: 'condicoes', txt: minus(o) + (r.vt ? ' (' + r.vt + ')' : ''), nv: 'aviso' };
    else if (cat === 'pd') ev = { cat: 'recursos', txt: 'perdeu ' + (+r.dpd || '') + ' PD: ' + minus(o) + (r.det ? ' (' + r.det + ')' : ''), nv: 'info' };
    else if (cat === 'combate') ev = { cat: 'combate', txt: minus(o), nv: 'info' };
    else if (cat === 'ataque') ev = { cat: 'combate', txt: minus(o) + extras + res, nv: 'info', h: 1 };
    else ev = { cat: cat === 'defesa' ? 'combate' : 'outros', txt: minus(o) + extras + res, nv: 'info', h: 1 };
    emite('r' + k, Object.assign(base, ev));
  }

  /* as fichas dos jogadores: PV, PD, condições, relações, itens e progresso */
  function agendaDiff() { clearTimeout(C.tDiff); C.tDiff = setTimeout(diff, 1300); }
  function snap(f) {
    const rel = {}; let livre = 0; for (const r of f.rel || []) if (r && (r.nome || r.id)) { rel[r.id || r.nome] = { nome: r.nome || 'alguém', n: (r.log || []).length, ult: (r.log && r.log[0] && r.log[0].txt) || '', ped: (r.pedido && r.pedido.txt) || '' }; livre += Math.max(0, (+r.pts || 0) - Math.max(0, ganDe(r))); }
    const exc = Math.max(0, livre - (f.relBase ?? 3)), cenas = {};
    for (const r of f.rel || []) for (const e of (r && Array.isArray(r.evo) ? r.evo : [])) if (e && e.cena) cenas[e.cena] = (cenas[e.cena] || 0) + 1;
    const cx = Math.max(0, ...Object.values(cenas));
    const it = {}; for (const x of f.itens || []) if (x && x.nome) it[x.nome] = +(x.qtd ?? 1);
    return { pv: +(f.pv && f.pv.v) || 0, pvm: +(f.pv && f.pv.m) || 0, pd: +(f.pd && f.pd.v) || 0, pdm: +(f.pd && f.pd.m) || 0,
      cond: (Array.isArray(f._cond) ? f._cond : []).filter(c => !/zerad/i.test(c)), rel, it, hab: Array.isArray(f._habN) ? [...f._habN] : (f.hab || []).map(prettyHab), rit: Array.isArray(f._ritN) ? [...f._ritN] : (f.rit || []).map(prettyHab), nivel: +f.nivel || 1, nex: +f.nex || 0, exc, cx };
  }
  function casa(fid, campo, n) {
    const i = C.recentes.findIndex(r => r.fid === fid && r[campo] === n);
    if (i < 0) return false;
    C.recentes.splice(i, 1); return true;
  }
  function limiar(idb, f, rec, lv, antes, v, m) {
    const piorou = ORD[lv] > ORD[antes || 'ok'];
    const txt = piorou
      ? rec + ' ' + NOME_NV[lv] + (lv === 'zero' ? ', estado crítico' : '') + ': ' + v + '/' + m + ' (' + pct(v, m) + '%)'
      : rec + ' saiu do nível ' + NOME_NV[antes] + ': ' + v + '/' + m + ' (' + pct(v, m) + '%)';
    emite(idb + rec + lv, { fid: f.id, quem: f.nome || 'Sem nome', cat: 'recursos', txt, nv: piorou ? (lv === 'baixo' ? 'aviso' : 'alerta') : 'info', k: rec.toLowerCase() + '-' + lv });
  }
  function diff() {
    if (!C.pronto) return;
    const agora = Date.now(); C.recentes = C.recentes.filter(r => agora - r.t < 15000);
    for (const f of pjs()) {
      const a = C.prev[f.id], b = snap(f), meta = (_.D.fichas[f.id] && _.D.fichas[f.id].meta) || {};
      const idb = 'f' + f.id + '_' + String(meta.t || Math.floor(agora / 1000)) + '_', quem = f.nome || 'Sem nome';
      const ev = (tipo, o) => emite(idb + fnv(tipo), Object.assign({ fid: f.id, quem }, o));
      /* limites: só gera de novo quando o nível muda (fica guardado, vale também depois de recarregar) */
      const e = Object.assign({}, C.est[f.id] || {});
      const lpv = nivel(b.pv, b.pvm, +C.cfg.pvBaixo, +C.cfg.pvCrit), lpd = nivel(b.pd, b.pdm, +C.cfg.pdBaixo, +C.cfg.pdCrit);
      let mudou = false;
      if (e.pv !== lpv) { if (e.pv || lpv !== 'ok') limiar(idb, f, 'PV', lpv, e.pv, b.pv, b.pvm); e.pv = lpv; mudou = true; }
      if (e.pd !== lpd) { if (e.pd || lpd !== 'ok') limiar(idb, f, 'PD', lpd, e.pd, b.pd, b.pdm); e.pd = lpd; mudou = true; }
      if (mudou) { C.est[f.id] = e; SV.db.set(C.base + '/est/' + f.id, e).catch(() => {}); }
      C.prev[f.id] = b;
      if (!a) continue;
      const dpv = b.pv - a.pv, dpd = b.pd - a.pd;
      if (dpv < 0 && !casa(f.id, 'dpv', -dpv)) ev('dano', { cat: 'combate', txt: 'recebeu ' + (-dpv) + ' de dano · PV ' + b.pv + '/' + b.pvm, nv: 'info', k: 'dano', n: -dpv });
      if (dpv > 0) ev('cura', { cat: 'recursos', txt: 'recuperou ' + dpv + ' PV · ' + b.pv + '/' + b.pvm, nv: 'info', k: 'cura', n: dpv });
      if (dpd < 0 && !casa(f.id, 'dpd', -dpd)) ev('pd-', { cat: 'recursos', txt: 'perdeu ' + (-dpd) + ' PD · ' + b.pd + '/' + b.pdm + ' (' + pct(b.pd, b.pdm) + '%)', nv: 'info' });
      if (dpd > 0) ev('pd+', { cat: 'recursos', txt: 'recuperou ' + dpd + ' PD · ' + b.pd + '/' + b.pdm, nv: 'info' });
      for (const c of b.cond) if (!a.cond.includes(c)) ev('c+' + c, { cat: 'condicoes', txt: 'recebeu a condição ' + c, nv: /morto|perdida|moribundo/i.test(c) ? 'alerta' : 'aviso' });
      for (const c of a.cond) if (!b.cond.includes(c)) ev('c-' + c, { cat: 'condicoes', txt: 'perdeu a condição ' + c, nv: 'info' });
      for (const [k, r] of Object.entries(b.rel)) { const o = a.rel[k]; if (o && r.n > o.n) ev('rel' + k + r.n, { cat: 'relacoes', txt: 'usou a relação com ' + r.nome + (r.ult ? ': ' + r.ult : ''), nv: 'aviso' });
        if (r.ped && (!o || o.ped !== r.ped)) ev('relped' + k + fnv(r.ped), { cat: 'relacoes', txt: 'pediu para evoluir a relação com ' + r.nome + ': “' + r.ped + '”', nv: 'aviso', k: 'relped' }); }
      if (b.cx > 3 && b.cx > (a.cx || 0)) ev('relc' + b.cx, { cat: 'relacoes', txt: 'mandou ' + b.cx + ' pontos de relação numa mesma cena (o limite é 3)', nv: 'alerta', k: 'relc' });
      if (b.exc > (a.exc || 0)) ev('relx' + b.exc, { cat: 'relacoes', txt: 'pôs ' + b.exc + ' ponto(s) de relação acima do que tinha livre, sem concessão do mestre', nv: 'alerta', k: 'relx' });
      for (const [k, q] of Object.entries(a.it)) { const q2 = b.it[k]; if (q2 == null) ev('it-' + k, { cat: 'outros', txt: 'ficou sem ' + k, nv: 'info' }); else if (q2 < q) ev('it' + k + q2, { cat: 'outros', txt: 'usou ' + k + ' (restam ' + q2 + ')', nv: 'info' }); }
      for (const hb of b.hab) if (!a.hab.includes(hb)) ev('hab' + hb, { cat: 'habilidades', txt: 'ganhou a habilidade ' + hb, nv: 'info' });
      for (const r of b.rit) if (!a.rit.includes(r)) ev('rit' + r, { cat: 'habilidades', txt: 'aprendeu o ritual ' + r, nv: 'info' });
      if (b.nivel > a.nivel) ev('nv' + b.nivel, { cat: 'outros', txt: 'subiu para o nível ' + b.nivel, nv: 'info' });
      if (b.nex > a.nex) ev('nex' + b.nex, { cat: 'outros', txt: 'NEX agora em ' + b.nex + '%', nv: 'info' });
    }
  }

  /* ---------------------------------------------------------- sino */
  function sino() {
    const n = Object.values(C.ev).filter(e => ativo(e) && !e.lida).length;
    const subiu = n > C.naoLidas; C.naoLidas = n;
    for (const b of [$('#b-sino .bolinha'), $('#abas [data-aba="central"] .bolinha')]) { if (!b) continue; b.hidden = !n; b.textContent = n > 99 ? '99+' : n; }
    const s = $('#b-sino');
    if (s) { s.title = n ? n + (n === 1 ? ' notificação não lida' : ' notificações não lidas') : 'Central do mestre: nada novo'; s.setAttribute('aria-label', s.title); if (subiu) { s.classList.remove('toca'); void s.offsetWidth; s.classList.add('toca'); } }
  }

  /* ---------------------------------------------------------- desenho */
  function monta() {
    const box = $('#p-central'); if (!box || box.dataset.ok) return;
    box.dataset.ok = '1';
    box.innerHTML = `<div class="titulo-pg"><h1>Central do mestre</h1><p id="c-sub">O que acontece na mesa, sem precisar abrir ficha por ficha. Só você vê.</p><button class="btn sm" type="button" data-c="nota-rapida">Nota rápida</button></div>
      <nav class="c-abas" id="c-abas" role="tablist" aria-label="Partes da central"></nav><div class="c-corpo" id="c-corpo"></div>`;
    box.addEventListener('click', clique);
    box.addEventListener('change', muda);
  }
  function agendaDesenho() { clearTimeout(C.tDes); C.tDes = setTimeout(desenha, 120); }
  function desenha() {
    sino();
    const box = $('#p-central'); if (!box || !box.dataset.ok || !_ || _.aba() !== 'central') return;
    if (box.contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && (C.vista === 'config' || C.vista === 'relacoes')) return;
    const nAt = Object.values(C.ev).filter(e => ativo(e) && !e.lida).length;
    $('#c-abas').innerHTML = VISTAS.map(([k, n]) => `<button type="button" role="tab" data-v="${k}" aria-selected="${C.vista === k}" class="${C.vista === k ? 'on' : ''}">${n}${k === 'notif' && nAt ? ` <span class="c-n">${nAt}</span>` : ''}</button>`).join('');
    const corpo = $('#c-corpo'), st = box.scrollTop;
    corpo.innerHTML = ({ geral: vGeral, combate: vCombate, jogadores: vJogadores, relacoes: vRelacoes, notif: vNotif, hist: vHist, config: vConfig }[C.vista] || vGeral)();
    box.scrollTop = st;
  }
  const medidor = (rec, v, m, cfg) => {
    const lv = nivel(v, m, rec === 'pv' ? +cfg.pvBaixo : +cfg.pdBaixo, rec === 'pv' ? +cfg.pvCrit : +cfg.pdCrit);
    return `<div class="c-med ${rec} ${lv}"><span class="c-med-n">${rec.toUpperCase()}</span><span class="c-barra"><i style="width:${pct(v, m)}%"></i></span><span class="c-med-v"><b>${v}</b>/${m}</span></div>`;
  };
  /* condições: a ficha manda cada uma com tom, resumo e efeito (f._est); fichas antigas mandam só o nome (f._cond) */
  const estDe = f => Array.isArray(f._est) && f._est.length ? f._est.filter(e => e && e.n) : (Array.isArray(f._cond) ? f._cond : []).map(c => ({ n: c, t: /morto|perdida|moribundo|zerad|−|-\d/i.test(c) ? 'mal' : /\+|inspirad/i.test(c) ? 'bem' : /pavor/i.test(c) ? 'pavor' : '' }));
  const conds = f => { const l = estDe(f); return l.length ? `<div class="c-conds">${l.map(e => `<span class="c-cond ${esc(e.t || '')}" tabindex="0" title="${esc([e.c, e.e, e.d ? 'Duração: ' + e.d : ''].filter(Boolean).join(' '))}">${esc(e.n)}</span>`).join('')}</div>` : ''; };
  /* um estado geral por personagem (o mais grave) e a lista do que pede atenção */
  const ORD_EG = { fora: 5, critico: 4, perigo: 3, pavor: 2, alerta: 1, normal: 0 };
  function estadoDe(f) {
    const lpv = nivel(+f.pv.v, +f.pv.m, +C.cfg.pvBaixo, +C.cfg.pvCrit), lpd = nivel(+f.pd.v, +f.pd.m, +C.cfg.pdBaixo, +C.cfg.pdCrit), l = estDe(f), mot = [];
    const pavor = f.pavorD ? String(f.pavorD) : (l.find(e => e.t === 'pavor') ? 'sim' : '');
    if (f.morto) mot.push(['fora', 'Morto']); else if (f.perdido) mot.push(['fora', 'Mente perdida']); else if (f.moribundo) mot.push(['critico', 'Moribundo: teste de lesão no fim da rodada']);
    if (!f.morto && lpv === 'zero') mot.push(['critico', 'PV zerado']); else if (lpv === 'crit') mot.push(['perigo', 'PV crítico (' + f.pv.v + '/' + f.pv.m + ')']);
    if (lpd === 'zero') mot.push(['perigo', 'PD zerado']); else if (lpd === 'crit') mot.push(['alerta', 'PD muito baixo (' + f.pd.v + '/' + f.pd.m + ')']);
    if (pavor) mot.push(['pavor', 'Dado de pavor' + (pavor !== 'sim' ? ' ' + pavor : '')]);
    if (lpv === 'baixo') mot.push(['alerta', 'PV baixo (' + f.pv.v + '/' + f.pv.m + ')']);
    if (lpd === 'baixo') mot.push(['alerta', 'PD baixo (' + f.pd.v + '/' + f.pd.m + ')']);
    const neg = l.filter(e => e.t === 'mal' && !/^(morto|mente perdida|moribundo|pv zerado|pd zerado)$/i.test(e.n));
    if (neg.length) mot.push(['alerta', neg.length === 1 ? neg[0].n : neg.length + ' desvantagens: ' + neg.map(e => e.n).join(', ')]);
    mot.sort((a, b) => ORD_EG[b[0]] - ORD_EG[a[0]]);
    const n = mot.length ? mot[0][0] : 'normal';
    return { n, txt: { fora: 'Fora de cena', critico: 'Crítico', perigo: 'Em perigo', pavor: 'Com pavor', alerta: 'Atenção', normal: 'Estável' }[n], mot, pavor, lpv, lpd };
  }
  const MODOS = [['', 'Cena livre'], ['combate', 'Combate'], ['invest', 'Investigação']];
  const barraModo = () => { const m = (SV.F.modo && SV.F.modo()) || ''; return `<div class="c-modo" role="group" aria-label="Modo da cena"><span>Modo da cena</span>${MODOS.map(([k, n]) => `<button type="button" data-c="cena-modo" data-m="${k}" class="${m === k ? 'on' : ''}" aria-pressed="${m === k}">${n}</button>`).join('')}<small>${m ? 'A ficha de cada jogador está no modo de ' + (m === 'combate' ? 'combate' : 'investigação') + '.' : 'Abra um modo e a ficha dos jogadores põe na frente o que importa.'}</small></div>`; };
  function atencao(l) {
    const linhas = l.map(f => ({ f, e: estadoDe(f) })).filter(x => x.e.mot.length).sort((a, b) => ORD_EG[b.e.n] - ORD_EG[a.e.n]);
    if (!linhas.length) return `<section class="c-atencao ok"><b>Ninguém precisa de atenção agora.</b></section>`;
    return `<section class="c-atencao" aria-label="Quem precisa de atenção"><h2>Atenção agora <small>${linhas.length} de ${l.length}</small></h2><ul>${linhas.map(({ f, e }) => `<li class="${e.n}"><button type="button" data-c="abrir" data-fid="${esc(f.id)}" title="Abrir a ficha de ${esc(f.nome)}"><b>${esc(f.nome || 'Sem nome')}</b><span class="c-eg ${e.n}">${e.txt}</span><span class="c-mot">${e.mot.map(m => esc(m[1])).join(' · ')}</span></button></li>`).join('')}</ul></section>`;
  }
  function acoesDe(f, n) {
    const out = [];
    for (const l of Object.values(_.D.rolagens || {})) if (l && typeof l === 'object') for (const r of Object.values(l)) if (r && (r.fid ? r.fid === f.id : r.quem === f.nome)) out.push(r);
    return out.sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, n);
  }
  const linhaAcao = r => `${esc(r.o || '')}${r.tot && r.tot !== '•' ? ' <b>' + esc(r.tot) + '</b>' : ''}${r.vt && r.vt !== 'PD' ? ' · ' + esc(r.vt) : ''}${r.custo ? ' <small>(' + esc(r.custo) + ')</small>' : ''} <small>${esc(hora(r.t || Date.now()))}</small>`;
  const jogadorDe = f => f.dono ? String(_.nomeDe(f.dono)).split(' ')[0] : 'sem jogador';
  const online = uid => !!(_.D.online && _.D.online[uid]);
  function cardBase(f, extra) {
    const ult = acoesDe(f, 1)[0], alerta = Object.values(C.ev).filter(e => ativo(e) && !e.lida && e.fid === f.id).length;
    const eg = estadoDe(f), lpv = eg.lpv;
    return `<article class="c-card ${lpv} eg-${eg.n}${eg.pavor ? ' tem-pavor' : ''}${eg.lpd === 'crit' || eg.lpd === 'zero' ? ' pd-mal' : ''}" data-fid="${esc(f.id)}">
      <header data-c="abrir" data-fid="${esc(f.id)}" title="Abrir a ficha de ${esc(f.nome)}"><span class="av"${f.cor ? ` style="--cor-f:${esc(f.cor)}"` : ''}>${f.retrato ? `<img src="${esc(f.retrato)}" alt="">` : esc(_.ini(f.nome))}</span>
        <div class="c-quem"><b>${esc(f.nome || 'Sem nome')}</b><small><span class="ponto${online(f.dono) ? ' on' : ''}"></span>${esc(jogadorDe(f))} · nv ${esc(f.nivel || 1)} · NEX ${esc(f.nex || 0)}%</small></div>
        <span class="c-eg ${eg.n}" title="${esc(eg.mot.map(m => m[1]).join(' · ') || 'Sem alertas')}">${eg.txt}</span>
        ${alerta ? `<button class="c-alerta" type="button" data-c="ver-notif" data-fid="${esc(f.id)}" title="Notificações não lidas de ${esc(f.nome)}">${alerta}</button>` : ''}</header>
      ${extra.medidores}
      ${conds(f)}
      <p class="c-ult">${ult ? 'Última ação: ' + linhaAcao(ult) : '<span class="vazio">Nenhuma ação registrada ainda.</span>'}</p>
      ${extra.fim || ''}
    </article>`;
  }
  function vGeral() {
    const l = pjs(), nAt = Object.values(C.ev).filter(e => ativo(e) && !e.lida).length;
    const jog = Object.keys(_.D.users || {}).filter(u => !_.ehGM(u)), on = jog.filter(online).length;
    const crit = l.filter(f => { const e = C.est[f.id] || {}; return e.pv === 'crit' || e.pv === 'zero' || e.pd === 'crit' || e.pd === 'zero'; }).length;
    const ult = evs().filter(([, e]) => ativo(e)).slice(0, 8);
    const comPavor = l.filter(f => estadoDe(f).pavor).length;
    return `${barraModo()}<div class="c-resumo">
        <div class="c-kpi"><b>${on}<small>/${jog.length}</small></b><span>jogadores online</span></div>
        <div class="c-kpi${nAt ? ' tem' : ''}"><b>${nAt}</b><span>notificações não lidas</span></div>
        <div class="c-kpi${crit ? ' mal' : ''}"><b>${crit}</b><span>em estado crítico</span></div>
        <div class="c-kpi${comPavor ? ' pavor' : ''}"><b>${comPavor}</b><span>com dado de pavor</span></div>
        <div class="c-kpi"><b>Sessão ${esc(C.cfg.sessao)}</b><span><button class="btn sm${C.sessaoConf ? ' red' : ''}" type="button" data-c="nova-sessao">${C.sessaoConf ? 'Confirmar: começar a sessão ' + (+C.cfg.sessao + 1) + '?' : 'Nova sessão'}</button></span></div>
      </div>
      ${l.length ? atencao(l) : ''}
      ${l.length ? `<div class="c-grade">${l.map(f => cardBase(f, { medidores: medidor('pv', +f.pv.v, +f.pv.m, C.cfg) + medidor('pd', +f.pd.v, +f.pd.m, C.cfg), fim: `<div class="c-pe"><button class="btn sm" type="button" data-c="abrir" data-fid="${esc(f.id)}">Abrir ficha</button></div>` })).join('')}</div>`
        : '<p class="vazio">Nenhuma ficha de jogador ainda. Quando os jogadores criarem as fichas, elas aparecem aqui.</p>'}
      <section class="cartao c-ultimos"><h2>Últimos acontecimentos <small>${ult.length ? '' : 'nada ainda'}</small></h2>
        ${ult.length ? `<ul class="c-lista">${ult.map(([id, e]) => itemEv(id, e, true)).join('')}</ul><button class="btn sm" type="button" data-v="notif">Ver todas as notificações</button>` : '<p class="vazio">Os alertas de PV e PD, as habilidades usadas e as condições aparecem aqui sozinhos.</p>'}
      </section>`;
  }
  function vCombate() {
    const l = pjs();
    const outros = C.extras ? Object.values(_.D.fichas).map(x => x.f).filter(f => f && f.papel !== 'pj' && f.visivel) : [];
    const lista = [...l, ...outros];
    const sess = +C.cfg.sessao || 1;
    const doSess = (fid, fn) => Object.values(C.ev).filter(e => e && e.fid === fid && e.s === sess && fn(e));
    const card = f => {
      const aberto = !!C.abertos[f.id];
      const ajuste = rec => `<div class="c-ajuste">${medidor(rec, +f[rec].v, +f[rec].m, C.cfg)}<button class="mini" type="button" data-c="menos" data-r="${rec}" data-fid="${esc(f.id)}" aria-label="Tirar 1 ${rec.toUpperCase()} de ${esc(f.nome)}">−</button><button class="mini" type="button" data-c="mais" data-r="${rec}" data-fid="${esc(f.id)}" aria-label="Dar 1 ${rec.toUpperCase()} a ${esc(f.nome)}">+</button></div>`;
      let fim = `<div class="c-pe"><button class="btn sm" type="button" data-c="expandir" data-fid="${esc(f.id)}" aria-expanded="${aberto}">${aberto ? 'Menos' : 'Mais detalhes'}</button><button class="btn sm" type="button" data-c="abrir" data-fid="${esc(f.id)}">Abrir ficha</button></div>`;
      if (aberto) {
        const dano = doSess(f.id, e => e.k === 'dano').reduce((a, e) => a + (+e.n || 0), 0);
        const habs = doSess(f.id, e => e.cat === 'habilidades'), rels = doSess(f.id, e => e.cat === 'relacoes'), its = doSess(f.id, e => e.cat === 'outros' && /^usou|ficou sem/.test(e.txt || ''));
        const acoes = acoesDe(f, 5);
        fim = `<div class="c-mais">
          <div><span class="c-k">Dano recebido nesta sessão</span><b>${dano}</b></div>
          <div><span class="c-k">Ações</span>${acoes.length ? `<ul>${acoes.map(r => `<li>${linhaAcao(r)}</li>`).join('')}</ul>` : '<span class="vazio">Nenhuma.</span>'}</div>
          <div><span class="c-k">Habilidades e rituais nesta sessão</span>${habs.length ? `<ul>${habs.slice(0, 6).map(e => `<li>${esc(e.txt)} <small>${esc(hora(e.t))}</small></li>`).join('')}</ul>` : '<span class="vazio">Nenhum.</span>'}</div>
          <div><span class="c-k">Relações e itens nesta sessão</span>${rels.length + its.length ? `<ul>${[...rels, ...its].slice(0, 6).map(e => `<li>${esc(e.txt)} <small>${esc(hora(e.t))}</small></li>`).join('')}</ul>` : '<span class="vazio">Nenhum.</span>'}</div>
        </div>` + fim;
      }
      return cardBase(f, { medidores: ajuste('pv') + ajuste('pd'), fim });
    };
    return `${barraModo()}<div class="c-barra-top"><label class="c-check"><input type="checkbox" data-c="extras"${C.extras ? ' checked' : ''}> Mostrar NPCs e inimigos visíveis</label><span class="vazio">Os botões − e + mudam a ficha na hora, e o jogador vê.</span></div>
      ${lista.length ? `<div class="c-grade combate">${lista.map(card).join('')}</div>` : '<p class="vazio">Nenhuma ficha para acompanhar.</p>'}`;
  }
  function vJogadores() {
    const jog = Object.entries(_.D.users || {}).filter(([u, x]) => x && !_.ehGM(u)).sort((a, b) => String(a[1].nome).localeCompare(b[1].nome));
    if (!jog.length) return '<p class="vazio">Nenhum jogador entrou na mesa ainda.</p>';
    return `<div class="c-jogs">${jog.map(([u, x]) => {
      const fs = pjs().filter(f => f.dono === u), on = online(u);
      return `<section class="cartao c-jog"><h2>${esc(x.nome || 'Sem nome')} <small><span class="ponto${on ? ' on' : ''}"></span>${on ? 'online agora' : x.visto ? 'visto ' + esc(_.quando(x.visto)) : 'offline'}</small></h2>
        ${fs.length ? fs.map(f => `<div class="c-jog-f"><b>${esc(f.nome)}</b><span>PV ${esc(f.pv.v)}/${esc(f.pv.m)} · PD ${esc(f.pd.v)}/${esc(f.pd.m)}</span><button class="btn sm" type="button" data-c="abrir" data-fid="${esc(f.id)}">Abrir ficha</button></div>`).join('') : '<p class="vazio">Ainda sem ficha.</p>'}</section>`;
    }).join('')}</div>`;
  }
  function itemEv(id, e, curto) {
    const acoes = curto ? '' : `<div class="c-ev-ac">
        <button class="btn sm" type="button" data-c="${e.lida ? 'naolida' : 'lida'}" data-id="${esc(id)}">${e.lida ? 'Não lida' : 'Lida'}</button>
        <button class="btn sm" type="button" data-c="${e.arq ? 'desarquivar' : 'arquivar'}" data-id="${esc(id)}">${e.arq ? 'Desarquivar' : 'Arquivar'}</button>
        <button class="btn sm ghost" type="button" data-c="limpar" data-id="${esc(id)}" title="Tira da central. Continua no histórico.">Limpar</button></div>`;
    return `<li class="c-ev nv-${esc(e.nv || 'info')}${e.lida ? ' lida' : ''}"><span class="c-ico ${esc(e.cat || 'outros')}" title="${esc(CAT_N[e.cat] || 'Outros')}">${ICO[e.cat] || ICO.outros}</span>
      <div class="c-ev-t"><p><b>${esc(e.quem || '')}</b> ${esc(e.txt || '')}</p><small>${esc(CAT_N[e.cat] || 'Outros')} · ${esc(hora(e.t))} · ${esc(dia(e.t))}${e.s ? ' · sessão ' + esc(e.s) : ''}${e.lida ? '' : ' · <span class="c-nova">não lida</span>'}</small></div>${acoes}</li>`;
  }
  const opcoesFicha = sel => `<option value="">Todos os personagens</option>` + pjs().map(f => `<option value="${esc(f.id)}"${sel === f.id ? ' selected' : ''}>${esc(f.nome)}</option>`).join('');
  const opcoesCat = sel => `<option value="">Todas as categorias</option>` + CATS.map(([k, n]) => `<option value="${k}"${sel === k ? ' selected' : ''}>${n}</option>`).join('');
  function vNotif() {
    const F = C.f, l = evs().filter(([, e]) => !e.h && !e.limpa && (F.modo === 'arq' ? e.arq : !e.arq) && (!F.fid || e.fid === F.fid) && (!F.cat || e.cat === F.cat));
    const lidas = evs().filter(([, e]) => ativo(e) && e.lida).length, nl = evs().filter(([, e]) => ativo(e) && !e.lida).length;
    return `<div class="c-filtros">
        <div class="c-seg" role="group" aria-label="Quais notificações"><button type="button" data-c="modo" data-m="ativas" class="${F.modo !== 'arq' ? 'on' : ''}" aria-pressed="${F.modo !== 'arq'}">Ativas</button><button type="button" data-c="modo" data-m="arq" class="${F.modo === 'arq' ? 'on' : ''}" aria-pressed="${F.modo === 'arq'}">Arquivadas</button></div>
        <select class="campo" data-f="fid" aria-label="Filtrar por personagem">${opcoesFicha(F.fid)}</select>
        <select class="campo" data-f="cat" aria-label="Filtrar por categoria">${opcoesCat(F.cat)}</select>
        <span class="sp"></span>
        <button class="btn sm" type="button" data-c="todas-lidas"${nl ? '' : ' disabled'}>Marcar todas como lidas</button>
        <button class="btn sm" type="button" data-c="limpar-lidas"${lidas ? '' : ' disabled'} title="Tira da central as já lidas. Elas continuam no histórico.">Limpar lidas</button>
      </div>
      ${l.length ? `<ul class="c-lista">${l.slice(0, 300).map(([id, e]) => itemEv(id, e)).join('')}</ul>` : `<p class="vazio">${F.modo === 'arq' ? 'Nada arquivado.' : 'Nenhuma notificação. Quando algo acontecer na mesa, aparece aqui.'}</p>`}
      <p class="vazio c-nota">Limpar e arquivar não apagam nada: tudo continua no Histórico da sessão.</p>`;
  }
  function vHist() {
    const H = C.hf, l = evs().filter(([, e]) => (!H.fid || e.fid === H.fid) && (!H.cat || e.cat === H.cat) && (!H.s || String(e.s) === H.s));
    const sessoes = [...new Set(evs().map(([, e]) => e.s || 1))].sort((a, b) => b - a);
    const grupos = {}; for (const [id, e] of l) (grupos[e.s || 1] ||= []).push([id, e]);
    return `<div class="c-filtros">
        <select class="campo" data-h="s" aria-label="Sessão"><option value="">Todas as sessões</option>${sessoes.map(s => `<option value="${s}"${H.s === String(s) ? ' selected' : ''}>Sessão ${s}</option>`).join('')}</select>
        <select class="campo" data-h="fid" aria-label="Personagem">${opcoesFicha(H.fid)}</select>
        <select class="campo" data-h="cat" aria-label="Categoria">${opcoesCat(H.cat)}</select>
      </div>
      ${l.length ? Object.keys(grupos).sort((a, b) => b - a).map(s => `<section class="cartao c-sessao"><h2>Sessão ${esc(s)} <small>${grupos[s].length} registro${grupos[s].length > 1 ? 's' : ''} · ${esc(dia(grupos[s][grupos[s].length - 1][1].t))}</small></h2>
        <ul class="c-hist">${grupos[s].map(([, e]) => `<li class="nv-${esc(e.nv || 'info')}"><span class="c-ico ${esc(e.cat || 'outros')}">${ICO[e.cat] || ICO.outros}</span><span class="c-h-h">${esc(hora(e.t))}</span><span><b>${esc(e.quem || '')}</b> ${esc(e.txt || '')}</span></li>`).join('')}</ul></section>`).join('')
        : '<p class="vazio">O histórico guarda tudo o que a central registrou, sessão por sessão, inclusive os testes e ataques.</p>'}`;
  }
  function vConfig() {
    const c = C.cfg, n = (k, rot) => `<label>${rot} <span class="c-num"><input class="campo" type="number" min="1" max="99" data-cfg="${k}" value="${esc(c[k])}" inputmode="numeric">%</span></label>`;
    return `<form class="c-cfg" onsubmit="return false">
      <section class="cartao"><h2>Alertas de PV</h2><p class="vazio">Gera um alerta quando o personagem passa de um nível para outro. Ficar no mesmo nível não repete o alerta.</p>
        ${n('pvBaixo', 'Atenção abaixo de')}${n('pvCrit', 'Crítico abaixo de')}<p class="vazio">PV zerado é sempre estado crítico.</p></section>
      <section class="cartao"><h2>Alertas de PD</h2>${n('pdBaixo', 'Atenção abaixo de')}${n('pdCrit', 'Crítico abaixo de')}<p class="vazio">PD zerado é sempre alerta.</p></section>
      <section class="cartao"><h2>Avisos</h2><label class="c-check"><input type="checkbox" data-cfg="aviso"${c.aviso ? ' checked' : ''}> Mostrar um aviso discreto no canto da tela quando alguém entrar em estado crítico</label>
        <p class="vazio">O resto fica só no sino e na central, sem interromper a sessão.</p></section>
      <section class="cartao"><h2>Sessão</h2><label>Sessão atual <span class="c-num"><input class="campo" type="number" min="1" data-cfg="sessao" value="${esc(c.sessao)}" inputmode="numeric"></span></label>
        <p class="vazio">As notificações e as anotações rápidas novas entram nesta sessão. O histórico separa por sessão.</p>
        <button class="btn sm${C.sessaoConf ? ' red' : ''}" type="button" data-c="nova-sessao">${C.sessaoConf ? 'Confirmar: começar a sessão ' + (+c.sessao + 1) + '?' : 'Começar a próxima sessão'}</button></section>
    </form>`;
  }

  /* ---------------------------------------------------------- ações */

  /* ---------------------------------------------------------- relações */
  const GRAU = ['Sem pontos', 'Afinidade', 'Vínculo', 'Devoção'];
  const VE = { '-1': 'Desconfia', '0': 'Mal conhece', '1': 'Conhecido', '2': 'Confia', '3': 'Leal' };
  const QUEM = { pj: 'Do grupo', npc: 'Morador', outro: 'Outra pessoa' };
  function ganDe(r) { return (Array.isArray(r.evo) ? r.evo : []).reduce((a, e) => a + (e && (e.por === 'gm' || e.cena || e.gasto) ? (+e.d || 0) : 0), 0); }
  const relsDe = f => (Array.isArray(f.rel) ? f.rel : []).filter(r => r && typeof r === 'object');
  const quemDe = r => r.quem || (r.npc ? 'npc' : r.fid ? 'pj' : 'outro');
  const npcsF = () => Object.values(_.D.fichas).map(x => x.f).filter(f => f && f.papel === 'npc').sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
  const relNpc = (r, n) => r.npc === n.id || (!r.npc && quemDe(r) !== 'pj' && !!String(n.nome || '').trim() && String(r.nome || '').trim().toLowerCase() === String(n.nome || '').trim().toLowerCase());
  const ultGm = r => (Array.isArray(r.evo) ? r.evo : []).find(e => e && e.por === 'gm');
  const evoNaSessao = r => (Array.isArray(r.evo) ? r.evo : []).some(e => e && e.por === 'gm' && +e.d > 0 && +e.s === (+C.cfg.sessao || 1));
  const grauTxt = r => (r.neg ? 'Rancor · ' : '') + GRAU[+r.pts || 0] + (r.perd ? ' (' + r.perd + ' perdido)' : '');
  function aplicaRel(fid, relId, npcId, o) {
    const f0 = fichaDe(fid); if (!f0) return null;
    const f = JSON.parse(JSON.stringify(f0)); f.rel = Array.isArray(f.rel) ? f.rel : [];
    const n = npcId ? fichaDe(npcId) : null;
    let r = relId ? f.rel.find(x => x && x.id === relId) : null;
    if (!r && n) r = f.rel.find(x => x && relNpc(x, n));
    if (!r) { if (!n) return null; r = { id: 'r' + Math.random().toString(36).slice(2, 8), nome: n.nome || 'Sem nome', pts: 0, desc: '', fid: '', log: [], quem: 'npc', npc: n.id, tipo: '', origem: '', rp: '', estado: '', evo: [], pedido: null, outro: null }; f.rel.push(r); }
    r.evo = Array.isArray(r.evo) ? r.evo : []; r.log = Array.isArray(r.log) ? r.log : [];
    if (n && !r.npc) { r.npc = n.id; r.quem = 'npc'; }
    const sess = +C.cfg.sessao || 1, max = 3 - (+r.perd || 0), antes = +r.pts || 0;
    r.pts = Math.max(0, Math.min(max, antes + (+o.d || 0)));
    const e = { t: Date.now(), s: sess, d: r.pts - antes, por: 'gm', txt: o.motivo };
    if (o.ve !== '' && o.ve != null) { r.outro = Object.assign({ g: 0, txt: '', vis: false }, r.outro || {}, { g: +o.ve, vis: !!o.vis }); e.ve = +o.ve; }
    else if (r.outro && o.vis != null) r.outro.vis = !!o.vis;
    if (o.estado) r.estado = o.estado;
    if (o.pedido !== 'manter') r.pedido = null;
    r.evo.unshift(e); r.evo = r.evo.slice(0, 40);
    _.grava(f);
    if (o.nota) SV.db.set('notas/' + SV.me.uid + '/r/' + f.id + '/' + r.id + '/' + Date.now().toString(36), { t: Date.now(), s: sess, txt: o.nota, motivo: o.motivo || '' }).catch(() => SV.toast('A anotação não foi salva.', 'err'));
    emite('rg' + f.id + r.id + e.t, { fid: f.id, quem: f.nome || 'Sem nome', cat: 'relacoes', txt: 'relação com ' + r.nome + (e.d ? (e.d > 0 ? ' subiu' : ' desceu') + ' para ' + GRAU[r.pts] : ' registrada') + ': ' + o.motivo, nv: 'info', k: 'relgm' });
    agendaDiff();
    return { f, r, e };
  }
  function vRelacoes() {
    const l = pjs(), ns = npcsF(), sess = +C.cfg.sessao || 1, rf = C.rf;
    const peds = [], fracas = [], imp = {};
    for (const f of l) for (const r of relsDe(f)) {
      if (r.pedido && r.pedido.txt) peds.push({ f, r });
      const u = ultGm(r);
      if ((+r.pts || 0) <= 1 && (!u || (+u.s || 0) <= sess - 2)) fracas.push({ f, r });
      if (quemDe(r) === 'npc' || r.npc) { const k = r.npc || 'n:' + String(r.nome).toLowerCase(); const x = imp[k] ||= { nome: r.nome, npc: r.npc, soma: 0, pjs: [] }; x.soma += +r.pts || 0; x.pjs.push(f.nome + ' (' + GRAU[+r.pts || 0] + ')'); }
    }
    const impL = Object.values(imp).sort((a, b) => b.soma - a.soma || b.pjs.length - a.pjs.length);
    const fSel = rf.fid ? fichaDe(rf.fid) : null, nSel = rf.npc ? fichaDe(rf.npc) : null, atual = fSel && nSel ? relsDe(fSel).find(r => relNpc(r, nSel)) : null;
    const opt = (v, n, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(n)}</option>`;
    const linha = (f, r) => {
      const k = f.id + ':' + r.id, ab = !!C.rab[k], u = ultGm(r) || (r.evo || [])[0], q = quemDe(r);
      const rec = q === 'pj' && r.fid ? (() => { const o = fichaDe(r.fid); const v = o && relsDe(o).find(x => x.fid === f.id); return v ? 'recíproca: ' + GRAU[+v.pts || 0] : 'só de um lado'; })() : '';
      const notas = Object.entries((C.rnotas[f.id] || {})[r.id] || {}).map(([, x]) => x).filter(x => x && x.txt).sort((a, b) => b.t - a.t);
      return `<div class="c-rel-l${r.pedido ? ' ped' : ''}">
        <div class="c-rel-q"><b>${esc(r.nome || 'Sem nome')}</b> <span class="c-rel-chip ${esc(q)}">${esc(QUEM[q] || '')}</span>${r.tipo || r.desc ? ` <i>${esc(r.tipo || r.desc)}</i>` : ''}</div>
        <div class="c-rel-g"><b>${esc(grauTxt(r))}</b>${r.outro ? ` · ${esc(String(r.nome || '').split(' ')[0])}: ${esc(VE[String(r.outro.g)] || '')}${r.outro.vis ? '' : ' <small>(oculto)</small>'}` : ''}${rec ? ` · <small>${esc(rec)}</small>` : ''}</div>
        <div class="c-rel-u">${u ? `<small>${esc(dia(u.t))}${u.s ? ' · sessão ' + esc(u.s) : ''}:</small> ${esc(u.txt || '')}` : '<small>sem evolução registrada</small>'}</div>
        <div class="c-rel-a"><button class="btn sm" type="button" data-c="rel-menos" data-fid="${esc(f.id)}" data-rid="${esc(r.id)}" aria-label="Tirar um ponto de ${esc(r.nome)}">−</button><button class="btn sm" type="button" data-c="rel-mais" data-fid="${esc(f.id)}" data-rid="${esc(r.id)}" aria-label="Dar um ponto em ${esc(r.nome)}">+</button><button class="btn sm ghost" type="button" data-c="rel-hist" data-k="${esc(k)}">${ab ? 'Fechar' : 'Histórico'}</button></div>
        ${ab ? `<div class="c-rel-h">
          ${(r.evo || []).length ? `<ul class="c-lista">${r.evo.map(e => `<li><small>${esc(dia(e.t))}${e.s ? ' · sessão ' + esc(e.s) : ''} · ${esc(e.por === 'gm' ? 'mestre' : e.por === 'criacao' ? 'criação' : 'jogador')}</small> ${e.d ? `<b>${e.d > 0 ? '+' : ''}${esc(e.d)}</b> ` : ''}${esc(e.txt || '')}</li>`).join('')}</ul>` : '<p class="vazio">Sem evolução ainda.</p>'}
          ${r.origem ? `<p><small>Como se conhecem:</small> ${esc(r.origem)}</p>` : ''}
          <div class="c-rel-n"><b>Anotações privadas</b>${notas.length ? `<ul class="c-lista">${notas.map(x => `<li><small>${esc(dia(x.t))} · sessão ${esc(x.s || '?')}</small> ${esc(x.txt)}</li>`).join('')}</ul>` : ' <small>nenhuma ainda</small>'}
            <div class="c-rel-lin"><input class="c-in" type="text" data-rn="${esc(k)}" placeholder="Anotação só sua sobre este vínculo" aria-label="Anotação privada sobre ${esc(r.nome)}"><button class="btn sm" type="button" data-c="rel-nota" data-k="${esc(k)}">Anotar</button></div></div>
        </div>` : ''}
      </div>`;
    };
    const rep = atual && evoNaSessao(atual);
    return `<div class="c-resumo">
        <div class="c-kpi${peds.length ? ' tem' : ''}"><b>${peds.length}</b><span>pedidos dos jogadores</span></div>
        <div class="c-kpi"><b>${l.reduce((a, f) => a + relsDe(f).filter(r => quemDe(r) === 'npc' || r.npc).length, 0)}</b><span>vínculos com moradores</span></div>
        <div class="c-kpi"><b>${fracas.length}</b><span>pouco desenvolvidas</span></div>
        <div class="c-kpi"><b>${impL.filter(x => x.soma >= 2).length}</b><span>NPCs que importam</span></div>
      </div>
      <section class="cartao c-rf" id="c-rec"><h2>Reconhecimento <small>sessão ${esc(sess)}</small></h2>
        <p class="c-dica">Quando um personagem faz algo marcante por um morador, registre aqui. Conversa comum não conta. Uma evolução por vínculo por sessão; a segunda pede confirmação.</p>
        <div class="c-rel-lin">
          <label>NPC <select class="c-in" data-rf="npc" id="c-rf-npc"><option value="">Escolha…</option>${ns.map(n => opt(n.id, n.nome + (n.npc && n.npc.curto ? '' : ''), rf.npc === n.id)).join('')}</select></label>
          <label>Personagem <select class="c-in" data-rf="fid" id="c-rf-fid"><option value="">Escolha…</option>${l.map(f => opt(f.id, f.nome + ' · ' + jogadorDe(f), rf.fid === f.id)).join('')}</select></label></div>
        ${fSel && nSel ? `<p class="c-dica" id="c-rf-atual">${atual ? `Hoje: ${esc(fSel.nome)} → ${esc(nSel.nome)}: <b>${esc(grauTxt(atual))}</b>${atual.outro ? ` · ${esc(nSel.nome.split(' ')[0])} vê: ${esc(VE[String(atual.outro.g)])}` : ''}${rep ? ' · <b>já evoluiu nesta sessão</b>' : ''}` : `${esc(fSel.nome)} ainda não tem vínculo com ${esc(nSel.nome)}. Conceder cria o vínculo.`}</p>` : ''}
        <label>Motivo (o que aconteceu) <input class="c-in" type="text" data-rf="motivo" id="c-rf-motivo" value="${esc(rf.motivo)}" placeholder="Ex.: ajudou o Ademir a recuperar a aliança perdida"></label>
        <div class="c-rel-lin">
          <label>Pontos de relação do personagem <select class="c-in" data-rf="d" id="c-rf-d">${[['1', '+1'], ['0', 'sem mudar'], ['2', '+2'], ['-1', '−1']].map(([v, n]) => opt(v, n, rf.d === v)).join('')}</select></label>
          <label>Como o NPC passa a ver <select class="c-in" data-rf="ve" id="c-rf-ve">${opt('', 'não muda', rf.ve === '')}${Object.entries(VE).map(([k, n]) => opt(k, n, rf.ve === k)).join('')}</select></label>
          <label class="c-chk"><input type="checkbox" data-rf="vis" id="c-rf-vis"${rf.vis ? ' checked' : ''}> O jogador vê como o NPC o vê</label></div>
        <label>Estado atual (o jogador vê, opcional) <input class="c-in" type="text" data-rf="estado" id="c-rf-estado" value="${esc(rf.estado)}" placeholder="Ex.: o Ademir agora guarda pão para ele"></label>
        <label>Anotação privada (só você vê) <textarea class="c-in" rows="2" data-rf="nota" id="c-rf-nota" placeholder="Ex.: o Ademir vai contar do acordo se ele voltar a perguntar">${esc(rf.nota)}</textarea></label>
        <div><button class="btn sm red" type="button" data-c="rel-conceder" id="c-rf-ok">${C.rconf && C.rconf === (rf.fid + ':' + rf.npc) ? 'Já evoluiu nesta sessão. Conceder mesmo assim?' : 'Registrar reconhecimento'}</button></div>
      </section>
      <section class="cartao" id="c-peds"><h2>Pedidos dos jogadores <small>${peds.length ? '' : 'nenhum'}</small></h2>
        ${peds.length ? `<ul class="c-lista">${peds.map(({ f, r }) => `<li class="c-ped"><b>${esc(f.nome)}</b> → ${esc(r.nome)} <small>(${esc(grauTxt(r))})</small>: “${esc(r.pedido.txt)}” <span class="c-rel-a"><button class="btn sm red" type="button" data-c="rel-aceita" data-fid="${esc(f.id)}" data-rid="${esc(r.id)}">Conceder +1</button><button class="btn sm" type="button" data-c="rel-registra" data-fid="${esc(f.id)}" data-rid="${esc(r.id)}">Só registrar</button><button class="btn sm ghost" type="button" data-c="rel-recusa" data-fid="${esc(f.id)}" data-rid="${esc(r.id)}">Recusar</button></span></li>`).join('')}</ul>` : '<p class="vazio">Quando um jogador pedir a evolução de uma relação, o pedido aparece aqui e no sino.</p>'}
      </section>
      <section class="cartao"><h2>NPCs que importam <small>soma dos pontos dos personagens</small></h2>
        ${impL.length ? `<ul class="c-lista">${impL.slice(0, 10).map(x => `<li><b>${esc(x.nome)}</b> <small>${esc(x.soma)} ponto(s)</small> · ${esc(x.pjs.join(', '))}</li>`).join('')}</ul>` : '<p class="vazio">Nenhum personagem tem vínculo com moradores ainda.</p>'}
      </section>
      <section class="cartao"><h2>Relações de cada personagem</h2>
        <label>Mostrar <select class="c-in" data-rfil="1" id="c-rfil">${opt('', 'todos', !C.rfil)}${l.map(f => opt(f.id, f.nome, C.rfil === f.id)).join('')}</select></label>
        ${l.filter(f => !C.rfil || f.id === C.rfil).map(f => `<div class="c-rel-pj"><h3>${esc(f.nome)} <small>${esc(jogadorDe(f))} · ${relsDe(f).length} vínculo(s)</small></h3>${relsDe(f).length ? relsDe(f).map(r => linha(f, r)).join('') : '<p class="vazio">Sem vínculos.</p>'}</div>`).join('') || '<p class="vazio">Nenhuma ficha de jogador ainda.</p>'}
      </section>
      <section class="cartao"><h2>Pouco desenvolvidas <small>até 1 ponto e sem evolução nas últimas duas sessões</small></h2>
        ${fracas.length ? `<ul class="c-lista">${fracas.map(({ f, r }) => `<li>${esc(f.nome)} → <b>${esc(r.nome)}</b> <small>${esc(grauTxt(r))}${r.tipo ? ' · ' + esc(r.tipo) : ''}</small></li>`).join('')}</ul>` : '<p class="vazio">Nenhuma.</p>'}
      </section>`;
  }
  function cliqueRel(a, b) {
    const fid = b.dataset.fid, rid = b.dataset.rid;
    const f = fid ? fichaDe(fid) : null, r = f ? relsDe(f).find(x => x.id === rid) : null;
    if (a === 'rel-hist') { C.rab[b.dataset.k] = !C.rab[b.dataset.k]; desenha(); return true; }
    if (a === 'rel-nota') {
      const [nf, nr] = String(b.dataset.k).split(':'), inp = document.querySelector('[data-rn="' + CSS.escape(b.dataset.k) + '"]'), t = (inp && inp.value || '').trim();
      if (!t) return true;
      SV.db.set('notas/' + SV.me.uid + '/r/' + nf + '/' + nr + '/' + Date.now().toString(36), { t: Date.now(), s: +C.cfg.sessao || 1, txt: t }).then(() => SV.toast('Anotação guardada. Só você vê.')).catch(() => SV.toast('A anotação não foi salva.', 'err'));
      return true;
    }
    if (a === 'rel-conceder') {
      const rf = C.rf; rf.motivo = (rf.motivo || '').trim();
      if (!rf.npc || !rf.fid) { SV.toast('Escolha o NPC e o personagem.', 'err'); return true; }
      if (rf.motivo.length < 5) { SV.toast('Escreva o motivo: a evolução precisa de um acontecimento.', 'err'); return true; }
      const fS = fichaDe(rf.fid), nS = fichaDe(rf.npc), at = fS && nS ? relsDe(fS).find(x => relNpc(x, nS)) : null, ch = rf.fid + ':' + rf.npc;
      if (at && evoNaSessao(at) && +rf.d > 0 && C.rconf !== ch) { C.rconf = ch; desenha(); return true; }
      const res = aplicaRel(rf.fid, null, rf.npc, { d: +rf.d, motivo: rf.motivo, ve: rf.ve, vis: rf.vis, estado: (rf.estado || '').trim(), nota: (rf.nota || '').trim() });
      if (res) { SV.toast('Reconhecimento registrado: ' + res.f.nome + ' e ' + res.r.nome + ' (' + GRAU[+res.r.pts || 0] + ').'); C.rf = { npc: rf.npc, fid: '', d: '1', ve: '', vis: false, motivo: '', estado: '', nota: '' }; C.rconf = ''; }
      desenha(); return true;
    }
    if (!f || !r) return false;
    if (a === 'rel-aceita') aplicaRel(fid, rid, null, { d: 1, motivo: 'Pedido aceito: ' + r.pedido.txt });
    else if (a === 'rel-registra') aplicaRel(fid, rid, null, { d: 0, motivo: 'Registrado: ' + r.pedido.txt });
    else if (a === 'rel-recusa') aplicaRel(fid, rid, null, { d: 0, motivo: 'Pedido não concedido desta vez: ' + r.pedido.txt });
    else if (a === 'rel-mais' || a === 'rel-menos') aplicaRel(fid, rid, null, { d: a === 'rel-mais' ? 1 : -1, motivo: 'Correção do mestre', pedido: 'manter' });
    else return false;
    desenha(); return true;
  }
  function ajusta(fid, rec, d) {
    const f0 = fichaDe(fid); if (!f0 || !f0[rec]) return;
    const f = JSON.parse(JSON.stringify(f0));
    f[rec].v = Math.max(0, Math.min(+f[rec].m || 0, (+f[rec].v || 0) + d));
    if (f[rec].v === +f0[rec].v) return;
    _.grava(f); agendaDiff(); desenha();
  }
  function clique(e) {
    const v = e.target.closest('[data-v]');
    if (v && !e.target.closest('[data-c]')) { ver(v.dataset.v); return; }
    const b = e.target.closest('[data-c]'); if (!b) return;
    const a = b.dataset.c, id = b.dataset.id, fid = b.dataset.fid;
    if (a.startsWith('rel-') && cliqueRel(a, b)) return;
    if (a === 'nota-rapida') { e.stopPropagation(); _.notaRapida(); }
    else if (a === 'abrir') SV.F.abrir(fid);
    else if (a === 'cena-modo') { if (SV.F.setModo) { SV.F.setModo(b.dataset.m || ''); SV.toast(b.dataset.m ? 'Modo de ' + (b.dataset.m === 'combate' ? 'combate' : 'investigação') + ' aberto para a mesa.' : 'Cena livre.'); } desenha(); }
    else if (a === 'menos' || a === 'mais') ajusta(fid, b.dataset.r, a === 'mais' ? 1 : -1);
    else if (a === 'expandir') { C.abertos[fid] = !C.abertos[fid]; desenha(); }
    else if (a === 'ver-notif') { C.f.fid = fid; C.f.modo = 'ativas'; ver('notif'); }
    else if (a === 'modo') { C.f.modo = b.dataset.m; desenha(); }
    else if (a === 'lida') patchEv([id], { lida: true });
    else if (a === 'naolida') patchEv([id], { lida: false });
    else if (a === 'arquivar') patchEv([id], { arq: true, lida: true });
    else if (a === 'desarquivar') patchEv([id], { arq: false });
    else if (a === 'limpar') patchEv([id], { limpa: true, lida: true });
    else if (a === 'todas-lidas') patchEv(evs().filter(([, x]) => ativo(x) && !x.lida && (!C.f.fid || x.fid === C.f.fid) && (!C.f.cat || x.cat === C.f.cat)).map(([k]) => k), { lida: true });
    else if (a === 'limpar-lidas') patchEv(evs().filter(([, x]) => ativo(x) && x.lida).map(([k]) => k), { limpa: true });
    else if (a === 'nova-sessao') {
      if (!C.sessaoConf) { C.sessaoConf = true; desenha(); setTimeout(() => { if (C.sessaoConf) { C.sessaoConf = false; desenha(); } }, 5000); return; }
      C.sessaoConf = false; salvaCfg({ sessao: (+C.cfg.sessao || 1) + 1 }); SV.toast('Sessão ' + C.cfg.sessao + ' começou.');
    }
  }
  function muda(e) {
    const el = e.target;
    if (el.dataset.rf) { const k = el.dataset.rf; C.rf[k] = k === 'vis' ? el.checked : el.value; if (k === 'npc' || k === 'fid') { C.rconf = ''; desenha(); } return; }
    if (el.dataset.rfil) { C.rfil = el.value; desenha(); return; }
    if (el.dataset.f) { C.f[el.dataset.f] = el.value; desenha(); return; }
    if (el.dataset.h) { C.hf[el.dataset.h] = el.value; desenha(); return; }
    if (el.dataset.c === 'extras') { C.extras = el.checked; desenha(); return; }
    if (el.dataset.cfg) {
      const k = el.dataset.cfg;
      if (k === 'aviso') return salvaCfg({ aviso: el.checked });
      const n = Math.round(+el.value);
      if (!(n >= 1)) { el.value = C.cfg[k]; return; }
      const novo = { [k]: k === 'sessao' ? n : Math.min(99, n) };
      if (k === 'pvCrit' && novo[k] >= +C.cfg.pvBaixo) novo.pvBaixo = Math.min(99, novo[k] + 1);
      if (k === 'pvBaixo' && novo[k] <= +C.cfg.pvCrit) novo.pvCrit = Math.max(1, novo[k] - 1);
      if (k === 'pdCrit' && novo[k] >= +C.cfg.pdBaixo) novo.pdBaixo = Math.min(99, novo[k] + 1);
      if (k === 'pdBaixo' && novo[k] <= +C.cfg.pdCrit) novo.pdCrit = Math.max(1, novo[k] - 1);
      salvaCfg(novo);
    }
  }
  function salvaCfg(o) {
    C.cfg = Object.assign({}, C.cfg, o);
    SV.db.set(C.base + '/cfg', C.cfg).catch(() => SV.toast('Não deu para salvar a configuração.', 'err'));
    agendaDiff(); desenha();
  }
  function ver(v) {
    if (v === 'notas') { _.irAba('notas'); return; }
    if (!VISTAS.some(x => x[0] === v)) v = 'geral';
    C.vista = v; try { localStorage.setItem('sv.central.vista', v); } catch (e) {}
    desenha();
    const box = $('#p-central'); if (box) box.scrollTop = 0;
  }

  SV.central = {
    inicia,
    aba() { desenha(); },
    ver,
    sessao: () => +C.cfg.sessao || 1,
    reconhecer(npcId) { if (!_) return; C.rf.npc = npcId || ''; C.rf.fid = ''; C.rconf = ''; C.vista = 'relacoes'; try { localStorage.setItem('sv.central.vista', 'relacoes'); } catch (e) {} _.irAba('central'); desenha(); setTimeout(() => { const el = document.querySelector('#c-rf-fid'); if (el) el.focus(); }, 60); }
  };
  if (SV._iniciou && SV.isGM) inicia();
})();
