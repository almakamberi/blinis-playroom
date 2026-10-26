import type { ToyFactory } from './types';
import { clamp, dist, panFor, rand } from './util';

interface Dot {
  x: number;
  y: number;
  r: number;
  c: number;
  age: number;
  vx: number;
}

/** Splash of Colour: glowing finger paint that drifts down, settles and fades. */
export const splashOfColour: ToyFactory = (ctx, env) => {
  const LIFE = 10;
  const MAX_DOTS = 1100;
  const radius = [30, 24, 20][env.level];
  let dots: Dot[] = [];
  const strokes = new Map<number, { x: number; y: number; c: number; travel: number }>();
  let nextColour = 0;
  let ghost: { t: number; x: number; y: number } | null = null;

  // Pre-rendered glowing sprites, one per colour: much cheaper than gradients per dot.
  const sprites = env.palette.soft.map((col) => {
    const s = document.createElement('canvas');
    s.width = s.height = 64;
    const g = s.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, col);
    grad.addColorStop(0.45, col);
    grad.addColorStop(1, col + '00');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return s;
  });

  function addDot(x: number, y: number, c: number) {
    dots.push({ x, y, r: radius * rand(0.85, 1.15), c, age: 0, vx: rand(-6, 6) });
    if (dots.length > MAX_DOTS) dots.splice(0, dots.length - MAX_DOTS);
  }

  function noteForY(y: number) {
    return Math.round(clamp(10 - (y / env.h) * 9, 1, 10));
  }

  function paintTo(id: number, x: number, y: number) {
    const s = strokes.get(id);
    if (!s) return;
    const d = dist(x, y, s.x, s.y);
    const step = radius * 0.35;
    const n = Math.min(40, Math.floor(d / step));
    for (let i = 1; i <= n; i++) addDot(s.x + ((x - s.x) * i) / n, s.y + ((y - s.y) * i) / n, s.c);
    if (n > 0) { s.x = x; s.y = y; }
    s.travel += d;
    if (s.travel > 160) {
      s.travel = 0;
      env.audio.play(noteForY(y), { vel: 0.25, pan: panFor(x, env.w) });
    }
  }

  return {
    resize() {},
    frame(dt) {
      if (ghost) {
        // The idle "invitation": an invisible finger paints a small swirl.
        ghost.t += dt;
        const a = ghost.t * 5;
        const r = 20 + ghost.t * 40;
        const x = env.w / 2 + Math.cos(a) * r;
        const y = env.h / 2 + Math.sin(a) * r;
        if (!strokes.has(-1)) strokes.set(-1, { x, y, c: nextColour, travel: -1e9 });
        paintTo(-1, x, y);
        if (ghost.t > 1.4) { ghost = null; strokes.delete(-1); }
      }

      ctx.fillStyle = env.palette.bg;
      ctx.fillRect(0, 0, env.w, env.h);
      for (const d of dots) {
        d.age += dt;
        // drift gently down and spread, like paint settling
        d.y += (6 + d.age * 1.5) * dt;
        d.x += d.vx * dt * 0.4;
        d.r += dt * 2.2;
      }
      dots = dots.filter((d) => d.age < LIFE);
      for (const d of dots) {
        const fadeIn = Math.min(1, d.age * 6);
        const fadeOut = clamp((LIFE - d.age) / 4, 0, 1);
        ctx.globalAlpha = fadeIn * fadeOut * (env.palette.night ? 0.7 : 0.85);
        const s = d.r * 1.6;
        ctx.drawImage(sprites[d.c], d.x - s, d.y - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1;
    },
    down(id, x, y) {
      const c = nextColour;
      nextColour = (nextColour + 1) % sprites.length;
      strokes.set(id, { x, y, c, travel: 0 });
      for (let i = 0; i < 3; i++) addDot(x + rand(-4, 4), y + rand(-4, 4), c);
      env.audio.play(noteForY(y), { vel: 0.5, pan: panFor(x, env.w) });
    },
    move(id, x, y) {
      paintTo(id, x, y);
    },
    up(id) {
      strokes.delete(id);
    },
    invite() {
      ghost = { t: 0, x: env.w / 2, y: env.h / 2 };
    },
  };
};
