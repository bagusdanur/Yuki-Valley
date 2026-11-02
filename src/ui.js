// ui.js — HUD, hotbar, toko, menu, toast, layar awal (semua DOM di sini)
import { CROPS, PRICES, BAG_EMOJI } from './config.js';

export const TOOLS = [
  { id: 'hoe', icon: '⛏️', label: 'Cangkul' },
  { id: 'seedJ', icon: '🌽', label: 'Benih', count: s => s.seeds.jagung },
  { id: 'seedB', icon: '🍠', label: 'Benih', count: s => s.seeds.bit },
  { id: 'water', icon: '💧', label: 'Siram' },
  { id: 'fert', icon: '🧪', label: 'Pupuk', count: s => s.fertilizer },
  { id: 'hand', icon: '✋', label: 'Panen' }
];
const $ = id => document.getElementById(id);

export class UI {
  constructor(cb) {
    this.cb = cb;
    this.shopOpen = false;
    this.paused = false;
    this._toastTimer = null;
    // hotbar
    const hb = $('hotbar');
    this.slotEls = {};
    for (const t of TOOLS) {
      const b = document.createElement('button');
      b.className = 'slot'; b.dataset.tool = t.id;
      b.innerHTML = `${t.icon}<small>${t.label}</small><span class="cnt"></span>`;
      b.addEventListener('click', () => cb.onTool(t.id));
      hb.appendChild(b);
      this.slotEls[t.id] = b;
    }
    // tombol HUD
    $('btnSound').addEventListener('click', () => cb.onSound());
    $('btnFull').addEventListener('click', () => cb.onFullscreen());
    $('btnPause').addEventListener('click', () => cb.onPause());
    // toko
    $('shopClose').addEventListener('click', () => this.closeShop());
    // menu jeda
    $('pmResume').addEventListener('click', () => cb.onPause());
    $('pmSave').addEventListener('click', () => cb.onSave());
    $('pmSound').addEventListener('click', () => cb.onSound());
    $('pmRestart').addEventListener('click', () => cb.onRestart());
    // layar awal
    $('btnPlay').addEventListener('click', () => cb.onNewGame());
    $('btnContinue').addEventListener('click', () => cb.onContinue());
  }
  showStart(hasSave) { $('btnContinue').classList.toggle('hidden', !hasSave); }
  hideStart() { $('startScreen').classList.add('hidden'); }
  showGameUI() { $('hud').classList.remove('hidden'); $('hotbar').classList.remove('hidden'); $('touch').classList.remove('hidden'); }
  setPaused(v) { this.paused = v; $('pauseMenu').classList.toggle('hidden', !v); }
  setSoundLabel(muted) {
    $('btnSound').textContent = muted ? '🔇' : '🔊';
    $('pmSound').textContent = muted ? '🔇 Suara: Mati' : '🔊 Suara: Nyala';
  }
  toast(msg, ms = 2400) {
    const el = $('toast');
    el.textContent = msg; el.style.opacity = 1;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.style.opacity = 0, ms);
  }
  fade(text) { const f = $('fade'); $('fadeText').textContent = text; f.style.opacity = 1; }
  unfade() { $('fade').style.opacity = 0; }
  clockText(min) {
    const h = Math.floor(min / 60), m = Math.floor(min % 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }
  refresh(state) {
    $('hDay').textContent = state.day;
    $('hClock').textContent = this.clockText(state.timeMin);
    $('hWeather').textContent = state.weather === 'hujan' ? '🌧️ Hujan' : '☀️ Cerah';
    $('hCoin').textContent = state.coins;
    $('hEnergy').style.width = Math.max(0, state.energy) + '%';
    const parts = Object.keys(state.bag).filter(k => state.bag[k] > 0).map(k => BAG_EMOJI[k] + '×' + state.bag[k]);
    $('hBag').textContent = parts.length ? parts.join(' ') : 'kosong';
    for (const t of TOOLS) {
      const el = this.slotEls[t.id];
      el.classList.toggle('active', state.tool === t.id);
      el.querySelector('.cnt').textContent = t.count ? '×' + t.count(state) : '';
    }
  }
  renderShop(state) {
    const rows = [
      { item: 'jagung', icon: '🌽', name: 'Benih Jagung', desc: 'Tanam • 3 hari • jual 55', price: CROPS.jagung.seedPrice, own: state.seeds.jagung },
      { item: 'bit', icon: '🍠', name: 'Benih Bit', desc: 'Tanam • 2 hari • jual 28', price: CROPS.bit.seedPrice, own: state.seeds.bit },
      { item: 'fert', icon: '🧪', name: 'Pupuk Ajaib', desc: 'Langsung tumbuh 1 tahap', price: PRICES.fertilizer, own: state.fertilizer }
    ];
    $('shopItems').innerHTML = '';
    for (const r of rows) {
      const div = document.createElement('div');
      div.className = 'shop-row';
      div.innerHTML = `<span class="ic">${r.icon}</span><div class="inf"><b>${r.name}</b> <span style="color:#ffd94d;font-weight:700">×${r.own}</span><small>${r.desc}</small></div>`;
      const b = document.createElement('button');
      b.textContent = 'Beli ' + r.price + ' 🪙';
      b.disabled = state.coins < r.price;
      b.addEventListener('click', () => this.cb.onBuy(r.item));
      div.appendChild(b);
      $('shopItems').appendChild(div);
    }
  }
  openShop(state) { this.shopOpen = true; this.renderShop(state); $('shop').classList.remove('hidden'); }
  closeShop() { this.shopOpen = false; $('shop').classList.add('hidden'); }
}
