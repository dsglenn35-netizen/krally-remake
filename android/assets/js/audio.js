// audio.js - 全程序化音效与音乐（WebAudio 合成，零原版素材）
const Sound = (() => {
  let ctx = null;
  let master, sfxBus, engineBus, musicBus;
  let started = false;
  let muted = false;

  // 引擎声节点
  let eng = null;
  let skid = null;
  let noiseBuf = null;
  const played = {};

  function makeNoise(seconds = 2) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.85; sfxBus.connect(master);
    engineBus = ctx.createGain(); engineBus.gain.value = 0.0; engineBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.35; musicBus.connect(master);
    noiseBuf = makeNoise(2);
    started = true;
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  // ---------- 引擎 ----------
  function engineStart() {
    if (!started) return;
    if (eng) return;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 60;
    const o2 = ctx.createOscillator(); o2.type = 'square';   o2.frequency.value = 31;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 6;
    const g1 = ctx.createGain(); g1.gain.value = 0.5;
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o1.connect(g1); o2.connect(g2); g1.connect(lp); g2.connect(lp); lp.connect(engineBus);
    o1.start(); o2.start();
    eng = { o1, o2, lp, g1, g2 };
    engineBus.gain.setTargetAtTime(0.30, ctx.currentTime, 0.2);
  }

  function engineStop() {
    if (!eng) return;
    const t = now();
    engineBus.gain.setTargetAtTime(0, t, 0.12);
    const e = eng; eng = null;
    setTimeout(() => { try { e.o1.stop(); e.o2.stop(); } catch (err) {} }, 500);
  }

  // ratio 0..1, throttle 0..1, offroad bool
  function engineUpdate(ratio, throttle, offroad) {
    if (!started || !eng) return;
    const t = now();
    const f = 55 + ratio * 190;
    eng.o1.frequency.setTargetAtTime(f, t, 0.06);
    eng.o2.frequency.setTargetAtTime(f * 0.5, t, 0.06);
    eng.lp.frequency.setTargetAtTime(420 + ratio * 2200 + (offroad ? -180 : 0), t, 0.08);
    const target = (0.18 + throttle * 0.22 + ratio * 0.1) * (muted ? 0 : 1);
    engineBus.gain.setTargetAtTime(target, t, 0.1);
  }

  // ---------- 打滑 / 风声 ----------
  function skidStart() {
    if (!started || skid) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 1.2;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(bp); bp.connect(g); g.connect(sfxBus); src.start();
    skid = { src, bp, g };
  }
  function skidUpdate(amount, offroad) {
    if (!skid) return;
    const t = now();
    skid.g.gain.setTargetAtTime(Math.min(0.22, amount * 0.22), t, 0.05);
    skid.bp.frequency.setTargetAtTime(offroad ? 900 : 1800, t, 0.05);
  }
  function skidStop() {
    if (!skid) return;
    const s = skid; skid = null;
    s.g.gain.setTargetAtTime(0, now(), 0.08);
    setTimeout(() => { try { s.src.stop(); } catch (e) {} }, 400);
  }

  // ---------- 一次性音效 ----------
  function blip(freq, dur, type = 'square', vol = 0.18, slideTo = null) {
    if (!started) return;
    const t = now();
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, filterType, f0, f1, vol, q = 1) {
    if (!started) return;
    const t = now();
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = filterType;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(60, f1), t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t); src.stop(t + dur + 0.02);
  }

  const api = {
    init,
    get ready() { return started; },
    get muted() { return muted; },
    get context() { return ctx; },
    attachAnalyser() {
      if (!ctx) return null;
      const a = ctx.createAnalyser();
      a.fftSize = 2048;
      master.connect(a);
      return a;
    },
    toggleMute() { muted = !muted; if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, now(), 0.05); return muted; },
    engineStart, engineStop, engineUpdate,
    skidStart, skidUpdate, skidStop,

    uiClick() { blip(880, 0.06, 'square', 0.12); },
    uiConfirm() { blip(660, 0.07, 'square', 0.14); blip2(990, 0.09, 'square', 0.12, 0.06); },
    countdownBeep(final) {
      if (final) blip(990, 0.45, 'sawtooth', 0.22);
      else blip(560, 0.16, 'square', 0.2);
    },
    lapChime() { blip(784, 0.16, 'triangle', 0.16); blip2(1175, 0.22, 'triangle', 0.14, 0.1); },
    pickup() { blip(660, 0.07, 'triangle', 0.18); blip2(990, 0.09, 'triangle', 0.16, 0.05); blip2(1320, 0.1, 'triangle', 0.13, 0.1); },
    rocket() { noiseBurst(0.35, 'bandpass', 500, 3200, 0.28, 2); blip(180, 0.25, 'sawtooth', 0.12, 60); },
    mineDrop() { blip(140, 0.18, 'square', 0.2, 60); noiseBurst(0.15, 'lowpass', 900, 200, 0.2); },
    explosion() {
      noiseBurst(0.7, 'lowpass', 2400, 120, 0.55, 0.8);
      blip(90, 0.5, 'sine', 0.4, 38);
      blip2(150, 0.25, 'square', 0.18, 50, 0.02);
    },
    damage() { noiseBurst(0.25, 'bandpass', 1800, 400, 0.3, 3); blip(240, 0.2, 'square', 0.16, 110); },
    finish(win) {
      const notes = win ? [523, 659, 784, 1047] : [523, 440, 349, 262];
      notes.forEach((f, i) => blip2(f, 0.32, 'sawtooth', 0.16, i * 0.16));
      if (win) blip2(1568, 0.6, 'triangle', 0.12, 0.7);
    },
  };

  // 延后触发的辅助（避免嵌套依赖 now() 的时序问题）
  function blip2(freq, dur, type, vol, delay, slideTo) {
    if (!started) return;
    const t = now() + (delay || 0);
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.03);
  }

  // ---------- 程序化音乐（synthwave 循环） ----------
  let musicTimer = null, step = 0;
  const BASS = [55, 55, 82.4, 73.4];
  const ARP = [220, 277.2, 329.6, 277.2, 220, 329.6, 415.3, 329.6];

  function musicStart() {
    if (!started || musicTimer) return;
    step = 0;
    const tick = () => {
      if (!ctx || muted) return;
      const t = now();
      // bass：每拍一个
      if (step % 4 === 0) {
        const f = BASS[(step / 4 | 0) % BASS.length];
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 420;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0, t);
        g.gain.linearRampToValueAtTime(0.22, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
        o.connect(flt); flt.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.4);
      }
      // arp：十六分音符
      const f2 = ARP[step % ARP.length];
      const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = f2;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0, t);
      g2.gain.linearRampToValueAtTime(0.055, t + 0.008);
      g2.gain.exponentialRampToValueAtTime(0.0005, t + 0.14);
      o2.connect(g2); g2.connect(musicBus); o2.start(t); o2.stop(t + 0.18);
      step++;
    };
    musicTimer = setInterval(tick, 150);
  }
  function musicStop() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }
  api.musicStart = musicStart;
  api.musicStop = musicStop;

  return api;
})();
