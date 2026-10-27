import type { ToyFactory } from './types';
import { approach, clamp, dist, drawFace, panFor, rand, Sparks, withAlpha } from './util';

type Kind = 'shirt' | 'socks' | 'dress' | 'trousers' | 'hat' | 'bib' | 'towel';
const KINDS: Kind[] = ['shirt', 'socks', 'dress', 'trousers', 'hat', 'bib', 'towel'];
const COLOURS = ['#E8676B', '#5FAFE0', '#F2C14E', '#6CC17A', '#B8A2E3', '#F2A65A', '#F4A9C0'];

interface Item {
  kind: Kind;
  colour: string;
  x: number; y: number;
  homeX: number; homeY: number;
  state: 'grass' | 'held' | 'line' | 'folding' | 'basket';
  u: number; // position along the line, 0..1
  wet: number; // 1 = soaking, 0 = dry and fluffy
  swing: number; swingV: number;
  holder: number | null; gdx: number; gdy: number;
  pop: number; fold: number; drip: number;
}

function darken(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(c * (1 - k * 0.35));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Laundry Day: peg wet clothes on the line; sun dries them, a cloud brings rain, a bird visits. */
export const laundryDay: ToyFactory = (ctx, env) => {
  const n = [3, 5, 7][env.level];
  let items: Item[] = [];
  let S = 64; // clothes size
  let cloudHome = 70;
  let lineY = 0, x0 = 0, x1 = 0, sag = 40, grassY = 0;
  const basket = { x: 0, y: 0, smile: 0 };
  const sun = { x: 0, y: 0, glow: 0 };
  const cloud = { x: 0, y: 0, target: 0, over: false };
  const bird = { u: -1, x: 0, y: 0, state: 'away' as 'away' | 'flying' | 'perched' | 'leaving', t: 0, hop: 0 };
  let wind = 0, gust = 0, now = 0, nextBird = 6;
  let drops: { x: number; y: number; vy: number }[] = [];
  let rain: { x: number; y: number }[] = [];
  const sparks = new Sparks();
  const ink = env.palette.night ? '#2A2530' : '#3B3340';

  const lineAt = (u: number) => ({ x: x0 + (x1 - x0) * u, y: lineY + sag * 4 * u * (1 - u) });

  function layout() {
    const portrait = env.h > env.w * 1.1;
    const side = portrait ? 30 : 120;
    x0 = side; x1 = env.w - side;
    lineY = portrait ? env.h * 0.3 : env.h * 0.24;
    sag = (x1 - x0) * 0.06;
    // keep everything clear of the corner bubbles
    grassY = portrait ? env.h - 104 - 200 : env.h - 140;
    basket.x = portrait ? env.w / 2 : env.w - 175;
    basket.y = portrait ? env.h - 104 - 6 : grassY + 72;
    sun.x = portrait ? env.w - 70 : env.w - 160; sun.y = portrait ? 150 : 60;
    cloudHome = portrait ? 80 : 200;
    cloud.y = sun.y + 6;
    cloud.target = cloud.over ? sun.x : cloudHome;
    cloud.x = cloud.target;
    const old = items;
    const kinds = KINDS.slice(0, n);
    const gx0 = portrait ? 30 : 110, gx1 = portrait ? env.w - 30 : env.w - 270;
    S = Math.min(64, ((gx1 - gx0) / n) * 1.05);
    const gy = portrait ? grassY + 26 : grassY + 40;
    items = kinds.map((kind, i) => {
      const prev = old.find((o) => o.kind === kind);
      const homeX = gx0 + ((gx1 - gx0) / n) * (i + 0.5);
      return prev ? { ...prev, homeX, homeY: gy, ...(prev.state === 'grass' ? { x: homeX, y: gy } : {}) } : {
        kind, colour: COLOURS[i], x: homeX, y: gy, homeX, homeY: gy, state: 'grass' as const,
        u: 0, wet: 1, swing: 0, swingV: 0, holder: null, gdx: 0, gdy: 0, pop: 0, fold: 0, drip: rand(0, 1),
      };
    });
  }

  /* ---------- clothes ---------- */

  function clothPath(kind: Kind, s: number) {
    // drawn hanging from (0, 0) = the middle of the top edge
    const w = s, h = s;
    ctx.beginPath();
    switch (kind) {
      case 'shirt':
        ctx.moveTo(-w * 0.2, 0); ctx.lineTo(-w * 0.5, h * 0.12); ctx.lineTo(-w * 0.42, h * 0.38); ctx.lineTo(-w * 0.3, h * 0.32);
        ctx.lineTo(-w * 0.3, h * 0.95); ctx.lineTo(w * 0.3, h * 0.95); ctx.lineTo(w * 0.3, h * 0.32); ctx.lineTo(w * 0.42, h * 0.38);
        ctx.lineTo(w * 0.5, h * 0.12); ctx.lineTo(w * 0.2, 0); ctx.quadraticCurveTo(0, h * 0.14, -w * 0.2, 0);
        break;
      case 'socks':
        for (const sx of [-1, 1]) {
          const ox = sx * w * 0.22;
          ctx.moveTo(ox - w * 0.1, 0); ctx.lineTo(ox + w * 0.1, 0); ctx.lineTo(ox + w * 0.1, h * 0.6);
          ctx.quadraticCurveTo(ox + w * 0.1 + sx * w * 0.2, h * 0.62, ox + w * 0.1 + sx * w * 0.2, h * 0.75);
          ctx.quadraticCurveTo(ox + w * 0.1 + sx * w * 0.2, h * 0.86, ox, h * 0.84); ctx.lineTo(ox - w * 0.1, h * 0.8); ctx.closePath();
        }
        break;
      case 'dress':
        ctx.moveTo(-w * 0.15, 0); ctx.lineTo(w * 0.15, 0); ctx.lineTo(w * 0.2, h * 0.35); ctx.lineTo(w * 0.45, h * 0.95);
        ctx.quadraticCurveTo(0, h * 1.02, -w * 0.45, h * 0.95); ctx.lineTo(-w * 0.2, h * 0.35); ctx.closePath();
        break;
      case 'trousers':
        ctx.moveTo(-w * 0.32, 0); ctx.lineTo(w * 0.32, 0); ctx.lineTo(w * 0.36, h * 0.95); ctx.lineTo(w * 0.06, h * 0.95);
        ctx.lineTo(0, h * 0.35); ctx.lineTo(-w * 0.06, h * 0.95); ctx.lineTo(-w * 0.36, h * 0.95); ctx.closePath();
        break;
      case 'hat':
        ctx.moveTo(-w * 0.35, h * 0.1); ctx.lineTo(w * 0.35, h * 0.1); ctx.lineTo(w * 0.35, h * 0.3);
        ctx.quadraticCurveTo(w * 0.35, h * 0.85, 0, h * 0.85); ctx.quadraticCurveTo(-w * 0.35, h * 0.85, -w * 0.35, h * 0.3); ctx.closePath();
        break;
      case 'bib':
        ctx.moveTo(-w * 0.1, 0); ctx.lineTo(w * 0.1, 0); ctx.lineTo(w * 0.1, h * 0.15);
        ctx.arc(0, h * 0.5, w * 0.36, -Math.PI * 0.35, Math.PI * 1.35); ctx.lineTo(-w * 0.1, 0); ctx.closePath();
        break;
      case 'towel':
        ctx.roundRect(-w * 0.4, 0, w * 0.8, h * 0.95, 6);
        break;
    }
  }

  function drawItem(it: Item) {
    const s = S * (1 + Math.sin(it.pop * Math.PI) * 0.15) * (it.state === 'held' ? 1.1 : 1);
    const fold = it.fold;
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.swing);
    ctx.scale(1, 1 - fold * 0.6);
    const col = darken(it.colour, it.wet);
    ctx.fillStyle = col;
    clothPath(it.kind, s);
    ctx.fill();
    // a little pattern so each piece looks loved
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    if (it.kind === 'shirt') { ctx.beginPath(); ctx.arc(0, s * 0.55, s * 0.1, 0, Math.PI * 2); ctx.fill(); }
    if (it.kind === 'dress') for (const [px, py] of [[-0.15, 0.6], [0.15, 0.7], [0, 0.82]]) { ctx.beginPath(); ctx.arc(px * s, py * s, s * 0.05, 0, Math.PI * 2); ctx.fill(); }
    if (it.kind === 'towel') for (let k = 0; k < 3; k++) ctx.fillRect(-s * 0.4, s * (0.65 + k * 0.08), s * 0.8, s * 0.03);
    if (it.kind === 'hat') { ctx.beginPath(); ctx.arc(0, s * 0.92, s * 0.1, 0, Math.PI * 2); ctx.fill(); }
    if (it.kind === 'socks') { ctx.fillRect(-s * 0.32, s * 0.08, s * 0.2, s * 0.06); ctx.fillRect(s * 0.12, s * 0.08, s * 0.2, s * 0.06); }
    if (it.wet < 0.05 && it.state === 'line') drawFace(ctx, 0, s * 0.5, s * 0.6, ink, { happy: true });
    ctx.restore();
    // pegs
    if (it.state === 'line') {
      for (const sx of [-1, 1]) {
        ctx.fillStyle = '#C99A6B';
        ctx.beginPath(); ctx.roundRect(it.x + sx * S * 0.2 - 4, it.y - 10, 8, 18, 3); ctx.fill();
      }
    }
  }

  function drawBird() {
    if (bird.state === 'away') return;
    const flap = bird.state === 'perched' ? 0 : Math.sin(now * 25) * 0.6;
    const y = bird.y - (bird.state === 'perched' ? Math.abs(Math.sin(bird.hop * Math.PI)) * 10 : 0);
    ctx.fillStyle = '#5FAFE0';
    ctx.beginPath(); ctx.ellipse(bird.x, y - 12, 16, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bird.x + 12, y - 22, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F2A65A';
    ctx.beginPath(); ctx.moveTo(bird.x + 20, y - 24); ctx.lineTo(bird.x + 28, y - 21); ctx.lineTo(bird.x + 20, y - 18); ctx.fill();
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.arc(bird.x + 14, y - 24, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4A9AD0';
    ctx.save(); ctx.translate(bird.x - 2, y - 14); ctx.rotate(-0.4 + flap);
    ctx.beginPath(); ctx.ellipse(-6, -6, 12, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  function sing(x: number) {
    [10, 12, 14, 12].forEach((nn, i) => setTimeout(() => env.audio.play(nn, { vel: 0.35, pan: panFor(x, env.w) }), i * 110));
  }

  return {
    resize() { layout(); },
    frame(dt, t) {
      now = t;
      const sunny = !cloud.over;
      sun.glow = Math.max(0, sun.glow - dt * 0.5);
      basket.smile = Math.max(0, basket.smile - dt * 0.4);
      cloud.x = approach(cloud.x, cloud.target, 1.5, dt);
      // gusts of wind now and then
      gust = Math.max(0, gust - dt * 0.4);
      if (Math.random() < dt * 0.08) { gust = 1; env.audio.arpeggio([7, 9], 0.2, 0.08); }
      wind = 0.15 + gust * 0.6;

      for (const it of items) {
        it.pop = Math.max(0, it.pop - dt * 2);
        if (it.state === 'line') {
          const p = lineAt(it.u);
          it.x = p.x; it.y = p.y;
          // pendulum sway with the wind
          const target = Math.sin(t * (1.2 + it.u) + it.u * 7) * 0.08 * wind * 3;
          it.swingV += ((target - it.swing) * 30 - it.swingV * 3) * dt;
          it.swing += it.swingV * dt;
          const before = it.wet;
          if (sunny) it.wet = Math.max(0, it.wet - dt * (0.07 + sun.glow * 0.15 + gust * 0.05));
          else it.wet = Math.min(1, it.wet + dt * 0.25);
          if (before > 0 && it.wet === 0) {
            it.pop = 1;
            sparks.burst(it.x, it.y + S * 0.5, '#FFFFFF', 10, 120, 4);
            env.audio.arpeggio([7, 9, 12], 0.08, 0.4);
          }
          it.drip -= dt * (it.wet > 0.3 ? 1.5 : 0);
          if (it.drip < 0) { it.drip = rand(0.3, 0.9); drops.push({ x: it.x + rand(-S * 0.25, S * 0.25), y: it.y + S * 0.9, vy: 0 }); }
        } else if (it.state === 'grass') {
          it.x = approach(it.x, it.homeX, 10, dt);
          it.y = approach(it.y, it.homeY, 10, dt);
          it.swing = approach(it.swing, 0, 8, dt);
        } else if (it.state === 'folding') {
          it.fold = Math.min(1, it.fold + dt * 2);
          it.x = approach(it.x, basket.x, 5, dt);
          it.y = approach(it.y, basket.y - 40, 5, dt);
          if (dist(it.x, it.y, basket.x, basket.y - 40) < 6) {
            it.state = 'basket';
            env.audio.play(5, { vel: 0.35 });
            if (items.every((o) => o.state === 'basket')) {
              basket.smile = 3;
              env.audio.arpeggio([5, 7, 9, 12, 14], 0.12, 0.5);
              sparks.burst(basket.x, basket.y - 30, '#F2C14E', 16, 200, 5);
              // fresh washing comes out wet again
              setTimeout(() => items.forEach((o, i) => setTimeout(() => {
                o.state = 'grass'; o.wet = 1; o.fold = 0; o.x = basket.x; o.y = basket.y - 40;
                env.audio.play(3 + i, { vel: 0.25 });
              }, i * 180)), 2500);
            }
          }
        }
      }
      // rain
      if (!sunny && Math.random() < dt * 40) rain.push({ x: cloud.x + rand(-60, 60), y: cloud.y + 20 });
      for (const r of rain) r.y += dt * 400;
      rain = rain.filter((r) => r.y < env.h);
      for (const d of drops) { d.vy += 600 * dt; d.y += d.vy * dt; }
      drops = drops.filter((d) => d.y < grassY + 30);
      // the bird
      if (bird.state === 'away' && t > nextBird && items.some((o) => o.state === 'line')) {
        bird.state = 'flying'; bird.u = rand(0.15, 0.85); bird.x = -30; bird.y = lineY - 60;
      }
      if (bird.state === 'flying') {
        const p = lineAt(bird.u);
        bird.x = approach(bird.x, p.x, 2, dt); bird.y = approach(bird.y, p.y, 2, dt);
        if (dist(bird.x, bird.y, p.x, p.y) < 4) { bird.state = 'perched'; sing(bird.x); bird.t = t; }
      } else if (bird.state === 'perched') {
        bird.hop = Math.max(0, bird.hop - dt * 3);
        if (Math.random() < dt * 0.4) { bird.hop = 1; bird.u = clamp(bird.u + rand(-0.05, 0.05), 0.05, 0.95); const p = lineAt(bird.u); bird.x = p.x; bird.y = p.y; }
        if (t - bird.t > 9) bird.state = 'leaving';
      } else if (bird.state === 'leaving') {
        bird.x += dt * 220; bird.y -= dt * 120;
        if (bird.x > env.w + 40) { bird.state = 'away'; nextBird = t + rand(10, 18); }
      }

      /* ---- draw ---- */
      ctx.fillStyle = sunny ? env.palette.bg : withAlpha(env.palette.bg2, 1);
      ctx.fillRect(0, 0, env.w, env.h);
      // sun
      const rays = 10;
      ctx.save();
      ctx.translate(sun.x, sun.y);
      ctx.rotate(t * 0.2 + sun.glow);
      ctx.strokeStyle = withAlpha('#F7C948', 0.7); ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2;
        const r0 = 46 + sun.glow * 6, r1 = 60 + sun.glow * 14;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = '#FBD97A';
      ctx.beginPath(); ctx.arc(sun.x, sun.y, 38, 0, Math.PI * 2); ctx.fill();
      drawFace(ctx, sun.x, sun.y, 60, '#7A5A2A', { happy: sun.glow > 0 });
      // cloud
      ctx.fillStyle = cloud.over ? '#B9C2CC' : '#FFFFFF';
      for (const [dx, dy, r] of [[-40, 6, 26], [-12, -10, 34], [24, 0, 28], [48, 10, 20]] as const) {
        ctx.beginPath(); ctx.arc(cloud.x + dx, cloud.y + dy, r, 0, Math.PI * 2); ctx.fill();
      }
      drawFace(ctx, cloud.x, cloud.y + 4, 46, ink, { sleepy: !cloud.over });
      ctx.strokeStyle = withAlpha('#5FAFE0', 0.7); ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (const r of rain) { ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 3, r.y + 12); ctx.stroke(); }
      // grass
      ctx.fillStyle = env.palette.night ? '#4E5F4E' : '#A9D69A';
      ctx.beginPath(); ctx.moveTo(0, grassY); ctx.quadraticCurveTo(env.w / 2, grassY - 30, env.w, grassY); ctx.lineTo(env.w, env.h); ctx.lineTo(0, env.h); ctx.fill();
      // poles and line
      ctx.fillStyle = '#B8956A';
      ctx.fillRect(x0 - 6, lineY - 10, 12, grassY - lineY + 20);
      ctx.fillRect(x1 - 6, lineY - 10, 12, grassY - lineY + 20);
      ctx.strokeStyle = withAlpha(ink, 0.55); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0, lineY); ctx.quadraticCurveTo((x0 + x1) / 2, lineY + sag * 2, x1, lineY); ctx.stroke();
      // basket
      ctx.fillStyle = '#D9A86C';
      ctx.beginPath(); ctx.moveTo(basket.x - 70, basket.y - 40); ctx.lineTo(basket.x + 70, basket.y - 40); ctx.lineTo(basket.x + 56, basket.y + 20); ctx.lineTo(basket.x - 56, basket.y + 20); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 3;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(basket.x - 66 + k * 2, basket.y - 22 + k * 14); ctx.lineTo(basket.x + 66 - k * 2, basket.y - 22 + k * 14); ctx.stroke(); }
      const folded = items.filter((o) => o.state === 'basket');
      folded.forEach((o, i) => {
        ctx.fillStyle = o.colour;
        ctx.beginPath(); ctx.roundRect(basket.x - 40 + (i % 3) * 8, basket.y - 46 - i * 9, 80, 12, 5); ctx.fill();
      });
      if (basket.smile > 0) drawFace(ctx, basket.x, basket.y - 6, 70, ink, { happy: true });
      for (const it of items) if (it.state !== 'held') drawItem(it);
      for (const it of items) if (it.state === 'held') drawItem(it);
      ctx.fillStyle = withAlpha('#5FAFE0', 0.8);
      for (const d of drops) { ctx.beginPath(); ctx.ellipse(d.x, d.y, 3, 5, 0, 0, Math.PI * 2); ctx.fill(); }
      drawBird();
      sparks.draw(ctx, dt);
    },
    down(id, x, y) {
      if (bird.state === 'perched' && dist(x, y, bird.x, bird.y - 15) < 40) {
        sing(bird.x); bird.state = 'leaving'; return;
      }
      if (dist(x, y, sun.x, sun.y) < 60) {
        sun.glow = 1; env.audio.arpeggio([9, 12, 14], 0.08, 0.4);
        if (cloud.over) { cloud.over = false; cloud.target = cloudHome; }
        return;
      }
      if (dist(x, y, cloud.x, cloud.y) < 70) {
        cloud.over = !cloud.over;
        cloud.target = cloud.over ? sun.x : cloudHome;
        env.audio.arpeggio(cloud.over ? [7, 5, 3] : [5, 7, 9], 0.1, 0.35);
        return;
      }
      // pick up clothes (topmost first)
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (it.state !== 'grass' && it.state !== 'line') continue;
        if (dist(x, y, it.x, it.y + S * 0.45) < S * 0.65) {
          if (it.state === 'line' && it.wet < 0.05) {
            // dry! fold it into the basket
            it.state = 'folding';
            env.audio.arpeggio([9, 7], 0.08, 0.35);
            return;
          }
          it.state = 'held'; it.holder = id; it.gdx = it.x - x; it.gdy = it.y - y;
          env.audio.play(4, { vel: 0.3, pan: panFor(x, env.w) });
          return;
        }
      }
      // a little splash on the grass, a whoosh in the sky
      sparks.burst(x, y, env.palette.soft[0], 5, 60, 3);
      env.audio.play(y > grassY ? 2 : 11, { vel: 0.15 });
    },
    move(id, x, y) {
      const it = items.find((o) => o.holder === id);
      if (!it) return;
      it.x = clamp(x + it.gdx, 20, env.w - 20);
      it.y = clamp(y + it.gdy, 20, env.h - 40);
      it.swing = approach(it.swing, 0, 10, 0.016);
    },
    up(id) {
      const it = items.find((o) => o.holder === id);
      if (!it) return;
      it.holder = null;
      const u = clamp((it.x - x0) / (x1 - x0), 0.06, 0.94);
      const p = lineAt(u);
      const crowded = items.some((o) => o !== it && o.state === 'line' && Math.abs(o.u - u) * (x1 - x0) < S * 0.8);
      if (it.x > x0 - 20 && it.x < x1 + 20 && Math.abs(it.y - p.y) < 70 && !crowded) {
        it.state = 'line'; it.u = u; it.swingV = 2;
        env.audio.play(8, { vel: 0.45, pan: panFor(it.x, env.w) }); // click! goes the peg
        setTimeout(() => env.audio.play(10, { vel: 0.35 }), 90);
      } else {
        it.state = 'grass';
        env.audio.play(2, { vel: 0.2 });
      }
    },
    invite() {
      const it = items.find((o) => o.state === 'grass');
      if (it) it.pop = 1;
      else sun.glow = 1;
    },
  };
};

