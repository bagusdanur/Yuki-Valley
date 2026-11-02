# Yuki Valley — Mini Harvest

Game farming pixel 2D ala Harvest Town, ditulis dengan **JavaScript modular murni** (ES Modules, tanpa framework/game engine) dan berjalan di browser. **Mode portrait** (tegak, nyaman di HP), bisa dimainkan dengan keyboard maupun layar sentuh. Seluruh UI memakai ikon vektor **Lucide** (tanpa emoji), efek suara asli dari paket **Kenney (CC0)**, dan ada **sistem misi harian** berhadiah koin.

## Cara menjalankan

Game ini memakai ES Modules + file asset, jadi perlu dibuka lewat server lokal (tidak bisa langsung klik `index.html`):

```bash
# pilihan 1 — Node.js (server mini bawaan, tanpa dependensi)
npm start
# lalu buka http://localhost:5173

# pilihan 2 — Python
python3 -m http.server 8000
# lalu buka http://localhost:8000
```

Di HP: jalankan server di komputer dalam jaringan Wi-Fi yang sama, lalu buka `http://<ip-komputer>:5173` dari browser HP dan mainkan secara portrait (tegak).

## Mode debug (edit sambil jalan)

```bash
npm run dev
# server berjalan dengan LIVE RELOAD: setiap file .js/.css/.html disimpan,
# browser me-refresh sendiri dan memuat kode terbaru (cache dimatikan).
```

Alur debug yang disarankan:

1. Jalankan `npm run dev`, buka `http://localhost:5173` di Chrome/Edge.
2. Tekan **F12** (DevTools) → tab **Console** untuk melihat error; tab **Sources** untuk memasang *breakpoint* di file `src/*.js` (mis. di `game.js` fungsi `doAction`) — permainan berhenti tepat di baris itu dan kamu bisa memeriksa isi variabel.
3. Edit kode di editor, simpan — game langsung termuat ulang dengan kode baru. Ulangi.
4. Di VS Code: buka folder ini, tekan **F5** (konfigurasi debug Chrome sudah disediakan di `.vscode/launch.json`) untuk menjalankan + memasang breakpoint langsung dari editor.
5. Logika murni (tanam/tumbuh/tabtrakan) bisa dicek tanpa browser: `npm test`.

## Cara main

- **Gerak:** WASD / tombol panah / D-pad di layar
- **Aksi:** Spasi / E / tombol AKSI — hadapkan karakter ke targetnya dulu
- **Ganti alat:** klik slot hotbar atau tombol 1–6
- **Jeda:** Esc / P / tombol jeda di kanan atas
- **Misi:** tombol gulungan (scroll) di kanan atas — 3 misi baru setiap hari, klaim hadiah koinnya

Alur: cangkul petak tanah → tanam benih → siram → tidur di pintu rumah → panen → jual di **Peti Pengiriman** di samping rumah → beli benih & pupuk di **stand TOKO**. Jangan lupa memerah sapi dan memungut telur ayam di kandang. Hari berjalan pukul 06:00–22:00, ada cuaca hujan (tanaman tersiram otomatis), energi terbatas, dan progres **tersimpan otomatis** di browser. Target: kumpulkan 1.000 koin dari hasil penjualan. Selesaikan juga **misi harian** untuk koin tambahan.

## Struktur project

```
yuki-valley/
├── index.html          # kerangka halaman & semua elemen UI
├── css/style.css       # tampilan fullscreen, HUD, hotbar, panel
├── assets/             # sprite PNG (Sprout Lands)
├── sounds/             # efek suara OGG (Kenney, CC0)
├── server.mjs          # server statis mini (Node, tanpa dependensi)
├── tests/logic.test.mjs# tes logika otomatis (npm test)
└── src/
    ├── main.js         # titik masuk: muat asset, buat game
    ├── config.js       # konstanta: peta, tanaman, harga, layout
    ├── state.js        # state permainan + simpan/muat
    ├── world.js        # geometri peta & tabrakan
    ├── farming.js      # pertumbuhan tanaman & pergantian hari
    ├── entities.js     # pemain & hewan (gerak, arah hadap)
    ├── render.js       # kamera, gambar dunia, partikel, cuaca, cahaya
    ├── audio.js        # efek suara file (sounds/) + musik WebAudio
    ├── icons.js        # ikon Lucide (SVG tersemat)
    ├── quests.js       # misi harian: buat, progres, klaim hadiah
    ├── input.js        # keyboard + sentuh
    ├── ui.js           # HUD, hotbar, toko, misi, menu, toast
    └── game.js         # orkestrasi: loop, aksi, ekonomi, misi, tidur
```

## Tes

```bash
npm test   # pemeriksaan logika: peta/tabtrakan, siklus tanam, hujan, telur, interaksi, misi
```

## Kredit

Asset pixel: **Sprout Lands — Asset Pack** oleh Cup Nooble (itch.io), paket basic gratis, lisensi non-komersial dengan kredit. Ikon: **Lucide** (lisensi ISC). Efek suara: **Kenney** (kenney.nl) — paket Interface Sounds, RPG Audio, Music Jingles, lisensi **CC0** (lihat `sounds/CREDITS.txt`). Game ini adalah demo non-komersial.
