// input.js — keyboard, D-pad sentuh, dan tombol aksi
export class Input {
  constructor({ onAction, onToolKey, onPause }) {
    this.keys = {};
    this.dpad = null;
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
    document.querySelectorAll('#dpad button').forEach(b => {
      const d = b.dataset.dir;
      const on = e => { e.preventDefault(); this.dpad = d; };
      const off = () => { if (this.dpad === d) this.dpad = null; };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointerleave', off);
      b.addEventListener('pointercancel', off);
    });
    const act = document.getElementById('btnAct');
    if (act) act.addEventListener('click', () => onAction());
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
