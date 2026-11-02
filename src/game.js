// game.js — orkestrasi: loop, waktu, aksi, ekonomi, misi, tidur, simpan (tanpa emoji — ikon Lucide)
import {
  TS, DOOR, CHEST, SHOP, CROPS, PRICES, ENERGY_COSTS, START,
  DAY_START_MIN, DAY_END_MIN, DAY_REAL_SECONDS, WIN_EARNED
} from './config.js';
import { createState, saveGame, loadGame, clearSave, hasSave } from './state.js';
import { inRect, isField } from './world.js';
import { cellAt, isRipe, startNewDay } from './farming.js';
import { createPlayer, createAnimals, updatePlayer, updateAnimals, frontTile, animalAtTile, createNpc, updateNpc, npcTile } from './entities.js';

const NPC_LINES = [
  'Haii~ Mau berkebun apa hari ini? Aku temenin yaa.',
  'Jagungnya jangan lupa disiram. Nanti dia ngambek, kayak aku kalau dicuekin~',
  'Kamu kerja keras banget sih... jadi makin sayang deh.',
  'Bit merah itu favoritku! Panen yang banyak yaa.',
  'Kalau capek, tidur aja di rumah. Besok aku masih di sini kok.',
  'Sapinya lucu ya? Tapi kamu lebih lucu sih~',
  'Target 1.000 koin, kita pasti bisa. Semangat yaa!'
];
import { generateQuests, applyProgress, claimReward } from './quests.js';
import { Renderer } from './render.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { AudioMan } from './audio.js';

const wait = ms => new Promise(r => setTimeout(r, ms));

export class Game {
  constructor(canvas, assets) {
    this.audio = new AudioMan();
    this.renderer = new Renderer(canvas, assets);
    this.state = createState();
    this.player = createPlayer();
    this.animals = createAnimals();
    this.npc = createNpc();
    this._npcLine = 0;
    this.started = false;
    this.paused = false;
    this.sleeping = false;
    this._autosave = 0;
    this._hudT = 0;
    this.ui = new UI({
      onTool: t => this.setTool(t),
      onBuy: item => this.buy(item),
      onPause: () => this.handlePauseKey(),
      onSound: () => this.toggleSound(),
      onFullscreen: () => this.tryFullscreen(),
      onSave: () => { if (saveGame(this.state)) this.ui.toast('Permainan tersimpan', 'save'); },
      onRestart: () => this.restart(),
      onPlay: () => this.play(),
      onMenu: () => this.backToMenu(),
      onQuest: () => { this.audio.sfx('click'); this.ui.openQuests(this.state); },
      onClaim: id => this.claimQuest(id)
    });
    this.input = new Input({
      onAction: () => this.doAction(),
      onToolKey: t => this.setTool(t),
      onPause: () => this.handlePauseKey()
    });
    this.ui.showStart(hasSave());
    this._last = 0;
    requestAnimationFrame(t => this.loop(t));
  }

  ensureQuests() {
    const s = this.state;
    if (s.questDay !== s.day || !(s.quests && s.quests.length)) {
      s.quests = generateQuests(s.day);
      s.questDay = s.day;
    }
  }
  progress(type, amount = 1, crop = null) {
    const finished = applyProgress(this.state.quests, type, amount, crop);
    for (const q of finished) {
      this.audio.sfx('quest');
      this.ui.toast(`Misi selesai: ${q.text}. Klaim +${q.reward} koin di panel Misi`, 'scroll-text', 3600);
    }
    if (finished.length) this.ui.refresh(this.state);
  }
  claimQuest(id) {
    const r = claimReward(this.state, id);
    if (r > 0) {
      this.audio.sfx('confirm');
      this.ui.toast(`Hadiah misi diterima: +${r} koin`, 'coins');
    }
    this.ui.renderQuests(this.state);
    this.afterChange();
  }

  play() { this.start(hasSave() ? 'continue' : 'new'); }
  backToMenu() {
    saveGame(this.state);
    this.started = false;
    this.paused = false;
    this.ui.setPaused(false);
    this.ui.closeShop();
    this.ui.closeQuests();
    this.ui.hideGameUI();
    this.audio.stopMusic();
    this.ui.showStart(hasSave());
    this.ui.showStartScreen();
  }

