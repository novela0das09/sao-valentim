/* ==========================================================
   São Valentim do Vale · ponte com o Firebase
   Login com Google + Realtime Database. Expõe a mesma interface
   que a mesa usa (db, user, room), então o resto do site não muda.
   ========================================================== */
(function () {
  'use strict';
  const CFG = window.APOGEU_FIREBASE || null;
  const ready = !!(CFG && CFG.apiKey && CFG.databaseURL && typeof firebase !== 'undefined' && !/COLE|SEU_/i.test(CFG.apiKey));
  const DISCORD = /^https:\/\/(discord\.gg|discord\.com\/invite)\/[\w-]+$/.test(window.APOGEU_DISCORD || '') ? window.APOGEU_DISCORD : '';
  const FB = (window.APOGEU_FB = { ready, user: null, isGM: false, mestres: {}, discord: DISCORD });

  /* ---------- tela de entrada ---------- */
  const css = `
  .gate{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:24px 16px;background:#0d1417;background-image:radial-gradient(ellipse 80% 50% at 50% 0%,rgba(79,163,165,.16),transparent 70%),radial-gradient(ellipse 60% 40% at 50% 100%,rgba(233,180,90,.08),transparent 70%);color:#d3dcdd;font:15px/1.5 "Barlow","Segoe UI",system-ui,sans-serif;overflow:auto}
  .gate-card{width:min(440px,100%);text-align:center;display:flex;flex-direction:column;gap:14px;align-items:center}
  .gate-ov{font:600 11px/1 "Barlow",sans-serif;letter-spacing:.3em;text-transform:uppercase;color:#e9b45a}
  .gate h1{margin:0;font:600 clamp(40px,9vw,58px)/1 "Cormorant Garamond",Georgia,serif;color:#f4ecd8;text-wrap:balance}
  .gate p{margin:0;color:#9fb0b3;max-width:38ch}
  .gate-btn{text-decoration:none;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:46px;padding:0 20px;border-radius:10px;border:1px solid rgba(196,214,216,.22);background:#1a2a2f;color:#d3dcdd;font:600 15px "Barlow",sans-serif;cursor:pointer;width:100%}
  .gate-btn:hover{background:#22353b}
  .gate-btn.primary{background:#e9b45a;border-color:#e9b45a;color:#2a1c06}
  .gate-btn.primary:hover{background:#f3cd85}
  .gate-btn svg{width:20px;height:20px}
  .gate-row{display:flex;flex-direction:column;gap:10px;width:100%}
  .gate-who{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:999px;background:#142024;border:1px solid rgba(196,214,216,.13);font-size:14px}
  .gate-who img{width:26px;height:26px;border-radius:50%}
  .gate-small{font-size:12.5px;color:#6f8387}
  .gate-small button{background:none;border:0;color:#9fb0b3;text-decoration:underline;cursor:pointer;font:inherit}
  .gate-err{color:#de6b58;font-size:13.5px}
  .acc-list{display:flex;flex-direction:column;gap:6px;max-height:46vh;overflow:auto}
  .acc-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;background:#111b1f;border:1px solid rgba(196,214,216,.13)}
  .acc-row img,.acc-row .ph{width:30px;height:30px;border-radius:50%;flex:none;background:#22353b}
  .acc-row .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
  @media (max-width:520px){.pl-mode .pl-ic span{display:none}.pl-mode .pl-ic{padding:0 10px}}
  .acc-row .nm small{display:block;font-weight:400;color:#6f8387;font-size:12px}
  .acc-row.banned{opacity:.7;border-style:dashed}
  .acc-row.banned .nm small{color:#de6b58}`;
  function addCss() { if (document.getElementById('gate-css')) return; const s = document.createElement('style'); s.id = 'gate-css'; s.textContent = css; document.head.appendChild(s); }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const GOOGLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.3 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"/></svg>';
  const CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/><path d="M9 12h.01M12 12h.01M15 12h.01"/></svg>';
  const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const discordBtn = () => (DISCORD ? `<a class="gate-btn" href="${esc(DISCORD)}" target="_blank" rel="noopener">${CHAT}Entrar no Discord da mesa</a>` : '');
  let gateEl = null;
  function gate(html) {
    addCss();
    if (!gateEl) { gateEl = document.createElement('div'); gateEl.className = 'gate'; gateEl.setAttribute('role', 'dialog'); gateEl.setAttribute('aria-modal', 'true'); document.body.appendChild(gateEl); }
    gateEl.innerHTML = `<div class="gate-card"><span class="gate-ov">Mesa de RPG</span><h1>São Valentim do Vale</h1>${html}</div>`;
    return gateEl;
  }
  function closeGate() { if (gateEl) { gateEl.remove(); gateEl = null; } }

  /* sem Firebase configurado: avisa e deixa usar só neste navegador */
  FB.setup = function (start) {
    const g = gate(`<p>Este site ainda não foi ligado a um banco de dados, então nada é compartilhado entre os jogadores.</p>
      <div class="gate-row"><button class="gate-btn primary" type="button" id="g-local">Testar só neste navegador</button></div>
      <p class="gate-small">Para jogar em grupo, siga o passo a passo do arquivo LEIA-ME e cole a configuração do Firebase no arquivo firebase-config.js.</p>`);
    g.querySelector('#g-local').onclick = () => { closeGate(); start(); };
  };
  if (!ready) return;

  firebase.initializeApp(CFG);
  const auth = firebase.auth(), rtdb = firebase.database();
  const CLIENT = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const errOf = e => ({ code: /permission/i.test(String(e && (e.code || e.message))) ? 'invalid_argument' : 'unavailable', message: String((e && e.message) || e) });
  /* cada documento vai como texto JSON: o Realtime Database não guarda listas vazias nem chaves com ponto */
  const pack = v => { const o = { j: JSON.stringify(v === undefined ? null : v), t: Date.now() }; if (v && typeof v.owner === 'string' && v.owner) o.o = v.owner; return o; }; // "o": dono da peça, lido pelas regras do banco
  const unpack = v => { if (v && typeof v.j === 'string') { try { return JSON.parse(v.j); } catch { return null; } } return v; };

  /* ---------- banco de dados (mesma forma que a mesa espera) ---------- */
  const db = {
    collection(path) {
      return {
        onSnapshot(next, onErr) {
          const ref = rtdb.ref(path); let live = false, buf = [], dead = false;
          const push = (type, s) => { if (dead) return; const val = unpack(s.val()); const ch = { type, doc: { id: s.key, data: () => val } }; if (live) next({ docChanges: () => [ch] }); else buf.push(ch); };
          const fail = e => { if (dead) return; dead = true; if (onErr) onErr(errOf(e)); };
          const a = ref.on('child_added', s => push('added', s), fail);
          const c = ref.on('child_changed', s => push('modified', s), fail);
          const r = ref.on('child_removed', s => push('removed', s), fail);
          ref.once('value').then(() => { if (dead) return; live = true; const b = buf; buf = []; next({ docChanges: () => b }); }, fail);
          return () => { dead = true; ref.off('child_added', a); ref.off('child_changed', c); ref.off('child_removed', r); };
        },
      };
    },
    doc(path) {
      const ref = rtdb.ref(path);
      return {
        set: v => ref.set(pack(v)).catch(e => { throw errOf(e); }),
        delete: () => ref.remove().catch(e => { throw errOf(e); }),
        onSnapshot(next, onErr) {
          let dead = false;
          const cb = ref.on('value', s => { if (!dead) next({ id: s.key, exists: s.exists(), data: () => (s.exists() ? unpack(s.val()) : undefined) }); }, e => { if (dead) return; dead = true; if (onErr) onErr(errOf(e)); });
          return () => { dead = true; ref.off('value', cb); };
        },
        get: () => ref.once('value').then(s => ({ id: s.key, exists: s.exists(), data: () => (s.exists() ? unpack(s.val()) : undefined) })),
      };
    },
  };
  /* ---------- eventos ao vivo (câmera, peças, sinais, rolagens) ---------- */
  const room = {
    on(topic, fn) {
      const ref = rtdb.ref('live/' + topic); let first = true;
      const cb = ref.on('value', s => { if (first) { first = false; return; } const v = s.val(); if (!v || v.from === CLIENT) return; fn({ data: unpack(v), sameTab: false }); }, () => {});
      return () => ref.off('value', cb);
    },
    emit(topic, data) { return rtdb.ref('live/' + topic).set(Object.assign(pack(data), { from: CLIENT })).catch(() => {}); },
  };
  const user = {
    id: async () => (FB.user ? FB.user.uid : null),
    isOwner: () => FB.isGM,
    canEdit: () => !!FB.user,
    can: () => !!FB.user,
    me: async () => ({ id: FB.user?.uid, name: FB.user?.displayName || '' }),
  };

  /* ---------- entrada: login, mestre, abrir a mesa ---------- */
  let started = false;
  FB.gate = function (start) {
    gate('<p>Conectando…</p>');
    auth.getRedirectResult().catch(e => showLogin(start, e));
    auth.onAuthStateChanged(async u => {
      if (started) { location.reload(); return; }
      if (!u) { showLogin(start); return; }
      FB.user = u;
      gate('<p>Abrindo a mesa…</p>');
      try {
        const ms = (await rtdb.ref('mesa/mestres').once('value')).val() || {};
        FB.mestres = ms; FB.isGM = ms[u.uid] === true;
        const ban = FB.isGM ? null : (await rtdb.ref('mesa/banidos/' + u.uid).once('value').catch(() => null))?.val();
        if (ban === true) { banGate(); return; }
        /* espectador: escolhido na entrada ("Entrar só para assistir") ou na tela de Conta; fica salvo na conta */
        const prev = (await rtdb.ref('users/' + u.uid).once('value').catch(() => null))?.val() || {};
        let esp = prev.esp === true;
        try { const want = sessionStorage.getItem('remanso.esp'); if (want) { esp = want === '1'; sessionStorage.removeItem('remanso.esp'); } } catch {}
        FB.espectador = !FB.isGM && esp;
        const me = { nome: u.displayName || u.email || 'Sem nome', foto: u.photoURL || '', visto: Date.now() }; if (esp) me.esp = true;
        rtdb.ref('users/' + u.uid).set(me).catch(() => {});
        let asPlayer = false; try { asPlayer = sessionStorage.getItem('remanso.asPlayer') === u.uid; sessionStorage.removeItem('remanso.asPlayer'); } catch {}
        if (!Object.keys(ms).length && !asPlayer) { askGM(start); return; }
        go(start);
      } catch (e) { showLogin(start, e); }
    });
  };
  FB.rtdb = rtdb; // a call de voz usa direto (sinais entre os navegadores)
  FB.setTravas = tv => rtdb.ref('mesa/travas').set({ pecas: !!tv.pecas, mapa: !!tv.mapa }).catch(() => {});
  function go(start) {
    window.claude = { use: async name => (name === 'db' ? db : name === 'user' ? user : name === 'room' ? room : null) };
    started = true; closeGate(); start();
    /* se o mestre expulsar esta conta com o site aberto, ela sai na hora */
    if (!FB.isGM && FB.user) rtdb.ref('mesa/banidos/' + FB.user.uid).on('value', s => { if (s.val() === true) location.reload(); }, () => {});
  }
  function banGate() {
    const u = FB.user;
    const g = gate(`<div class="gate-who">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="">` : ''}${esc(u.displayName || u.email)}</div>
      <p>Você foi removido desta mesa pelo mestre. Se acha que foi engano, fale com o mestre.</p>
      <div class="gate-row">${discordBtn()}<button class="gate-btn" type="button" id="g-out">Entrar com outra conta</button></div>`);
    g.querySelector('#g-out').onclick = () => auth.signOut();
  }
  function showLogin(start, err) {
    const g = gate(`<p>Entre com a sua conta do Google para abrir o mapa, as fichas e o mural da mesa.</p>
      <div class="gate-row"><button class="gate-btn primary" type="button" id="g-in">${GOOGLE}Entrar com Google</button><button class="gate-btn" type="button" id="g-esp">${EYE}Entrar só para assistir</button>${discordBtn()}</div>
      ${err ? `<p class="gate-err">${esc(friendly(err))}</p>` : ''}
      <p class="gate-small">O Google só informa seu nome e foto para a mesa. Quem entra só para assistir vê o mapa e ouve a call, sem ficha e sem falar.</p>`);
    const signIn = async esp => {
      try { sessionStorage.setItem('remanso.esp', esp ? '1' : '0'); } catch {}
      const prov = new firebase.auth.GoogleAuthProvider();
      try { await auth.signInWithPopup(prov); }
      catch (e) {
        if (/popup-blocked|operation-not-supported|cancelled-popup/i.test(e.code || '')) { try { await auth.signInWithRedirect(prov); return; } catch (e2) { showLogin(start, e2); return; } }
        if (!/popup-closed/i.test(e.code || '')) showLogin(start, e);
      }
    };
    g.querySelector('#g-in').onclick = () => signIn(false);
    g.querySelector('#g-esp').onclick = () => signIn(true);
  }
  function friendly(e) {
    const c = String(e.code || e.message || e);
    if (/unauthorized-domain/.test(c)) return 'Este endereço ainda não está autorizado no Firebase. Adicione o domínio do site em Authentication → Configurações → Domínios autorizados.';
    if (/network/.test(c)) return 'Sem conexão. Confira a internet e tente de novo.';
    if (/permission/i.test(c)) return 'O banco de dados recusou o acesso. Confira se as regras do LEIA-ME foram coladas no Realtime Database.';
    return 'Não deu para entrar agora (' + c + ').';
  }
  function askGM(start) {
    const u = FB.user;
    const g = gate(`<div class="gate-who">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="">` : ''}${esc(u.displayName || u.email)}</div>
      <p>Esta mesa ainda não tem mestre. Quem vai narrar a campanha toca no primeiro botão; os jogadores entram pelo segundo.</p>
      <div class="gate-row"><button class="gate-btn primary" type="button" id="g-gm">Eu sou o mestre desta mesa</button><button class="gate-btn" type="button" id="g-pl">Sou jogador</button>${discordBtn()}</div>
      <p class="gate-small">O mestre pode passar o posto para outra pessoa depois, no botão de conta.</p>`);
    g.querySelector('#g-gm').onclick = async () => {
      try { await rtdb.ref('mesa/mestres/' + u.uid).set(true); FB.isGM = true; FB.mestres = { [u.uid]: true }; go(start); }
      catch (e) { const ms = (await rtdb.ref('mesa/mestres').once('value')).val() || {}; FB.mestres = ms; FB.isGM = ms[u.uid] === true; if (!FB.isGM) alertGate('Outra pessoa acabou de virar mestre. Você entra como jogador.', start); else go(start); }
    };
    g.querySelector('#g-pl').onclick = () => go(start);
  }
  function alertGate(msg, start) {
    const g = gate(`<p>${esc(msg)}</p><div class="gate-row"><button class="gate-btn primary" type="button" id="g-ok">Entrar</button></div>`);
    g.querySelector('#g-ok').onclick = () => go(start);
  }

  /* ---------- conta e jogadores (usa o modal da mesa) ---------- */
  /* sair do posto: tira o próprio nome da lista de mestres e reabre a mesa como jogador */
  async function stepDown(handTo) {
    const u = FB.user;
    if (handTo) await rtdb.ref('mesa/mestres/' + handTo).set(true);
    await rtdb.ref('mesa/mestres/' + u.uid).remove();
    try { sessionStorage.setItem('remanso.asPlayer', u.uid); } catch {}
    location.reload();
  }
  FB.setEspectador = async v => {
    const u = FB.user; if (!u || FB.isGM) return;
    await rtdb.ref('users/' + u.uid + '/esp').set(v ? true : null);
    try { sessionStorage.setItem('remanso.esp', v ? '1' : '0'); } catch {}
    location.reload();
  };
  FB.account = async function () {
    const u = FB.user; if (!u || typeof modal !== 'function') return;
    let close;
    const me = h('div', { class: 'acc-row' }, u.photoURL ? h('img', { src: u.photoURL, alt: '' }) : h('span', { class: 'ph' }), h('span', { class: 'nm' }, u.displayName || u.email, h('small', null, (FB.isGM ? 'Mestre' : FB.espectador ? 'Espectador' : 'Jogador') + ' · ' + (u.email || ''))));
    const espBtn = FB.isGM ? null : h('button', { class: 'btn' + (FB.espectador ? ' primary' : ''), type: 'button', style: { width: '100%' }, onclick: async e => { e.currentTarget.disabled = true; try { await FB.setEspectador(!FB.espectador); } catch { e.currentTarget.disabled = false; UI.toast('Não foi possível trocar agora. Tente de novo.', 'err'); } } }, FB.espectador ? 'Voltar a jogar como jogador' : 'Só assistir (entrar como espectador)');
    const list = h('div', { class: 'acc-list' }, h('p', { class: 'hint' }, 'Carregando…'));
    let armed = false;
    const leave = h('button', { class: 'btn danger', type: 'button', style: { width: '100%' }, onclick: async () => {
      if (!armed) { armed = true; leave.textContent = 'Tem certeza? Toque de novo para virar jogador'; return; }
      leave.disabled = true; leave.textContent = 'Saindo…';
      try { await stepDown(null); } catch (e) { leave.disabled = false; armed = false; leave.textContent = 'Deixar de ser mestre e virar jogador'; UI.toast('Não foi possível sair do posto agora. Tente de novo.', 'err'); }
    } }, 'Deixar de ser mestre e virar jogador');
    close = modal(
      h('h2', null, FB.isGM ? 'Mestre e jogadores' : 'Sua conta'),
      me,
      FB.isGM ? h('p', null, 'Para outra pessoa assumir, toque em ', h('b', null, 'Passar o posto'), ' ao lado do nome dela: ela vira mestre e você vira jogador. ', h('b', null, 'Tornar mestre'), ' deixa vocês dois como mestres. ', h('b', null, 'Expulsar'), ' tira a pessoa da mesa na hora; ela só volta se você tocar em ', h('b', null, 'Readmitir'), '.') : h('p', null, FB.espectador ? 'Você está como espectador: vê o mapa, as fichas e as rolagens e ouve a call, mas não tem ficha nem fala na call.' : 'Você está na mesa como jogador. Só o mestre mexe no mapa, no mural e nas notas.'),
      espBtn,
      FB.isGM ? list : null,
      FB.isGM ? leave : null,
      FB.isGM ? h('p', { class: 'hint', style: { margin: '0' } }, 'Se não sobrar nenhum mestre, a próxima pessoa que entrar no site pode assumir a mesa.') : null,
      h('div', { class: 'acts' }, DISCORD ? h('a', { class: 'btn', href: DISCORD, target: '_blank', rel: 'noopener', style: { marginRight: 'auto', textDecoration: 'none' } }, 'Discord da mesa') : null, h('button', { class: 'btn ghost', type: 'button', onclick: async () => { await auth.signOut(); } }, 'Sair da conta'), h('button', { class: 'btn primary', type: 'button', onclick: () => close() }, 'Fechar')));
    if (!FB.isGM) return;
    const draw = async () => {
      const [us, ms, bs] = await Promise.all([rtdb.ref('users').once('value'), rtdb.ref('mesa/mestres').once('value'), rtdb.ref('mesa/banidos').once('value')]);
      const users = us.val() || {}, mest = ms.val() || {}, bans = bs.val() || {};
      const rows = Object.entries(users).filter(([uid]) => uid !== u.uid).sort((a, b) => ((bans[a[0]] === true) - (bans[b[0]] === true)) || (b[1].visto || 0) - (a[1].visto || 0));
      if (!rows.length) { list.replaceChildren(h('p', { class: 'hint', style: { margin: '0' } }, 'Ninguém mais entrou na mesa ainda. Quando os jogadores fizerem login, eles aparecem aqui.')); return; }
      const act = (label, cls, fn) => h('button', { class: 'btn sm' + cls, type: 'button', onclick: async e => { e.currentTarget.disabled = true; try { await fn(); } catch (err) { UI.toast('Não foi possível fazer isso agora. Tente de novo.', 'err'); } draw(); } }, label);
      /* expulsar pede dois toques para não acontecer sem querer */
      const kick = (uid, nome) => { let armed = false; const b = h('button', { class: 'btn sm danger', type: 'button', onclick: async () => {
        if (!armed) { armed = true; b.textContent = 'Toque de novo para expulsar'; setTimeout(() => { if (b.isConnected && armed) { armed = false; b.textContent = 'Expulsar'; } }, 4000); return; }
        b.disabled = true;
        try {
          await rtdb.ref('mesa/banidos/' + uid).set(true);
          await Promise.all([rtdb.ref('mesa/fichasOk/' + uid).remove(), rtdb.ref('pedidos/' + uid).remove()]).catch(() => {});
          UI.toast(nome + ' foi expulso da mesa.');
        } catch (err) { UI.toast('Não foi possível expulsar agora. Tente de novo.', 'err'); }
        draw();
      } }, 'Expulsar'); return b; };
      list.replaceChildren(...rows.map(([uid, x]) => {
        const isM = mest[uid] === true, isB = !isM && bans[uid] === true, nome = x.nome || 'Sem nome';
        return h('div', { class: 'acc-row' + (isB ? ' banned' : '') }, x.foto ? h('img', { src: x.foto, alt: '' }) : h('span', { class: 'ph' }),
          h('span', { class: 'nm' }, nome, h('small', null, isM ? 'Mestre' : isB ? 'Expulso da mesa' : x.esp ? 'Espectador' : 'Jogador')),
          isM ? act('Tirar de mestre', ' danger', () => rtdb.ref('mesa/mestres/' + uid).remove())
            : isB ? act('Readmitir', ' primary', () => rtdb.ref('mesa/banidos/' + uid).remove())
              : [act('Tornar mestre', '', () => rtdb.ref('mesa/mestres/' + uid).set(true)), act('Passar o posto', ' primary', () => stepDown(uid)), kick(uid, nome)]);
      }));
    };
    draw();
  };
})();
