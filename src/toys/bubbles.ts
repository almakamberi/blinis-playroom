import type { ToyFactory } from './types';
import { clamp, dist, panFor, pick, rand, Ripples, Sparks, withAlpha } from './util';

interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
  color: string;
  holder: number | null; // pointer id while being blown
  wig: number;
  born: number;
}

/** Bubble Pop: bubbles float up; tap to pop; hold empty space to blow a new one. */
export const bubblePop: ToyFactory = (ctx, env) => {
  const cfg = [
    { every: 1.5, max: 7, rMin: 55, rMax: 85, speed: 28 },
    { every: 1.1, max: 11, rMin: 40, rMax: 75, speed: 34 },
    { every: 0.85, max: 15, rMin: 28, rMax: 65, speed: 40 },
  ][env.level];
  const MAX_R = 130;
  let bubbles: Bubble[] = [];
  const sparks = new Sparks();
  const ripples = new Ripples();
  let spawnTimer = 0;
  let now = 0;

  const noteForRadius = (r: number) => Math.round(clamp(10 - ((r - 25) / (MAX_R - 25)) * 9, 1, 10));

  function spawn(x = rand(60, env.w - 60), r = rand(cfg.rMin, cfg.rMax)) {
    bubbles.push({ x, y: env.h + r, r, vy: -cfg.speed * rand(0.7, 1.2), phase: rand(0, 6), color: pick(env.palette.soft), holder: null, wig: 0, born: now });
  }

  function pop(b: Bubble) {
    bubbles = bubbles.filter((o) => o !== b);
    sparks.burst(b.x, b.y, b.color, 12, b.r * 2.2, Math.max(4, b.r * 0.1));
    ripples.add(b.x, b.y, b.color);
    env.audio.play(noteForRadius(b.r), { bloop: true, vel: 0.6, pan: panFor(b.x, env.w) });
  }

  function drawBubble(b: Bubble) {
    const wob = Math.sin(now * 2 + b.phase) * 0.03 + Math.sin(b.wig * 18) * b.wig * 0.15;
    const rx = b.r * (1 + wob);
    const ry = b.r * (1 - wob);
    ctx.fillStyle = withAlpha(b.color, env.palette.night ? 0.22 : 0.3);
    ctx.strokeStyle = withAlpha(b.color, 0.95);
    ctx.lineWidth = Math.max(3, b.r * 0.06);
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // shine
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(3, b.r * 0.09);
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.68, Math.PI * 1.1, Math.PI * 1.45);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.2, b.y - b.r * 0.62, Math.max(2, b.r * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }

  return {
    resize() {
      bubbles = bubbles.filter((b) => b.x < env.w + b.r);
      if (bubbles.length === 0) for (let i = 0; i < 3; i++) { spawn(); bubbles[bubbles.length - 1].y = rand(env.h * 0.3, env.h); }
    },
    frame(dt, t) {
      now = t;
      spawnTimer += dt;
      const free = bubbles.filter((b) => b.holder === null).length;
      if (spawnTimer > cfg.every && free < cfg.max) {
        spawnTimer = 0;
        spawn();
      }
      for (const b of bubbles) {
        b.wig = Math.max(0, b.wig - dt);
        if (b.holder !== null) {
          b.r = Math.min(MAX_R, b.r + 32 * dt);
          continue;
        }
        b.y += b.vy * dt;
        b.x += Math.sin(t * 0.7 + b.phase) * 12 * dt;
      }
      bubbles = bubbles.filter((b) => b.y + b.r > -20);

      ctx.fillStyle = env.palette.bg;
      ctx.fillRect(0, 0, env.w, env.h);
      for (const b of bubbles) drawBubble(b);
      sparks.draw(ctx, dt);
      ripples.draw(ctx, dt);
    },
    down(id, x, y) {
      // Topmost bubble first, with a generous margin for little fingers.
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if (b.holder === null && dist(x, y, b.x, b.y) < b.r + 18) return pop(b);
      }
      const b: Bubble = { x, y, r: 16, vy: 0, phase: rand(0, 6), color: pick(env.palette.soft), holder: id, wig: 0.4, born: now };
      bubbles.push(b);
      env.audio.play(8, { vel: 0.25, pan: panFor(x, env.w) });
    },
    move(id, x, y) {
      const b = bubbles.find((o) => o.holder === id);
      if (b) {
        b.x = x;
        b.y = y;
      }
    },
    up(id) {
      const b = bubbles.find((o) => o.holder === id);
      if (!b) return;
      b.holder = null;
      b.vy = -cfg.speed * 0.9;
      b.wig = 0.6;
      env.audio.play(noteForRadius(b.r), { vel: 0.4, pan: panFor(b.x, env.w) });
    },
    invite() {
      for (const b of bubbles) b.wig = 0.8;
      spawn(env.w / 2, cfg.rMax);
    },
  };
};
