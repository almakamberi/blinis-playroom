import type { Palette } from '../settings/themes';
import type { ToyEnv, ToyFactory } from './types';
import { approach, clamp, dist, drawFace, panFor, rand, Ripples, Sparks, withAlpha } from './util';

interface Rect { x: number; y: number; w: number; h: number }

/** One gadget lives in one panel of the board and handles its own touches. */
interface Gadget {
  frame(dt: number, t: number): void;
  down(id: number, x: number, y: number): void;
  move(id: number, x: number, y: number): void;
  up(id: number, x: number, y: number): void;
  invite(): void;
}

interface Kit {
  ctx: CanvasRenderingContext2D;
  env: ToyEnv;
  r: Rect;
  ink: string;
  sparks: Sparks;
  p: Palette;
}

const cx = (r: Rect) => r.x + r.w / 2;
const cy = (r: Rect) => r.y + r.h / 2;
const size = (r: Rect) => Math.min(r.w, r.h);

/* ---------------- Doorbell: ding-dong ---------------- */

function doorbell({ ctx, env, r, ink, sparks }: Kit): Gadget {
  let press = 0, ring = 0;
  const s = size(r);
  const bx = cx(r), by = cy(r) + s * 0.12;
  return {
    frame(dt) {
      press = Math.max(0, press - dt * 4);
      ring = Math.max(0, ring - dt * 0.8);
      // bell
      const bellY = cy(r) - s * 0.25;
      ctx.save();
      ctx.translate(bx, bellY - s * 0.1);
      ctx.rotate(Math.sin(ring * 25) * ring * 0.5);
      ctx.fillStyle = '#F2C14E';
      ctx.beginPath();
      ctx.moveTo(-s * 0.13, s * 0.12);
      ctx.quadraticCurveTo(-s * 0.13, -s * 0.06, 0, -s * 0.06);
      ctx.quadraticCurveTo(s * 0.13, -s * 0.06, s * 0.13, s * 0.12);
      ctx.lineTo(s * 0.16, s * 0.16);
      ctx.lineTo(-s * 0.16, s * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath(); ctx.arc(0, s * 0.18, s * 0.035, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // sound waves
      if (ring > 0) {
        ctx.strokeStyle = withAlpha('#F2C14E', ring);
        ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (const side of [-1, 1]) for (let k = 1; k <= 2; k++) {
          ctx.beginPath();
          ctx.arc(bx, bellY, s * (0.15 + k * 0.07 * (1.6 - ring)), side < 0 ? Math.PI * 0.8 : -Math.PI * 0.2, side < 0 ? Math.PI * 1.2 : Math.PI * 0.2);
          ctx.stroke();
        }
      }
      // plaque + button
      ctx.fillStyle = withAlpha(ink, 0.2);
      ctx.beginPath(); ctx.roundRect(bx - s * 0.17, by - s * 0.22 + 5, s * 0.34, s * 0.44, s * 0.08); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.roundRect(bx - s * 0.17, by - s * 0.22, s * 0.34, s * 0.44, s * 0.08); ctx.fill();
      ctx.fillStyle = withAlpha(ink, 0.2);
      ctx.beginPath(); ctx.arc(bx, by + 3, s * 0.11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ring > 0.5 ? '#FFD86E' : '#5FAFE0';
      ctx.beginPath(); ctx.arc(bx, by + press * 3, s * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(bx - s * 0.03, by - s * 0.03 + press * 3, s * 0.03, 0, Math.PI * 2); ctx.fill();
    },
    down(_id, x) {
      press = 1;
      ring = 1;
      env.audio.play(9, { vel: 0.6, pan: panFor(x, env.w) });
      setTimeout(() => env.audio.play(5, { vel: 0.55, pan: panFor(x, env.w) }), 380);
      sparks.burst(bx, cy(r) - s * 0.25, '#F2C14E', 6, 80, 3);
    },
    move() {},
    up() {},
    invite() { ring = 0.4; },
  };
}

/* ---------------- Door with a slide bolt and a surprise behind it ---------------- */

const VISITORS = [
  { body: '#F6C978', face: '#4A3A2A' }, // Blini
  { body: '#7CCB7A', face: '#2F4A2E' }, // frog
  { body: '#F4A9C0', face: '#5A3040' }, // bunny-pink
  { body: '#8EC5E8', face: '#2F3F55' }, // blue blob
];

function door({ ctx, env, r, ink, sparks }: Kit, bolted: boolean): Gadget {
  const s = size(r);
  const dw = s * 0.5, dh = s * 0.78;
  const dx = cx(r) - dw / 2, dy = cy(r) - dh / 2;
  let open = 0, target = 0, shake = 0, locked = bolted, bolt = bolted ? 1 : 0, visitor = 0, wave = 0;
  return {
    frame(dt, t) {
      open = approach(open, target, 6, dt);
      bolt = approach(bolt, locked ? 1 : 0, 14, dt);
      shake = Math.max(0, shake - dt);
      wave = Math.max(0, wave - dt * 0.6);
      // frame + inside
      ctx.fillStyle = '#B8956A';
      ctx.beginPath(); ctx.roundRect(dx - 8, dy - 8, dw + 16, dh + 12, 10); ctx.fill();
      ctx.fillStyle = env.palette.night ? '#3A3443' : '#FFF4DE';
      ctx.fillRect(dx, dy, dw, dh);
      // who's behind the door?
      if (open > 0.05) {
        const v = VISITORS[visitor % VISITORS.length];
        const vy = dy + dh * 0.62 - Math.sin(wave * Math.PI) * 6;
        ctx.fillStyle = v.body;
        ctx.beginPath(); ctx.arc(cx(r), vy, dw * 0.34, 0, Math.PI * 2); ctx.fill();
        drawFace(ctx, cx(r), vy - dw * 0.04, dw * 0.6, v.face, { happy: wave > 0 });
        // waving hand
        ctx.fillStyle = v.body;
        ctx.beginPath();
        ctx.ellipse(cx(r) + dw * 0.36, vy - dw * 0.2 + Math.sin(t * 10) * 4 * (wave > 0 ? 1 : 0), dw * 0.08, dw * 0.12, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // the door panel, swinging on its left hinge
      const k = Math.cos(open * Math.PI * 0.46);
      const shk = Math.sin(shake * 40) * shake * 4;
      const pw = dw * k;
      ctx.fillStyle = '#E8676B';
      ctx.beginPath(); ctx.roundRect(dx + shk, dy, Math.max(4, pw), dh, 6); ctx.fill();
      if (k > 0.3) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(dx + pw * 0.15 + shk, dy + dh * 0.1, pw * 0.7, dh * 0.32, 6); ctx.stroke();
        ctx.beginPath(); ctx.roundRect(dx + pw * 0.15 + shk, dy + dh * 0.52, pw * 0.7, dh * 0.38, 6); ctx.stroke();
        ctx.fillStyle = '#F2C14E';
        ctx.beginPath(); ctx.arc(dx + pw * 0.82 + shk, dy + dh * 0.5, s * 0.03, 0, Math.PI * 2); ctx.fill();
      }
      // slide bolt on the frame
      if (bolted) {
        const by = dy + dh * 0.3;
        const bxFrame = dx + dw + 4;
        ctx.fillStyle = withAlpha(ink, 0.5);
        ctx.beginPath(); ctx.roundRect(bxFrame - 4, by - 9, 26, 18, 4); ctx.fill();
        const bx = bxFrame - bolt * 26;
        ctx.fillStyle = '#C9C2B8';
        ctx.beginPath(); ctx.roundRect(bx - 4, by - 6, 30, 12, 4); ctx.fill();
        ctx.fillStyle = '#9AA3AD';
        ctx.beginPath(); ctx.arc(bx + 12, by - 12, 9, 0, Math.PI * 2); ctx.fill();
      }
    },
    down(_id, x, y) {
      if (bolted && target === 0 && dist(x, y, dx + dw + 4, dy + dh * 0.3) < 48) {
        locked = !locked;
        env.audio.play(locked ? 2 : 6, { vel: 0.45, pan: panFor(x, env.w) });
        return;
      }
      if (target === 0 && locked) {
        shake = 0.5; // knock knock — still bolted
        env.audio.play(1, { vel: 0.4 });
        setTimeout(() => env.audio.play(1, { vel: 0.35 }), 180);
        return;
      }
      if (target === 0) {
        target = 1;
        visitor = (visitor + 1) % VISITORS.length;
        wave = 1;
        env.audio.arpeggio([5, 7, 9, 12], 0.09, 0.5);
        sparks.burst(cx(r), cy(r), '#F6C978', 10, 140, 4);
      } else {
        target = 0;
        env.audio.play(3, { vel: 0.4 });
      }
    },
    move() {},
    up() {},
    invite() { shake = 0.3; },
  };
}

/* ---------------- Water tap filling a cup ---------------- */

function waterTap({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  let running = false, handle = 0, fill = 0, flow = 0, nextDrip = 0, splash = 0, now = 0;
  const spoutX = cx(r) + s * 0.08, spoutY = cy(r) - s * 0.04;
  const pipeX = spoutX - s * 0.36;
  const cupX = spoutX, cupTop = cy(r) + s * 0.12, cupH = s * 0.28, cupW = s * 0.3;
  const water = '#7FC4EC';
  return {
    frame(dt, t) {
      now = t;
      handle = approach(handle, running ? 1 : 0, 10, dt);
      flow = approach(flow, running ? 1 : 0, 8, dt);
      splash = Math.max(0, splash - dt);
      if (running) {
        fill = Math.min(1.08, fill + dt * 0.14);
        if (fill >= 1 && splash === 0) {
          splash = 1.2;
          sparks.burst(cupX, cupTop, water, 10, 120, 4);
          env.audio.arpeggio([9, 10, 12], 0.08, 0.35);
        }
        if (t > nextDrip) {
          nextDrip = t + rand(0.25, 0.5);
          env.audio.play(Math.floor(rand(10, 14)), { vel: 0.12, pan: panFor(spoutX, env.w) });
        }
      } else {
        fill = Math.max(0, fill - dt * 0.04); // the cup slowly gets "drunk"
      }
      // pipe and tap
      ctx.fillStyle = '#B9C2CC';
      ctx.beginPath(); ctx.roundRect(pipeX, spoutY - s * 0.22, s * 0.08, s * 0.5, 6); ctx.fill();
      ctx.beginPath(); ctx.roundRect(pipeX, spoutY - s * 0.22, spoutX - pipeX + s * 0.04, s * 0.1, 10); ctx.fill();
      ctx.beginPath(); ctx.roundRect(spoutX - s * 0.04, spoutY - s * 0.17, s * 0.08, s * 0.12, 5); ctx.fill();
      // handle (rotates a quarter turn when on)
      const hx = spoutX - s * 0.16, hy = spoutY - s * 0.27;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(handle * Math.PI / 2);
      ctx.fillStyle = running ? '#5FAFE0' : '#E8676B';
      ctx.beginPath(); ctx.roundRect(-s * 0.12, -s * 0.03, s * 0.24, s * 0.06, 6); ctx.fill();
      ctx.beginPath(); ctx.roundRect(-s * 0.03, -s * 0.12, s * 0.06, s * 0.24, 6); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#9AA3AD';
      ctx.beginPath(); ctx.arc(hx, hy, s * 0.04, 0, Math.PI * 2); ctx.fill();
      // water stream
      const surface = cupTop + cupH * (1 - Math.min(1, fill));
      if (flow > 0.02) {
        ctx.strokeStyle = withAlpha(water, 0.85);
        ctx.lineCap = 'round';
        ctx.lineWidth = 10 * flow;
        ctx.beginPath();
        ctx.moveTo(spoutX, spoutY - s * 0.05);
        for (let k = 0; k <= 8; k++) {
          const yy = spoutY - s * 0.05 + ((surface - spoutY + s * 0.05) * k) / 8;
          ctx.lineTo(spoutX + Math.sin(now * 20 + k) * 1.5, yy);
        }
        ctx.stroke();
      }
      // cup
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cupX - cupW / 2, cupTop);
      ctx.lineTo(cupX - cupW * 0.4, cupTop + cupH);
      ctx.lineTo(cupX + cupW * 0.4, cupTop + cupH);
      ctx.lineTo(cupX + cupW / 2, cupTop);
      ctx.closePath();
      ctx.fillStyle = withAlpha('#FFFFFF', 0.55);
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = water;
      ctx.beginPath();
      ctx.moveTo(cupX - cupW, surface);
      for (let k = 0; k <= 10; k++) ctx.lineTo(cupX - cupW + (k / 10) * cupW * 2, surface + Math.sin(now * 5 + k) * 2.5);
      ctx.lineTo(cupX + cupW, cupTop + cupH + 5);
      ctx.lineTo(cupX - cupW, cupTop + cupH + 5);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = withAlpha(ink, 0.4); ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(cupX - cupW / 2, cupTop);
      ctx.lineTo(cupX - cupW * 0.4, cupTop + cupH);
      ctx.lineTo(cupX + cupW * 0.4, cupTop + cupH);
      ctx.lineTo(cupX + cupW / 2, cupTop);
      ctx.stroke();
      if (fill > 0.98) drawFace(ctx, cupX, cupTop + cupH * 0.55, cupW * 0.8, ink, { happy: true });
    },
    down() {
      running = !running;
      env.audio.arpeggio(running ? [12, 10, 9] : [4, 2], 0.07, 0.4);
    },
    move() {},
    up() {},
    invite() { if (!running) sparks.burst(spoutX, spoutY, water, 3, 40, 3); },
  };
}

/* ---------------- Padlock and key ---------------- */

function padlock({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const hookX = r.x + r.w * 0.25, hookY = cy(r) - s * 0.22;
  const lockX = r.x + r.w * 0.66, lockY = cy(r) + s * 0.08;
  const key = { x: hookX, y: hookY + s * 0.18, holder: null as number | null, gdx: 0, gdy: 0, turn: 0, inLock: false };
  let open = 0, isOpen = false, rattle = 0;
  function drawKey() {
    ctx.save();
    ctx.translate(key.x, key.y);
    ctx.rotate(key.inLock ? -Math.PI / 2 + key.turn * Math.PI / 2 : 0);
    ctx.fillStyle = '#F2C14E';
    ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = withAlpha('#FFFFFF', 0.6);
    ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F2C14E';
    ctx.fillRect(-s * 0.02, -s * 0.04, s * 0.04, s * 0.18);
    ctx.fillRect(0, s * 0.06, s * 0.05, s * 0.025);
    ctx.fillRect(0, s * 0.1, s * 0.04, s * 0.025);
    ctx.restore();
  }
  return {
    frame(dt) {
      open = approach(open, isOpen ? 1 : 0, 10, dt);
      rattle = Math.max(0, rattle - dt);
      if (key.inLock && !isOpen) {
        key.turn = Math.min(1, key.turn + dt * 2.5);
        if (key.turn >= 1) {
          isOpen = true;
          env.audio.arpeggio([7, 9, 12, 14], 0.08, 0.5);
          sparks.burst(lockX, lockY - s * 0.15, '#F2C14E', 12, 160, 4);
        }
      }
      if (key.holder === null && !key.inLock) {
        key.x = approach(key.x, hookX, 10, dt);
        key.y = approach(key.y, hookY + s * 0.18, 10, dt);
      }
      // hook
      ctx.strokeStyle = withAlpha(ink, 0.5); ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hookX, hookY - s * 0.06); ctx.lineTo(hookX, hookY + s * 0.02); ctx.arc(hookX + s * 0.03, hookY + s * 0.02, s * 0.03, Math.PI, 0, true); ctx.stroke();
      // lock
      const rx = Math.sin(rattle * 40) * rattle * 5;
      const lw = s * 0.34, lh = s * 0.28;
      ctx.strokeStyle = '#9AA3AD'; ctx.lineWidth = s * 0.05;
      ctx.beginPath();
      const shY = lockY - lh / 2 - open * s * 0.1;
      ctx.moveTo(lockX - lw * 0.28 + rx, lockY - lh / 2 + (open > 0.5 ? -open * s * 0.1 : 0));
      ctx.lineTo(lockX - lw * 0.28 + rx, shY - s * 0.06);
      ctx.arc(lockX + rx, shY - s * 0.06, lw * 0.28, Math.PI, 0);
      ctx.lineTo(lockX + lw * 0.28 + rx, shY + s * 0.02);
      ctx.stroke();
      ctx.fillStyle = '#E8676B';
      ctx.beginPath(); ctx.roundRect(lockX - lw / 2 + rx, lockY - lh / 2, lw, lh, s * 0.06); ctx.fill();
      ctx.fillStyle = withAlpha(ink, 0.7);
      ctx.beginPath(); ctx.arc(lockX + rx, lockY - lh * 0.05, s * 0.025, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(lockX - s * 0.01 + rx, lockY - lh * 0.05, s * 0.02, lh * 0.25);
      if (isOpen) drawFace(ctx, lockX, lockY + lh * 0.1, lw * 0.7, ink, { happy: true });
      drawKey();
    },
    down(id, x, y) {
      if (!key.inLock && dist(x, y, key.x, key.y) < s * 0.2) {
        key.holder = id; key.gdx = key.x - x; key.gdy = key.y - y;
        env.audio.play(10, { vel: 0.25 });
        return;
      }
      if (isOpen) {
        // click it shut; the key goes home
        isOpen = false; key.inLock = false; key.turn = 0;
        env.audio.play(2, { vel: 0.5 });
        return;
      }
      rattle = 0.5;
      env.audio.play(1, { vel: 0.3, pan: panFor(x, env.w) });
    },
    move(id, x, y) {
      if (key.holder !== id) return;
      key.x = x + key.gdx; key.y = y + key.gdy;
    },
    up(id) {
      if (key.holder !== id) return;
      key.holder = null;
      if (dist(key.x, key.y + s * 0.1, lockX, lockY) < s * 0.25) {
        key.inLock = true; key.turn = 0;
        key.x = lockX + s * 0.13; key.y = lockY - s * 0.01;
        env.audio.play(5, { vel: 0.4 });
      }
    },
    invite() { rattle = 0.3; },
  };
}

/* ---------------- Dial with a ring of lights ---------------- */

function dial({ ctx, env, r, ink }: Kit): Gadget {
  const s = size(r);
  const x0 = cx(r), y0 = cy(r);
  const lights = 10;
  let value = 0, holder: number | null = null, lit = 0;
  return {
    frame() {
      const R = s * 0.34;
      for (let i = 0; i < lights; i++) {
        const a = -Math.PI / 2 + (i / lights) * Math.PI * 2;
        const on = i < lit;
        ctx.fillStyle = on ? ['#E8676B', '#F2C14E', '#6CC17A', '#5FAFE0', '#B8A2E3'][i % 5] : withAlpha(ink, 0.15);
        ctx.beginPath(); ctx.arc(x0 + Math.cos(a) * R, y0 + Math.sin(a) * R, s * 0.045, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = withAlpha(ink, 0.2);
      ctx.beginPath(); ctx.arc(x0, y0 + 5, s * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(x0, y0, s * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = withAlpha(ink, 0.12); ctx.lineWidth = 3;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + value * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x0 + Math.cos(a) * s * 0.19, y0 + Math.sin(a) * s * 0.19);
        ctx.lineTo(x0 + Math.cos(a) * s * 0.22, y0 + Math.sin(a) * s * 0.22);
        ctx.stroke();
      }
      const pa = -Math.PI / 2 + value * Math.PI * 2;
      ctx.strokeStyle = '#E8676B'; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(pa) * s * 0.15, y0 + Math.sin(pa) * s * 0.15); ctx.stroke();
    },
    down(id, x, y) { holder = id; this.move(id, x, y); },
    move(id, x, y) {
      if (holder !== id) return;
      let a = Math.atan2(y - y0, x - x0) + Math.PI / 2;
      if (a < 0) a += Math.PI * 2;
      value = a / (Math.PI * 2);
      const n = Math.round(value * lights);
      if (n !== lit) {
        lit = n;
        if (n > 0) env.audio.play(n, { vel: 0.4, pan: panFor(x, env.w) });
        else env.audio.play(0, { vel: 0.25 });
      }
    },
    up(id) { if (holder === id) holder = null; },
    invite() { lit = Math.min(lights, lit + 1); setTimeout(() => (lit = Math.max(0, lit - 1)), 600); },
  };
}

/* ---------------- Zipper pouch ---------------- */

function zipper({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const zx = cx(r), top = cy(r) - s * 0.36, bottom = cy(r) + s * 0.36;
  const pw = s * 0.62;
  let v = 0, holder: number | null = null, step = 0, done = false;
  const tabY = () => top + v * (bottom - top);
  return {
    frame(_dt, t) {
      // pouch
      ctx.fillStyle = '#5FAFE0';
      ctx.beginPath(); ctx.roundRect(zx - pw / 2, top - s * 0.04, pw, bottom - top + s * 0.08, s * 0.08); ctx.fill();
      // opening: a lens shape from the top down to the tab
      const ty = tabY();
      const open = Math.min(1, v * 1.4) * s * 0.18;
      if (v > 0.02) {
        ctx.fillStyle = env.palette.night ? '#2E2A36' : '#FFF4DE';
        ctx.beginPath();
        ctx.moveTo(zx, top);
        ctx.quadraticCurveTo(zx - open * 1.6, (top + ty) / 2, zx, ty);
        ctx.quadraticCurveTo(zx + open * 1.6, (top + ty) / 2, zx, top);
        ctx.fill();
        if (v > 0.5) {
          // a little star hiding inside
          const sy = (top + ty) / 2;
          const sr = open * 0.6 * (1 + Math.sin(t * 4) * 0.05);
          ctx.fillStyle = '#F2C14E';
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + (i * Math.PI) / 5;
            const rr = i % 2 === 0 ? sr : sr * 0.5;
            if (i === 0) ctx.moveTo(zx + Math.cos(a) * rr, sy + Math.sin(a) * rr); else ctx.lineTo(zx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
          }
          ctx.closePath(); ctx.fill();
        }
      }
      // teeth below the tab (still closed)
      ctx.fillStyle = withAlpha('#FFFFFF', 0.85);
      for (let y = ty + 10; y < bottom; y += 9) {
        ctx.fillRect(zx - 6, y, 6, 4);
        ctx.fillRect(zx, y + 4, 6, 4);
      }
      // tab
      ctx.fillStyle = '#C9C2B8';
      ctx.beginPath(); ctx.roundRect(zx - 12, ty - 8, 24, 18, 6); ctx.fill();
      ctx.fillStyle = '#E8676B';
      ctx.beginPath(); ctx.roundRect(zx - 14, ty + 6, 28, 34, 10); ctx.fill();
      ctx.fillStyle = withAlpha(ink, 0.3);
      ctx.beginPath(); ctx.roundRect(zx - 5, ty + 16, 10, 16, 5); ctx.fill();
    },
    down(id, x, y) {
      if (Math.abs(x - zx) < 50 && Math.abs(y - (tabY() + 20)) < 50) {
        holder = id;
        env.audio.play(6, { vel: 0.3 });
      } else {
        env.audio.play(1, { vel: 0.2 });
      }
    },
    move(id, _x, y) {
      if (holder !== id) return;
      v = clamp((y - 20 - top) / (bottom - top), 0, 1);
      const st = Math.round(v * 8);
      if (st !== step) { step = st; env.audio.play(2 + st, { vel: 0.22 }); }
      if (v > 0.97 && !done) {
        done = true;
        sparks.burst(zx, (top + bottom) / 2, '#F2C14E', 12, 160, 4);
        env.audio.arpeggio([9, 12, 14], 0.09, 0.45);
      }
      if (v < 0.5) done = false;
    },
    up(id) { if (holder === id) holder = null; },
    invite() { v = Math.min(v + 0.08, 1); },
  };
}

/* ---------------- The board ---------------- */

/** Home Gadgets: doorbell, door with a bolt, water tap, padlock and key, dial and zipper. */
export const homeGadgets: ToyFactory = (ctx, env) => {
  const kinds = [
    ['bell', 'door', 'tap'],
    ['bell', 'door', 'tap', 'lock'],
    ['bell', 'door', 'tap', 'lock', 'dial', 'zip'],
  ][env.level];
  let cells: { r: Rect; g: Gadget }[] = [];
  const owner = new Map<number, Gadget>();
  const sparks = new Sparks();
  const ripples = new Ripples();
  const ink = env.palette.night ? '#2A2530' : '#3B3340';

  function layout() {
    const n = kinds.length;
    const portrait = env.h > env.w * 1.1;
    const top = portrait ? 104 : 14, side = portrait ? 16 : 104;
    const W = env.w - side * 2, H = env.h - top * 2;
    const cols = portrait ? (n === 3 ? 1 : 2) : n === 6 ? 3 : n;
    const rows = Math.ceil(n / cols);
    const gap = 10;
    const cw = (W - gap * (cols - 1)) / cols, ch = (H - gap * (rows - 1)) / rows;
    owner.clear();
    cells = kinds.map((k, i) => {
      const r: Rect = { x: side + (i % cols) * (cw + gap), y: top + Math.floor(i / cols) * (ch + gap), w: cw, h: ch };
      const kit: Kit = { ctx, env, r, ink, sparks, p: env.palette };
      const g =
        k === 'bell' ? doorbell(kit)
        : k === 'door' ? door(kit, env.level > 0)
        : k === 'tap' ? waterTap(kit)
        : k === 'lock' ? padlock(kit)
        : k === 'dial' ? dial(kit)
        : zipper(kit);
      return { r, g };
    });
  }

  const at = (x: number, y: number) => cells.find(({ r }) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);

  return {
    resize() { layout(); },
    frame(dt, t) {
      ctx.fillStyle = env.palette.bg;
      ctx.fillRect(0, 0, env.w, env.h);
      for (const { r, g } of cells) {
        ctx.fillStyle = env.palette.night ? '#3C342E' : '#D9BC91';
        ctx.beginPath(); ctx.roundRect(r.x, r.y + 5, r.w, r.h, 22); ctx.fill();
        ctx.fillStyle = env.palette.night ? '#4A4038' : '#EBD3AE';
        ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 22); ctx.fill();
        ctx.fillStyle = withAlpha(ink, 0.2);
        for (const [sx, sy] of [[r.x + 14, r.y + 14], [r.x + r.w - 14, r.y + 14], [r.x + 14, r.y + r.h - 14], [r.x + r.w - 14, r.y + r.h - 14]]) {
          ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
        }
        g.frame(dt, t);
      }
      sparks.draw(ctx, dt);
      ripples.draw(ctx, dt);
    },
    down(id, x, y) {
      const c = at(x, y);
      if (!c) {
        ripples.add(x, y, env.palette.soft[2]);
        env.audio.play(1, { vel: 0.18, pan: panFor(x, env.w) });
        return;
      }
      owner.set(id, c.g);
      c.g.down(id, x, y);
    },
    move(id, x, y) { owner.get(id)?.move(id, x, y); },
    up(id, x, y) {
      owner.get(id)?.up(id, x, y);
      owner.delete(id);
    },
    invite() {
      const c = cells[Math.floor(Math.random() * cells.length)];
      c?.g.invite();
    },
  };
};
