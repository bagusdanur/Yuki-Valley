// render.js — kamera, gambar dunia & entitas, partikel, cuaca, pencahayaan
import { TS, WORLD_W, WORLD_H, HOUSE, DOOR, CHEST, SHOP, POND, FIELD, PEN, ATLAS, DECOR } from './config.js';
import { inRect, isPenFence, isPath } from './world.js';
import { stageOf, isRipe } from './farming.js';
import { DIRROW } from './entities.js';

function hash(x, y) { let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0); }

export class Renderer {
  constructor(canvas, assets) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.img = assets;
    this.cam = { x: 0, y: 0 };
    this.particles = [];
    this.resize();
  }
  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.vw = this.cv.clientWidth; this.vh = this.cv.clientHeight;
    this.cv.width = Math.round(this.vw * dpr);
    this.cv.height = Math.round(this.vh * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }
  atlas(cell, dx, dy, dw = TS, dh = TS) {
    this.ctx.drawImage(this.img.atlas, cell[0] * 16, cell[1] * 16, 16, 16, dx, dy, dw, dh);
  }
  spawn(x, y, kind, n = 10) {
    const presets = {
      dirt: ['#8a5a2b', '#a4713a', '#6e4525'], water: ['#6ec6ff', '#a8dcff', '#4aa3e0'],
      harvest: ['#ffd94d', '#9be15d', '#fff3a0'], coin: ['#ffd94d', '#ffb03a'],
      leaf: ['#7ec850', '#5da23e'], splash: ['#bfe8ff', '#8fd0ff']
    };
    const colors = presets[kind] || presets.leaf;
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + (Math.random() - .5) * 30, y: y + (Math.random() - .5) * 16,
        vx: (Math.random() - .5) * 90, vy: -40 - Math.random() * 90,
        life: .5 + Math.random() * .45, t: 0,
        color: colors[i % colors.length], size: 3 + Math.random() * 4
      });
    }
  }
  draw(state, player, animals, front, now, dt) {
    const { ctx, vw, vh } = this;
    // kamera mengikuti pemain, dibatasi tepi dunia
    const tx = player.x + TS / 2 - vw / 2, ty = player.y + TS / 2 - vh / 2;
    this.cam.x = Math.max(0, Math.min(tx, Math.max(0, WORLD_W * TS - vw)));
    this.cam.y = Math.max(0, Math.min(ty, Math.max(0, WORLD_H * TS - vh)));
    if (WORLD_W * TS < vw) this.cam.x = (WORLD_W * TS - vw) / 2;
    if (WORLD_H * TS < vh) this.cam.y = (WORLD_H * TS - vh) / 2;
    const cam = this.cam;
    ctx.fillStyle = '#79b657'; ctx.fillRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

    const x0 = Math.max(0, Math.floor(cam.x / TS)), x1 = Math.min(WORLD_W - 1, Math.ceil((cam.x + vw) / TS));
    const y0 = Math.max(0, Math.floor(cam.y / TS)), y1 = Math.min(WORLD_H - 1, Math.ceil((cam.y + vh) / TS));

    // ---- lapisan dasar: rumput, jalan, ladang, kolam ----
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      this.atlas(ATLAS.grass[hash(x, y) % 4], x * TS, y * TS);
      if (isPath(x, y)) { ctx.fillStyle = 'rgba(214,183,120,0.5)'; ctx.fillRect(x * TS, y * TS, TS, TS); }
    }
    for (let y = FIELD.y; y < FIELD.y + FIELD.h; y++) for (let x = FIELD.x; x < FIELD.x + FIELD.w; x++) {
      this.atlas(ATLAS.dirt[hash(x, y) % 3], x * TS, y * TS);
      const c = state.field[x + ',' + y];
      if (!c || !c.tilled) { ctx.fillStyle = 'rgba(255,246,200,0.28)'; ctx.fillRect(x * TS, y * TS, TS, TS); }
      if (c && c.crop && c.watered) { ctx.fillStyle = 'rgba(70,40,15,0.30)'; ctx.fillRect(x * TS, y * TS, TS, TS); }
    }
    ctx.strokeStyle = 'rgba(90,55,25,0.55)'; ctx.lineWidth = 3;
    ctx.strokeRect(FIELD.x * TS + 1, FIELD.y * TS + 1, FIELD.w * TS - 2, FIELD.h * TS - 2);
    const wf = Math.floor(now / 900) % 4;
    for (let y = POND.y; y < POND.y + POND.h; y++) for (let x = POND.x; x < POND.x + POND.w; x++)
      this.atlas(ATLAS.water[(wf + x + y) % 4], x * TS, y * TS);
    // telur di tanah kandang
    for (const e of state.eggs) ctx.drawImage(this.img.egg, 0, 0, 16, 16, e.tx * TS + 10, e.ty * TS + 14, 26, 26);

    // ---- objek & entitas urut kedalaman ----
    const draws = [];
    draws.push({ y: (HOUSE.y + HOUSE.h) * TS, fn: () => this.drawHouse() });
    draws.push({ y: (SHOP.y + SHOP.h) * TS, fn: () => this.drawShop() });
    // Sprite peti sebenarnya hanya 16x20 di (112,76) pada atlas — menggambar
    // kotak 32x32 dari (96,64) membuat peti tampil kecil & bergeser.
    draws.push({ y: (CHEST.y + 1) * TS, fn: () => this.ctx.drawImage(this.img.atlas, 112, 76, 16, 20, CHEST.x * TS + 10, CHEST.y * TS + 6, 28, 35) });
    for (let y = PEN.y; y < PEN.y + PEN.h; y++) for (let x = PEN.x; x < PEN.x + PEN.w; x++) {
      if (!isPenFence(x, y)) continue;
      const cell = (x === PEN.x || x === PEN.x + PEN.w - 1) && hash(x, y) % 2 ? ATLAS.fencePost : ATLAS.fenceH;
      if (cell === ATLAS.fencePost) {
        // Tiang pagar sprite-nya cuma 6x11 di (85,65) — gambar rapat menapak
        // tanah, bukan sel penuh 16x16 (tiang terlihat melayang/terpotong).
        draws.push({ y: (y + 1) * TS, fn: ((cx, cy) => () => this.ctx.drawImage(this.img.atlas, 85, 65, 6, 11, cx * TS + 15, cy * TS + 15, 18, 33))(x, y) });
      } else {
        draws.push({ y: (y + 1) * TS, fn: ((cx, cy, cl) => () => this.atlas(cl, cx * TS, cy * TS))(x, y, cell) });
      }
    }
    // dekorasi
    for (const d of DECOR) draws.push({ y: (d[2] + 1) * TS, fn: ((dd) => () => this.atlas(ATLAS[dd[0]], dd[1] * TS, dd[2] * TS))(d) });
    // tanaman
    for (const k in state.field) {
      const c = state.field[k]; if (!c.crop) continue;
      const [tx2, ty2] = k.split(',').map(Number), st = stageOf(c);
      const fn = () => {
        ctx.drawImage(this.img.plants, (1 + st) * 16, (c.crop === 'jagung' ? 0 : 1) * 16, 16, 16, tx2 * TS + 4, ty2 * TS + 2, 40, 40);
        if (isRipe(c)) { // bintang emas "matang" digambar vektor (tanpa emoji)
          const sx = tx2 * TS + 37, sy = ty2 * TS + 9;
          ctx.fillStyle = '#ffd94d'; ctx.strokeStyle = '#b57f17'; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx, sy - 7); ctx.quadraticCurveTo(sx + 1.8, sy - 1.8, sx + 7, sy);
          ctx.quadraticCurveTo(sx + 1.8, sy + 1.8, sx, sy + 7); ctx.quadraticCurveTo(sx - 1.8, sy + 1.8, sx - 7, sy);
          ctx.quadraticCurveTo(sx - 1.8, sy - 1.8, sx, sy - 7); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      };
      if (st >= 2) draws.push({ y: (ty2 + 1) * TS, fn }); else fn();
    }
    for (const a of animals) draws.push({ y: a.y + TS, fn: () => this.drawAnimal(a, now) });
    draws.push({ y: player.y + TS, fn: () => this.drawPlayer(player) });
    draws.sort((p, q) => p.y - q.y).forEach(d => d.fn());

    // sorotan tile depan
    if (front && front.tx >= 0 && front.ty >= 0 && front.tx < WORLD_W && front.ty < WORLD_H) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
      ctx.strokeRect(front.tx * TS + 3, front.ty * TS + 3, TS - 6, TS - 6);
    }
    // partikel
    this.particles = this.particles.filter(p => (p.t += dt) < p.life);
    for (const p of this.particles) {
      p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.globalAlpha = 1 - p.t / p.life;
      ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // ---- cuaca & pencahayaan (ruang layar) ----
    if (state.weather === 'hujan') this.drawRain(now);
    this.drawLighting(state.timeMin);
  }
  drawHouse() {
    const { ctx } = this, hx = HOUSE.x * TS, hy = HOUSE.y * TS;
    for (let i = 0; i < HOUSE.w; i++) {
      this.atlas(ATLAS.roof, hx + i * TS, hy);
      this.atlas(ATLAS.roof, hx + i * TS, hy + TS);
      this.atlas(i === 0 ? ATLAS.window : ATLAS.wall, hx + i * TS, hy + 2 * TS);
      this.atlas(i === 2 ? ATLAS.board : ATLAS.wall, hx + i * TS, hy + 3 * TS);
    }
    ctx.fillStyle = '#5d3a22'; ctx.fillRect(hx, hy + 2 * TS - 4, HOUSE.w * TS, 5);
    const dx = DOOR.x * TS, dy = DOOR.y * TS;
    ctx.fillStyle = '#6e4525'; ctx.fillRect(dx + 8, dy + 4, 32, 44);
    ctx.strokeStyle = '#4a2c15'; ctx.lineWidth = 3; ctx.strokeRect(dx + 8, dy + 4, 32, 44);
    ctx.beginPath(); ctx.moveTo(dx + 24, dy + 4); ctx.lineTo(dx + 24, dy + 48); ctx.stroke();
    ctx.fillStyle = '#ffd94d'; ctx.beginPath(); ctx.arc(dx + 31, dy + 28, 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#a33f2e'; ctx.fillRect(dx + 4, dy + 45, 40, 4);
  }
  drawShop() {
    const { ctx } = this, sx = SHOP.x * TS, sy = SHOP.y * TS, w = SHOP.w * TS;
    // meja kayu
    for (let i = 0; i < SHOP.w; i++) this.atlas(ATLAS.board, sx + i * TS, sy + TS);
    // tiang
    ctx.fillStyle = '#6e4525';
    ctx.fillRect(sx + 4, sy + 14, 7, TS + 20); ctx.fillRect(sx + w - 11, sy + 14, 7, TS + 20);
    // atap bergaris merah-putih
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? '#e8e3d5' : '#c8452c';
      ctx.fillRect(sx - 6 + i * (w + 12) / 10, sy + 2, (w + 12) / 10, 16);
    }
    ctx.fillStyle = '#5d3a22'; ctx.fillRect(sx - 6, sy + 17, w + 12, 4);
    // papan nama
    ctx.fillStyle = '#3b2a1a'; ctx.fillRect(sx + w / 2 - 34, sy + 24, 68, 18);
    ctx.fillStyle = '#ffe9b0'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('TOKO', sx + w / 2, sy + 37); ctx.textAlign = 'left';
  }
  drawPlayer(p) {
    const row = DIRROW[p.dir], f = p.moving ? p.frame : 0;
    this.ctx.drawImage(this.img.char, f * 16, row * 16, 16, 16, p.x + 4, p.y - 6, 40, 40);
  }
  drawAnimal(a, now) {
    const { ctx } = this, fr = Math.floor(now / 350) % 2;
    ctx.save();
    if (a.kind === 'chick') {
      const cell = a.moving ? ATLAS.chickSide[fr] : ATLAS.chickFront;
      if (a.dir < 0) { ctx.translate(a.x + TS, 0); ctx.scale(-1, 1); ctx.drawImage(this.img.atlas, cell[0] * 16, cell[1] * 16, 16, 16, 0, a.y + 8, 36, 36); }
      else ctx.drawImage(this.img.atlas, cell[0] * 16, cell[1] * 16, 16, 16, a.x + 6, a.y + 8, 36, 36);
    } else {
      // Frame sapi sebenarnya rapat 27x18 di (51,108) & (83,108); kotak longgar
      // 32x32 dari (48/80,96) membuat sapi kecil, bergeser, dan "melompat"
      // saat berbalik arah. Gambar rapat & cerminkan di titik tengah tubuh.
      const sx = fr === 0 ? 51 : 83;
      const dy = a.y + TS - 38;
      if (a.dir < 0) { ctx.translate(a.x + TS / 2, 0); ctx.scale(-1, 1); ctx.drawImage(this.img.atlas, sx, 108, 27, 18, -27, dy, 54, 36); }
      else ctx.drawImage(this.img.atlas, sx, 108, 27, 18, a.x + TS / 2 - 27, dy, 54, 36);
    }
    ctx.restore();
  }
  drawRain(now) {
    const { ctx, vw, vh } = this;
    ctx.strokeStyle = 'rgba(174,214,255,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 80; i++) {
      const x = (hash(i, 7) % Math.max(vw, 1)) + ((now / 30) % 40) - 20;
      const y = (hash(i, 13) + Math.floor(now * 0.55)) % Math.max(vh, 1);
      ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 13);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(70,80,95,0.18)'; ctx.fillRect(0, 0, vw, vh);
  }
  drawLighting(timeMin) {
    const { ctx, vw, vh } = this;
    let dark = 0;
    if (timeMin < 420) dark = 0.25 * (1 - (timeMin - 360) / 60);
    else if (timeMin <= 1020) dark = 0;
    else if (timeMin <= 1140) dark = 0.18 * (timeMin - 1020) / 120;
    else dark = 0.18 + 0.32 * (timeMin - 1140) / 180;
    if (dark > 0.005) { ctx.fillStyle = `rgba(16,20,52,${dark.toFixed(3)})`; ctx.fillRect(0, 0, vw, vh); }
    if (timeMin > 990 && timeMin < 1170) {
      const a = 0.10 * (1 - Math.abs(timeMin - 1080) / 90);
      ctx.fillStyle = `rgba(255,150,50,${a.toFixed(3)})`; ctx.fillRect(0, 0, vw, vh);
    }
  }
}
