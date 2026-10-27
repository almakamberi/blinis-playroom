import type { ToyFactory } from './types';
import { approach, clamp, dist, drawFace, panFor, rand, Ripples, Sparks, withAlpha } from './util';

type Kind = 'lamp' | 'fan' | 'radio' | 'toaster' | 'phone' | 'tv';

interface Plug { x: number; y: number; restX: number; restY: number; holder: number | null; gdx: number; gdy: number; socket: number | null; wiggle: number }
interface Appliance {
  kind: Kind;
  color: string;
  cx: number;
  cy: number;
  s: number;
  on: number; // 0..1 power-on animation
  wasPowered: boolean;
  wiggle: number;
  plug: Plug;
  // per-appliance state
  blade: number;
  boost: number;
  toast: number; // 0 = down in the slot, 1 = popped up
  toastTimer: number;
  charge: number;
  charged: boolean;
  radioNext: number;
  radioRoot: number;
  notes: { x: number; y: number; life: number }[];
  ball: { x: number; y: number; vx: number; vy: number; hue: number };
}

const KINDS: Kind[] = ['lamp', 'fan', 'radio', 'toaster', 'phone', 'tv'];
const COLOURS: Record<Kind, string> = {
  lamp: '#F2C14E', fan: '#5FAFE0', radio: '#E8676B', toaster: '#B9C2CC', phone: '#7A6FA6', tv: '#6CC17A',
};

/**
 * Plug It In: household appliances on cables and a power strip. Plug one in and it
 * comes to life — the lamp lights, the fan spins, the radio plays, the toaster pops.
 */
