import type { ToyFactory } from './types';
import { ANIMALS, bodyColour, drawAnimal, speak, type AnimalKind } from './animals';
import { approach, clamp, dist, panFor, shuffle, Sparks, withAlpha } from './util';

type Shape = 'circle' | 'star' | 'heart' | 'triangle' | 'square' | 'moon';
const SHAPES: Shape[] = ['circle', 'star', 'heart', 'triangle', 'square', 'moon'];
const COLOURS = ['#E8676B', '#5FAFE0', '#F2C14E', '#6CC17A', '#B8A2E3', '#F2A65A'];
const GOLD = '#F2C14E';

function shapePath(ctx: CanvasRenderingContext2D, shape: Shape, x: number, y: number, r: number) {
  ctx.beginPath();
  switch (shape) {
    case 'circle': ctx.arc(x, y, r, 0, Math.PI * 2); break;
    case 'square': ctx.roundRect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7, r * 0.3); break;
    case 'triangle': ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r * 0.8); ctx.lineTo(x - r, y + r * 0.8); ctx.closePath(); break;
    case 'heart':
      ctx.moveTo(x, y + r * 0.9);
      ctx.bezierCurveTo(x - r * 1.5, y, x - r * 0.8, y - r * 1.2, x, y - r * 0.4);
      ctx.bezierCurveTo(x + r * 0.8, y - r * 1.2, x + r * 1.5, y, x, y + r * 0.9);
      break;
    case 'moon':
      ctx.arc(x, y, r, Math.PI * 0.35, Math.PI * 1.65);
      ctx.arc(x + r * 0.45, y - r * 0.1, r * 0.75, Math.PI * 1.45, Math.PI * 0.55, true);
      ctx.closePath();
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? r * 1.1 : r * 0.5;
        if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
      break;
  }
}

interface Door {
  x: number; y: number; w: number; h: number;
  colour: string; lockColour: string; shape: Shape; animal: AnimalKind;
  state: 'locked' | 'turning' | 'open';
  open: number; turn: number; shake: number; bounce: number; talkUntil: number;
  lock: { x: number; y: number; vy: number; fall: boolean; alpha: number };
}
interface Key {
  colour: string; shape: Shape; door: Door;
  x: number; y: number; homeX: number; homeY: number;
  holder: number | null; gdx: number; gdy: number; used: boolean; wiggle: number;
}

