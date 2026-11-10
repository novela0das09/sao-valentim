/* ==========================================================
   São Valentim do Vale · call de voz
   Malha WebRTC (cada um liga direto para cada um), com os sinais
   passando pelo banco. O motor é o mesmo da Névoa; aqui a distância
   vem das peças no mapa 3D.
   ========================================================== */
(function () {
  'use strict';
  const SV = window.SV;
  const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }];
  const MOVEL = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const prazo = (p, ms) => Promise.race([p, new Promise((_, f) => setTimeout(() => f(Object.assign(new Error('tempo'), { name: 'Timeout' })), ms))]);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const V = (SV.voz = {
    ok: false, peers: {}, cfg: {}, conns: new Map(), joined: false, joining: false,
    stream: null, track: null, muted: false, semMic: false, ac: null, lan: null,
    vol: SV.ls.get('vozVol', {}) || {}, fala: new Set(), seen: new Set(), chain: Promise.resolve(),
    n: 0, sid: null, me: null, inboxOff: null, meterT: 0, listeners: new Set(),
    C() {
      const c = this.cfg || {};
      return { aberta: c.aberta !== false, prox: c.prox !== false, raio: clamp(+c.raio || 14, 3, 80) };
    },
    init() {
      if (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) return;
      this.ok = true;
      this.me = SV.me.uid;
      SV.db.on('call/cfg', v => { this.cfg = v || {}; this.mix(); this.avisa(); });
      SV.db.on('call/peers', v => {
        this.peers = v || {};
        if (this.joined && !this.peers[this.me]?.s) this.relink();
        this.sync(); this.avisa();
      });
      addEventListener('pagehide', () => { if (this.joined) SV.db.remove('call/peers/' + this.me).catch(() => {}); });
    },
    avisa() { for (const f of this.listeners) try { f(); } catch {} },
    onChange(f) { this.listeners.add(f); return () => this.listeners.delete(f); },
    isGM(u) { return SV.mestres?.[u] === true || (u === this.me && SV.isGM); },
    /* quanto eu ouço o outro: 1 perto, some com a distância; o mestre ouve e é ouvido por todos */
    link(a, b) {
      const c = this.C();
      if (this.isGM(a) || this.isGM(b)) return { g: 1, pan: 0 };
      if (!c.prox) return { g: 1, pan: 0 };
      const pa = SV.posDe?.(a), pb = SV.posDe?.(b);
      if (!pa || !pb) return { g: 0, why: 'sem peça no mapa' };
      if ((pa.cena || 'vale') !== (pb.cena || 'vale')) return { g: 0, why: 'em outro lugar' };
      const d = Math.hypot(pa.x - pb.x, pa.z - pb.z), r = c.raio, perto = r * 0.35;
      const g = d <= perto ? 1 : d >= r ? 0 : Math.pow(1 - (d - perto) / (r - perto), 1.6);
      return { g, d, pan: clamp((pb.x - pa.x) / r, -1, 1) * 0.7, why: g > 0 ? '' : 'longe demais' };
    },
    async pegaMic() {
      try {
        const s = await prazo(navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }), 15000);
        return { stream: s };
      } catch (e) {
        const n = e && e.name;
        return { err: n === 'NotAllowedError' ? 'O navegador não liberou o microfone. Você entra só ouvindo; libere o microfone no cadeado da barra de endereço para falar.' : n === 'NotFoundError' ? 'Nenhum microfone encontrado. Você entra só ouvindo.' : 'Não deu para usar o microfone. Você entra só ouvindo.' };
      }
    },
    async join() {
      if (!this.ok || this.joined || this.joining) return;
      if (!this.C().aberta && !SV.isGM) { SV.toast('O mestre fechou a call por enquanto.'); return; }
      this.joining = true; this.semMic = false; this.avisa();
      try { const A = window.AudioContext || window.webkitAudioContext; this.ac = new A({ latencyHint: MOVEL ? 'playback' : 'balanced' }); this.ac.resume?.().catch(() => {}); } catch { this.ac = null; }
      const m = await this.pegaMic();
      if (!this.joining) { m.stream?.getTracks().forEach(t => t.stop()); return; }
      this.stream = m.stream || null; this.semMic = !m.stream;
      this.track = this.stream ? this.stream.getAudioTracks()[0] : null;
      if (this.track) this.track.enabled = !this.muted;
      try { if (this.ac && this.stream) { this.lan = this.ac.createAnalyser(); this.lan.fftSize = 512; this.ac.createMediaStreamSource(this.stream).connect(this.lan); } } catch { this.lan = null; }
      this.sid = Math.random().toString(36).slice(2, 10); this.seen.clear();
      try {
        await prazo(SV.db.remove('call/sig/' + this.me), 8000).catch(() => {});
        if (this.inboxOff) this.inboxOff();
        this.inboxOff = SV.db.on('call/sig/' + this.me, v => { this.chain = this.chain.then(() => this.inbox(v)).catch(e => console.warn(e)); });
        SV.db.onDisconnectRemove('call/peers/' + this.me);
        await prazo(SV.db.set('call/peers/' + this.me, this.eu()), 12000);
      } catch (e) {
        console.warn(e); this.joining = false; this.stopLocal();
        if (this.inboxOff) { this.inboxOff(); this.inboxOff = null; }
        SV.toast(e && e.name === 'Timeout' ? 'A conexão está lenta e a call não respondeu. Tente de novo.' : 'Não deu para entrar na call agora. Tente de novo.', 'err');
        this.avisa(); return;
      }
      if (!this.joining) { this.joined = true; this.leave(); return; }
      this.joined = true; this.joining = false;
      clearInterval(this.meterT); this.meterT = setInterval(() => this.meter(), 140);
      this.sync(); this.avisa();
      SV.toast(m.err || (this.C().prox ? 'Você entrou na call. Quem está perto da sua peça no mapa soa mais alto.' : 'Você entrou na call.'), m.err ? 'err' : '');
    },
    eu() { return { n: SV.isGM ? 'Mestre' : (SV.meuNome?.() || SV.me.nome.split(' ')[0]), f: SV.me.foto || '', s: this.sid, mu: this.muted || this.semMic, t: Date.now() }; },
    relink() { if (!this.joined) return; SV.db.set('call/peers/' + this.me, this.eu()).catch(() => {}); },
    leave() {
      if (!this.joined && !this.joining) return;
      this.joining = false; this.joined = false;
      for (const k of [...this.conns.keys()]) this.drop(k);
      if (this.inboxOff) { this.inboxOff(); this.inboxOff = null; }
      SV.db.remove('call/peers/' + this.me).catch(() => {});
      SV.db.remove('call/sig/' + this.me).catch(() => {});
      this.stopLocal(); clearInterval(this.meterT); this.fala.clear(); this.avisa();
    },
    stopLocal() { this.stream?.getTracks().forEach(t => t.stop()); this.stream = null; this.track = null; try { this.ac?.close(); } catch {} this.ac = null; this.lan = null; },
    toggleMute() {
      this.muted = !this.muted;
      if (this.track) this.track.enabled = !this.muted;
      this.relink(); this.avisa();
    },
    setCfg(o) { if (SV.isGM) SV.db.update('call/cfg', o).catch(() => SV.toast('Não deu para mudar a call.', 'err')); },
    sync() {
      if (!this.joined) return;
      const vivos = new Set();
      for (const [u, p] of Object.entries(this.peers)) {
        if (u === this.me || !p || !p.s) continue;
        vivos.add(u);
        const c = this.conns.get(u);
        if (c && c.rs !== p.s) this.drop(u);
        if (!this.conns.get(u) && this.me < u) this.call(u, p.s);
      }
      for (const u of [...this.conns.keys()]) if (!vivos.has(u)) this.drop(u);
      this.mix();
    },
    conn(u, rs) {
      const pc = new RTCPeerConnection({ iceServers: ICE });
      const c = { uid: u, rs, pc, q: [], sender: null, gain: null, pan: null, an: null, audio: null, g: 0, st: 'new', tries: 0 };
      if (this.track) c.sender = pc.addTrack(this.track, this.stream);
      else if (this.me < u) pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.onicecandidate = e => { if (e.candidate) this.send(u, rs, { ty: 'ice', c: JSON.stringify(e.candidate.toJSON ? e.candidate.toJSON() : e.candidate) }); };
      pc.ontrack = e => this.attach(c, (e.streams && e.streams[0]) || new MediaStream([e.track]));
      pc.onconnectionstatechange = () => {
        c.st = pc.connectionState;
        if (c.st === 'connected') { this.mix(); this.audioOn(); }
        this.avisa();
        if (c.st === 'failed' && this.me < u && this.conns.get(u) === c) setTimeout(() => {
          if (this.conns.get(u) === c && this.peers[u]?.s === rs) { const t = c.tries + 1; this.drop(u); if (t <= 3) this.call(u, rs, t); }
        }, 1500);
      };
      this.conns.set(u, c);
      return c;
    },
    async call(u, rs, tries = 0) {
      const c = this.conn(u, rs); c.tries = tries;
      try { const o = await c.pc.createOffer(); await c.pc.setLocalDescription(o); this.send(u, rs, { ty: 'offer', sdp: o.sdp }); } catch (e) { console.warn('call', e); }
    },
    drop(u) {
      const c = this.conns.get(u); if (!c) return;
      this.conns.delete(u);
      try { c.pc.close(); } catch {}
      try { c.gain?.disconnect(); c.pan?.disconnect(); c.src?.disconnect(); } catch {}
      if (c.audio) { c.audio.srcObject = null; c.audio.remove(); }
      this.fala.delete(u);
    },
    send(to, rs, msg) {
      const id = Date.now().toString(36) + (this.n++ % 1679616).toString(36).padStart(4, '0');
      SV.db.set(`call/sig/${to}/${this.me}/${id}`, Object.assign(msg, { s: this.sid, r: rs })).catch(() => {});
    },
    async inbox(v) {
      if (!this.joined && !this.joining) return;
      for (const [de, msgs] of Object.entries(v || {})) for (const k of Object.keys(msgs || {}).sort()) {
        const key = de + '/' + k;
        if (this.seen.has(key)) continue;
        this.seen.add(key);
        SV.db.remove(`call/sig/${this.me}/${de}/${k}`).catch(() => {});
        const m = msgs[k];
        if (!m || m.r !== this.sid) continue;
        try { await prazo(this.handle(de, m), 6000); } catch (e) { console.warn('sinal', e); }
      }
    },
    async handle(u, m) {
      let c = this.conns.get(u);
      if (m.ty === 'offer') {
        if (c) this.drop(u);
        c = this.conn(u, m.s);
        await c.pc.setRemoteDescription({ type: 'offer', sdp: m.sdp });
        const a = await c.pc.createAnswer(); await c.pc.setLocalDescription(a);
        this.send(u, m.s, { ty: 'answer', sdp: a.sdp }); this.flushIce(c); this.mix();
      } else if (m.ty === 'answer') {
        if (!c || c.rs !== m.s || c.pc.signalingState !== 'have-local-offer') return;
        await c.pc.setRemoteDescription({ type: 'answer', sdp: m.sdp }); this.flushIce(c);
      } else if (m.ty === 'ice') {
        if (!c || c.rs !== m.s) return;
        let cand; try { cand = JSON.parse(m.c); } catch { return; }
        c.pc.remoteDescription ? await c.pc.addIceCandidate(cand).catch(() => {}) : c.q.push(cand);
      }
    },
    flushIce(c) { const q = c.q; c.q = []; for (const x of q) c.pc.addIceCandidate(x).catch(() => {}); },
    audioOn() {
      if (this.ac && this.ac.state === 'suspended') this.ac.resume().catch(() => {});
      for (const c of this.conns.values()) if (c.audio && c.audio.paused) c.audio.play?.().catch(() => {});
    },
    attach(c, stream) {
      if (c.audio) return;
      c.audio = document.createElement('audio'); c.audio.autoplay = true; c.audio.playsInline = true; c.audio.hidden = true;
      c.audio.srcObject = stream; document.body.append(c.audio);
      if (this.ac && !MOVEL) {
        c.audio.muted = true;
        try {
          c.src = this.ac.createMediaStreamSource(stream);
          c.an = this.ac.createAnalyser(); c.an.fftSize = 512;
          c.gain = this.ac.createGain(); c.gain.gain.value = 0;
          c.pan = this.ac.createStereoPanner ? this.ac.createStereoPanner() : null;
          c.src.connect(c.an); c.src.connect(c.gain);
          if (c.pan) { c.gain.connect(c.pan); c.pan.connect(this.ac.destination); } else c.gain.connect(this.ac.destination);
        } catch { c.audio.muted = false; c.gain = null; }
      } else {
        c.audio.volume = 0;
        try { if (this.ac) { c.src = this.ac.createMediaStreamSource(stream); c.an = this.ac.createAnalyser(); c.an.fftSize = 512; c.src.connect(c.an); } } catch {}
      }
      c.audio.play?.().catch(() => {});
      this.mix();
    },
    mix() {
      if (!this.joined) return;
      for (const [u, c] of this.conns) {
        const eu = this.link(this.me, u), ele = this.link(u, this.me);
        const tr = ele.g > 0 ? this.track : null;
        if (c.sender && c.sender.track !== tr) c.sender.replaceTrack(tr).catch(() => {});
        c.g = eu.g; c.why = eu.why;
        const v = eu.g * clamp(this.vol[u] ?? 1, 0, 2);
        if (c.gain && this.ac) { c.gain.gain.setTargetAtTime(v, this.ac.currentTime, 0.12); c.pan && c.pan.pan.setTargetAtTime(eu.pan || 0, this.ac.currentTime, 0.15); }
        else if (c.audio) { c.audio.volume = clamp(v, 0, 1); c.audio.muted = v < 0.02; }
      }
      this.avisa();
    },
    setVol(u, v) { this.vol[u] = clamp(v, 0, 2); SV.ls.set('vozVol', this.vol); this.mix(); },
    nivel(an) { if (!an) return 0; const a = new Uint8Array(an.fftSize); an.getByteTimeDomainData(a); let s = 0; for (const x of a) { const d = (x - 128) / 128; s += d * d; } return Math.sqrt(s / a.length); },
    meter() {
      const antes = [...this.fala].join();
      this.fala.clear();
      if (this.lan && !this.muted && this.nivel(this.lan) > 0.045) this.fala.add(this.me);
      for (const [u, c] of this.conns) if (c.an && c.g > 0.02 && this.nivel(c.an) > 0.04) this.fala.add(u);
      if ([...this.fala].join() !== antes) this.avisa();
    }
  });
})();