  start(mode) {
    if (mode === 'continue') this.state = loadGame() || createState();
    else { clearSave(); this.state = createState(); }
    this.ensureQuests();
    this.player = createPlayer();
    this.animals = createAnimals();
    this.npc = createNpc();
    this.started = true; this.paused = false;
    this.ui.hideStart(); this.ui.showGameUI(); this.ui.setPaused(false);
    this.tryFullscreen();
    this.audio.startMusic();
    this.ui.refresh(this.state);
    this.ui.toast(mode === 'continue' ? 'Selamat datang kembali, petani!' : 'Selamat datang di Yuki Valley! Cangkul tanah cokelat untuk mulai', 'sprout', 3600);
  }
  restart() {
    if (!confirm('Hapus simpanan dan mulai game baru dari awal?')) return;
    clearSave();
    this.state = createState();
    this.ensureQuests();
    this.player = createPlayer(); this.animals = createAnimals();
    this.paused = false; this.ui.setPaused(false);
    this.ui.refresh(this.state);
    this.ui.toast('Game baru dimulai', 'sprout');
  }
  tryFullscreen() {
    try {
      const el = document.getElementById('game-container');
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el.requestFullscreen) {
        el.requestFullscreen().then(() => {
          if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(() => {});
        }).catch(() => {});
      }
    } catch { /* abaikan — tidak semua browser mendukung */ }
  }
  toggleSound() { this.ui.setSoundLabel(this.audio.toggleMute()); }
  handlePauseKey() {
    if (!this.started || this.sleeping) return;
    if (this.ui.shopOpen) { this.ui.closeShop(); return; }
    if (this.ui.questOpen) { this.ui.closeQuests(); return; }
    this.paused = !this.paused;
    this.ui.setPaused(this.paused);
  }
  setTool(t) { if (this.started) { this.state.tool = t; this.audio.sfx('select'); this.ui.refresh(this.state); } }

  spendEnergy(kind) {
    const cost = ENERGY_COSTS[kind] || 0;
    if (this.state.energy < cost) {
      this.audio.sfx('error');
      this.ui.toast('Energi habis! Tidur di rumah untuk pulih', 'zap');
      return false;
    }
    this.state.energy -= cost;
    return true;
  }

  doAction() {
    const s = this.state;
    if (!this.started || this.paused || this.sleeping || this.ui.shopOpen || this.ui.questOpen) return;
    const { tx, ty } = frontTile(this.player);
    const cx = tx * TS + TS / 2, cy = ty * TS + TS / 2;

    if (tx === DOOR.x && ty === DOOR.y) return void this.sleep(false);
    if (inRect(tx, ty, SHOP)) { this.audio.sfx('pop'); this.ui.openShop(s); return; }
    if (tx === CHEST.x && ty === CHEST.y) return void this.sellAll();
    const nt = npcTile(this.npc);
    if (tx === nt.tx && ty === nt.ty) return void this.talkToNpc();

    const animal = animalAtTile(this.animals, tx, ty);
    if (animal && animal.kind === 'cow') {
      if (s.tool !== 'hand') return this.ui.toast('Perah sapi pakai alat Panen (ikon tangan)', 'hand');
      if (s.cowMilked) return this.ui.toast('Sapinya sudah diperah hari ini. Besok lagi ya', 'milk');
      if (!this.spendEnergy('milk')) return;
      s.cowMilked = true; s.bag.milk++;
      this.audio.sfx('milk');
      this.renderer.spawn(animal.x + TS / 2, animal.y + 10, 'splash', 8);
      this.progress('milk', 1);
      this.ui.toast('Dapat susu segar! Masuk tas', 'milk');
      return this.afterChange();
    }
    if (animal && animal.kind === 'chick') return this.ui.toast('"Cit cit!" — ayamnya santai saja', 'info');

    const ei = s.eggs.findIndex(e => e.tx === tx && e.ty === ty);
    if (ei >= 0) {
      s.eggs.splice(ei, 1); s.bag.egg++;
      this.audio.sfx('pop');
      this.progress('egg', 1);
      this.ui.toast('Mengambil telur. Masuk tas', 'egg');
      return this.afterChange();
    }

    if (!isField(tx, ty)) return this.ui.toast('Di sini tidak bisa. Ke petak tanah cokelat ya', 'info');
    const c = cellAt(s, tx, ty);
    if (s.tool === 'hoe') {
      if (c.crop) return this.ui.toast('Ada tanamannya, jangan dicangkul', 'shovel');
      if (c.tilled) return this.ui.toast('Tanah ini sudah dicangkul', 'shovel');
      if (!this.spendEnergy('hoe')) return;
      c.tilled = true; this.audio.sfx('hoe'); this.renderer.spawn(cx, cy, 'dirt', 12);
      this.ui.toast('Tanah dicangkul', 'shovel');
    } else if (s.tool === 'seedJ' || s.tool === 'seedB') {
      const crop = s.tool === 'seedJ' ? 'jagung' : 'bit';
      if (!c.tilled) return this.ui.toast('Cangkul dulu tanahnya', 'shovel');
      if (c.crop) return this.ui.toast('Sudah ada tanaman di sini', 'sprout');
      if (s.seeds[crop] <= 0) return this.ui.toast('Benih ' + CROPS[crop].name + ' habis — beli di stand Toko', 'store');
      if (!this.spendEnergy('plant')) return;
      s.seeds[crop]--; c.crop = crop; c.grow = 0; c.watered = false;
      this.audio.sfx('plant'); this.renderer.spawn(cx, cy, 'leaf', 8);
      this.progress('plant', 1);
      this.ui.toast('Menanam ' + CROPS[crop].name, 'sprout');
    } else if (s.tool === 'water') {
      if (!c.crop) return this.ui.toast('Tidak ada tanaman untuk disiram', 'droplets');
      if (c.watered) return this.ui.toast('Sudah disiram hari ini', 'droplets');
      if (!this.spendEnergy('water')) return;
      c.watered = true; this.audio.sfx('water'); this.renderer.spawn(cx, cy, 'water', 12);
      this.progress('water', 1);
      this.ui.toast('Disiram. Besok tumbuh!', 'droplets');
    } else if (s.tool === 'fert') {
      if (!c.crop) return this.ui.toast('Pupuk dipakai ke tanaman ya', 'flask-conical');
      if (isRipe(c)) return this.ui.toast('Sudah matang, tinggal panen', 'sparkles');
      if (s.fertilizer <= 0) return this.ui.toast('Pupuk habis — beli di stand Toko (15 koin)', 'store');
      if (!this.spendEnergy('fertilize')) return;
      s.fertilizer--; c.grow = Math.min(c.grow + 1, 3);
      this.audio.sfx('plant'); this.renderer.spawn(cx, cy, 'leaf', 12);
      this.progress('fert', 1);
      this.ui.toast('Pupuk ajaib! Langsung tumbuh 1 tahap', 'flask-conical');
    } else if (s.tool === 'hand') {
      if (!c.crop) return this.ui.toast('Tidak ada yang bisa dipanen', 'hand');
      if (!isRipe(c)) return this.ui.toast('Belum matang — tumbuh ' + c.grow + '/' + CROPS[c.crop].days + ' hari. Siram lalu tidur', 'moon');
      if (!this.spendEnergy('harvest')) return;
      const nm = CROPS[c.crop].name;
      s.bag[c.crop]++; s.stats.harvested++;
      this.progress('harvest', 1, c.crop);
      c.crop = null; c.grow = 0; c.watered = false;
      this.audio.sfx('harvest'); this.renderer.spawn(cx, cy, 'harvest', 12);
      this.ui.toast(nm + ' dipanen! Masuk tas', 'backpack');
    }
    this.afterChange();
  }
  talkToNpc() {
    const p = this.player, n = this.npc;
    // Yuki berhenti melangkah dan menoleh ke pemain
    n.tx = n.x; n.ty = n.y;
    n.dir = Math.abs(p.x - n.x) > Math.abs(p.y - n.y) ? (p.x < n.x ? 'left' : 'right') : (p.y < n.y ? 'up' : 'down');
    this.audio.sfx('pop');
    this.renderer.spawn(n.x + TS / 2, n.y - 2, 'heart', 7);
    this.ui.toast('Yuki: "' + NPC_LINES[this._npcLine++ % NPC_LINES.length] + '"', 'heart', 3600);
  }
  afterChange() { saveGame(this.state); this.ui.refresh(this.state); }

  sellAll() {
    const s = this.state;
    const n = s.bag.jagung + s.bag.bit + s.bag.egg + s.bag.milk;
    if (!n) return this.ui.toast('Tas kosong — panen / perah / pungut telur dulu', 'backpack');
    const gain = s.bag.jagung * CROPS.jagung.sellPrice + s.bag.bit * CROPS.bit.sellPrice +
                 s.bag.egg * PRICES.egg + s.bag.milk * PRICES.milk;
    s.coins += gain; s.earned += gain; s.stats.soldItems += n; s.stats.earnedTotal += gain;
    s.bag = { jagung: 0, bit: 0, egg: 0, milk: 0 };
    this.audio.sfx('sell');
    this.renderer.spawn(CHEST.x * TS + TS / 2, CHEST.y * TS, 'coin', 14);
    this.progress('sell', n);
    this.progress('earn', gain);
    this.ui.toast('Terjual semua! +' + gain + ' koin (total perolehan: ' + s.earned + ')', 'coins');
    if (!s.won && s.earned >= WIN_EARNED) {
      s.won = true;
      setTimeout(() => { this.audio.sfx('win'); this.ui.toast('HEBAT! Target ' + WIN_EARNED + ' koin tercapai — kamu petani sukses!', 'trophy', 5200); }, 1700);
    }
    this.afterChange();
  }

  buy(item) {
    const s = this.state;
    const price = item === 'fert' ? PRICES.fertilizer : CROPS[item].seedPrice;
    if (s.coins < price) { this.audio.sfx('error'); return this.ui.toast('Koin tidak cukup', 'coins'); }
    s.coins -= price;
    if (item === 'fert') s.fertilizer++; else s.seeds[item]++;
    this.audio.sfx('buy');
    this.ui.toast('Berhasil dibeli!', 'backpack');
    this.ui.renderShop(s);
    this.afterChange();
  }

  async sleep(forced) {
    if (this.sleeping) return;
    this.sleeping = true;
    this.audio.sfx('sleep');
    this.ui.fade(forced ? 'Sudah malam… kamu tertidur pulas' : 'Tidur nyenyak…');
    await wait(1100);
    const res = startNewDay(this.state);
    this.state.timeMin = DAY_START_MIN;
    this.state.energy = START.energy;
    this.ensureQuests();
    this.player.x = DOOR.x * TS; this.player.y = (DOOR.y + 1) * TS; this.player.dir = 'down';
    this.ui.fade('Hari ke-' + this.state.day + (res.weather === 'hujan' ? ' — Hujan' : ' — Cerah'));
    await wait(900);
    this.ui.unfade();
    this.sleeping = false;
    const notes = [];
    if (res.grown) notes.push(res.grown + ' tanaman tumbuh');
    if (res.weather === 'hujan') notes.push('hujan menyiram semua tanaman');
    if (res.laid) notes.push('ada ' + res.laid + ' telur baru di kandang');
    notes.push('3 misi baru hari ini');
    this.ui.toast('Selamat pagi! Hari ke-' + this.state.day + ' — ' + notes.join(' • '), 'sun', 3400);
    this.afterChange();
  }

  loop(t) {
    const dt = Math.min((t - (this._last || t)) / 1000 || 0, 0.05);
    this._last = t;
    const active = this.started && !this.paused && !this.sleeping && !this.ui.shopOpen && !this.ui.questOpen;
    if (active) {
      this.state.timeMin += dt * (DAY_END_MIN - DAY_START_MIN) / DAY_REAL_SECONDS;
      if (this.state.timeMin >= DAY_END_MIN) { this.state.timeMin = DAY_END_MIN; void this.sleep(true); }
      const ox = this.player.x, oy = this.player.y;
      updatePlayer(this.player, this.input.axis(), dt);
      // pemain tidak bisa menembus Yuki
      const n = this.npc;
      if (this.player.x + 13 < n.x + TS - 13 && this.player.x + TS - 13 > n.x + 13 &&
          this.player.y + TS - 16 < n.y + TS - 2 && this.player.y + TS - 2 > n.y + TS - 16) {
        this.player.x = ox; this.player.y = oy;
      }
      updateAnimals(this.animals, dt);
      updateNpc(this.npc, dt);
      this._autosave += dt;
      if (this._autosave > 20) { this._autosave = 0; saveGame(this.state); }
    }
    this._hudT += dt;
    if (this._hudT > 0.15) { this._hudT = 0; if (this.started) this.ui.refresh(this.state); }
    const front = this.started ? frontTile(this.player) : null;
    this.renderer.draw(this.state, this.player, this.animals, front, t, dt, this.npc);
    requestAnimationFrame(tt => this.loop(tt));
  }
}
