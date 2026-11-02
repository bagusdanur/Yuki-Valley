// audio.js — efek suara dari file asli (Kenney CC0, folder sounds/) + musik WebAudio.
// Bila file suara belum ada/gagal dimuat, otomatis jatuh ke bunyi synth cadangan
// supaya game tidak pernah error hanya karena audio.
const FILES = {
  click: 'sounds/click.ogg', select: 'sounds/select.ogg', error: 'sounds/error.ogg',
  hoe: 'sounds/hoe.ogg', plant: 'sounds/plant.ogg', water: 'sounds/water.ogg',
  harvest: 'sounds/harvest.ogg', sell: 'sounds/coin.ogg', buy: 'sounds/buy.ogg',
  pop: 'sounds/pop.ogg', milk: 'sounds/milk.ogg', sleep: 'sounds/door.ogg',
  confirm: 'sounds/confirm.ogg', quest: 'sounds/quest.ogg', win: 'sounds/win.ogg'
};
// cadangan synth [f1, f2, dur] bila file gagal
const FALLBACK = {
  hoe: [160, 90, .12], plant: [500, 720, .09], water: [300, 540, .15],
  harvest: [660, 990, .13], sell: [880, 1320, .18], buy: [760, 1020, .1],
  pop: [520, 640, .07], sleep: [392, 196, .35], error: [200, 140, .12],
  milk: [420, 580, .12], win: [784, 1175, .3], click: [700, 700, .05],
  select: [600, 800, .06], confirm: [880, 1180, .12], quest: [660, 990, .25]
};

export class AudioMan {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicOn = false;
    this._musicTimer = null;
    this._note = 0;
    this._els = {};
    for (const [name, src] of Object.entries(FILES)) {
      const a = new Audio();
      a.preload = 'auto';
      a.src = src;
      a.addEventListener('error', () => { a.dataset.bad = '1'; });
      this._els[name] = a;
    }
  }
  _ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* tanpa audio */ }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  /** Bunyi synth pendek (cadangan + musik) */
  blip(f1, f2, dur = 0.12, vol = 0.05, type = 'square') {
    if (this.muted) return;
    const ac = this._ensure(); if (!ac) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + dur);
  }
  sfx(name) {
    if (this.muted) return;
    this._ensure();
    const el = this._els[name];
    if (el && !el.dataset.bad) {
      try {
        const c = el.cloneNode();
        c.volume = 0.9;
        const p = c.play();
        if (p && p.catch) p.catch(() => this._fallback(name));
        return;
      } catch { /* jatuh ke cadangan */ }
    }
    this._fallback(name);
  }
  _fallback(name) {
    const m = FALLBACK[name] || FALLBACK.pop;
    this.blip(m[0], m[1], m[2], 0.06);
  }
  /** Musik latar: melodi pentatonik + bas lembut, cukup keras di speaker HP */
  startMusic() {
    if (this.musicOn) return;
    const ac = this._ensure(); if (!ac) return;
    this.musicOn = true;
    const scale = [262, 294, 330, 392, 440, 523, 440, 392, 330, 294];
    const step = () => {
      if (!this.musicOn) return;
      if (!this.muted) {
        const f = scale[this._note % scale.length];
        this.blip(f, f, 0.38, 0.045, 'triangle');
        if (this._note % 2 === 0) this.blip(f / 2, f / 2, 0.5, 0.028, 'sine');
        if (this._note % 8 === 4) this.blip(f * 1.5, f * 1.5, 0.3, 0.02, 'triangle');
      }
      this._note++;
      this._musicTimer = setTimeout(step, 430);
    };
    step();
  }
  stopMusic() { this.musicOn = false; clearTimeout(this._musicTimer); }
  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}
