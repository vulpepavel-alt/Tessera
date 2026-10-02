// The hidden debug screen, toggled with F3.
// Shows how fast the game runs (FPS = pictures per second) and what the
// engine is doing. Useful for spotting slowdowns.

const REFRESH_SECONDS = 0.5;

export class DebugOverlay {
  constructor(renderer) {
    this.renderer = renderer;
    this.el = document.createElement('div');
    this.el.className = 'debug-overlay hidden';
    document.body.appendChild(this.el);
    this.frames = 0;
    this.timeSinceRefresh = 0;
    this.worstFrame = 0;
  }

  toggle() {
    this.el.classList.toggle('hidden');
  }

  get visible() {
    return !this.el.classList.contains('hidden');
  }

  // getInfo() is only called when the text is refreshed, to keep this cheap.
  update(dt, getInfo) {
    this.frames++;
    this.timeSinceRefresh += dt;
    this.worstFrame = Math.max(this.worstFrame, dt);
    if (this.timeSinceRefresh < REFRESH_SECONDS) return;

    const fps = Math.round(this.frames / this.timeSinceRefresh);
    const worstMs = (this.worstFrame * 1000).toFixed(1);
    this.frames = 0;
    this.timeSinceRefresh = 0;
    this.worstFrame = 0;
    if (!this.visible) return;

    const render = this.renderer.info.render;
    const info = getInfo();
    const p = info.position;
    this.el.textContent = [
      `FPS ${fps}   (slowest frame ${worstMs} ms)`,
      `Draw calls ${render.calls}   Triangles ${render.triangles.toLocaleString('en-US')}`,
      `Chunks ${info.chunks.ready} ready, ${info.chunks.loading} loading   Workers ${info.chunks.workers}`,
      `Position ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}   Chunk ${Math.floor(p.x / 32)}, ${Math.floor(p.z / 32)}`,
      `Region ${info.region}   Enemies ${info.enemies ?? 0}`,
    ].join('\n');
  }
}
