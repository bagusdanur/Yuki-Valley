// Tes logika murni Yuki Valley — jalankan: npm test
import { createState } from '../src/state.js';
import { isSolid, isPenFence } from '../src/world.js';
import { cellAt, stageOf, isRipe, startNewDay } from '../src/farming.js';
import { createPlayer, createAnimals, frontTile, animalAtTile } from '../src/entities.js';
import { PEN, DOOR } from '../src/config.js';
import { generateQuests, applyProgress, claimReward, claimableCount } from '../src/quests.js';

let fails = 0;
function check(name, cond) { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) fails++; }

// --- state awal
const s = createState();
check('state awal: koin 80, benih 3/3, energi 100', s.coins === 80 && s.seeds.jagung === 3 && s.seeds.bit === 3 && s.energy === 100);

// --- tabrakan peta
check('rumah solid', isSolid(3, 3) === true);
check('tile pintu solid (dinding rumah)', isSolid(DOOR.x, DOOR.y) === true);
check('ladang tidak solid', isSolid(5, 12) === false);
check('pagar kandang solid', isPenFence(PEN.x, PEN.y + 2) === true);
check('gerbang kandang terbuka', isPenFence(29, 19) === false);
check('kolam solid', isSolid(30, 3) === true);
check('toko solid', isSolid(12, 2) === true);
check('peti solid', isSolid(8, 3) === true);
check('luar peta solid', isSolid(-1, 0) === true && isSolid(99, 99) === true);

// --- siklus tanam jagung (rng cerah, tanpa telur: 0.99)
const rngDry = () => 0.99;
const c = cellAt(s, 3, 10);
c.tilled = true; c.crop = 'jagung'; c.watered = true;
startNewDay(s, rngDry);
check('hari 2, jagung grow 1, cuaca cerah', s.day === 2 && c.grow === 1 && s.weather === 'cerah' && c.watered === false);
c.watered = true; startNewDay(s, rngDry);
check('jagung grow 2, stage 2', c.grow === 2 && stageOf(c) === 2 && !isRipe(c));
c.watered = true; startNewDay(s, rngDry);
check('jagung matang hari ke-4 (grow 3, ripe)', c.grow === 3 && isRipe(c) && stageOf(c) === 3);

// --- bit matang 2 hari, stage melompat 0->2->3
const b = cellAt(s, 4, 10);
b.crop = 'bit'; b.watered = true; startNewDay(s, rngDry);
check('bit grow 1 -> stage 2', b.grow === 1 && stageOf(b) === 2 && !isRipe(b));
b.watered = true; startNewDay(s, rngDry);
check('bit grow 2 -> ripe, stage 3', b.grow === 2 && isRipe(b) && stageOf(b) === 3);

// --- hujan menyiram tanaman kering (rng 0.1)
const s2 = createState();
const d = cellAt(s2, 5, 10);
d.crop = 'jagung'; d.watered = false;
const r2 = startNewDay(s2, () => 0.1);
check('hari hujan: tanaman kering tidak tumbuh tapi jadi tersiram', r2.weather === 'hujan' && d.grow === 0 && d.watered === true);

// --- telur ayam (rng 0.5: cerah, ayam bertelur, posisi deterministik)
const s3 = createState();
const r3 = startNewDay(s3, () => 0.5);
check('telur: tepat 1 telur unik di (29,16)', r3.laid === 1 && s3.eggs.length === 1 && s3.eggs[0].tx === 29 && s3.eggs[0].ty === 16);
check('sapi siap perah lagi setelah hari baru', s3.cowMilked === false);

// --- arah hadap & interaksi pintu
const p = createPlayer();
p.x = DOOR.x * 48; p.y = (DOOR.y + 1) * 48; p.dir = 'up';
const f = frontTile(p);
check('berdiri di depan rumah hadap atas -> tile pintu', f.tx === DOOR.x && f.ty === DOOR.y);

// --- hewan: sapi terdeteksi di tile awalnya
const animals = createAnimals();
const cow = animalAtTile(animals, PEN.x + 4, PEN.y + 2);
check('sapi ditemukan di tile kandang awal', !!cow && cow.kind === 'cow');

// --- misi harian
const q1 = generateQuests(1), q1b = generateQuests(1), q2 = generateQuests(2);
check('misi: 3 misi per hari, deterministik per hari', q1.length === 3 && JSON.stringify(q1) === JSON.stringify(q1b));
check('misi: tipe tidak berulang dalam satu hari', new Set(q1.map(q => q.type + '|' + (q.crop || ''))).size === 3);
check('misi: hari lain, susunan id berbeda', q2[0].id.startsWith('q2-') && q1[0].id.startsWith('q1-'));
const qs = [
  { id: 't1', type: 'harvest', crop: null, target: 2, reward: 30, progress: 0, done: false, claimed: false, icon: 'sprout', text: 'Panen 2 tanaman' },
  { id: 't2', type: 'water', crop: null, target: 5, reward: 25, progress: 0, done: false, claimed: false, icon: 'droplets', text: 'Siram 5 tanaman' }
];
const fin = applyProgress(qs, 'harvest', 2, 'jagung');
check('misi: progres mencapai target -> selesai tepat sekali', fin.length === 1 && qs[0].done && qs[0].progress === 2);
check('misi: progres setelah selesai tidak dihitung lagi', applyProgress(qs, 'harvest', 1, 'jagung').length === 0);
const sq = createState(); sq.quests = qs;
const before = sq.coins;
const got = claimReward(sq, qs[0].id);
check('misi: klaim menambah koin sebesar hadiah, sekali saja', got === qs[0].reward && sq.coins === before + got && claimReward(sq, qs[0].id) === 0);
check('misi: claimableCount 0 setelah diklaim', claimableCount(sq) === 0);
check('state awal punya field misi kosong', Array.isArray(s.quests) && s.questDay === 0);

console.log(fails ? `\n${fails} KEGAGALAN` : '\nSEMUA LULUS');
process.exit(fails ? 1 : 0);
