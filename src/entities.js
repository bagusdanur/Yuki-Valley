// entities.js — pemain & hewan (gerak + tabrakan)
import { TS, WORLD_W, WORLD_H, PEN } from './config.js';
import { isSolid } from './world.js';

export const DIRV = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
export const DIRROW = { down: 0, up: 1, left: 2, right: 3 };

export function createPlayer() {
  return { x: 4 * TS, y: 6 * TS, dir: 'down', frame: 0, animT: 0, moving: false, speed: 165 };
}
export function frontTile(p) {
  const cx = p.x + TS / 2, cy = p.y + TS / 2, v = DIRV[p.dir];
  return { tx: Math.floor((cx + v[0] * TS * 0.75) / TS), ty: Math.floor((cy + v[1] * TS * 0.75) / TS) };
}
export function playerTile(p) {
  return { tx: Math.floor((p.x + TS / 2) / TS), ty: Math.floor((p.y + TS - 8) / TS) };
}
function boxHitsSolid(nx, ny) {
  const x0 = nx + 13, x1 = nx + TS - 13, y0 = ny + TS - 16, y1 = ny + TS - 2;
  const txs = [Math.floor(x0 / TS), Math.floor(x1 / TS)];
  const tys = [Math.floor(y0 / TS), Math.floor(y1 / TS)];
  for (const tx of txs) for (const ty of tys) if (isSolid(tx, ty)) return true;
  return false;
}
export function updatePlayer(p, axis, dt) {
  const { x, y } = axis;
  p.moving = !!(x || y);
  if (!p.moving) { p.frame = 0; return; }
  p.dir = x < 0 ? 'left' : x > 0 ? 'right' : y < 0 ? 'up' : 'down';
  const len = Math.hypot(x, y) || 1, sp = p.speed * dt;
  const nx = p.x + x / len * sp, ny = p.y + y / len * sp;
  if (!boxHitsSolid(nx, p.y)) p.x = nx;
  if (!boxHitsSolid(p.x, ny)) p.y = ny;
  p.x = Math.max(0, Math.min(p.x, WORLD_W * TS - TS));
  p.y = Math.max(0, Math.min(p.y, WORLD_H * TS - TS));
  p.animT += dt;
  if (p.animT > 0.12) { p.animT = 0; p.frame = (p.frame + 1) % 4; }
}

// ===== Hewan =====
export function createAnimals() {
  const mk = (kind, tx, ty) => ({ kind, x: tx * TS, y: ty * TS, tx: tx * TS, ty: ty * TS, dir: 1, moving: false, wait: Math.random() * 2000 });
  return [mk('chick', PEN.x + 2, PEN.y + 2), mk('chick', PEN.x + 6, PEN.y + 3), mk('cow', PEN.x + 4, PEN.y + 2)];
}
export function updateAnimals(list, dt) {
  for (const a of list) {
    const dx = a.tx - a.x, dy = a.ty - a.y, dist = Math.hypot(dx, dy);
    a.moving = dist > 4;
    if (a.moving) {
      const sp = (a.kind === 'cow' ? 26 : 42) * dt;
      a.x += dx / dist * sp; a.y += dy / dist * sp;
      if (dx) a.dir = dx < 0 ? -1 : 1;
    } else {
      a.wait -= dt * 1000;
      if (a.wait <= 0) {
        a.wait = 1200 + Math.random() * 2800;
        a.tx = (PEN.x + 1) * TS + Math.random() * (PEN.w - 3) * TS;
        a.ty = (PEN.y + 1) * TS + Math.random() * (PEN.h - 3) * TS;
      }
    }
  }
}
export function animalAtTile(list, tx, ty) {
  return list.find(a => Math.floor((a.x + TS / 2) / TS) === tx && Math.floor((a.y + TS / 2) / TS) === ty) || null;
}
