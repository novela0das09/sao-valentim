/* ==========================================================
   São Valentim do Vale · núcleo
   Banco (Firebase ou modo local de teste), login com Google
   (Google Identity Services → Firebase) e a tela de entrada.
   ========================================================== */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  const CFG = window.SV_FIREBASE;
  const forcaLocal = /[?&]local\b/.test(location.search);
  SV.online = !!(CFG && CFG.apiKey && typeof firebase !== 'undefined' && !forcaLocal);
  SV.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  SV.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const ls = {
    get(k, d) { try { const v = localStorage.getItem('sv.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('sv.' + k, JSON.stringify(v)); } catch {} }
  };
  SV.ls = ls;

  /* ---------- banco local: o mesmo formato do Firebase, guardado neste navegador e
     espelhado entre abas. Serve para testar mestre e jogador lado a lado. ---------- */
  function bancoLocal() {
    const KEY = 'sv.localdb';
    let tree = {};
    const ler = () => { try { tree = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { tree = {}; } };
    ler();
    const bc = 'BroadcastChannel' in window ? new BroadcastChannel('sv.localdb') : null;
    const subs = new Set();
    const parts = p => String(p).split('/').filter(Boolean);
    const norm = p => '/' + parts(p).join('/');
    const pega = p => parts(p).reduce((o, k) => (o == null ? undefined : o[k]), tree);
    const clone = v => (v == null ? null : JSON.parse(JSON.stringify(v)));
    function poe(p, v) {
      const ks = parts(p);
      if (!ks.length) { tree = v || {}; return; }
      let o = tree;
      for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {}; o = o[ks[i]]; }
      if (v == null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = clone(v);
    }
    const guarda = () => { try { localStorage.setItem(KEY, JSON.stringify(tree)); } catch {} };
    function dispara(s) {
      let v = clone(pega(s.path));
      if (s.q && v && typeof v === 'object') v = Object.fromEntries(Object.entries(v).filter(([, x]) => x && x[s.q.child] === s.q.eq));
      setTimeout(() => s.cb(v), 0);
    }
    function avisa(p) { for (const s of subs) if (p.startsWith(s.path) || s.path.startsWith(p)) dispara(s); }
    function mudou(p) { guarda(); avisa(p); bc && bc.postMessage({ p }); }
    if (bc) bc.onmessage = e => { ler(); avisa(e.data.p); };
    return {
      local: true,
      on(path, cb) { const s = { path: norm(path), cb }; subs.add(s); dispara(s); return () => subs.delete(s); },
      query(path, child, eq, cb) { const s = { path: norm(path), cb, q: { child, eq } }; subs.add(s); dispara(s); return () => subs.delete(s); },
      async get(path) { return clone(pega(norm(path))); },
      async set(path, v) { poe(norm(path), v); mudou(norm(path)); },
      async update(path, obj) { for (const [k, v] of Object.entries(obj || {})) poe(norm(path) + '/' + k, v); mudou(norm(path)); },
      async remove(path) { poe(norm(path), null); mudou(norm(path)); },
      async push(path, v) { const id = SV.uid(); poe(norm(path) + '/' + id, v); mudou(norm(path) + '/' + id); return id; },
      onDisconnectRemove(path) { addEventListener('pagehide', () => { ler(); poe(norm(path), null); guarda(); bc && bc.postMessage({ p: norm(path) }); }); },
      key: () => SV.uid()
    };
  }
  function bancoFirebase(rt) {
    return {
      local: false,
      rt,
      on(path, cb) { const r = rt.ref(path), f = r.on('value', s => cb(s.val()), e => { console.warn('sem acesso a', path, e && e.code); cb(null); }); return () => r.off('value', f); },
      query(path, child, eq, cb) { const q = rt.ref(path).orderByChild(child).equalTo(eq), f = q.on('value', s => cb(s.val()), e => { console.warn('sem acesso a', path, e && e.code); cb(null); }); return () => q.off('value', f); },
      async get(path) { return (await rt.ref(path).once('value')).val(); },
      set: (p, v) => rt.ref(p).set(v),
      update: (p, o) => rt.ref(p).update(o),
      remove: p => rt.ref(p).remove(),
      async push(p, v) { const r = rt.ref(p).push(); await r.set(v); return r.key; },
      onDisconnectRemove(p) { try { rt.ref(p).onDisconnect().remove(); } catch {} },
      key: () => rt.ref().push().key
    };
  }

  /* ---------- entrada ---------- */
  const $ = s => document.querySelector(s);
  function estado(nome, extra) {
    const e = $('#entrada');
    e.hidden = false;
    e.dataset.estado = nome;
    for (const p of e.querySelectorAll('[data-passo]')) p.hidden = p.dataset.passo !== nome;
    if (extra) extra(e);
  }
  function erro(msg) { const el = $('#e-erro'); if (el) { el.textContent = msg || ''; el.hidden = !msg; } }
  function amigavel(e) {
    const c = String((e && (e.code || e.message)) || e);
    if (/unauthorized-domain/.test(c)) return 'Este endereço ainda não está liberado no login do Firebase.';
    if (/network/.test(c)) return 'Sem conexão. Confira a internet e tente de novo.';
    if (/popup-closed|cancelled/.test(c)) return '';
    if (/popup-blocked/.test(c)) return 'O navegador bloqueou a janela do Google. Libere pop-ups para este site e tente de novo.';
    if (/permission/i.test(c)) return 'O banco recusou o acesso. As regras do banco precisam ser publicadas (veja o LEIA-ME).';
    return 'Não deu para entrar agora (' + c + ').';
  }

  /* Google Identity Services: o botão do Google entrega um token que o Firebase aceita.
     Assim o login não depende de cookies de outro site, que o Chrome passou a bloquear. */
  function carregaGIS() {
    return new Promise((ok, falha) => {
      if (window.google && google.accounts && google.accounts.id) return ok();
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = () => ok(); s.onerror = () => falha(new Error('gsi'));
      document.head.appendChild(s);
    });
  }
  async function botaoGoogle(auth) {
    const alvo = $('#e-google');
    alvo.innerHTML = '';
    try {
      await carregaGIS();
      google.accounts.id.initialize({
        client_id: window.SV_GOOGLE_CLIENT,
        callback: async r => {
          erro('');
          estado('carregando', e => { e.querySelector('#e-status').textContent = 'Conferindo o crachá…'; });
          try { await auth.signInWithCredential(firebase.auth.GoogleAuthProvider.credential(r.credential)); }
          catch (err) { estado('login'); erro(amigavel(err)); botaoGoogle(auth); }
        },
        ux_mode: 'popup', auto_select: false, itp_support: true, use_fedcm_for_prompt: true
      });
      const w = Math.min(340, Math.max(220, alvo.clientWidth || 300));
      google.accounts.id.renderButton(alvo, { theme: 'filled_black', size: 'large', shape: 'rectangular', text: 'continue_with', logo_alignment: 'left', locale: 'pt-BR', width: w });
    } catch {
      alvo.innerHTML = '<button class="e-btn primario" type="button" id="e-popup">Entrar com Google</button>';
    }
    const alt = $('#e-popup') || $('#e-alt');
    if (alt) alt.onclick = async () => {
      erro('');
      try { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
      catch (err) { erro(amigavel(err)); }
    };
  }

  SV.entrar = function (pronto) {
    estado('carregando');
    if (!SV.online) return entrarLocal(pronto);
    /* o Firebase guarda neste endereço (o mesmo do site da Névoa) a lembrança de um websocket que falhou
       e passa a usar long polling, que aqui leva meio minuto para conectar. Começa sempre pelo websocket. */
    try { localStorage.removeItem('firebase:previous_websocket_failure'); } catch {}
    /* o banco responde pelo endereço principal e depois manda o navegador para um servidor interno
       (s-gke-…firebaseio.com) que, em algumas redes, não conecta nunca. Apaga o servidor guardado e
       prende a conexão no endereço principal, que sempre funcionou nos testes. */
    try { localStorage.removeItem('firebase:host:' + new URL(CFG.databaseURL).host); } catch {}
    let app;
    try { app = firebase.apps.length ? firebase.app() : firebase.initializeApp(CFG); }
    catch (e) { estado('login'); erro(amigavel(e)); return; }
    const auth = firebase.auth(), rt = firebase.database();
    try {
      const ri = rt._delegate._repo.repoInfo_;
      if (ri && '_host' in ri) Object.defineProperty(ri, 'internalHost', { get() { return ri._host; }, set() {}, configurable: true });
    } catch (e) { console.warn('[SV] não deu para fixar o servidor do banco', e); }
    SV.db = bancoFirebase(rt);
    SV.auth = auth;
    let iniciou = false;
    auth.onAuthStateChanged(async u => {
      if (iniciou) { location.reload(); return; }
      if (!u) { estado('login'); botaoGoogle(auth); return; }
      estado('carregando', e => { e.querySelector('#e-status').textContent = 'Abrindo a mesa…'; });
      try {
        SV.me = { uid: u.uid, nome: u.displayName || u.email || 'Sem nome', foto: u.photoURL || '', email: u.email || '' };
        /* o banco às vezes demora a conectar com a sessão guardada: espera um pouco, renova o login e tenta de novo */
        const ler = async path => {
          for (let i = 0; i < 6; i++) {
            const r = await Promise.race([SV.db.get(path).then(v => ({ v })), new Promise(ok => setTimeout(() => ok(null), 8000))]);
            if (r) return r.v;
            estado('carregando', e => { e.querySelector('#e-status').textContent = 'A conexão está lenta, esperando o banco…'; });
            if (i === 2) { try { await u.getIdToken(true); rt.goOffline(); rt.goOnline(); } catch {} }
          }
          throw new Error('network: o banco não respondeu');
        };
        const ms = (await ler('mesa/mestres')) || {};
        SV.mestres = ms;
        SV.isGM = ms[u.uid] === true;
        const ban = SV.isGM ? null : await ler('mesa/banidos/' + u.uid).catch(() => null);
        if (ban === true) { estado('banido'); $('#e-sair2').onclick = () => auth.signOut(); return; }
        SV.db.update('users/' + u.uid, { nome: SV.me.nome, foto: SV.me.foto, visto: Date.now() }).catch(() => {});
        const vai = () => { iniciou = true; $('#entrada').hidden = true; pronto(); };
        if (!Object.keys(ms).length) {
          estado('mestre', e => {
            e.querySelector('#e-quem').innerHTML = (SV.me.foto ? `<img src="${SV.esc(SV.me.foto)}" alt="">` : '') + SV.esc(SV.me.nome);
            e.querySelector('#e-gm').onclick = async () => {
              try { await SV.db.set('mesa/mestres/' + u.uid, true); SV.isGM = true; SV.mestres = { [u.uid]: true }; vai(); }
              catch (err) { erro(amigavel(err)); }
            };
            e.querySelector('#e-pj').onclick = vai;
          });
          return;
        }
        vai();
      } catch (err) { estado('login'); erro(amigavel(err)); botaoGoogle(auth); }
    });
    SV.sair = () => { try { google.accounts.id.disableAutoSelect(); } catch {} auth.signOut(); };
  };

  /* modo local: escolhe um nome e um papel; cada aba pode ser uma pessoa */
  function entrarLocal(pronto) {
    SV.db = bancoLocal();
    estado('local', e => {
      const salvo = sessionStorage.getItem('sv.localme');
      const nome = e.querySelector('#e-lnome');
      nome.value = salvo ? JSON.parse(salvo).nome : '';
      const vai = gm => {
        const n = nome.value.trim() || (gm ? 'Mestre' : 'Jogador');
        const prev = salvo ? JSON.parse(salvo) : null;
        SV.me = { uid: prev && prev.nome === n ? prev.uid : 'local-' + n.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).slice(2, 5), nome: n, foto: '' };
        sessionStorage.setItem('sv.localme', JSON.stringify(SV.me));
        SV.db.update('users/' + SV.me.uid, { nome: n, foto: '', visto: Date.now() });
        (async () => {
          if (gm) await SV.db.set('mesa/mestres/' + SV.me.uid, true);
          SV.mestres = (await SV.db.get('mesa/mestres')) || {};
          SV.isGM = SV.mestres[SV.me.uid] === true;
          $('#entrada').hidden = true; pronto();
        })();
      };
      e.querySelector('#e-lgm').onclick = () => vai(true);
      e.querySelector('#e-lpj').onclick = () => vai(false);
    });
    SV.sair = () => { sessionStorage.removeItem('sv.localme'); location.reload(); };
  }
})();
