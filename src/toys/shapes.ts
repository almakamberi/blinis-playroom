import type { ToyFactory } from './types';
import { approach, dist, drawFace, panFor, Ripples, shuffle, Sparks, withAlpha } from './util';

type Kind = 'circle' | 'square' | 'triangle' | 'star' | 'heart';

interface Piece {
  kind: Kind;
  color: string;
  note: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  holeX: number;
  holeY: number;
  placed: boolean;
  holder: number | null;
  gdx: number;
  gdy: number;
  wiggle: number;
  shake: number; // on the hole: "not this one"
  pulse: number;
}

export function shapePath(ctx: CanvasRenderingContext2D, kind: Kind, x: number, y: number, s: number) {
  const h = s / 2;
  ctx.beginPath();
  switch (kind) {
    case 'circle':
      ctx.arc(x, y, h, 0, Math.PI * 2);
      break;
    case 'square':
      ctx.roundRect(x - h * 0.9, y - h * 0.9, s * 0.9, s * 0.9, s * 0.18);
      break;
    case 'triangle': {
      const pts = [0, 1, 2].map((i) => {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
        return [x + Math.cos(a) * h * 1.1, y + h * 0.15 + Math.sin(a) * h * 1.1];
      });
      ctx.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
      for (let i = 1; i <= 3; i++) {
        const p = pts[i % 3], q = pts[(i + 1) % 3];
        ctx.arcTo(p[0], p[1], q[0], q[1], s * 0.12);
      }
      ctx.closePath();
      break;
    }
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? h * 1.05 : h * 0.5;
        const px = x + Math.cos(a) * r, py = y + h * 0.05 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    case 'heart':
      ctx.moveTo(x, y + h * 0.85);
      ctx.bezierCurveTo(x - h * 1.3, y + h * 0.05, x - h * 0.75, y - h * 1.0, x, y - h * 0.35);
      ctx.bezierCurveTo(x + h * 0.75, y - h * 1.0, x + h * 1.3, y + h * 0.05, x, y + h * 0.85);
      ctx.closePath();
      break;
  }
}

