// Keyboard and mouse input.
//
// While playing, the mouse pointer is "locked": it disappears and every mouse
// movement turns the camera. Pressing Esc unlocks it again. (This is the
// browser's "Pointer Lock" feature.)

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keysDown = new Set();
    this.pressedThisFrame = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.wheel = 0;
    this.locked = false;
    this.lockOnClick = false; // the game turns this on; menus leave it off
    this.pressHandlers = new Map(); // key code -> list of functions
    this.lockHandlers = [];

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.keysDown.delete(e.code));
    // If the window loses focus, forget held keys so we don't keep moving.
    window.addEventListener('blur', () => this.keysDown.clear());

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseX += e.movementX;
      this.mouseY += e.movementY;
    });
    canvas.addEventListener('wheel', (e) => {
      this.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });

    // Mouse buttons count as keys named "Mouse0" (left) and "Mouse2" (right).
    document.addEventListener('mousedown', (e) => {
      if (!this.locked) return;
      const code = `Mouse${e.button}`;
      if (!this.keysDown.has(code)) this.pressedThisFrame.add(code);
      this.keysDown.add(code);
    });
    document.addEventListener('mouseup', (e) => this.keysDown.delete(`Mouse${e.button}`));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('click', () => {
      if (this.lockOnClick) this.lock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked) this.keysDown.clear();
      for (const fn of this.lockHandlers) fn(this.locked);
    });
  }

  // Ask the browser to lock the mouse. Browsers refuse if you ask again too
  // soon after pressing Esc; then the player simply clicks once more.
  lock() {
    if (this.locked) return;
    try {
      const result = this.canvas.requestPointerLock();
      result?.catch?.(() => {});
    } catch {
      // ignored: the next click will try again
    }
  }

  unlock() {
    if (this.locked) document.exitPointerLock();
  }

  onKeyDown(e) {
    // Stop the browser from scrolling the page with Space / arrow keys.
    if (this.locked && (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Tab')) e.preventDefault();
    // F3 / F4 would otherwise trigger browser features.
    if (e.code === 'F3' || e.code === 'F4') e.preventDefault();
    if (!e.repeat) {
      this.pressedThisFrame.add(e.code);
      for (const fn of this.pressHandlers.get(e.code) ?? []) fn();
    }
    this.keysDown.add(e.code);
  }

  isDown(code) {
    return this.keysDown.has(code);
  }

  // True only during the frame in which the key went down.
  wasPressed(code) {
    return this.pressedThisFrame.has(code);
  }

  // Call once at the end of every frame.
  endFrame() {
    this.pressedThisFrame.clear();
  }

  // Run fn once each time the key is pressed (holding it down doesn't repeat).
  onPress(code, fn) {
    if (!this.pressHandlers.has(code)) this.pressHandlers.set(code, []);
    this.pressHandlers.get(code).push(fn);
  }

  // Run fn(isLocked) whenever the mouse gets locked or unlocked.
  onLockChange(fn) {
    this.lockHandlers.push(fn);
  }

  // Returns how far the mouse moved since the last call, then resets it.
  takeMouseMovement() {
    const movement = { x: this.mouseX, y: this.mouseY };
    this.mouseX = 0;
    this.mouseY = 0;
    return movement;
  }

  // Returns scroll-wheel steps since the last call (+ = scrolled down).
  takeWheel() {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }
}
