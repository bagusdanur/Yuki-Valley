// state.js — state permainan + simpan/muat (localStorage)
import { START, DAY_START_MIN } from './config.js';

const SAVE_KEY = 'kebun-kecil-save-v2';

export function createState() {
  return {
    day: 1,
    timeMin: DAY_START_MIN,
    weather: 'cerah',           // 'cerah' | 'hujan'
    coins: START.coins,
    earned: 0,                  // total koin hasil jualan (untuk target menang)
    won: false,
    energy: START.energy,
    seeds: { ...START.seeds },
    fertilizer: START.fertilizer,
    bag: { jagung: 0, bit: 0, egg: 0, milk: 0 },
    field: {},                  // "x,y" -> {tilled, crop, grow, watered}
    eggs: [],                   // [{tx, ty}] telur di tanah kandang
    cowMilked: false,
    quests: [],                 // misi harian aktif (dari quests.js)
    questDay: 0,                // hari terakhir daftar misi dibuat
    tool: 'hoe',
    stats: { harvested: 0, soldItems: 0, earnedTotal: 0 }
  };
}

export function saveGame(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s.day !== 'number' || !s.field) return null;
    return Object.assign(createState(), s);
  } catch { return null; }
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* abaikan */ }
}
