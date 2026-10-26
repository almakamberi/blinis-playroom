import type { ToyFactory } from './types';
import { approach, clamp, dist, drawFace, lerp, panFor, pick, rand, Sparks } from './util';

interface Seed { x: number; y: number; vy: number; groundY: number; color: string }
interface Plant {
  x: number;
  baseY: number;
  height: number;
  grow: number; // 0..1
  stage: number; // notes played so far
  color: string;
  phase: number;
  sway: number;
  petals: number;
  leaving: number; // >0: shrinking away
  born: number;
}
interface Visitor {
  kind: 'ladybird' | 'frog';
  x: number;
  y: number;
  tx: number;
  ty: number;
  target: Plant | null;
  hop: number;
  face: number; // 1 right, -1 left
}

/** Little Garden: tap to drop seeds; flowers grow; a ladybird and a frog come to visit. */
export const littleGarden: ToyFactory = (ctx, env) => {
  const growTime = [2.2, 3, 3.6][env.level];
  const maxPlants = [5, 7, 9][env.level];
  let seeds: Seed[] = [];
  let plants: Plant[] = [];
  const visitors: Visitor[] = [];
  const sparks = new Sparks();
  let groundTop = 0;
  let sun = { x: 0, y: 0, r: 44, glow: 0 };
  let breeze = 0;
  let now = 0;

  const flowerColours = () => env.palette.soft.filter((_, i) => i !== 2);
  const grass = env.palette.night ? '#4E5F4E' : '#A9D69A';
  const grassDark = env.palette.night ? '#3F4E40' : '#8CC27E';
  const bloomed = () => plants.filter((p) => p.grow >= 1 && p.leaving === 0);
  const headOf = (p: Plant) => {
    const sw = Math.sin(now * 1.3 + p.phase) * (4 + p.sway * 30 + breeze * 25);
    return { x: p.x + sw, y: p.baseY - p.height * easeGrow(p.grow) };
  };
  const easeGrow = (g: number) => 1 - (1 - g) * (1 - g);

  function plantSeed(x: number, groundY: number, color: string) {
    const live = plants.filter((p) => p.leaving === 0);
    if (live.length >= maxPlants) live.reduce((a, b) => (a.born < b.born ? a : b)).leaving = 1;
    plants.push({
      x, baseY: groundY, height: rand(0.22, 0.4) * env.h, grow: 0, stage: 0, color,
      phase: rand(0, 6), sway: 0, petals: pick([5, 6, 7]), leaving: 0, born: now,
    });
    plants.sort((a, b) => a.baseY - b.baseY);
    env.audio.play(2, { vel: 0.4, pan: panFor(x, env.w) });
  }

  function sendVisitor(v: Visitor) {
    const options = bloomed().filter((p) => p !== v.target);
    const target = options.length ? pick(options) : null;
    v.target = target;
    if (v.kind === 'frog') {
      v.tx = target ? clamp(target.x + rand(-60, 60), 40, env.w - 40) : rand(60, env.w - 60);
      v.ty = groundTop + (env.h - groundTop) * 0.55;
    }
  }

  function updateVisitors(dt: number) {
    const n = bloomed().length;
    if (n >= 2 && !visitors.some((v) => v.kind === 'ladybird')) {
      const v: Visitor = { kind: 'ladybird', x: -30, y: env.h * 0.2, tx: 0, ty: 0, target: null, hop: 0, face: 1 };
      sendVisitor(v);
      visitors.push(v);
      env.audio.arpeggio([7, 9, 10], 0.12, 0.3);
    }
    if (n >= 4 && !visitors.some((v) => v.kind === 'frog')) {
      const v: Visitor = { kind: 'frog', x: env.w + 50, y: groundTop + (env.h - groundTop) * 0.55, tx: 0, ty: 0, target: null, hop: 0, face: -1 };
      sendVisitor(v);
      visitors.push(v);
      env.audio.arpeggio([0, 2], 0.18, 0.4);
    }
    for (const v of visitors) {
      if (v.target && (v.target.leaving > 0 || !plants.includes(v.target))) sendVisitor(v);
      if (v.kind === 'ladybird') {
        if (v.target) {
          const h = headOf(v.target);
          v.tx = h.x;
          v.ty = h.y - 22;
        } else {
          v.tx = env.w * 0.5 + Math.cos(now * 0.5) * env.w * 0.3;
          v.ty = env.h * 0.25 + Math.sin(now * 0.9) * 30;
        }
        const ox = v.x;
        v.x = approach(v.x, v.tx, 1.6, dt);
        v.y = approach(v.y, v.ty, 1.6, dt) + Math.sin(now * 6) * (dist(v.x, v.y, v.tx, v.ty) > 8 ? 0.8 : 0);
        if (Math.abs(v.x - ox) > 0.3) v.face = v.x > ox ? 1 : -1;
      } else {
        // frog: little hops towards its target
        const d = v.tx - v.x;
        if (Math.abs(d) > 4) {
          v.hop = (v.hop + dt * 1.6) % 1;
          v.face = d > 0 ? 1 : -1;
          v.x += Math.sign(d) * Math.min(Math.abs(d), 90 * dt);
        } else {
          v.hop = approach(v.hop, 0, 10, dt);
        }
      }
    }
  }

  function drawPlant(p: Plant) {
    const g = easeGrow(p.grow);
    const shrink = p.leaving > 0 ? p.leaving : 1;
    const h = headOf(p);
    const hx = lerp(p.x, h.x, shrink), hy = lerp(p.baseY, h.y, shrink);
    ctx.strokeStyle = env.palette.night ? '#6E8F67' : '#6DB46A';
    ctx.lineCap = 'round';
    ctx.lineWidth = 7 * shrink;
    ctx.beginPath();
    ctx.moveTo(p.x, p.baseY);
    ctx.quadraticCurveTo(p.x, (p.baseY + hy) / 2, hx, hy);
    ctx.stroke();
    // leaves
    if (g > 0.3) {
      const ls = clamp((g - 0.3) / 0.4, 0, 1) * 26 * shrink;
      ctx.fillStyle = env.palette.night ? '#7A9B70' : '#84C77B';
      for (const [side, k] of [[-1, 0.35], [1, 0.55]] as const) {
        const lx = lerp(p.x, hx, k), ly = lerp(p.baseY, hy, k);
        ctx.beginPath();
        ctx.ellipse(lx + side * ls * 0.8, ly, ls, ls * 0.45, side * -0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // flower head
    const bloom = clamp((g - 0.65) / 0.35, 0, 1) * shrink;
    const r = 30 * bloom;
    if (bloom > 0) {
      ctx.fillStyle = p.color;
      for (let i = 0; i < p.petals; i++) {
        const a = (i / p.petals) * Math.PI * 2 + p.phase + Math.sin(now + p.phase) * 0.1;
        ctx.beginPath();
        ctx.ellipse(hx + Math.cos(a) * r * 0.75, hy + Math.sin(a) * r * 0.75, r * 0.55, r * 0.4, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#F9DC7A';
      ctx.beginPath();
      ctx.arc(hx, hy, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      if (bloom > 0.8) drawFace(ctx, hx, hy - r * 0.05, r * 0.95, '#5A4532', { happy: p.sway > 0.2 });
    } else {
      ctx.fillStyle = '#84C77B';
      ctx.beginPath();
      ctx.ellipse(hx, hy, 7 * shrink, 10 * shrink, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawLadybird(v: Visitor) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.scale(v.face, 1);
    const flying = dist(v.x, v.y, v.tx, v.ty) > 8;
    if (flying) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      const f = Math.sin(now * 40) * 0.4;
      ctx.beginPath(); ctx.ellipse(-6, -14, 12, 6, -0.6 + f, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6, -14, 12, 6, 0.6 - f, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#3B3340';
    ctx.beginPath(); ctx.arc(16, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E8676B';
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3B3340'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, -15); ctx.lineTo(-12, 13); ctx.stroke();
    ctx.fillStyle = '#3B3340';
    for (const [sx, sy] of [[-6, -6], [5, 4], [-3, 9], [8, -9]]) { ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(19, -3, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawFrog(v: Visitor) {
    const jump = Math.sin(v.hop * Math.PI) * 30;
    ctx.save();
    ctx.translate(v.x, v.y - jump);
    ctx.scale(v.face, 1);
    const body = env.palette.night ? '#7FA27A' : '#7CCB7A';
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath(); ctx.ellipse(0, 26 + jump, 34, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(0, 4, 36, 26, 0, 0, Math.PI * 2); ctx.fill();
    for (const ex of [-14, 14]) {
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(ex, -18, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex, -18, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3B3340';
      ctx.beginPath(); ctx.arc(ex + 2, -18, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#3B5A3A'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 2, 16, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    ctx.fillStyle = 'rgba(244,140,150,0.4)';
    ctx.beginPath(); ctx.ellipse(-24, 6, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(24, 6, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  return {
    resize() {
      groundTop = env.h * 0.74;
      sun = { ...sun, x: env.w - 70, y: 90, r: 44 };
      for (const p of plants) p.baseY = clamp(p.baseY, groundTop + 8, env.h - 10);
    },
    frame(dt, t) {
      now = t;
      breeze = Math.max(0, breeze - dt * 0.5);
      sun.glow = Math.max(0, sun.glow - dt);
      for (const s of seeds) {
        s.vy += 900 * dt;
        s.y += s.vy * dt;
      }
      for (const s of seeds.filter((s) => s.y >= s.groundY)) plantSeed(s.x, s.groundY, s.color);
      seeds = seeds.filter((s) => s.y < s.groundY);
      for (const p of plants) {
        p.sway = Math.max(0, p.sway - dt * 0.8);
        if (p.grow < 1) {
          p.grow = Math.min(1, p.grow + dt / growTime);
          const stage = Math.floor(p.grow * 3);
          if (stage > p.stage) {
            p.stage = stage;
            env.audio.play(2 + stage * 2, { vel: 0.35, pan: panFor(p.x, env.w) });
            if (stage === 3) sparks.burst(headOf(p).x, headOf(p).y, p.color, 8, 90, 4);
          }
        }
        if (p.leaving > 0) p.leaving = Math.max(0, p.leaving - dt * 0.8) || -1;
      }
      plants = plants.filter((p) => p.leaving !== -1);
      updateVisitors(dt);

      // sky
      ctx.fillStyle = env.palette.bg;
      ctx.fillRect(0, 0, env.w, env.h);
      // sun (or moon in night theme)
      const sr = sun.r * (1 + Math.sin(sun.glow * Math.PI) * 0.15);
      ctx.fillStyle = env.palette.night ? '#E9DDB0' : '#FBD97A';
      ctx.beginPath(); ctx.arc(sun.x, sun.y, sr, 0, Math.PI * 2); ctx.fill();
      drawFace(ctx, sun.x, sun.y, sr * 1.6, '#7A5A2A', { happy: sun.glow > 0, sleepy: env.palette.night && sun.glow === 0 });
      // ground: two soft hills
      ctx.fillStyle = grassDark;
      ctx.beginPath();
      ctx.moveTo(0, groundTop - 10);
      ctx.quadraticCurveTo(env.w * 0.3, groundTop - 40, env.w * 0.6, groundTop - 5);
      ctx.quadraticCurveTo(env.w * 0.85, groundTop + 15, env.w, groundTop - 25);
      ctx.lineTo(env.w, env.h); ctx.lineTo(0, env.h); ctx.fill();
      ctx.fillStyle = grass;
      ctx.beginPath();
      ctx.moveTo(0, groundTop + 12);
      ctx.quadraticCurveTo(env.w * 0.5, groundTop - 12, env.w, groundTop + 18);
      ctx.lineTo(env.w, env.h); ctx.lineTo(0, env.h); ctx.fill();

      for (const v of visitors) if (v.kind === 'frog') drawFrog(v);
      for (const p of plants) drawPlant(p);
      ctx.fillStyle = '#9A6B45';
      for (const s of seeds) { ctx.beginPath(); ctx.ellipse(s.x, s.y, 7, 10, 0.4, 0, Math.PI * 2); ctx.fill(); }
      for (const v of visitors) if (v.kind === 'ladybird') drawLadybird(v);
      sparks.draw(ctx, dt);
    },
    down(_id, x, y) {
      // visitors first
      for (const v of visitors) {
        if (dist(x, y, v.x, v.y) < 50) {
          if (v.kind === 'frog') { env.audio.arpeggio([0, 2, 0], 0.12, 0.45); v.hop = 0.01; }
          else env.audio.arpeggio([10, 12], 0.1, 0.4);
          sendVisitor(v);
          if (v.kind === 'frog' && Math.abs(v.tx - v.x) < 10) v.tx = clamp(v.x + rand(-150, 150), 40, env.w - 40);
          return;
        }
      }
      if (dist(x, y, sun.x, sun.y) < sun.r + 24) {
        sun.glow = 1;
        breeze = 1;
        for (const p of plants) p.sway = 0.6;
        env.audio.arpeggio([5, 7, 9, 10], 0.1, 0.4);
        return;
      }
      for (const p of plants) {
        if (p.grow >= 0.65 && p.leaving === 0) {
          const h = headOf(p);
          if (dist(x, y, h.x, h.y) < 44) {
            p.sway = 1;
            sparks.burst(h.x, h.y, p.color, 8, 110, 4);
            env.audio.play(5 + plants.indexOf(p) % 6, { vel: 0.55, pan: panFor(h.x, env.w) });
            return;
          }
        }
      }
      const groundY = y > groundTop ? clamp(y, groundTop + 8, env.h - 12) : groundTop + rand(10, (env.h - groundTop) * 0.6);
      const color = pick(flowerColours());
      if (y >= groundY - 4) plantSeed(clamp(x, 30, env.w - 30), groundY, color);
      else seeds.push({ x: clamp(x, 30, env.w - 30), y, vy: 0, groundY, color });
    },
    move() {},
    up() {},
    invite() {
      sun.glow = 1;
      breeze = 0.8;
      for (const p of plants) p.sway = 0.3;
    },
  };
};
