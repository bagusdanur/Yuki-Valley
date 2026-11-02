// config.js — semua konstanta & tata letak dunia (murni, tanpa DOM)
/* eslint-disable */
export const TS = 48;                    // ukuran tile (piksel logis)
export const WORLD_W = 36, WORLD_H = 26; // ukuran peta dalam tile

export const HOUSE = { x: 2, y: 2, w: 5, h: 4 };
export const DOOR  = { x: 4, y: 5 };
export const CHEST = { x: 8, y: 3 };                       // peti pengiriman (jual)
export const SHOP  = { x: 11, y: 2, w: 3, h: 2 };          // stand toko benih
export const POND  = { x: 29, y: 2, w: 4, h: 3 };
export const FIELD = { x: 3, y: 10, w: 12, h: 8 };         // 96 petak ladang
export const PEN   = { x: 24, y: 13, w: 10, h: 7 };        // kandang hewan
export const PEN_GATE = { x: 29, y: 19 };                  // celah pagar (baris bawah)
export const NPC_HOME = { x: 7, y: 5 };                    // posisi Yuki (NPC) di dekat rumah

// Jalur tanah (visual saja): dari rumah ke toko, ladang, dan kandang
export const PATHS = [
  { x: 4, y: 6, w: 2, h: 4 },   // rumah -> ladang
  { x: 6, y: 3, w: 5, h: 1 },   // rumah -> toko
  { x: 4, y: 18, w: 2, h: 3 },  // ladang -> bawah
  { x: 6, y: 20, w: 21, h: 1 }, // jalan bawah menuju kandang
  { x: 27, y: 18, w: 2, h: 2 }  // naik ke pintu kandang
];

// Dekorasi: [jenis, tx, ty, solid]
export const DECOR = [
  ['bush', 16, 3, true], ['flower', 20, 4, false], ['flowerY', 26, 6, false],
  ['rock', 18, 8, true], ['bushBerry', 34, 8, true], ['flower', 8, 21, false],
  ['bush', 0, 8, true], ['flowerY', 14, 24, false], ['flower', 33, 22, false],
  ['rock', 20, 22, true], ['bush', 1, 24, true], ['flower', 22, 2, false],
  ['bushBerry', 15, 20, true], ['flowerY', 30, 24, false], ['rock', 35, 15, true]
];

export const CROPS = {
  jagung: { name: 'Jagung', seedPrice: 20, sellPrice: 55, days: 3, row: 0, stages: [0, 1, 2, 3] },
  bit:    { name: 'Bit',    seedPrice: 10, sellPrice: 28, days: 2, row: 1, stages: [0, 2, 3, 3] }
};
export const PRICES = { egg: 15, milk: 40, fertilizer: 15 };

export const START = { coins: 80, energy: 100, seeds: { jagung: 3, bit: 3 }, fertilizer: 1 };
export const ENERGY_COSTS = { hoe: 3, plant: 2, water: 2, fertilize: 1, harvest: 1, milk: 3, egg: 0 };
export const WIN_EARNED = 1000;

export const DAY_START_MIN = 360;    // 06:00
export const DAY_END_MIN = 1320;     // 22:00
export const DAY_REAL_SECONDS = 300; // 1 hari permainan = 5 menit nyata

// Atlas sprite (sel 16px) di assets/atlas.png
export const ATLAS = {
  grass: [[0, 0], [1, 0], [2, 0], [3, 0]],
  water: [[4, 0], [5, 0], [6, 0], [7, 0]],
  dirt:  [[0, 1], [1, 1], [2, 1]],
  roof: [0, 4], wall: [1, 4], board: [2, 4], window: [3, 4],
  fenceH: [4, 4], fencePost: [5, 4],
  bush: [0, 5], bushBerry: [1, 5], flower: [2, 5], flowerY: [3, 5], rock: [4, 5],
  chickSide: [[0, 6], [1, 6]], chickFront: [2, 6]
};
export const ASSET_FILES = {
  char: 'assets/char.png', atlas: 'assets/atlas.png', plants: 'assets/plants.png',
  items: 'assets/items.png', egg: 'assets/egg.png', milk: 'assets/milk.png',
  yuki: 'assets/char-yuki.png'
};
