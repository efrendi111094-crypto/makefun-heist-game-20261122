// Midnight Vault — keyboard and mouse input. One job: turn keys and clicks
// into a movement vector, tool presses and HUD button clicks.
// WASD / arrows move, Shift sneaks, Q smoke, R EMP, E hold to lockpick,
// P pause, M mute. Clicking the floor sets a move target (click-to-move);
// clicking a HUD tool button uses that tool.

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
  KeyE: 'interact',
  KeyQ: 'smoke',
  KeyR: 'emp',
  KeyP: 'pause',
  KeyM: 'mute',
  Enter: 'confirm',
  Escape: 'escape',
};

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set(); // edge-triggered, consumed by the game each frame
    this.moveTarget = null; // {x, y} in game pixels, or null
    this.canvas = canvas;
    this.onFirstGesture = null;
    this._gestured = false;

    window.addEventListener('keydown', (e) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(action);
      this.keys.add(action);
      this._gesture();
    });
    window.addEventListener('keyup', (e) => {
      const action = KEYMAP[e.code];
      if (action) this.keys.delete(action);
    });
    canvas.addEventListener('pointerdown', (e) => {
      this._gesture();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this.click = { x, y };
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.moveTarget = null;
    });
  }

  _gesture() {
    if (!this._gestured) {
      this._gestured = true;
      if (this.onFirstGesture) this.onFirstGesture();
    }
  }

  down(action) {
    return this.keys.has(action);
  }

  // True once, on the frame the key went down.
  wasPressed(action) {
    return this.pressed.has(action);
  }

  endFrame() {
    this.pressed.clear();
    this.click = null;
  }

  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('left')) x -= 1;
    if (this.down('right')) x += 1;
    if (this.down('up')) y -= 1;
    if (this.down('down')) y += 1;
    if (x !== 0 || y !== 0) {
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len, fromKeys: true };
    }
    if (this.moveTarget) return { x: 0, y: 0, fromKeys: false };
    return { x: 0, y: 0, fromKeys: false };
  }

  get sneaking() {
    return this.down('sneak');
  }
}
