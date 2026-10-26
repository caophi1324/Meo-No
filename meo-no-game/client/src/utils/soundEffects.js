// Web Audio API Procedural Sound Effects Engine (No external audio files needed!)

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = typeof localStorage !== 'undefined' && localStorage.getItem('meono_sound_muted') === 'true';
    this.activeVoices = new Set();
    this.collector = null;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('meono_sound_muted', this.muted);
    if (this.muted) this.activeVoices.forEach(voice => voice.cancel());
    return this.muted;
  }

  // Capture all voices produced by an existing procedural sound. Completion comes
  // from AudioScheduledSourceNode.onended, not an estimated sound duration.
  track(source, gain, extra = []) {
    let resolve;
    const done = new Promise(r => { resolve = r; });
    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      source.disconnect(); gain.disconnect(); extra.forEach(node => node.disconnect());
      this.activeVoices.delete(voice);
      resolve();
    };
    const voice = { done, cancel: () => { try { source.stop(); } catch {} finish(); } };
    source.onended = finish;
    this.activeVoices.add(voice);
    this.collector?.push(voice);
    return voice;
  }

  playTracked(name, ...args) {
    this.init();
    if (this.muted || this.ctx?.state !== 'running' || typeof this[name] !== 'function') {
      return { done: Promise.resolve(), cancel() {} };
    }
    const voices = [];
    this.collector = voices;
    try { this[name](...args); } finally { this.collector = null; }
    return { done: Promise.all(voices.map(v => v.done)), cancel: () => voices.forEach(v => v.cancel()) };
  }

  playWhoosh(delay = 0) {
    if (this.muted) return;
    this.init();
    if (this.ctx?.state !== 'running') return;
    const ctx = this.ctx, now = ctx.currentTime + delay, duration = .32;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.Q.value = .65;
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + .16);
    filter.frequency.exponentialRampToValueAtTime(350, now + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(.001, now);
    gain.gain.linearRampToValueAtTime(.11, now + .09);
    gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    this.track(noise, gain, [filter]);
    noise.start(now); noise.stop(now + duration);
  }

  playSlam() {
    this.tone({ type: 'triangle', from: 160, to: 48, duration: .09, volume: .16 });
  }

  playImplodingFlip() {
    this.tone({ type: 'sine', from: 180, to: 850, duration: .3, volume: .13 });
    this.tone({ type: 'triangle', from: 620, to: 80, duration: .25, volume: .1, delay: .16 });
  }

  playDraw() {
    if (this.muted) return;
    this.init();
    if (this.ctx?.state !== 'running') return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      this.track(osc, gain);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Ignore audio errors
    }
  }

  playCard() {
    if (this.muted) return;
    this.init();
    if (this.ctx?.state !== 'running') return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.1);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      this.track(osc, gain);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Ignore audio errors
    }
  }

  playExplosion(delay = 0) {
    if (this.muted) return;
    this.init();
    if (this.ctx?.state !== 'running') return;

    try {
      const now = this.ctx.currentTime + delay;
      // Low boom oscillator
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      this.track(osc, gain);
      osc.start(now);
      osc.stop(now + 0.85);
    } catch {
      // Ignore audio errors
    }
  }

  playDefuse() {
    if (this.muted) return;
    this.init();
    if (this.ctx?.state !== 'running') return;

    try {
      const now = this.ctx.currentTime;
      const notes = [440, 554, 659, 880];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        this.track(osc, gain);
        osc.start(t);
        osc.stop(t + 0.2);
      });
    } catch {
      // Ignore audio errors
    }
  }

  playNope() {
    if (this.muted) return;
    this.init();
    if (this.ctx?.state !== 'running') return;

    try {
      const now = this.ctx.currentTime;
      [220, 180].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.14;

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        this.track(osc, gain);
        osc.start(t);
        osc.stop(t + 0.12);
      });
    } catch {
      // Ignore audio errors
    }
  }

  playVictory() {
    if (this.muted) return;
    this.init();
    if (this.ctx?.state !== 'running') return;

    try {
      const now = this.ctx.currentTime;
      const fanfare = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      fanfare.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.12;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + (idx === fanfare.length - 1 ? 0.6 : 0.25));

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        this.track(osc, gain);
        osc.start(t);
        osc.stop(t + 0.7);
      });
    } catch {
      // Ignore audio errors
    }
  }

  tone({ type = 'sine', from = 440, to = from, duration = 0.15, volume = 0.15, delay = 0 }) {
    if (this.muted) return;
    this.init();
    if (this.ctx?.state !== 'running') return;

    try {
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(from, now);
      if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      this.track(osc, gain);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Ignore audio errors
    }
  }

  playAttack() {
    this.tone({ type: 'sawtooth', from: 240, to: 60, duration: 0.3, volume: 0.22 });
    this.tone({ type: 'square', from: 90, to: 40, duration: 0.35, volume: 0.12, delay: 0.04 });
  }

  playSkip() {
    this.tone({ type: 'triangle', from: 1000, to: 280, duration: 0.22, volume: 0.13 });
  }

  playFavor() {
    this.tone({ type: 'sine', from: 620, duration: 0.12, volume: 0.12 });
    this.tone({ type: 'sine', from: 880, duration: 0.16, volume: 0.12, delay: 0.08 });
  }

  playShuffle() {
    [420, 600, 360, 720, 520].forEach((f, i) =>
      this.tone({ type: 'triangle', from: f, duration: 0.09, volume: 0.1, delay: i * 0.05 })
    );
  }

  playFuture() {
    [880, 1100, 1320].forEach((f, i) =>
      this.tone({ type: 'sine', from: f, duration: 0.18, volume: 0.11, delay: i * 0.06 })
    );
  }

  playCat() {
    this.tone({ type: 'square', from: 520, to: 760, duration: 0.12, volume: 0.12 });
    this.tone({ type: 'square', from: 780, to: 520, duration: 0.14, volume: 0.1, delay: 0.1 });
  }

  playReverse() {
    this.tone({ type: 'triangle', from: 300, to: 900, duration: 0.18, volume: 0.12 });
    this.tone({ type: 'triangle', from: 900, to: 300, duration: 0.18, volume: 0.12, delay: 0.16 });
  }

  playFuel() {
    this.tone({ type: 'sawtooth', from: 120, to: 420, duration: 0.35, volume: 0.14 });
    this.tone({ type: 'sine', from: 520, to: 780, duration: 0.2, volume: 0.1, delay: 0.2 });
  }

  playDestroy() {
    this.tone({ type: 'sawtooth', from: 700, to: 80, duration: 0.3, volume: 0.2 });
    this.tone({ type: 'square', from: 180, to: 50, duration: 0.25, volume: 0.12, delay: 0.08 });
  }

  playBoomBuild() {
    [70, 95, 125].forEach((freq, i) =>
      this.tone({ type: 'sawtooth', from: freq, to: freq * 1.25, duration: 0.18, volume: 0.12, delay: i * 0.16 })
    );
  }

  playNopeSlam() {
    this.tone({ type: 'square', from: 190, to: 60, duration: 0.12, volume: 0.2 });
    this.tone({ type: 'triangle', from: 900, to: 320, duration: 0.18, volume: 0.12, delay: 0.04 });
  }

  playBeast() {
    this.tone({ type: 'sawtooth', from: 130, to: 75, duration: 0.26, volume: 0.16 });
    this.tone({ type: 'square', from: 300, to: 460, duration: 0.14, volume: 0.1, delay: 0.12 });
  }

  // Một chuỗi kết liễu duy nhất theo theme; không chồng explosion + victory.
  playFinisher(theme = 'default') {
    if (this.muted) return;
    this.init();
    if (this.ctx?.state !== 'running') return;

    if (theme === 'anime') {
      // Nhát chém, trống nhỏ rồi tiếng whoosh tắt dần.
      this.tone({ type: 'sawtooth', from: 1500, to: 180, duration: 0.26, volume: 0.22 });
      this.tone({ type: 'triangle', from: 110, to: 48, duration: 0.5, volume: 0.2, delay: 0.08 });
      this.tone({ type: 'sine', from: 880, to: 220, duration: 0.55, volume: 0.12, delay: 0.2 });
      [523.25, 659.25, 783.99].forEach((freq, index) =>
        this.tone({ type: 'triangle', from: freq, duration: 0.34, volume: 0.12, delay: 0.3 + index * 0.08 })
      );
      return;
    }

    if (theme === 'lol') {
      // Hum nền, tia hextech và cú impact.
      this.tone({ type: 'sine', from: 58, to: 64, duration: 1.1, volume: 0.16 });
      this.tone({ type: 'square', from: 240, to: 960, duration: 0.4, volume: 0.1, delay: 0.08 });
      this.tone({ type: 'sawtooth', from: 210, to: 38, duration: 0.55, volume: 0.24, delay: 0.32 });
      this.tone({ type: 'triangle', from: 1200, to: 300, duration: 0.5, volume: 0.1, delay: 0.4 });
      return;
    }

    this.playBoomBuild();
    this.playExplosion(0.45);
  }

  playClick() {
    if (this.muted) return;
    this.init();
    if (this.ctx?.state !== 'running') return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      this.track(osc, gain);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Ignore audio errors
    }
  }
}

export const soundEffects = new SoundEngine();
