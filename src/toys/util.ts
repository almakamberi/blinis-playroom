export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

/** Frame-rate independent exponential approach. */
export const approach = (cur: number, target: number, speed: number, dt: number) =>
  target + (cur - target) * Math.exp(-speed * dt);

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function withAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Map x across the screen to stereo pan. */
export const panFor = (x: number, w: number) => (x / Math.max(1, w)) * 2 - 1;

/** Soft expanding rings: used for taps on empty space so no tap is "dead". */
export class Ripples {
  private items: { x: number; y: number; age: number; color: string }[] = [];
  add(x: number, y: number, color: string) {
    this.items.push({ x, y, age: 0, color });
    if (this.items.length > 30) this.items.shift();
  }
  draw(ctx: CanvasRenderingContext2D, dt: number) {
    for (const r of this.items) {
      r.age += dt;
      const k = r.age / 0.9;
      ctx.strokeStyle = withAlpha(r.color, 0.6 * (1 - k));
      ctx.lineWidth = 4 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 12 + k * 50, 0, Math.PI * 2);
      ctx.stroke();
    }
    this.items = this.items.filter((r) => r.age < 0.9);
  }
}

/** Little sparkles that drift and fade. */
export class Sparks {
  private items: { x: number; y: number; vx: number; vy: number; life: number; r: number; color: string }[] = [];
  burst(x: number, y: number, color: string, n = 10, speed = 140, r = 5) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
      const s = speed * rand(0.6, 1);
      this.items.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, r: r * rand(0.7, 1.2), color });
    }
    if (this.items.length > 400) this.items.splice(0, this.items.length - 400);
  }
  draw(ctx: CanvasRenderingContext2D, dt: number) {
    for (const p of this.items) {
      p.life -= dt * 1.4;
      p.vx *= Math.exp(-3 * dt);
      p.vy *= Math.exp(-3 * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) continue;
      ctx.fillStyle = withAlpha(p.color, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.5 + p.life * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    this.items = this.items.filter((p) => p.life > 0);
  }
}

/** A friendly face: two eyes and a smile. `happy` turns the eyes into ^^ arcs. */
export function drawFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  ink: string,
  opts: { happy?: boolean; blink?: boolean; sleepy?: boolean } = {},
) {
  const ex = size * 0.17;
  const er = Math.max(2, size * 0.055);
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, size * 0.04);
  for (const sx of [-1, 1]) {
    const cx = x + sx * ex;
    if (opts.happy) {
      ctx.beginPath();
      ctx.arc(cx, y + er * 0.6, er * 1.3, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (opts.blink || opts.sleepy) {
      ctx.beginPath();
      ctx.moveTo(cx - er, y);
      ctx.quadraticCurveTo(cx, y + er * 0.9, cx + er, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(cx, y, er, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.beginPath();
  const mw = size * (opts.happy ? 0.14 : 0.1);
  ctx.arc(x, y + size * 0.08, mw, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  // rosy cheeks
  ctx.fillStyle = 'rgba(244,140,150,0.35)';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + sx * size * 0.28, y + size * 0.1, size * 0.07, size * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
