// world.js — geometri peta & tabrakan (murni, tanpa DOM)
import { WORLD_W, WORLD_H, HOUSE, CHEST, SHOP, POND, PEN, PEN_GATE, FIELD, PATHS, DECOR } from './config.js';

export function inRect(tx, ty, r) { return tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h; }
export function key(tx, ty) { return tx + ',' + ty; }

export function isPenFence(tx, ty) {
  if (!inRect(tx, ty, PEN)) return false;
  const edge = tx === PEN.x || ty === PEN.y || tx === PEN.x + PEN.w - 1 || ty === PEN.y + PEN.h - 1;
  return edge && !(tx === PEN_GATE.x && ty === PEN_GATE.y);
}
export function isPath(tx, ty) { return PATHS.some(r => inRect(tx, ty, r)); }
export function decorAt(tx, ty) { return DECOR.find(d => d[1] === tx && d[2] === ty) || null; }

export function isSolid(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return true;
  if (inRect(tx, ty, HOUSE)) return true;
  if (tx === CHEST.x && ty === CHEST.y) return true;
  if (inRect(tx, ty, SHOP)) return true;
  if (inRect(tx, ty, POND)) return true;
  if (isPenFence(tx, ty)) return true;
  const d = decorAt(tx, ty);
  if (d && d[3]) return true;
  return false;
}
export function isField(tx, ty) { return inRect(tx, ty, FIELD); }
