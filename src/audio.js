// audio.js — efek suara & musik latar prosedural (WebAudio, tanpa file)
export class AudioMan {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicOn = false;
    this._musicTimer = null;
    this._note = 0;
  }
  _ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* tanpa audio */ }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  /** Bunyi pendek: f1 -> f2 Hz selama dur detik */
  blip(f1, f2, dur = 0.12, vol = 0.05) {
    if (this.muted) return;
    const ac = this._ensure(); if (!ac) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + dur);
  }
  sfx(name) {
    const map = {
      hoe: [160, 90, .12], plant: [500, 720, .09], water: [300, 540, .15],
      harvest: [660, 990, .13], sell: [880, 1320, .18], buy: [760, 1020, .1],
      pop: [520, 640, .07], sleep: [392, 196, .35], error: [200, 140, .12],
      milk: [420, 580, .12], win: [784, 1175, .3]
    };
    const m = map[name] || map.pop;
    this.blip(m[0], m[1], m[2]);
  }
  /** Musik latar: melodi pentatonik pelan, diulang */
  startMusic() {
    if (this.musicOn) return;
    const ac = this._ensure(); if (!ac) return;
    this.musicOn = true;
    const scale = [262, 294, 330, 392, 440, 523, 440, 392, 330, 294];
    const step = () => {
      if (!this.musicOn) return;
      if (!this.muted) {
        const f = scale[this._note % scale.length];
        this.blip(f, f, 0.38, 0.016);
        if (this._note % 2 === 0) this.blip(f / 2, f / 2, 0.5, 0.010);
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
