// quests.js — sistem misi harian (murni, tanpa DOM — bisa dites)
// Tiga misi acak-deterministik per hari; progres dari aksi pemain; klaim hadiah koin.

const TEMPLATES = [
  { type: 'harvest', crop: null,      icon: 'sprout',        label: n => `Panen ${n} tanaman`,            variants: [[3, 30], [5, 50], [8, 85]] },
  { type: 'harvest', crop: 'jagung',  icon: 'wheat',         label: n => `Panen ${n} jagung`,             variants: [[3, 35], [5, 60]] },
  { type: 'harvest', crop: 'bit',     icon: 'carrot',        label: n => `Panen ${n} bit`,                variants: [[3, 30], [5, 50]] },
  { type: 'plant',   crop: null,      icon: 'sprout',        label: n => `Tanam ${n} benih`,              variants: [[4, 30], [6, 45]] },
  { type: 'water',   crop: null,      icon: 'droplets',      label: n => `Siram ${n} tanaman`,            variants: [[5, 25], [8, 40]] },
  { type: 'sell',    crop: null,      icon: 'coins',         label: n => `Jual ${n} barang di peti`,       variants: [[4, 40], [6, 60], [10, 100]] },
  { type: 'earn',    crop: null,      icon: 'coins',         label: n => `Dapatkan ${n} koin dari jualan`, variants: [[100, 30], [200, 60]] },
  { type: 'milk',    crop: null,      icon: 'milk',          label: n => `Perah sapi ${n}x`,               variants: [[1, 35], [2, 70]] },
  { type: 'egg',     crop: null,      icon: 'egg',           label: n => `Pungut ${n} telur ayam`,         variants: [[2, 30], [3, 45]] },
  { type: 'fert',    crop: null,      icon: 'flask-conical', label: n => `Pakai pupuk ${n}x`,              variants: [[2, 25]] }
];

// RNG deterministik per hari (mulberry32) — misi hari yang sama selalu sama
function rngFor(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Buat 3 misi untuk hari `day` (id stabil: q<day>-<i>) */
export function generateQuests(day) {
  const rnd = rngFor(day);
  const pool = [...TEMPLATES];
  const out = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const ti = Math.floor(rnd() * pool.length);
    const tpl = pool.splice(ti, 1)[0];
    const [target, reward] = tpl.variants[Math.floor(rnd() * tpl.variants.length)];
    out.push({
      id: `q${day}-${i}`, type: tpl.type, crop: tpl.crop, icon: tpl.icon,
      text: tpl.label(target), target, reward,
      progress: 0, done: false, claimed: false
    });
  }
  return out;
}

/** Tambah progres; kembalikan daftar misi yang BARU saja selesai. */
export function applyProgress(quests, type, amount = 1, crop = null) {
  const finished = [];
  for (const q of quests || []) {
    if (q.done || q.type !== type) continue;
    if (q.crop && q.crop !== crop) continue;
    q.progress = Math.min(q.target, q.progress + amount);
    if (q.progress >= q.target) { q.done = true; finished.push(q); }
  }
  return finished;
}

/** Klaim hadiah; kembalikan jumlah koin (0 bila belum selesai / sudah diklaim). */
export function claimReward(state, questId) {
  const q = (state.quests || []).find(x => x.id === questId);
  if (!q || !q.done || q.claimed) return 0;
  q.claimed = true;
  state.coins += q.reward;
  return q.reward;
}

export function claimableCount(state) {
  return (state.quests || []).filter(q => q.done && !q.claimed).length;
}
