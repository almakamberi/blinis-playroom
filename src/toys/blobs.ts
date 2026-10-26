import type { ToyFactory } from './types';
import { approach, dist, drawFace, panFor, rand, Ripples } from './util';

interface Blob {
  note: number;
  color: string;
  x: number;
  y: number;
  slot: number;
  squish: number;
  hop: number;
  happy: number;
  blinkAt: number;
  holder: number | null;
  grabDx: number;
  grabDy: number;
  startX: number;
  startY: number;
  dragging: boolean;
}

/** Blob Band: each blob sings one note; drag to rearrange; tap the conductor to play the row. */
export const blobBand: ToyFactory = (ctx, env) => {
  const count = [3, 5, 7][env.level];
  const blobs: Blob[] = Array.from({ length: count }, (_, i) => ({
    note: 3 + i,
    color: env.palette.soft[i % env.palette.soft.length],
    x: 0, y: 0, slot: i, squish: 0, hop: 0, happy: 0, blinkAt: rand(1, 5),
    holder: null, grabDx: 0, grabDy: 0, startX: 0, startY: 0, dragging: false,
  }));
  const ripples = new Ripples();
  let size = 100;
  let rows = 1;
  let perRow = count;
  let now = 0;
  const conductor = { x: 0, y: 0, r: 46, bounce: 0 };
  let song: { at: number; slot: number }[] = [];

  const rowBase = (row: number) => (rows === 1 ? env.h * 0.56 : [env.h * 0.42, env.h * 0.68][row]);

  /** Where a slot sits: one row in landscape, two rows on tall narrow screens. Song order reads left→right, top→bottom. */
  function slotPos(slot: number) {
    const row = Math.floor(slot / perRow);
    const inRow = row === rows - 1 ? count - perRow * row : perRow;
    const col = slot - row * perRow;
    return { x: (env.w / (inRow + 1)) * (col + 1), y: rowBase(row) };
  }

  function layout() {
    rows = env.h > env.w * 1.2 && count > 3 ? 2 : 1;
    perRow = Math.ceil(count / rows);
    size = Math.min((env.w / (perRow + 1)) * 0.92, env.h * (rows === 1 ? 0.28 : 0.19), 150);
    conductor.r = Math.max(40, Math.min(56, env.h * 0.07));
    conductor.x = env.w / 2;
    conductor.y = env.h - conductor.r - Math.max(28, env.h * 0.06);
  }

  function sing(b: Blob, vel = 0.65) {
    b.squish = 1;
    b.happy = 0.8;
    env.audio.play(b.note, { vel, pan: panFor(b.x, env.w) });
  }

  function hit(x: number, y: number) {
    for (let i = blobs.length - 1; i >= 0; i--) {
      const b = blobs[i];
      if (dist(x, y, b.x, b.y - size * 0.4) < size * 0.62) return b;
    }
    return null;
  }

  function reorder(dragged: Blob) {
    // Place the dragged blob into the slot nearest to its x; everyone else shifts.
    const others = blobs.filter((b) => b !== dragged).sort((a, b) => a.slot - b.slot);
    let target = 0;
    let best = Infinity;
    for (let s = 0; s < count; s++) {
      const p = slotPos(s);
      const d = dist(p.x, p.y, dragged.x, dragged.y);
      if (d < best) { best = d; target = s; }
    }
    others.splice(target, 0, dragged);
    others.forEach((b, i) => {
      if (b.slot !== i && b !== dragged) b.hop = 0.5;
      b.slot = i;
    });
  }

  function drawBlob(b: Blob) {
    const s = size * (b.holder !== null ? 1.08 : 1);
    const sq = Math.sin(b.squish * Math.PI) * b.squish * 0.3;
    const breathe = Math.sin(now * 1.6 + b.note) * 0.025;
    const sx = 1 + sq + breathe;
    const sy = 1 - sq - breathe;
    const hopY = Math.sin(Math.min(1, b.hop * 2) * Math.PI) * size * 0.25;
    const baseY = b.y - hopY;
    ctx.save();
    ctx.translate(b.x, baseY);
    ctx.scale(sx, sy);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.ellipse(0, 4 + hopY / sy, s * 0.42, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    // jelly body (flat bottom, round top)
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.moveTo(-s * 0.48, 0);
    ctx.bezierCurveTo(-s * 0.55, -s * 0.55, -s * 0.3, -s * 0.9, 0, -s * 0.9);
    ctx.bezierCurveTo(s * 0.3, -s * 0.9, s * 0.55, -s * 0.55, s * 0.48, 0);
    ctx.quadraticCurveTo(0, s * 0.06, -s * 0.48, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.2, -s * 0.66, s * 0.1, s * 0.06, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const blink = (now % 6) > b.blinkAt && (now % 6) < b.blinkAt + 0.15;
    drawFace(ctx, b.x, baseY - s * 0.42 * sy, s * 0.9, env.palette.night ? '#2A2530' : '#3B3340', { happy: b.happy > 0, blink });
  }

  function drawConductor() {
    const c = conductor;
    const k = 1 + Math.sin(c.bounce * Math.PI) * 0.15;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(k, 1 / k);
    ctx.fillStyle = '#F6C978';
    ctx.beginPath();
    ctx.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawFace(ctx, c.x, c.y - c.r * 0.1, c.r * 1.6, '#4A3A2A', { happy: c.bounce > 0 || song.length > 0 });
    // little music note above
    ctx.fillStyle = env.palette.ink;
    ctx.globalAlpha = 0.5 + Math.sin(now * 2) * 0.2;
    const nx = c.x + c.r * 0.95, ny = c.y - c.r * 0.9;
    ctx.beginPath();
    ctx.ellipse(nx, ny, 8, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(nx + 5, ny - 26, 3, 26);
    ctx.globalAlpha = 1;
  }

  return {
    resize() {
      layout();
      for (const b of blobs) { const p = slotPos(b.slot); b.x = p.x; b.y = p.y; }
    },
    frame(dt, t) {
      now = t;
      conductor.bounce = Math.max(0, conductor.bounce - dt * 2);
      while (song.length && song[0].at <= t) {
        const step = song.shift()!;
        const b = blobs.find((o) => o.slot === step.slot);
        if (b) { sing(b, 0.55); b.hop = 0.5; }
      }
      for (const b of blobs) {
        b.squish = Math.max(0, b.squish - dt * 2.5);
        b.hop = Math.max(0, b.hop - dt);
        b.happy = Math.max(0, b.happy - dt);
        if (!b.dragging) {
          const p = slotPos(b.slot);
          b.x = approach(b.x, p.x, 9, dt);
          b.y = approach(b.y, p.y, 9, dt);
        }
      }
      ctx.fillStyle = env.palette.bg;
      ctx.fillRect(0, 0, env.w, env.h);
      // a soft stage
      ctx.fillStyle = env.palette.bg2;
      for (let r = 0; r < rows; r++) {
        ctx.beginPath();
        ctx.ellipse(env.w / 2, rowBase(r) + size * 0.05, env.w * 0.46, size * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      const order = blobs.slice().sort((a, b) => Number(a.dragging) - Number(b.dragging));
      for (const b of order) drawBlob(b);
      drawConductor();
      ripples.draw(ctx, dt);
    },
    down(id, x, y) {
      if (dist(x, y, conductor.x, conductor.y) < conductor.r + 20) {
        conductor.bounce = 1;
        if (song.length === 0) {
          for (let s = 0; s < count; s++) song.push({ at: now + 0.2 + s * 0.38, slot: s });
        }
        return;
      }
      const b = hit(x, y);
      if (!b || b.holder !== null) {
        ripples.add(x, y, env.palette.soft[3]);
        env.audio.play(1, { vel: 0.2, pan: panFor(x, env.w) });
        return;
      }
      b.holder = id;
      b.grabDx = b.x - x;
      b.grabDy = b.y - y;
      b.startX = x;
      b.startY = y;
      sing(b);
    },
    move(id, x, y) {
      const b = blobs.find((o) => o.holder === id);
      if (!b) return;
      if (!b.dragging && dist(x, y, b.startX, b.startY) > 12) b.dragging = true;
      if (b.dragging) {
        b.x = x + b.grabDx;
        b.y = y + b.grabDy;
        reorder(b);
      }
    },
    up(id) {
      const b = blobs.find((o) => o.holder === id);
      if (!b) return;
      if (b.dragging) sing(b, 0.45);
      b.holder = null;
      b.dragging = false;
    },
    invite() {
      const b = blobs[Math.floor(Math.random() * blobs.length)];
      b.hop = 0.5;
      b.happy = 0.6;
      conductor.bounce = 1;
    },
  };
};
