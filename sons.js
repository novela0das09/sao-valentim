/* ==========================================================
   São Valentim do Vale · sons da mesa
   O mestre toca, todos ouvem. Os sons do vale são gerados no
   próprio navegador (sem baixar nada); o mestre também pode
   subir arquivos de áudio curtos.
   ========================================================== */
(function () {
  'use strict';
  const SV = window.SV;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- sons gerados ---------- */
  function ruido(ac, seg = 2) {
    const b = ac.createBuffer(1, ac.sampleRate * seg, ac.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = w * 0.6 + last * 3; }
    const s = ac.createBufferSource(); s.buffer = b; s.loop = true; return s;
  }
  const env = (g, ac, at, a, peak, rel) => { g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + a); g.gain.exponentialRampToValueAtTime(0.0001, at + a + rel); };
  const AMB = {
    chuva: (ac, out) => {
      const n = ruido(ac), f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
      const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 7000; const g = ac.createGain(); g.gain.value = 0.35;
      n.connect(f).connect(f2).connect(g).connect(out); n.start();
      const pingos = setInterval(() => {
        const t = ac.currentTime + Math.random() * 0.2, o = ac.createOscillator(), gg = ac.createGain();
        o.frequency.value = 1800 + Math.random() * 2500; o.connect(gg).connect(out); env(gg, ac, t, 0.002, 0.04, 0.05); o.start(t); o.stop(t + 0.08);
      }, 70);
      return () => { clearInterval(pingos); n.stop(); };
    },
    vento: (ac, out) => {
      const n = ruido(ac, 4), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.9;
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 260; lfo.connect(lg).connect(f.frequency);
      const g = ac.createGain(); g.gain.value = 0.55; const lfo2 = ac.createOscillator(), lg2 = ac.createGain(); lfo2.frequency.value = 0.05; lg2.gain.value = 0.25; lfo2.connect(lg2).connect(g.gain);
      n.connect(f).connect(g).connect(out); n.start(); lfo.start(); lfo2.start();
      return () => { n.stop(); lfo.stop(); lfo2.stop(); };
    },
    lago: (ac, out) => {
      const n = ruido(ac, 3), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
      const g = ac.createGain(); g.gain.value = 0.3; const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.22; lg.gain.value = 0.22; lfo.connect(lg).connect(g.gain);
      n.connect(f).connect(g).connect(out); n.start(); lfo.start();
      const gotas = setInterval(() => {
        if (Math.random() < 0.5) return;
        const t = ac.currentTime, o = ac.createOscillator(), gg = ac.createGain();
        o.frequency.setValueAtTime(320 + Math.random() * 300, t); o.frequency.exponentialRampToValueAtTime(900 + Math.random() * 500, t + 0.12);
        o.connect(gg).connect(out); env(gg, ac, t, 0.01, 0.05, 0.14); o.start(t); o.stop(t + 0.2);
      }, 900);
      return () => { clearInterval(gotas); n.stop(); lfo.stop(); };
    },
    noite: (ac, out) => {
      const grilos = setInterval(() => {
        const t = ac.currentTime + Math.random() * 0.4, fr = 4100 + Math.random() * 600;
        for (let k = 0; k < 3; k++) {
          const o = ac.createOscillator(), gg = ac.createGain(); o.frequency.value = fr; o.connect(gg).connect(out);
          env(gg, ac, t + k * 0.06, 0.004, 0.035, 0.03); o.start(t + k * 0.06); o.stop(t + k * 0.06 + 0.05);
        }
      }, 520);
      const n = ruido(ac, 3), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; const g = ac.createGain(); g.gain.value = 0.12;
      n.connect(f).connect(g).connect(out); n.start();
      return () => { clearInterval(grilos); n.stop(); };
    },
    radio: (ac, out) => {
      const n = ruido(ac), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.6; const g = ac.createGain(); g.gain.value = 0.22;
      n.connect(f).connect(g).connect(out); n.start();
      const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sine'; o.frequency.value = 540; og.gain.value = 0;
      o.connect(og).connect(out); o.start();
      const t = setInterval(() => { const now = ac.currentTime; og.gain.setTargetAtTime(Math.random() < 0.25 ? 0.05 : 0, now, 0.08); o.frequency.setTargetAtTime(380 + Math.random() * 500, now, 0.2); g.gain.setTargetAtTime(0.12 + Math.random() * 0.2, now, 0.05); }, 400);
      return () => { clearInterval(t); n.stop(); o.stop(); };
    },
    coracao: (ac, out) => {
      const bate = () => {
        const t = ac.currentTime;
        for (const [dt, a] of [[0, 0.9], [0.22, 0.6]]) {
          const o = ac.createOscillator(), gg = ac.createGain(); o.frequency.setValueAtTime(70, t + dt); o.frequency.exponentialRampToValueAtTime(38, t + dt + 0.15);
          o.connect(gg).connect(out); env(gg, ac, t + dt, 0.01, a, 0.18); o.start(t + dt); o.stop(t + dt + 0.25);
        }
      };
      bate(); const i = setInterval(bate, 950);
      return () => clearInterval(i);
    },
    drone: (ac, out) => {
      const g = ac.createGain(); g.gain.value = 0.16; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; f.Q.value = 3;
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.04; lg.gain.value = 160; lfo.connect(lg).connect(f.frequency); lfo.start();
      const os = [55, 55.4, 82.2, 109.6].map(fr => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(); return o; });
      f.connect(g).connect(out);
      return () => { os.forEach(o => o.stop()); lfo.stop(); };
    }
  };
  const EFE = {
    sino: (ac, out) => {
      const t = ac.currentTime;
      for (const [r, a, d] of [[1, 0.5, 4], [2.76, 0.25, 2.6], [5.4, 0.12, 1.6], [8.9, 0.06, 1]]) {
        const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 196 * r; o.connect(g).connect(out); env(g, ac, t, 0.005, a, d); o.start(t); o.stop(t + d + 0.1);
      }
      return 4.2;
    },
    batida: (ac, out) => {
      const t = ac.currentTime;
      [0, 0.32, 0.64].forEach(dt => {
        const n = ruido(ac, 0.3), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; const g = ac.createGain();
        n.connect(f).connect(g).connect(out); env(g, ac, t + dt, 0.004, 1.4, 0.16); n.start(t + dt); n.stop(t + dt + 0.25);
      });
      return 1.1;
    },
    trovao: (ac, out) => {
      const t = ac.currentTime, n = ruido(ac, 6), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(1600, t); f.frequency.exponentialRampToValueAtTime(140, t + 4);
      const g = ac.createGain(); n.connect(f).connect(g).connect(out); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1.2, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.4, t + 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + 5); n.start(t); n.stop(t + 5.2);
      return 5.2;
    },
    sussurro: (ac, out) => {
      const t = ac.currentTime;
      for (let k = 0; k < 7; k++) {
        const n = ruido(ac, 0.6), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200 + Math.random() * 2200; f.Q.value = 6;
        const p = ac.createStereoPanner ? ac.createStereoPanner() : null, g = ac.createGain(), dt = k * 0.35 + Math.random() * 0.2;
        n.connect(f).connect(g); if (p) { p.pan.value = Math.random() * 2 - 1; g.connect(p).connect(out); } else g.connect(out);
        env(g, ac, t + dt, 0.08, 0.5, 0.3); n.start(t + dt); n.stop(t + dt + 0.5);
      }
      return 3;
    },
    orelhao: (ac, out) => {
      const t = ac.currentTime;
      for (let k = 0; k < 2; k++) {
        const t0 = t + k * 2.2;
        for (const fr of [425, 440]) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = fr * 2; o.connect(g).connect(out); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02); g.gain.setValueAtTime(0.12, t0 + 1); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.05); o.start(t0); o.stop(t0 + 1.1); }
        const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 20; lg.gain.value = 0;
      }
      return 4.4;
    },
    apito: (ac, out) => {
      const t = ac.currentTime, g = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 2;
      const os = [146.8, 293.6, 440.4].map((fr, i) => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(fr * 0.97, t); o.frequency.linearRampToValueAtTime(fr, t + 0.4); o.connect(f); o.start(t); o.stop(t + 3.4); return o; });
      const n = ruido(ac, 3.5), nf = ac.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 2000; const ng = ac.createGain(); ng.gain.value = 0.15; n.connect(nf).connect(ng).connect(g); n.start(t); n.stop(t + 3.4);
      f.connect(g).connect(out); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.3); g.gain.setValueAtTime(0.5, t + 2.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.3);
      return 3.5;
    },
    agua: (ac, out) => {
      const t = ac.currentTime, n = ruido(ac, 1.2), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.9);
      const g = ac.createGain(); n.connect(f).connect(g).connect(out); env(g, ac, t, 0.01, 0.9, 0.9); n.start(t); n.stop(t + 1.2);
      return 1.3;
    }
  };
  SV.SONS_PRONTOS = [
    ['chuva', 'Chuva', 'ambiente'], ['vento', 'Vento no vale', 'ambiente'], ['lago', 'Água parada', 'ambiente'], ['noite', 'Noite e grilos', 'ambiente'],
    ['radio', 'Rádio chiando', 'ambiente'], ['coracao', 'Coração', 'ambiente'], ['drone', 'Pressão (grave)', 'ambiente'],
    ['sino', 'Sino da capela', 'efeito'], ['batida', 'Batidas na porta', 'efeito'], ['trovao', 'Trovão', 'efeito'], ['sussurro', 'Sussurros', 'efeito'],
    ['orelhao', 'Orelhão tocando', 'efeito'], ['apito', 'Apito do vapor', 'efeito'], ['agua', 'Algo cai na água', 'efeito']
  ].map(([id, nome, tipo]) => ({ id: 'p:' + id, nome, tipo, pronto: true }));

  const S = (SV.sons = {
    ac: null, master: null, vol: clamp(SV.ls.get('somVol', 0.8), 0, 1), mudo: !!SV.ls.get('somMudo', false), bloqueado: false,
    lib: {}, estado: {}, tocando: new Map(), buffers: new Map(), ultimoEfeito: SV.ls.get('somUltimo', ''), listeners: new Set(),
    avisa() { for (const f of this.listeners) try { f(); } catch {} },
    onChange(f) { this.listeners.add(f); return () => this.listeners.delete(f); },
    ctx() {
      if (!this.ac) {
        const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
        this.ac = new A(); this.master = this.ac.createGain(); this.master.connect(this.ac.destination); this.aplicaVol();
      }
      if (this.ac.state === 'suspended') this.ac.resume().then(() => { this.bloqueado = false; this.avisa(); }).catch(() => {});
      this.bloqueado = this.ac.state !== 'running';
      return this.ac;
    },
    aplicaVol() { if (this.master) this.master.gain.setTargetAtTime(this.mudo ? 0 : this.vol, this.ac.currentTime, 0.1); },
    setVol(v) { this.vol = clamp(v, 0, 1); SV.ls.set('somVol', this.vol); this.aplicaVol(); this.avisa(); },
    setMudo(m) { this.mudo = !!m; SV.ls.set('somMudo', this.mudo); this.aplicaVol(); this.avisa(); },
    init() {
      SV.db.on('sons/lib', v => { this.lib = v || {}; this.avisa(); this.aplica(); });
      SV.db.on('sons/estado', v => { this.estado = v || {}; this.aplica(); this.avisa(); });
      const destrava = () => { this.ctx(); this.aplica(); };
      addEventListener('pointerdown', destrava, { passive: true }); addEventListener('keydown', destrava);
    },
    todos() { return [...SV.SONS_PRONTOS, ...Object.values(this.lib || {}).filter(x => x && x.id).sort((a, b) => (a.criado || 0) - (b.criado || 0))]; },
    item(id) { return this.todos().find(x => x.id === id); },
    async buffer(id) {
      if (this.buffers.has(id)) return this.buffers.get(id);
      const p = (async () => {
        const dados = await SV.db.get('sons_arq/' + id.slice(2));
        if (!dados) throw new Error('sem arquivo');
        const bin = atob(String(dados).split(',').pop()), a = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
        return await this.ac.decodeAudioData(a.buffer);
      })();
      this.buffers.set(id, p);
      p.catch(() => this.buffers.delete(id));
      return p;
    },
    async toca(id, loop, vol = 1) {
      const ac = this.ctx(); if (!ac) return null;
      const g = ac.createGain(); g.gain.value = 0.0001; g.connect(this.master);
      g.gain.setTargetAtTime(vol, ac.currentTime, loop ? 0.8 : 0.02);
      let parar = () => {}, dur = 0;
      if (id.startsWith('p:')) {
        const k = id.slice(2);
        if (loop && AMB[k]) parar = AMB[k](ac, g);
        else if (EFE[k]) dur = EFE[k](ac, g);
        else if (AMB[k]) { parar = AMB[k](ac, g); dur = 6; }
      } else if (id.startsWith('a:')) {
        try {
          const b = await this.buffer(id), s = ac.createBufferSource(); s.buffer = b; s.loop = !!loop; s.connect(g); s.start();
          parar = () => { try { s.stop(); } catch {} }; dur = loop ? 0 : b.duration;
        } catch { return null; }
      }
      const h = { id, g, parar, fim: () => { g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.5); setTimeout(() => { try { parar(); } catch {} g.disconnect(); }, 2200); } };
      if (dur) setTimeout(() => { try { parar(); } catch {} setTimeout(() => g.disconnect(), 500); }, dur * 1000 + 400);
      return h;
    },
    /* aplica o estado da mesa: ambientes em loop e o último efeito */
    aplica() {
      if (!this.ac || this.ac.state !== 'running') return;
      const loops = (this.estado && this.estado.loops) || {};
      for (const [id, h] of [...this.tocando]) if (!loops[id]) { h.then(x => x && x.fim()); this.tocando.delete(id); }
      for (const [id, v] of Object.entries(loops)) {
        if (!this.tocando.has(id)) this.tocando.set(id, this.toca(id, true, clamp(+v || 1, 0, 1)));
        else this.tocando.get(id).then(x => x && x.g.gain.setTargetAtTime(clamp(+v || 1, 0, 1), this.ac.currentTime, 0.3));
      }
      const e = this.estado && this.estado.efeito;
      if (e && e.n && e.n !== this.ultimoEfeito) {
        this.ultimoEfeito = e.n; SV.ls.set('somUltimo', e.n);
        if (Date.now() - (e.t || 0) < 8000) this.toca(e.id, false, 1);
      }
    },
    /* comandos do mestre */
    efeito(id) { if (SV.isGM) SV.db.set('sons/estado/efeito', { id, t: Date.now(), n: SV.uid() }); },
    loop(id, on) { if (!SV.isGM) return; on ? SV.db.set('sons/estado/loops/' + id, 1) : SV.db.remove('sons/estado/loops/' + id); },
    pararTudo() { if (SV.isGM) SV.db.set('sons/estado/loops', null); },
    async subir(file, tipo) {
      if (!SV.isGM || !file) return;
      if (file.size > 3 * 1024 * 1024) { SV.toast('O arquivo passa de 3 MB. Corte um trecho menor ou converta para MP3.', 'err'); return; }
      const dados = await new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = falha; r.readAsDataURL(file); });
      const k = SV.db.key();
      await SV.db.set('sons_arq/' + k, dados);
      await SV.db.set('sons/lib/' + k, { id: 'a:' + k, nome: file.name.replace(/\.[^.]+$/, '').slice(0, 40), tipo, criado: Date.now() });
      SV.toast('Som adicionado.');
    },
    async apagar(id) {
      if (!SV.isGM || !id.startsWith('a:')) return;
      const k = id.slice(2);
      await SV.db.remove('sons/lib/' + k); await SV.db.remove('sons_arq/' + k); await SV.db.remove('sons/estado/loops/' + id);
    }
  });
})();