export const plugItIn: ToyFactory = (ctx, env) => {
  const n = [3, 4, 6][env.level];
  const hasMaster = env.level === 2;
  let apps: Appliance[] = [];
  let sockets: { x: number; y: number; glow: number }[] = [];
  const strip = { x0: 0, x1: 0, y: 0, h: 60 };
  const master = { x: 0, y: 0, on: true, anim: 1 };
  let now = 0;
  const sparks = new Sparks();
  const ripples = new Ripples();
  const ink = env.palette.night ? '#2A2530' : '#3B3340';

  const powered = (a: Appliance) => a.plug.socket !== null && master.on;

  function layout() {
    const portrait = env.h > env.w * 1.1;
    const side = portrait ? 20 : 110;
    strip.h = 60;
    strip.y = portrait ? env.h - 110 - strip.h / 2 : env.h - 20 - strip.h / 2;
    strip.x0 = side;
    strip.x1 = env.w - side;
    const parkY = strip.y - (portrait ? 110 : 92);
    const top = portrait ? 104 : 16;
    const bottom = parkY - 60;
    const cols = portrait ? (n === 3 ? 3 : n === 4 ? 2 : 3) : n;
    const rows = Math.ceil(n / cols);
    const cw = (env.w - side * 2) / cols;
    const ch = (bottom - top) / rows;
    const s = Math.min(cw, ch) * 0.78;

    const old = apps;
    apps = KINDS.slice(0, n).map((kind, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const inRow = r === rows - 1 ? n - cols * r : cols;
      const cx = side + ((env.w - side * 2) / inRow) * (c + 0.5);
      const cy = top + ch * (r + 0.5);
      const restX = side + ((env.w - side * 2) / n) * (i + 0.5);
      const prev = old.find((a) => a.kind === kind);
      return {
        kind, color: COLOURS[kind], cx, cy, s,
        on: 0, wasPowered: false, wiggle: 0.4,
        plug: { x: restX, y: parkY, restX, restY: parkY, holder: null, gdx: 0, gdy: 0, socket: null, wiggle: 0 },
        blade: 0, boost: 0, toast: 0, toastTimer: 0, charge: prev?.charge ?? 0.15, charged: false,
        radioNext: 0, radioRoot: 0, notes: [],
        ball: { x: 0.5, y: 0.5, vx: 0.35, vy: 0.27, hue: 0 },
      };
    });

    const stripEnd = hasMaster ? strip.x1 - 64 : strip.x1;
    const count = n; // one socket each, in any order
    sockets = Array.from({ length: count }, (_, i) => ({
      x: strip.x0 + ((stripEnd - strip.x0) / count) * (i + 0.5),
      y: strip.y,
      glow: 0,
    }));
    master.x = strip.x1 - 36;
    master.y = strip.y;
  }

  /* ---------- appliances ---------- */

  function drawLamp(a: Appliance) {
    const { cx, s } = a;
    const base = a.cy + s * 0.45;
    if (a.on > 0.02) {
      const g = ctx.createRadialGradient(cx, a.cy - s * 0.05, 0, cx, a.cy - s * 0.05, s * 0.8);
      g.addColorStop(0, withAlpha('#FFE9A8', 0.65 * a.on));
      g.addColorStop(1, withAlpha('#FFE9A8', 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, a.cy - s * 0.05, s * 0.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = withAlpha(ink, 0.55);
    ctx.fillRect(cx - s * 0.03, a.cy - s * 0.1, s * 0.06, s * 0.52);
    ctx.beginPath(); ctx.ellipse(cx, base, s * 0.22, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    // bulb
    ctx.fillStyle = a.on > 0.5 ? '#FFF3C4' : withAlpha('#FFFFFF', 0.7);
    ctx.beginPath(); ctx.arc(cx, a.cy - s * 0.06, s * 0.09, 0, Math.PI * 2); ctx.fill();
    // shade
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.16, a.cy - s * 0.42);
    ctx.lineTo(cx + s * 0.16, a.cy - s * 0.42);
    ctx.lineTo(cx + s * 0.32, a.cy - s * 0.1);
    ctx.lineTo(cx - s * 0.32, a.cy - s * 0.1);
    ctx.closePath();
    ctx.lineJoin = 'round'; ctx.strokeStyle = a.color; ctx.lineWidth = s * 0.05;
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(cx - s * 0.12, a.cy - s * 0.3, s * 0.04, s * 0.09, 0.4, 0, Math.PI * 2); ctx.fill();
  }

  function drawFan(a: Appliance) {
    const { cx, s } = a;
    const hy = a.cy - s * 0.1;
    const R = s * 0.32;
    ctx.fillStyle = withAlpha(ink, 0.55);
    ctx.fillRect(cx - s * 0.03, hy, s * 0.06, s * 0.52);
    ctx.beginPath(); ctx.ellipse(cx, a.cy + s * 0.45, s * 0.2, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    // blades
    ctx.fillStyle = a.color;
    for (let i = 0; i < 3; i++) {
      const ang = a.blade + (i * Math.PI * 2) / 3;
      ctx.save();
      ctx.translate(cx, hy);
      ctx.rotate(ang);
      ctx.beginPath(); ctx.ellipse(R * 0.5, 0, R * 0.48, R * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // cage
    ctx.strokeStyle = withAlpha(ink, 0.35);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, hy, R + 6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = withAlpha(ink, 0.6);
    ctx.beginPath(); ctx.arc(cx, hy, s * 0.06, 0, Math.PI * 2); ctx.fill();
    // breeze lines
    if (a.on > 0.3) {
      ctx.strokeStyle = withAlpha(a.color, 0.5 * a.on);
      ctx.lineCap = 'round';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const off = ((now * 1.5 + i / 3) % 1);
        const x = cx + R + 14 + off * s * 0.25;
        const y = hy - R * 0.5 + i * R * 0.5;
        ctx.globalAlpha = 1 - off;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 10, y - 6, x + 22, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawRadio(a: Appliance) {
    const { cx, s } = a;
    const w = s * 0.82, h = s * 0.56;
    const y = a.cy - h / 2 + s * 0.12;
    const beat = a.on > 0.5 ? Math.max(0, Math.sin(now * 8)) * 0.08 : 0;
    ctx.strokeStyle = withAlpha(ink, 0.5); ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx + w * 0.25, y); ctx.lineTo(cx + w * 0.42, y - s * 0.3); ctx.stroke();
    ctx.fillStyle = withAlpha(ink, 0.5);
    ctx.beginPath(); ctx.arc(cx + w * 0.42, y - s * 0.3, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = a.color;
    ctx.beginPath(); ctx.roundRect(cx - w / 2, y, w, h, s * 0.1); ctx.fill();
    // speaker
    const sr = h * 0.32 * (1 + beat);
    ctx.fillStyle = withAlpha('#FFFFFF', 0.8);
    ctx.beginPath(); ctx.arc(cx - w * 0.18, y + h / 2, sr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = withAlpha(ink, 0.35);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      ctx.beginPath(); ctx.arc(cx - w * 0.18 + i * sr * 0.45, y + h / 2 + j * sr * 0.45, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    // dial + light
    ctx.fillStyle = withAlpha('#FFFFFF', 0.85);
    ctx.beginPath(); ctx.roundRect(cx + w * 0.08, y + h * 0.22, w * 0.32, h * 0.22, 5); ctx.fill();
    ctx.fillStyle = a.on > 0.5 ? '#FFD86E' : withAlpha(ink, 0.25);
    ctx.beginPath(); ctx.arc(cx + w * 0.24, y + h * 0.7, h * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = withAlpha(ink, 0.6);
    ctx.fillRect(cx + w * 0.1 + ((now * 0.1 + a.radioRoot * 0.2) % 1) * w * 0.26 * a.on, y + h * 0.24, 3, h * 0.18);
    // floating notes
    for (const nt of a.notes) {
      ctx.globalAlpha = nt.life;
      ctx.fillStyle = a.color;
      ctx.beginPath(); ctx.ellipse(nt.x, nt.y, 7, 5, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(nt.x + 5, nt.y - 20, 3, 20);
    }
    ctx.globalAlpha = 1;
  }

  function drawToaster(a: Appliance) {
    const { cx, s } = a;
    const w = s * 0.78, h = s * 0.5;
    const y = a.cy - h / 2 + s * 0.15;
    // toast
    const ty = y - a.toast * s * 0.28 + s * 0.04;
    ctx.fillStyle = '#E0A85E';
    ctx.beginPath(); ctx.roundRect(cx - w * 0.3, ty - s * 0.12, w * 0.24, s * 0.3, 8); ctx.fill();
    ctx.beginPath(); ctx.roundRect(cx + w * 0.06, ty - s * 0.12, w * 0.24, s * 0.3, 8); ctx.fill();
    ctx.fillStyle = '#F3D3A0';
    ctx.beginPath(); ctx.roundRect(cx - w * 0.27, ty - s * 0.09, w * 0.18, s * 0.24, 6); ctx.fill();
    ctx.beginPath(); ctx.roundRect(cx + w * 0.09, ty - s * 0.09, w * 0.18, s * 0.24, 6); ctx.fill();
    // body
    ctx.fillStyle = a.color;
    ctx.beginPath(); ctx.roundRect(cx - w / 2, y, w, h, s * 0.12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.roundRect(cx - w * 0.38, y + h * 0.15, w * 0.12, h * 0.6, 6); ctx.fill();
    // glow when heating
    if (a.on > 0.5 && a.toast < 0.5) {
      ctx.fillStyle = withAlpha('#F49A6B', 0.4 + Math.sin(now * 6) * 0.2);
      ctx.beginPath(); ctx.roundRect(cx - w * 0.22, y + h * 0.65, w * 0.44, h * 0.12, 4); ctx.fill();
    }
    // lever
    ctx.fillStyle = withAlpha(ink, 0.6);
    const ly = y + h * (a.toast < 0.5 && a.on > 0.5 ? 0.75 : 0.3);
    ctx.beginPath(); ctx.roundRect(cx + w / 2 - 4, ly - 6, 18, 12, 5); ctx.fill();
    drawFace(ctx, cx, y + h * 0.5, s * 0.45, ink, { happy: a.toast > 0.5, sleepy: a.on < 0.5 });
  }

  function drawPhone(a: Appliance) {
    const { cx, s } = a;
    const w = s * 0.42, h = s * 0.78;
    const x = cx - w / 2, y = a.cy - h / 2;
    ctx.fillStyle = a.color;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, s * 0.08); ctx.fill();
    const sx = x + w * 0.1, sy = y + h * 0.1, sw = w * 0.8, sh = h * 0.8;
    ctx.fillStyle = a.on > 0.5 ? '#EAF4FB' : '#2E2A36';
    ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, s * 0.04); ctx.fill();
    if (a.on > 0.5 || a.charge > 0.98) {
      // battery
      const bw = sw * 0.6, bh = sh * 0.24, bx = cx - bw / 2, by = sy + sh * 0.55;
      ctx.strokeStyle = ink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 5); ctx.stroke();
      ctx.fillStyle = ink; ctx.fillRect(bx + bw, by + bh * 0.3, 5, bh * 0.4);
      ctx.fillStyle = a.charge > 0.98 ? '#6CC17A' : a.charge > 0.4 ? '#F2C14E' : '#E8676B';
      ctx.fillRect(bx + 4, by + 4, (bw - 8) * a.charge, bh - 8);
      if (a.charged) drawFace(ctx, cx, sy + sh * 0.3, sw * 0.9, ink, { happy: true });
      else {
        // lightning bolt
        ctx.fillStyle = '#F2C14E';
        const lx = cx, ly = sy + sh * 0.28;
        ctx.beginPath();
        ctx.moveTo(lx + 4, ly - 16); ctx.lineTo(lx - 8, ly + 2); ctx.lineTo(lx, ly + 2);
        ctx.lineTo(lx - 4, ly + 16); ctx.lineTo(lx + 8, ly - 2); ctx.lineTo(lx, ly - 2); ctx.closePath(); ctx.fill();
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.moveTo(sx, sy + sh * 0.4); ctx.lineTo(sx + sw * 0.6, sy); ctx.lineTo(sx + sw, sy); ctx.lineTo(sx, sy + sh * 0.8); ctx.fill();
    }
  }

  function drawTv(a: Appliance) {
    const { cx, s } = a;
    const w = s * 0.9, h = s * 0.62;
    const x = cx - w / 2, y = a.cy - h / 2 - s * 0.05;
    ctx.strokeStyle = withAlpha(ink, 0.5); ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - w * 0.2, a.cy + h / 2 - s * 0.05); ctx.lineTo(cx - w * 0.28, a.cy + s * 0.45);
    ctx.moveTo(cx + w * 0.2, a.cy + h / 2 - s * 0.05); ctx.lineTo(cx + w * 0.28, a.cy + s * 0.45); ctx.stroke();
    ctx.fillStyle = a.color;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, s * 0.08); ctx.fill();
    const sx = x + w * 0.07, sy = y + h * 0.1, sw = w * 0.86, sh = h * 0.8;
    ctx.fillStyle = '#2E2A36';
    ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, s * 0.05); ctx.fill();
    if (a.on > 0.02) {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, s * 0.05); ctx.clip();
      // "switch on" opens from a line in the middle
      const open = clamp(a.on * 1.4, 0, 1);
      const oh = sh * open;
      ctx.beginPath(); ctx.rect(sx, sy + (sh - oh) / 2, sw, Math.max(2, oh)); ctx.clip();
      const bg = env.palette.soft[Math.floor(a.ball.hue) % env.palette.soft.length];
      ctx.fillStyle = withAlpha(bg, 0.9);
      ctx.fillRect(sx, sy, sw, sh);
      const bx = sx + a.ball.x * sw, by = sy + a.ball.y * sh;
      ctx.fillStyle = '#F6C978';
      ctx.beginPath(); ctx.arc(bx, by, sh * 0.2, 0, Math.PI * 2); ctx.fill();
      drawFace(ctx, bx, by, sh * 0.32, '#4A3A2A', { happy: true });
      ctx.restore();
    }
  }

  const DRAW: Record<Kind, (a: Appliance) => void> = { lamp: drawLamp, fan: drawFan, radio: drawRadio, toaster: drawToaster, phone: drawPhone, tv: drawTv };

  /* ---------- plugs, cables, strip ---------- */

  function cablePath(a: Appliance) {
    const p = a.plug;
    const ax = a.cx, ay = a.cy + a.s * 0.45;
    const py = p.y - 26;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.bezierCurveTo(ax, ay + 70, p.x, py - 90, p.x, py);
  }

  function drawCable(a: Appliance) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = withAlpha(ink, 0.55);
    ctx.lineWidth = 9;
    cablePath(a); ctx.stroke();
    ctx.strokeStyle = withAlpha('#FFFFFF', 0.2);
    ctx.lineWidth = 3;
    cablePath(a); ctx.stroke();
  }

  function drawPlug(a: Appliance) {
    const p = a.plug;
    const wig = Math.sin(p.wiggle * 20) * p.wiggle * 0.25;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(wig);
    if (p.holder !== null) ctx.scale(1.08, 1.08);
    ctx.fillStyle = '#C9C2B8';
    ctx.beginPath(); ctx.roundRect(-10, 20, 6, 18, 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(4, 20, 6, 18, 2); ctx.fill();
    ctx.fillStyle = env.palette.night ? '#D8CCBC' : '#FFFFFF';
    ctx.beginPath(); ctx.roundRect(-20, -26, 40, 50, 13); ctx.fill();
    ctx.strokeStyle = withAlpha(ink, 0.2); ctx.lineWidth = 2; ctx.stroke();
    // a tiny picture of the appliance colour so it's clear which plug is which
    ctx.fillStyle = a.color;
    ctx.beginPath(); ctx.arc(0, -2, 11, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawStrip() {
    const { x0, x1, y, h } = strip;
    ctx.fillStyle = withAlpha(ink, 0.18);
    ctx.beginPath(); ctx.roundRect(x0, y - h / 2 + 6, x1 - x0, h, h / 2); ctx.fill();
    ctx.fillStyle = env.palette.night ? '#CFC4B5' : '#FFFFFF';
    ctx.beginPath(); ctx.roundRect(x0, y - h / 2, x1 - x0, h, h / 2); ctx.fill();
    ctx.strokeStyle = withAlpha(ink, 0.15); ctx.lineWidth = 2; ctx.stroke();
    for (const s of sockets) {
      if (s.glow > 0.01) {
        ctx.fillStyle = withAlpha('#FFD86E', 0.45 * s.glow);
        ctx.beginPath(); ctx.arc(s.x, s.y, 30, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = env.palette.night ? '#B9AE9F' : '#EEF1F4';
      ctx.beginPath(); ctx.arc(s.x, s.y, 19, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = withAlpha(ink, 0.65);
      ctx.beginPath(); ctx.roundRect(s.x - 9, s.y - 8, 5, 16, 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(s.x + 4, s.y - 8, 5, 16, 2); ctx.fill();
    }
    if (hasMaster) {
      const m = master;
      ctx.fillStyle = m.on ? '#E8676B' : '#B9B2AA';
      ctx.beginPath(); ctx.roundRect(m.x - 24, m.y - 22, 48, 44, 12); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      const t = m.anim;
      ctx.beginPath(); ctx.roundRect(m.x - 18, m.y - 16 + (1 - t) * 14, 36, 18, 7); ctx.fill();
      // power light on the switch
      ctx.fillStyle = m.on ? '#FFE08A' : withAlpha(ink, 0.3);
      ctx.beginPath(); ctx.arc(m.x, m.y + 13 - (1 - t) * 20, 4, 0, Math.PI * 2); ctx.fill();
    }
    // the cord of the strip itself goes off to the "wall"
    ctx.strokeStyle = withAlpha(ink, 0.45); ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo(x0 - 20, y + 30, x0 - 40, y + 26); ctx.stroke();
  }

  /* ---------- behaviour ---------- */

  function onPowerChange(a: Appliance, p: boolean) {
    if (p) {
      sparks.burst(a.cx, a.cy, a.color, 12, 160, 5);
      const intro: Record<Kind, number[]> = { lamp: [7, 9], fan: [2, 4, 7], radio: [5, 7, 9], toaster: [3, 5], phone: [4, 6, 8], tv: [7, 9, 12] };
      env.audio.arpeggio(intro[a.kind], 0.1, 0.5);
      if (a.kind === 'toaster') { a.toast = 0; a.toastTimer = 1.8; }
      if (a.kind === 'radio') a.radioNext = now + 0.4;
    } else {
      env.audio.play(2, { vel: 0.25 });
    }
  }

  function updateAppliance(a: Appliance, dt: number) {
    const p = powered(a);
    if (p !== a.wasPowered) { onPowerChange(a, p); a.wasPowered = p; }
    a.on = approach(a.on, p ? 1 : 0, 5, dt);
    a.wiggle = Math.max(0, a.wiggle - dt);
    a.boost = Math.max(0, a.boost - dt * 0.6);
    switch (a.kind) {
      case 'fan':
        a.blade += dt * (a.on * 12 + a.boost * 14);
        break;
      case 'radio':
        if (p && now >= a.radioNext) {
          // a gentle little walk through the pentatonic scale
          const tune = [0, 2, 4, 2, 3, 4, 7, 4];
          const step = Math.floor(now / 0.45) % tune.length;
          env.audio.play(5 + a.radioRoot + tune[step], { vel: 0.22, pan: panFor(a.cx, env.w) });
          a.radioNext = now + 0.45;
          a.notes.push({ x: a.cx + rand(-a.s * 0.2, a.s * 0.3), y: a.cy - a.s * 0.25, life: 1 });
        }
        for (const nt of a.notes) { nt.life -= dt * 0.8; nt.y -= dt * 40; nt.x += Math.sin(now * 3 + nt.y) * 0.4; }
        a.notes = a.notes.filter((nt) => nt.life > 0);
        break;
      case 'toaster':
        if (p && a.toast < 0.5) {
          a.toastTimer -= dt;
          if (a.toastTimer <= 0) {
            a.toast = 1;
            env.audio.play(12, { vel: 0.55 });
            sparks.burst(a.cx, a.cy - a.s * 0.3, '#E0A85E', 8, 120, 4);
          }
        }
        break;
      case 'phone':
        if (p) {
          a.charge = Math.min(1, a.charge + dt * 0.22);
          if (a.charge >= 1 && !a.charged) {
            a.charged = true;
            env.audio.arpeggio([7, 9, 12], 0.12, 0.45);
          }
        } else {
          a.charge = Math.max(0.1, a.charge - dt * 0.03);
          if (a.charge < 0.95) a.charged = false;
        }
        break;
      case 'tv':
        if (a.on > 0.5) {
          const b = a.ball;
          b.x += b.vx * dt; b.y += b.vy * dt;
          if (b.x < 0.2 || b.x > 0.8) { b.vx *= -1; b.x = clamp(b.x, 0.2, 0.8); env.audio.play(9, { vel: 0.15 }); }
          if (b.y < 0.25 || b.y > 0.75) { b.vy *= -1; b.y = clamp(b.y, 0.25, 0.75); }
        }
        break;
    }
  }

  function tapAppliance(a: Appliance) {
    a.wiggle = 0.5;
    if (!powered(a)) {
      // nothing happens without power: a little hint wiggle on its plug
      a.plug.wiggle = 0.8;
      env.audio.play(0, { vel: 0.25, pan: panFor(a.cx, env.w) });
      return;
    }
    switch (a.kind) {
      case 'toaster':
        if (a.toast > 0.5) { a.toast = 0; a.toastTimer = 1.8; env.audio.play(3, { vel: 0.4 }); }
        break;
      case 'fan': a.boost = 1; env.audio.play(4, { vel: 0.4 }); break;
      case 'radio': a.radioRoot = (a.radioRoot + 2) % 5; env.audio.play(10, { vel: 0.4 }); break;
      case 'tv': a.ball.hue += 1; env.audio.arpeggio([9, 12], 0.08, 0.4); break;
      default: env.audio.play(7, { vel: 0.45, pan: panFor(a.cx, env.w) });
    }
  }

  return {
    resize() { layout(); },
    frame(dt, t) {
      now = t;
      master.anim = approach(master.anim, master.on ? 1 : 0, 16, dt);
      for (const a of apps) updateAppliance(a, dt);
      for (const [i, s] of sockets.entries()) {
        const used = apps.some((a) => a.plug.socket === i);
        s.glow = approach(s.glow, used && master.on ? 1 : 0, 6, dt);
      }
      for (const a of apps) {
        const p = a.plug;
        p.wiggle = Math.max(0, p.wiggle - dt);
        if (p.holder === null) {
          const tx = p.socket !== null ? sockets[p.socket].x : p.restX;
          const ty = p.socket !== null ? sockets[p.socket].y - 34 : p.restY;
          p.x = approach(p.x, tx, 12, dt);
          p.y = approach(p.y, ty, 12, dt);
        }
      }

      ctx.fillStyle = env.palette.bg;
      ctx.fillRect(0, 0, env.w, env.h);
      // floor
      ctx.fillStyle = env.palette.bg2;
      ctx.fillRect(0, strip.y - 150, env.w, env.h);
      for (const a of apps) drawCable(a);
      for (const a of apps) {
        ctx.save();
        const wig = Math.sin(a.wiggle * 20) * a.wiggle * 0.06;
        ctx.translate(a.cx, a.cy + a.s * 0.45);
        ctx.rotate(wig);
        ctx.translate(-a.cx, -(a.cy + a.s * 0.45));
        DRAW[a.kind](a);
        ctx.restore();
      }
      drawStrip();
      const order = apps.slice().sort((a, b) => Number(a.plug.holder !== null) - Number(b.plug.holder !== null));
      for (const a of order) drawPlug(a);
      sparks.draw(ctx, dt);
      ripples.draw(ctx, dt);
    },
    down(id, x, y) {
      for (let i = apps.length - 1; i >= 0; i--) {
        const p = apps[i].plug;
        if (p.holder === null && dist(x, y, p.x, p.y + 4) < 44) {
          p.holder = id;
          p.gdx = p.x - x;
          p.gdy = p.y - y;
          if (p.socket !== null) { p.socket = null; env.audio.play(1, { vel: 0.35 }); }
          else env.audio.play(4, { vel: 0.25 });
          return;
        }
      }
      if (hasMaster && dist(x, y, master.x, master.y) < 44) {
        master.on = !master.on;
        env.audio.play(master.on ? 7 : 2, { vel: 0.5 });
        return;
      }
      for (const a of apps) {
        if (Math.abs(x - a.cx) < a.s * 0.5 && Math.abs(y - a.cy) < a.s * 0.55) return tapAppliance(a);
      }
      ripples.add(x, y, env.palette.soft[0]);
      env.audio.play(1, { vel: 0.18, pan: panFor(x, env.w) });
    },
    move(id, x, y) {
      const a = apps.find((o) => o.plug.holder === id);
      if (!a) return;
      a.plug.x = clamp(x + a.plug.gdx, 30, env.w - 30);
      a.plug.y = clamp(y + a.plug.gdy, 40, env.h - 40);
    },
    up(id) {
      const a = apps.find((o) => o.plug.holder === id);
      if (!a) return;
      const p = a.plug;
      p.holder = null;
      let best = -1;
      let bd = 70;
      sockets.forEach((s, i) => {
        const d = dist(p.x, p.y + 34, s.x, s.y);
        if (d < bd && !apps.some((o) => o.plug.socket === i)) { bd = d; best = i; }
      });
      if (best >= 0) {
        p.socket = best;
        p.wiggle = 0.4;
        sparks.burst(sockets[best].x, sockets[best].y, '#FFD86E', 8, 120, 4);
      } else {
        env.audio.play(2, { vel: 0.2 });
      }
    },
    invite() {
      const a = apps.find((o) => o.plug.socket === null);
      if (a) a.plug.wiggle = 0.9;
    },
  };
};
