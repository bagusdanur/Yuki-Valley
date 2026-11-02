// farming.js — logika ladang, pertumbuhan, dan pergantian hari (murni)
import { CROPS, PEN } from './config.js';
import { key } from './world.js';

export function cellAt(state, tx, ty) {
  const k = key(tx, ty);
  if (!state.field[k]) state.field[k] = { tilled: false, crop: null, grow: 0, watered: false };
  return state.field[k];
}
export function stageOf(cell) { return cell.crop ? CROPS[cell.crop].stages[Math.min(cell.grow, 3)] : 0; }
export function isRipe(cell) { return !!cell.crop && cell.grow >= CROPS[cell.crop].days; }

// Dipanggil saat pemain tidur: tanaman tersiram tumbuh, telur diletakkan,
// sapi siap diperah lagi, cuaca hari baru ditentukan.
export function startNewDay(state, rng = Math.random) {
  let grown = 0;
  for (const k in state.field) {
    const c = state.field[k];
    if (c.crop && c.watered && c.grow < 3) { c.grow++; grown++; }
    if (c.crop) c.watered = false;
  }
  state.day++;
  state.cowMilked = false;
  state.weather = state.day > 1 && rng() < 0.35 ? 'hujan' : 'cerah';
  if (state.weather === 'hujan') {
    for (const k in state.field) if (state.field[k].crop) state.field[k].watered = true;
  }
  // telur dari 2 ayam (peluang 65% per ayam), maksimum 6 telur di tanah
  let laid = 0;
  for (let i = 0; i < 2 && state.eggs.length < 6; i++) {
    if (rng() < 0.65) {
      const tx = PEN.x + 1 + Math.floor(rng() * (PEN.w - 2));
      const ty = PEN.y + 1 + Math.floor(rng() * (PEN.h - 2));
      if (!state.eggs.some(e => e.tx === tx && e.ty === ty)) { state.eggs.push({ tx, ty }); laid++; }
    }
  }
  return { grown, laid, weather: state.weather };
}