/** Shape Friends: drag each shape into its matching hole. More shapes as the child grows. */
export const shapeFriends: ToyFactory = (ctx, env) => {
  const kinds: Kind[] = (['circle', 'square', 'triangle', 'star', 'heart'] as Kind[]).slice(0, [2, 3, 5][env.level]);
  const snapK = [1.0, 0.75, 0.6][env.level];
  let pieces: Piece[] = [];
  let size = 100;
  let celebrate = 0;
  let resetAt = 0;
  let now = 0;
  const sparks = new Sparks();
  const ripples = new Ripples();

  let boardTop = 0;
  let boardH = 0;

  function deal() {
    const n = kinds.length;
    const rows = env.h > env.w * 1.2 && n > 3 ? 2 : 1;
    const perRow = Math.ceil(n / rows);
    // Holes live in the top half, pieces in the lower half; keep clear of the corner bubbles.
    const top = 110, bottom = env.h - 110;
    const half = (bottom - top) / 2;
    size = Math.min((env.w / (perRow + 1)) * 0.8, (half / rows) * 0.62, 150);
    const pos = (i: number, bandTop: number) => {
      const row = Math.floor(i / perRow);
      const inRow = row === rows - 1 ? n - perRow * row : perRow;
      const col = i - row * perRow;
      return { x: (env.w / (inRow + 1)) * (col + 1), y: bandTop + (half / rows) * (row + 0.5) };
    };
    boardTop = top + 4;
    boardH = half - 8;
    const holeOrder = shuffle(kinds);
    const pieceOrder = shuffle(kinds);
    pieces = kinds.map((kind, k) => {
      const hole = pos(holeOrder.indexOf(kind), top);
      const home = pos(pieceOrder.indexOf(kind), top + half);
      const old = pieces.find((p) => p.kind === kind);
      return {
        kind,
        color: env.palette.soft[(k * 2 + 1) % env.palette.soft.length],
        note: [2, 4, 5, 7, 9][k],
        holeX: hole.x, holeY: hole.y,
        homeX: home.x, homeY: home.y,
        x: old?.x ?? home.x, y: old?.y ?? home.y,
        placed: false, holder: null, gdx: 0, gdy: 0, wiggle: 0.6, shake: 0, pulse: 0,
      };
    });
  }

  function drawPiece(p: Piece) {
    const lift = p.holder !== null ? 1.1 : 1;
    const wig = Math.sin(p.wiggle * 20) * p.wiggle * 0.25;
    const jump = celebrate > 0 ? Math.abs(Math.sin((celebrate + p.note) * 6)) * size * 0.15 : 0;
    ctx.save();
    ctx.translate(p.x, p.y - jump);
    ctx.rotate(wig);
    ctx.scale(lift, lift);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    shapePath(ctx, p.kind, 3, 6, size);
    ctx.fill();
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.08;
    shapePath(ctx, p.kind, 0, 0, size);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const fy = p.kind === 'triangle' ? size * 0.15 : p.kind === 'heart' ? -size * 0.05 : 0;
    drawFace(ctx, p.x, p.y - jump + fy, size * 0.75, env.palette.night ? '#2A2530' : '#3B3340', { happy: p.placed || p.wiggle > 0.3 });
  }

  function drawHole(p: Piece) {
    const shake = Math.sin(p.shake * 30) * p.shake * 8;
    const pul = 1 + Math.sin(p.pulse * Math.PI) * 0.08;
    ctx.save();
    ctx.translate(p.holeX + shake, p.holeY);
    ctx.scale(pul, pul);
    ctx.fillStyle = withAlpha(env.palette.ink, env.palette.night ? 0.25 : 0.12);
    ctx.strokeStyle = withAlpha(p.color, 0.9);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.setLineDash([12, 10]);
    shapePath(ctx, p.kind, 0, 0, size * 1.08);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function hit(x: number, y: number) {
    let best: Piece | null = null;
    let bd = size * 0.7;
    for (const p of pieces) {
      const d = dist(x, y, p.x, p.y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  return {
    resize() { deal(); },
    frame(dt, t) {
      now = t;
      celebrate = Math.max(0, celebrate - dt);
      if (resetAt && t > resetAt) {
        resetAt = 0;
        deal();
        env.audio.play(5, { vel: 0.3 });
      }
      for (const p of pieces) {
        p.wiggle = Math.max(0, p.wiggle - dt);
        p.shake = Math.max(0, p.shake - dt);
        p.pulse = Math.max(0, p.pulse - dt);
        if (p.holder === null) {
          const tx = p.placed ? p.holeX : p.homeX;
          const ty = p.placed ? p.holeY : p.homeY;
          p.x = approach(p.x, tx, 8, dt);
          p.y = approach(p.y, ty, 8, dt);
        }
      }
      ctx.fillStyle = env.palette.bg;
      ctx.fillRect(0, 0, env.w, env.h);
      // the shape board
      ctx.fillStyle = env.palette.bg2;
      ctx.beginPath();
      ctx.roundRect(env.w * 0.04, boardTop, env.w * 0.92, boardH, 36);
      ctx.fill();
      for (const p of pieces) drawHole(p);
      const order = pieces.slice().sort((a, b) => Number(a.holder !== null) - Number(b.holder !== null));
      for (const p of order) drawPiece(p);
      sparks.draw(ctx, dt);
      ripples.draw(ctx, dt);
    },
    down(id, x, y) {
      const p = hit(x, y);
      if (!p || p.holder !== null) {
        ripples.add(x, y, env.palette.soft[0]);
        env.audio.play(1, { vel: 0.2, pan: panFor(x, env.w) });
        return;
      }
      p.wiggle = 0.5;
      env.audio.play(p.note, { vel: 0.5, pan: panFor(x, env.w) });
      if (p.placed || resetAt) return; // placed pieces just wiggle and sing
      p.holder = id;
      p.gdx = p.x - x;
      p.gdy = p.y - y;
    },
    move(id, x, y) {
      const p = pieces.find((o) => o.holder === id);
      if (!p) return;
      p.x = x + p.gdx;
      p.y = y + p.gdy;
    },
    up(id) {
      const p = pieces.find((o) => o.holder === id);
      if (!p) return;
      p.holder = null;
      if (dist(p.x, p.y, p.holeX, p.holeY) < size * snapK) {
        p.placed = true;
        p.wiggle = 0.8;
        sparks.burst(p.holeX, p.holeY, p.color, 14, 220, 6);
        env.audio.arpeggio([p.note, p.note + 2, p.note + 5], 0.09, 0.55);
        if (pieces.every((o) => o.placed)) {
          celebrate = 2;
          resetAt = now + 3;
          setTimeout(() => env.audio.arpeggio([5, 7, 9, 10, 12, 15], 0.13, 0.5), 400);
          for (const o of pieces) sparks.burst(o.holeX, o.holeY, o.color, 10, 260, 6);
        }
        return;
      }
      // dropped on the wrong hole: the hole gives a tiny head-shake
      const wrong = pieces.find((o) => !o.placed && o !== p && dist(p.x, p.y, o.holeX, o.holeY) < size * 0.6);
      if (wrong) wrong.shake = 0.4;
      env.audio.play(p.note - 3, { vel: 0.3 });
    },
    invite() {
      const p = pieces.find((o) => !o.placed);
      if (p) { p.wiggle = 0.8; p.pulse = 1; }
    },
  };
};
