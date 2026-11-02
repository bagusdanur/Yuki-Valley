// input.js — keyboard, D-pad sentuh, dan tombol aksi
export class Input {
  constructor({ onAction, onToolKey, onPause }) {
    this.keys = {};
    // D-pad dilacak per pointer (multi-sentuh): arah aktif = tombol terakhir
    // yang MASIH ditekan, jadi jari kedua tidak membunuh arah jari pertama.
    this._dpadPointers = new Map(); // pointerId -> arah
    this._dpadOrder = [];           // pointerId urut waktu tekan
    addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      if (k === ' ' || k === 'e') onAction();
      if (k === 'escape' || k === 'p') onPause();
      const tools = { '1': 'hoe', '2': 'seedJ', '3': 'seedB', '4': 'water', '5': 'fert', '6': 'hand' };
      if (tools[e.key]) onToolKey(tools[e.key]);
    });
    addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
    // Bila fokus hilang / tab disembunyikan di tengah menekan arah, pointerup
    // bisa tidak pernah sampai — bersihkan semua supaya karakter tidak
    // berjalan sendiri ke satu arah (bug "nyangkut ke kiri").
    const clearAll = () => { this.keys = {}; this._dpadPointers.clear(); this._dpadOrder = []; };
    addEventListener('blur', clearAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearAll(); });
    document.querySelectorAll('#dpad button').forEach(b => {
      const setDir = (e, d) => {
        this._dpadPointers.set(e.pointerId, d);
        this._dpadOrder = this._dpadOrder.filter(x => x !== e.pointerId);
        this._dpadOrder.push(e.pointerId);
      };
      b.addEventListener('pointerdown', e => {
        e.preventDefault();
        try { b.setPointerCapture(e.pointerId); } catch { /* abaikan */ }
        setDir(e, b.dataset.dir);
      });
      // Geser jari ke tombol arah lain = ganti arah (tidak nyangkut di arah awal)
      b.addEventListener('pointermove', e => {
        if (!this._dpadPointers.has(e.pointerId)) return;
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const btn = el && el.closest ? el.closest('#dpad button') : null;
        if (btn && btn.dataset.dir !== this._dpadPointers.get(e.pointerId)) setDir(e, btn.dataset.dir);
      });
      const off = e => {
        if (this._dpadPointers.delete(e.pointerId))
          this._dpadOrder = this._dpadOrder.filter(x => x !== e.pointerId);
      };
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('lostpointercapture', off);
    });
    const act = document.getElementById('btnAct');
    if (act) act.addEventListener('click', () => onAction());
  }
  /** Arah D-pad aktif saat ini (tombol terakhir yang masih ditekan) */
  get dpad() {
    const id = this._dpadOrder[this._dpadOrder.length - 1];
    return id === undefined ? null : (this._dpadPointers.get(id) || null);
  }
  /** Vektor gerak saat ini: {x, y} masing-masing -1..1 */
  axis() {
    let x = 0, y = 0;
    if (this.keys['a'] || this.keys['arrowleft'] || this.dpad === 'left') x = -1;
    if (this.keys['d'] || this.keys['arrowright'] || this.dpad === 'right') x = 1;
    if (this.keys['w'] || this.keys['arrowup'] || this.dpad === 'up') y = -1;
    if (this.keys['s'] || this.keys['arrowdown'] || this.dpad === 'down') y = 1;
    return { x, y };
  }
}
