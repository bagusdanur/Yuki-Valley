// ui.js — HUD, hotbar, toko, misi, menu, toast, layar awal (semua DOM di sini)
// Semua ikon memakai Lucide (ikon vektor SVG, lisensi ISC) — tanpa emoji.
import { CROPS, PRICES } from './config.js';
import { icon } from './icons.js';
import { claimableCount } from './quests.js';

export const TOOLS = [
  { id: 'hoe', icon: 'shovel', label: 'Cangkul' },
  { id: 'seedJ', icon: 'wheat', label: 'Jagung', count: s => s.seeds.jagung },
  { id: 'seedB', icon: 'carrot', label: 'Bit', count: s => s.seeds.bit },
  { id: 'water', icon: 'droplets', label: 'Siram' },
  { id: 'fert', icon: 'flask-conical', label: 'Pupuk', count: s => s.fertilizer },
  { id: 'hand', icon: 'hand', label: 'Panen' }
];
export const BAG_ICONS = { jagung: 'wheat', bit: 'carrot', egg: 'egg', milk: 'milk' };
const $ = id => document.getElementById(id);

export class UI {
  constructor(cb) {
    this.cb = cb;
    this.shopOpen = false;
    this.questOpen = false;
    this.paused = false;
    this._toastTimer = null;
    // sematkan ikon statis dari atribut data-ic
    document.querySelectorAll('[data-ic]').forEach(el => {
      el.innerHTML = icon(el.dataset.ic, el.dataset.sz ? +el.dataset.sz : 18);
    });
    // hotbar
    const hb = $('hotbar');
    this.slotEls = {};
    for (const t of TOOLS) {
      const b = document.createElement('button');
      b.className = 'slot'; b.dataset.tool = t.id;
      b.innerHTML = `${icon(t.icon, 19)}<small>${t.label}</small><span class="cnt"></span>`;
      b.addEventListener('click', () => cb.onTool(t.id));
      hb.appendChild(b);
      this.slotEls[t.id] = b;
    }
    // tombol HUD
    $('btnSound').addEventListener('click', () => cb.onSound());
    $('btnFull').addEventListener('click', () => cb.onFullscreen());
    $('btnPause').addEventListener('click', () => cb.onPause());
    $('btnQuest').addEventListener('click', () => cb.onQuest());
    // toko & misi
    $('shopClose').addEventListener('click', () => this.closeShop());
    $('questClose').addEventListener('click', () => this.closeQuests());
    // menu jeda
    $('pmResume').addEventListener('click', () => cb.onPause());
    $('pmSave').addEventListener('click', () => cb.onSave());
    $('pmSound').addEventListener('click', () => cb.onSound());
    $('pmMenu').addEventListener('click', () => cb.onMenu());
    // menu utama: Main, Pengaturan, Kredit
    $('btnPlay').addEventListener('click', () => cb.onPlay());
    $('btnSettings').addEventListener('click', () => this.openSettings());
    $('btnCredit').addEventListener('click', () => this.openCredit());
    $('setClose').addEventListener('click', () => this.closeSettings());
    $('credClose').addEventListener('click', () => this.closeCredit());
    $('setSound').addEventListener('click', () => cb.onSound());
    $('setFull').addEventListener('click', () => cb.onFullscreen());
    $('setRestart').addEventListener('click', () => cb.onRestart());
    this.setSoundLabel(false);
  }
  showStart(hasSave) {
    $('menuHint').textContent = hasSave ? 'Ada simpanan — tombol Main melanjutkan ladangmu.' : '';
  }
  hideStart() { $('startScreen').classList.add('hidden'); }
  showStartScreen() { $('startScreen').classList.remove('hidden'); }
  showGameUI() { $('hud').classList.remove('hidden'); $('hotbar').classList.remove('hidden'); $('touch').classList.remove('hidden'); }
  hideGameUI() { $('hud').classList.add('hidden'); $('hotbar').classList.add('hidden'); $('touch').classList.add('hidden'); }
  openSettings() { $('settingsPanel').classList.remove('hidden'); }
  closeSettings() { $('settingsPanel').classList.add('hidden'); }
  openCredit() { $('creditPanel').classList.remove('hidden'); }
  closeCredit() { $('creditPanel').classList.add('hidden'); }
  setPaused(v) { this.paused = v; $('pauseMenu').classList.toggle('hidden', !v); }
  setSoundLabel(muted) {
    $('btnSound').innerHTML = icon(muted ? 'volume-x' : 'volume-2', 18);
    const label = icon(muted ? 'volume-x' : 'volume-2', 17) + `<span>Suara: ${muted ? 'Mati' : 'Nyala'}</span>`;
    $('pmSound').innerHTML = label;
    $('setSound').innerHTML = label;
  }
  toast(msg, iconName = 'info', ms = 2400) {
    const el = $('toast');
    el.replaceChildren();
    const ic = document.createElement('span');
    ic.className = 't-ic'; ic.innerHTML = icon(iconName, 17);
    const tx = document.createElement('span');
    tx.textContent = msg;
    el.append(ic, tx);
    el.style.opacity = 1;
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
    const rain = state.weather === 'hujan';
    $('hWeather').innerHTML = icon(rain ? 'cloud-rain' : 'sun', 16) + `<span>${rain ? 'Hujan' : 'Cerah'}</span>`;
    $('hCoin').textContent = state.coins;
    $('hEnergy').style.width = Math.max(0, state.energy) + '%';
    const parts = Object.keys(state.bag).filter(k => state.bag[k] > 0)
      .map(k => `<span class="bag-it">${icon(BAG_ICONS[k], 14)}×${state.bag[k]}</span>`);
    $('hBag').innerHTML = parts.length ? parts.join('') : 'kosong';
    const claim = claimableCount(state);
    $('questBadge').textContent = claim;
    $('questBadge').classList.toggle('hidden', claim === 0);
    for (const t of TOOLS) {
      const el = this.slotEls[t.id];
      el.classList.toggle('active', state.tool === t.id);
      el.querySelector('.cnt').textContent = t.count ? '×' + t.count(state) : '';
    }
  }
  renderShop(state) {
    const rows = [
      { item: 'jagung', icon: 'wheat', name: 'Benih Jagung', desc: 'Tanam • 3 hari • jual 55', price: CROPS.jagung.seedPrice, own: state.seeds.jagung },
      { item: 'bit', icon: 'carrot', name: 'Benih Bit', desc: 'Tanam • 2 hari • jual 28', price: CROPS.bit.seedPrice, own: state.seeds.bit },
      { item: 'fert', icon: 'flask-conical', name: 'Pupuk Ajaib', desc: 'Langsung tumbuh 1 tahap', price: PRICES.fertilizer, own: state.fertilizer }
    ];
    $('shopItems').innerHTML = '';
    for (const r of rows) {
      const div = document.createElement('div');
      div.className = 'shop-row';
      div.innerHTML = `<span class="ic">${icon(r.icon, 24)}</span><div class="inf"><b>${r.name}</b> <span style="color:#ffd94d;font-weight:700">×${r.own}</span><small>${r.desc}</small></div>`;
      const b = document.createElement('button');
      b.innerHTML = `Beli ${r.price} ${icon('coins', 14)}`;
      b.disabled = state.coins < r.price;
      b.addEventListener('click', () => this.cb.onBuy(r.item));
      div.appendChild(b);
      $('shopItems').appendChild(div);
    }
  }
  openShop(state) { this.shopOpen = true; this.renderShop(state); $('shop').classList.remove('hidden'); }
  closeShop() { this.shopOpen = false; $('shop').classList.add('hidden'); }
  renderQuests(state) {
    const box = $('questItems');
    box.innerHTML = '';
    for (const q of state.quests || []) {
      const div = document.createElement('div');
      div.className = 'quest-row' + (q.done ? ' done' : '');
      const pct = Math.min(100, Math.round(q.progress / q.target * 100));
      div.innerHTML = `<span class="ic">${icon(q.icon, 24)}</span>
        <div class="inf"><b>${q.text}</b>
          <div class="qbar"><div style="width:${pct}%"></div></div>
          <small>${q.progress}/${q.target} • Hadiah ${q.reward} koin</small>
        </div>`;
      const b = document.createElement('button');
      if (q.claimed) { b.innerHTML = icon('check', 15) + '<span>Diambil</span>'; b.disabled = true; }
      else if (q.done) { b.innerHTML = `Klaim ${q.reward}`; b.addEventListener('click', () => this.cb.onClaim(q.id)); }
      else { b.innerHTML = icon('target', 15); b.disabled = true; }
      div.appendChild(b);
      box.appendChild(div);
    }
    if (!(state.quests || []).length) box.innerHTML = '<p class="panel-note">Belum ada misi. Tidur dulu untuk hari baru.</p>';
  }
  openQuests(state) { this.questOpen = true; this.renderQuests(state); $('questPanel').classList.remove('hidden'); }
  closeQuests() { this.questOpen = false; $('questPanel').classList.add('hidden'); }
}