/** Keys & Locks: little doors with padlocks; the right key opens each one and a friend says hello. */
export const keysAndLocks: ToyFactory = (ctx, env) => {
  const n = [3, 4, 6][env.level];
  const match: 'any' | 'colour' | 'shape' = (['any', 'colour', 'shape'] as const)[env.level];
  let doors: Door[] = [];
  let keys: Key[] = [];
  let party = 0, resetAt = 0, now = 0, keySize = 40;
  const sparks = new Sparks();
  const ink = env.palette.night ? '#2A2530' : '#3B3340';

  function deal() {
    const portrait = env.h > env.w * 1.1;
    const keyRowH = portrait ? 150 : 120;
    const top = portrait ? 104 : 14;
    const side = portrait ? 16 : 104;
    const bottom = env.h - (portrait ? 104 : 10) - keyRowH;
    const cols = portrait ? (n === 4 ? 2 : 3) : n === 6 ? 3 : n;
    const rows = Math.ceil(n / cols);
    const cw = (env.w - side * 2) / cols, ch = (bottom - top) / rows;
    const dw = Math.min(cw * 0.78, ch * 0.62), dh = Math.min(dw * 1.5, ch * 0.88);
    const animals = shuffle(ANIMALS).slice(0, n);
    const shapes = shuffle(SHAPES).slice(0, n);
    doors = Array.from({ length: n }, (_, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = side + cw * (c + 0.5) - dw / 2, y = top + ch * (r + 0.5) - dh / 2;
      const lx = x + dw * 0.72, ly = y + dh * 0.55;
      return {
        x, y, w: dw, h: dh,
        colour: COLOURS[i % COLOURS.length],
        lockColour: match === 'shape' ? GOLD : COLOURS[i % COLOURS.length],
        shape: shapes[i], animal: animals[i],
        state: 'locked', open: 0, turn: 0, shake: 0, bounce: 0, talkUntil: 0,
        lock: { x: lx, y: ly, vy: 0, fall: false, alpha: 1 },
      };
    });
    keySize = Math.min(54, (env.w - side * 2) / n * 0.42);
    const kx0 = portrait ? 30 : 110, kx1 = env.w - kx0;
    const ky = env.h - (portrait ? 104 : 10) - keyRowH / 2;
    keys = shuffle(doors).map((d, i) => {
      const homeX = kx0 + ((kx1 - kx0) / n) * (i + 0.5);
      return {
        colour: d.lockColour, shape: d.shape, door: d,
        x: homeX, y: ky - 30, homeX, homeY: ky,
        holder: null, gdx: 0, gdy: 0, used: false, wiggle: 0.5,
      };
    });
    party = 0;
  }

  const fits = (k: Key, d: Door) => match === 'any' || (match === 'colour' ? k.colour === d.lockColour : k.shape === d.shape);

  function greet(d: Door) {
    d.bounce = 1;
    const dur = speak((nn, o) => env.audio.play(nn, { ...o, pan: panFor(d.x, env.w) }), d.animal);
    d.talkUntil = now + dur;
  }

  /* ---------- drawing ---------- */

  function drawKey(k: Key) {
    const s = keySize;
    ctx.save();
    ctx.translate(k.x, k.y);
    const turning = k.used && k.door.state === 'turning';
    ctx.rotate(turning ? -Math.PI / 2 + k.door.turn * Math.PI / 2 : Math.sin(k.wiggle * 18) * k.wiggle * 0.3);
    if (k.holder !== null) ctx.scale(1.1, 1.1);
    ctx.fillStyle = k.colour;
    ctx.fillRect(-s * 0.08, 0, s * 0.16, s * 0.9);
    ctx.fillRect(0, s * 0.62, s * 0.24, s * 0.1);
    ctx.fillRect(0, s * 0.78, s * 0.18, s * 0.1);
    shapePath(ctx, k.shape, 0, -s * 0.15, s * 0.42);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    shapePath(ctx, k.shape, 0, -s * 0.15, s * 0.16);
    ctx.fill();
    ctx.restore();
  }

  function drawDoor(d: Door) {
    const shake = Math.sin(d.shake * 40) * d.shake * 5;
    // the room behind
    ctx.fillStyle = withAlpha(d.colour, 0.25);
    ctx.beginPath(); ctx.roundRect(d.x - 6, d.y - 6, d.w + 12, d.h + 10, 14); ctx.fill();
    ctx.fillStyle = env.palette.night ? '#3A3443' : '#FFF4DE';
    ctx.beginPath(); ctx.roundRect(d.x, d.y, d.w, d.h, 10); ctx.fill();
    if (d.open > 0.05) {
      const talk = now < d.talkUntil ? Math.abs(Math.sin(now * 16)) : 0;
      const by = d.y + d.h * 0.58 - Math.sin(d.bounce * Math.PI) * d.h * 0.08;
      drawAnimal(ctx, d.animal, d.x + d.w / 2, by, d.w * 0.8, now, { talk, happy: party > 0 || d.bounce > 0.6 });
    }
    // door panel swings on the left hinge
    const k = Math.cos(d.open * Math.PI * 0.47);
    const pw = Math.max(4, d.w * k);
    ctx.fillStyle = d.colour;
    ctx.beginPath(); ctx.roundRect(d.x + shake, d.y, pw, d.h, 10); ctx.fill();
    if (k > 0.35) {
      // little round window with someone peeking
      const wx = d.x + pw / 2 + shake, wy = d.y + d.h * 0.24, wr = d.w * 0.17 * k;
      ctx.fillStyle = withAlpha(bodyColour(d.animal), 0.9);
      ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.fill();
      const blink = (now + d.x) % 4 < 0.15;
      ctx.fillStyle = ink;
      for (const sx of [-1, 1]) {
        if (blink) ctx.fillRect(wx + sx * wr * 0.35 - 3, wy, 6, 2);
        else { ctx.beginPath(); ctx.arc(wx + sx * wr * 0.35, wy + wr * 0.1, Math.max(2, wr * 0.13), 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(d.x + pw * 0.15 + shake, d.y + d.h * 0.48, pw * 0.7, d.h * 0.42, 8); ctx.stroke();
      ctx.fillStyle = '#F7E3A8';
      ctx.beginPath(); ctx.arc(d.x + pw * 0.82 + shake, d.y + d.h * 0.5, d.w * 0.045, 0, Math.PI * 2); ctx.fill();
    }
    // padlock
    const L = d.lock;
    if (L.alpha > 0.01) {
      const ls = d.w * 0.3;
      ctx.globalAlpha = L.alpha;
      const lx = L.x + (d.state === 'locked' ? shake : 0);
      const open = d.state !== 'locked' ? Math.min(1, d.turn * 1.5) : 0;
      ctx.strokeStyle = '#9AA3AD'; ctx.lineWidth = ls * 0.14;
      ctx.beginPath(); ctx.arc(lx, L.y - ls * 0.45 - open * ls * 0.25, ls * 0.28, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = d.lockColour;
      ctx.beginPath(); ctx.roundRect(lx - ls / 2, L.y - ls * 0.45, ls, ls * 0.85, ls * 0.18); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      shapePath(ctx, d.shape, lx, L.y - ls * 0.02, ls * 0.24);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  return {
    resize() { deal(); },
    frame(dt, t) {
      now = t;
      if (resetAt && t > resetAt) { resetAt = 0; deal(); env.audio.arpeggio([4, 2, 0], 0.1, 0.3); }
      party = Math.max(0, party - dt);
      for (const d of doors) {
        d.shake = Math.max(0, d.shake - dt);
        d.bounce = Math.max(0, d.bounce - dt * 1.5);
        if (d.state === 'turning') {
          d.turn = Math.min(1, d.turn + dt * 2.2);
          if (d.turn >= 1) {
            d.state = 'open';
            d.lock.fall = true;
            d.lock.vy = -120;
            sparks.burst(d.lock.x, d.lock.y, d.lockColour, 12, 160, 4);
            greet(d);
            if (doors.every((o) => o.state === 'open')) {
              party = 3;
              resetAt = t + 5;
              setTimeout(() => {
                env.audio.arpeggio([5, 7, 9, 10, 12, 14, 17], 0.12, 0.5);
                doors.forEach((o, i) => setTimeout(() => { o.bounce = 1; }, i * 150));
              }, 900);
            }
          }
        }
        d.open = approach(d.open, d.state === 'open' ? 1 : 0, 5, dt);
        if (d.lock.fall) {
          d.lock.vy += 900 * dt;
          d.lock.y += d.lock.vy * dt;
          d.lock.alpha = Math.max(0, d.lock.alpha - dt * 0.8);
        }
      }
      for (const k of keys) {
        k.wiggle = Math.max(0, k.wiggle - dt);
        if (k.used) {
          const d = k.door;
          k.x = d.lock.x + keySize * 0.05;
          k.y = d.lock.y + keySize * 0.15;
        } else if (k.holder === null) {
          k.x = approach(k.x, k.homeX, 10, dt);
          k.y = approach(k.y, k.homeY, 10, dt);
        }
      }

      ctx.fillStyle = env.palette.bg;
      ctx.fillRect(0, 0, env.w, env.h);
      // a little brick street wall
      ctx.fillStyle = env.palette.bg2;
      const portrait = env.h > env.w * 1.1;
      const wallBottom = env.h - (portrait ? 104 : 10) - (portrait ? 150 : 120);
      ctx.fillRect(0, 0, env.w, wallBottom + 8);
      ctx.strokeStyle = withAlpha(ink, 0.06); ctx.lineWidth = 2;
      for (let y = 20, row = 0; y < wallBottom; y += 28, row++) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(env.w, y); ctx.stroke();
        for (let x = (row % 2) * 30; x < env.w; x += 60) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 28); ctx.stroke(); }
      }
      // key hooks rail
      ctx.fillStyle = '#B8956A';
      const ky = keys[0]?.homeY ?? env.h - 160;
      ctx.beginPath(); ctx.roundRect(keys.length ? Math.min(...keys.map((k) => k.homeX)) - 40 : 0, ky - keySize * 0.75, (keys.length ? Math.max(...keys.map((k) => k.homeX)) - Math.min(...keys.map((k) => k.homeX)) : 0) + 80, 14, 7); ctx.fill();
      for (const d of doors) drawDoor(d);
      const order = keys.slice().sort((a, b) => Number(a.holder !== null) - Number(b.holder !== null));
      for (const k of order) if (!(k.used && k.door.lock.alpha < 0.05)) {
        ctx.globalAlpha = k.used ? k.door.lock.alpha : 1;
        drawKey(k);
        ctx.globalAlpha = 1;
      }
      sparks.draw(ctx, dt);
    },
    down(id, x, y) {
      for (let i = keys.length - 1; i >= 0; i--) {
        const k = keys[i];
        if (!k.used && k.holder === null && dist(x, y, k.x, k.y + keySize * 0.2) < keySize * 0.9) {
          k.holder = id; k.gdx = k.x - x; k.gdy = k.y - y;
          env.audio.play(10, { vel: 0.3, pan: panFor(x, env.w) });
          return;
        }
      }
      for (const d of doors) {
        if (x > d.x && x < d.x + d.w && y > d.y && y < d.y + d.h) {
          if (d.state === 'open') return greet(d);
          d.shake = 0.5; // knock knock — someone's in there!
          env.audio.play(1, { vel: 0.45 });
          setTimeout(() => env.audio.play(1, { vel: 0.4 }), 200);
          const k = keys.find((o) => o.door === d && !o.used);
          if (k && match !== 'any') k.wiggle = 0.8; // hint: this is the key
          return;
        }
      }
      env.audio.play(2, { vel: 0.15 });
    },
    move(id, x, y) {
      const k = keys.find((o) => o.holder === id);
      if (!k) return;
      k.x = clamp(x + k.gdx, 20, env.w - 20);
      k.y = clamp(y + k.gdy, 20, env.h - 20);
    },
    up(id) {
      const k = keys.find((o) => o.holder === id);
      if (!k) return;
      k.holder = null;
      const d = doors.find((o) => o.state === 'locked' && dist(k.x, k.y + keySize * 0.4, o.lock.x, o.lock.y) < o.w * 0.4);
      if (!d) return;
      if (fits(k, d)) {
        // in goes the key; if babies use "any" key, swap partners so every door still gets one
        if (k.door !== d) {
          const other = keys.find((o) => o.door === d && !o.used);
          if (other) other.door = k.door;
          k.door = d;
        }
        k.used = true;
        d.state = 'turning';
        d.turn = 0;
        env.audio.arpeggio([5, 7], 0.12, 0.45);
      } else {
        d.shake = 0.5;
        k.wiggle = 0.6;
        env.audio.play(0, { vel: 0.35 });
      }
    },
    invite() {
      const k = keys.find((o) => !o.used);
      if (k) k.wiggle = 0.9;
    },
  };
};
