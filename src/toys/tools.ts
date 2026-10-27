import { cx, cy, makePanelBoard, size, type Gadget, type Kit } from './panels';
import { approach, clamp, dist, drawFace, panFor, rand, withAlpha } from './util';

const WOOD = '#E0B07A';
const WOOD_DARK = '#C99A6B';

function plank(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = WOOD;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill();
  ctx.strokeStyle = withAlpha('#8F6A48', 0.25); ctx.lineWidth = 2;
  for (let k = 1; k < 3; k++) {
    ctx.beginPath(); ctx.moveTo(x + 8, y + (h * k) / 3); ctx.bezierCurveTo(x + w * 0.3, y + (h * k) / 3 - 4, x + w * 0.6, y + (h * k) / 3 + 4, x + w - 8, y + (h * k) / 3); ctx.stroke();
  }
}

/* ---------------- Hammer and nails ---------------- */

function hammer({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const py = cy(r) + s * 0.15, pw = s * 0.8, ph = s * 0.18, px = cx(r) - pw / 2;
  const nails = [0.2, 0.5, 0.8].map((f) => ({ x: px + pw * f, depth: 0, wob: 0 }));
  let swing = 0, target = 0, happy = 0;
  return {
    frame(dt) {
      swing = approach(swing, 0, 6, dt);
      happy = Math.max(0, happy - dt * 0.4);
      plank(ctx, px, py, pw, ph);
      for (const n of nails) {
        n.wob = Math.max(0, n.wob - dt * 3);
        const up = s * 0.13 * (1 - n.depth);
        ctx.fillStyle = '#9AA3AD';
        ctx.fillRect(n.x - 3, py - up, 6, up + 3);
        ctx.beginPath(); ctx.ellipse(n.x + Math.sin(n.wob * 20) * n.wob * 3, py - up, s * 0.04, s * 0.015, 0, 0, Math.PI * 2); ctx.fill();
      }
      if (happy > 0) drawFace(ctx, cx(r), py + ph * 0.5, ph * 2, ink, { happy: true });
      // the hammer swings down onto the last nail tapped
      // swing from whichever side has room, so the hammer stays on the bench
      const n = nails[target];
      const dir = n.x > cx(r) ? -1 : 1;
      const pivotX = n.x + dir * s * 0.32, pivotY = py - s * 0.12;
      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.scale(dir, 1);
      ctx.rotate(-0.9 + swing * 0.9);
      ctx.fillStyle = WOOD_DARK;
      ctx.beginPath(); ctx.roundRect(-s * 0.32, -s * 0.025, s * 0.36, s * 0.05, 6); ctx.fill();
      ctx.fillStyle = '#6A7480';
      ctx.beginPath(); ctx.roundRect(-s * 0.38, -s * 0.07, s * 0.1, s * 0.14, 5); ctx.fill();
      ctx.restore();
    },
    down(_id, x) {
      let best = 0;
      nails.forEach((n, i) => { if (Math.abs(n.x - x) < Math.abs(nails[best].x - x)) best = i; });
      target = best;
      const n = nails[best];
      swing = 1;
      if (n.depth < 1) {
        n.depth = Math.min(1, n.depth + 0.34);
        n.wob = 1;
        env.audio.play(3 + Math.round(n.depth * 3), { vel: 0.6, bloop: true, pan: panFor(x, env.w) });
        sparks.burst(n.x, py, '#FFF3C4', 5, 80, 3);
        if (nails.every((o) => o.depth >= 1)) {
          happy = 3;
          setTimeout(() => env.audio.arpeggio([7, 9, 12], 0.1, 0.5), 200);
          setTimeout(() => nails.forEach((o) => { o.depth = 0; o.wob = 1; }), 4000);
        }
      } else {
        env.audio.play(1, { vel: 0.35 });
      }
    },
    move() {},
    up() {},
    invite() { nails[0].wob = 1; },
  };
}

/* ---------------- Drill: hold to drill, then a picture goes up ---------------- */

function drill({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const wall = { x: cx(r) - s * 0.4, y: cy(r) - s * 0.4, w: s * 0.8, h: s * 0.62 };
  const hole = { x: cx(r), y: cy(r) - s * 0.15 };
  let holder: number | null = null, progress = 0, spin = 0, nextNote = 0, picture = 0, done = false;
  return {
    frame(dt, t) {
      if (holder !== null && !done) {
        progress = Math.min(1, progress + dt * 0.55);
        spin += dt * 40;
        if (t > nextNote) { nextNote = t + 0.1; env.audio.play(4 + Math.round(progress * 6), { vel: 0.15 }); }
        if (Math.random() < dt * 20) sparks.burst(hole.x, hole.y, '#E3D6C2', 1, 60, 2);
        if (progress >= 1) {
          done = true;
          env.audio.arpeggio([9, 12, 14], 0.1, 0.5);
          setTimeout(() => { picture = 0.01; env.audio.play(7, { vel: 0.4 }); }, 600);
        }
      }
      if (picture > 0) picture = Math.min(1, picture + dt * 1.5);
      ctx.fillStyle = '#F4E6D0';
      ctx.beginPath(); ctx.roundRect(wall.x, wall.y, wall.w, wall.h, 8); ctx.fill();
      // hole
      if (progress > 0) {
        ctx.fillStyle = withAlpha(ink, 0.6);
        ctx.beginPath(); ctx.arc(hole.x, hole.y, 3 + progress * 5, 0, Math.PI * 2); ctx.fill();
      }
      // the picture of Blini hanging on its new hook
      if (picture > 0) {
        const py = hole.y + 6 - (1 - picture) * 30;
        ctx.strokeStyle = withAlpha(ink, 0.5); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(hole.x - s * 0.12, py + s * 0.08); ctx.lineTo(hole.x, py); ctx.lineTo(hole.x + s * 0.12, py + s * 0.08); ctx.stroke();
        ctx.fillStyle = '#C99A6B';
        ctx.beginPath(); ctx.roundRect(hole.x - s * 0.16, py + s * 0.06, s * 0.32, s * 0.26, 6); ctx.fill();
        ctx.fillStyle = '#EAF4FB';
        ctx.fillRect(hole.x - s * 0.13, py + s * 0.09, s * 0.26, s * 0.2);
        ctx.fillStyle = '#F6C978';
        ctx.beginPath(); ctx.arc(hole.x, py + s * 0.2, s * 0.08, 0, Math.PI * 2); ctx.fill();
        drawFace(ctx, hole.x, py + s * 0.19, s * 0.15, '#4A3A2A', { happy: true });
      }
      // the drill, pushed against the wall while held
      if (picture === 0) {
        const push = holder !== null ? 0 : s * 0.05;
        const dx = hole.x + s * 0.08 + push, dy = hole.y;
        ctx.save();
        ctx.translate(dx, dy);
        ctx.fillStyle = '#9AA3AD';
        ctx.fillRect(-s * 0.08, -3, s * 0.08, 6);
        ctx.strokeStyle = '#6A7480'; ctx.lineWidth = 2;
        for (let k = 0; k < 4; k++) { const xx = -s * 0.08 + ((k * s * 0.02 + spin) % (s * 0.08)); ctx.beginPath(); ctx.moveTo(xx, -3); ctx.lineTo(xx + 3, 3); ctx.stroke(); }
        ctx.fillStyle = '#F2A65A';
        ctx.beginPath(); ctx.roundRect(0, -s * 0.06, s * 0.24, s * 0.12, 10); ctx.fill();
        ctx.beginPath(); ctx.roundRect(s * 0.12, 0, s * 0.08, s * 0.2, 8); ctx.fill();
        ctx.fillStyle = holder !== null ? '#6CC17A' : '#E8676B';
        ctx.beginPath(); ctx.arc(s * 0.16, s * 0.08, s * 0.025, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    },
    down(id) {
      if (done) {
        // take the picture down for another go
        done = false; progress = 0; picture = 0;
        env.audio.arpeggio([7, 5], 0.08, 0.3);
        return;
      }
      holder = id;
      env.audio.play(4, { vel: 0.3 });
    },
    move() {},
    up(id) { if (holder === id) holder = null; },
    invite() { spin += 2; },
  };
}

/* ---------------- Paint roller: paint the fence ---------------- */

function roller({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const fence = { x: cx(r) - s * 0.42, y: cy(r) - s * 0.38, w: s * 0.84, h: s * 0.52 };
  const cols = 7, rows = 5;
  const cells: (string | null)[] = Array(cols * rows).fill(null);
  const POTS = ['#E8676B', '#5FAFE0', '#F2C14E', '#6CC17A'];
  let colour = POTS[0], holder: number | null = null, rx = fence.x + fence.w / 2, ry = fence.y + fence.h / 2, last = -1, finished = 0;
  const potY = fence.y + fence.h + s * 0.16;
  const potX = (i: number) => cx(r) + (i - 1.5) * s * 0.2;
  function paintAt(x: number, y: number) {
    const c = Math.floor(((x - fence.x) / fence.w) * cols), rr = Math.floor(((y - fence.y) / fence.h) * rows);
    for (let dy = -1; dy <= 1; dy++) {
      const yy = rr + dy;
      if (c < 0 || c >= cols || yy < 0 || yy >= rows) continue;
      const i = yy * cols + c;
      if (cells[i] !== colour) {
        cells[i] = colour;
        if (i !== last) { last = i; env.audio.play(2 + c, { vel: 0.2, pan: panFor(x, env.w) }); }
      }
    }
    if (cells.every((v) => v === colour) && finished === 0) {
      finished = 3;
      env.audio.arpeggio([5, 7, 9, 12], 0.1, 0.5);
      sparks.burst(cx(r), fence.y + fence.h / 2, colour, 14, 180, 5);
    }
  }
  return {
    frame(dt) {
      finished = Math.max(0, finished - dt);
      // fence planks
      const pw = fence.w / cols;
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = '#FFF4DE';
        ctx.beginPath(); ctx.roundRect(fence.x + c * pw + 2, fence.y - 8, pw - 4, fence.h + 8, [8, 8, 2, 2]); ctx.fill();
        for (let rr = 0; rr < rows; rr++) {
          const v = cells[rr * cols + c];
          if (!v) continue;
          ctx.fillStyle = v;
          ctx.fillRect(fence.x + c * pw + 2, fence.y + (rr * fence.h) / rows - (rr === 0 ? 8 : 0), pw - 4, fence.h / rows + (rr === 0 ? 8 : 0) + 0.5);
        }
      }
      if (finished > 0) drawFace(ctx, cx(r), fence.y + fence.h / 2, s * 0.35, ink, { happy: true });
      // paint pots
      POTS.forEach((c, i) => {
        const x = potX(i);
        ctx.fillStyle = '#C9C2B8';
        ctx.beginPath(); ctx.roundRect(x - s * 0.07, potY - s * 0.05, s * 0.14, s * 0.12, 6); ctx.fill();
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.ellipse(x, potY - s * 0.05, s * 0.07, s * 0.025, 0, 0, Math.PI * 2); ctx.fill();
        if (c === colour) { ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x - s * 0.085, potY - s * 0.085, s * 0.17, s * 0.17, 8); ctx.stroke(); }
      });
      // the roller
      ctx.strokeStyle = withAlpha(ink, 0.6); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(rx + s * 0.08, ry); ctx.lineTo(rx + s * 0.12, ry + s * 0.08); ctx.lineTo(rx + s * 0.12, ry + s * 0.2); ctx.stroke();
      ctx.fillStyle = WOOD_DARK;
      ctx.beginPath(); ctx.roundRect(rx + s * 0.1, ry + s * 0.18, s * 0.05, s * 0.12, 5); ctx.fill();
      ctx.fillStyle = colour;
      ctx.beginPath(); ctx.roundRect(rx - s * 0.1, ry - s * 0.04, s * 0.2, s * 0.08, 10); ctx.fill();
    },
    down(id, x, y) {
      for (let i = 0; i < POTS.length; i++) {
        if (dist(x, y, potX(i), potY) < s * 0.1) {
          colour = POTS[i];
          env.audio.play(5 + i * 2, { vel: 0.4 });
          return;
        }
      }
      holder = id; rx = x; ry = y;
      paintAt(x, y);
    },
    move(id, x, y) {
      if (holder !== id) return;
      rx = clamp(x, r.x + 20, r.x + r.w - 20); ry = clamp(y, r.y + 20, r.y + r.h - 20);
      paintAt(rx, ry);
    },
    up(id) { if (holder === id) holder = null; },
    invite() { ry += 4; },
  };
}

/* ---------------- Saw: back and forth until the plank comes apart ---------------- */

function saw({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const py = cy(r) - s * 0.02, pw = s * 0.82, ph = s * 0.16, px = cx(r) - pw / 2;
  const cutX = cx(r);
  let progress = 0, holder: number | null = null, lastX = 0, sawX = 0, apart = 0, dust: { x: number; y: number; vy: number; life: number }[] = [];
  return {
    frame(dt) {
      if (progress >= 1) apart = Math.min(1, apart + dt * 1.5);
      // trestles
      ctx.fillStyle = WOOD_DARK;
      for (const tx of [px + pw * 0.15, px + pw * 0.85]) {
        ctx.beginPath(); ctx.moveTo(tx - s * 0.06, py + s * 0.35); ctx.lineTo(tx, py + ph); ctx.lineTo(tx + s * 0.06, py + s * 0.35); ctx.lineTo(tx + s * 0.03, py + s * 0.35); ctx.lineTo(tx, py + ph + s * 0.05); ctx.lineTo(tx - s * 0.03, py + s * 0.35); ctx.fill();
      }
      // two halves (they tip apart when cut)
      for (const side of [-1, 1]) {
        ctx.save();
        const hx = side < 0 ? px : cutX;
        ctx.translate(cutX, py + ph);
        ctx.rotate(side * apart * 0.25);
        ctx.translate(-cutX + side * apart * 8, -(py + ph));
        plank(ctx, hx, py, pw / 2, ph);
        ctx.restore();
      }
      // cut line and kerf
      if (progress < 1) {
        ctx.strokeStyle = withAlpha(ink, 0.4); ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cutX, py - 6); ctx.lineTo(cutX, py + ph + 6); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = withAlpha(ink, 0.7);
        ctx.fillRect(cutX - 2, py, 4, ph * progress);
      } else drawFace(ctx, cutX, py - s * 0.18, s * 0.3, ink, { happy: true });
      // sawdust
      for (const d of dust) { d.vy += 300 * dt; d.y += d.vy * dt; d.life -= dt; }
      dust = dust.filter((d) => d.life > 0);
      ctx.fillStyle = '#E3C79F';
      for (const d of dust) { ctx.beginPath(); ctx.arc(d.x, d.y, 2.5, 0, Math.PI * 2); ctx.fill(); }
      // the saw
      if (progress < 1) {
        const bx = cutX + sawX, by = py + ph * progress - 4;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(-0.25);
        ctx.fillStyle = '#C9D1D9';
        ctx.beginPath(); ctx.moveTo(-s * 0.3, 0); ctx.lineTo(s * 0.05, 0); ctx.lineTo(s * 0.05, -s * 0.12); ctx.lineTo(-s * 0.3, -s * 0.05); ctx.fill();
        ctx.fillStyle = '#9AA3AD';
        for (let k = 0; k < 10; k++) { ctx.beginPath(); ctx.moveTo(-s * 0.3 + k * s * 0.035, 0); ctx.lineTo(-s * 0.3 + k * s * 0.035 + s * 0.017, 5); ctx.lineTo(-s * 0.3 + (k + 1) * s * 0.035, 0); ctx.fill(); }
        ctx.fillStyle = '#E8676B';
        ctx.beginPath(); ctx.roundRect(s * 0.04, -s * 0.14, s * 0.12, s * 0.12, 8); ctx.fill();
        ctx.restore();
      }
    },
    down(id, x) {
      if (progress >= 1) {
        progress = 0; apart = 0;
        env.audio.arpeggio([4, 5], 0.08, 0.3);
        return;
      }
      holder = id; lastX = x;
    },
    move(id, x) {
      if (holder !== id || progress >= 1) return;
      const d = x - lastX;
      lastX = x;
      sawX = clamp(sawX + d, -s * 0.15, s * 0.15);
      progress = Math.min(1, progress + Math.abs(d) / (s * 7));
      if (Math.abs(d) > 2 && Math.random() < 0.5) dust.push({ x: cutX + rand(-4, 4), y: py + ph, vy: rand(-30, 0), life: 1 });
      if (Math.abs(d) > 3 && Math.random() < 0.2) env.audio.play(d > 0 ? 4 : 2, { vel: 0.18 });
      if (progress >= 1) {
        env.audio.arpeggio([9, 7, 12], 0.1, 0.5);
        sparks.burst(cutX, py, '#E3C79F', 14, 160, 4);
      }
    },
    up(id) { if (holder === id) holder = null; },
    invite() { sawX = 6; },
  };
}

/* ---------------- Screwdriver: hold to screw them in, click click ---------------- */

function screws({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const py = cy(r) + s * 0.05, pw = s * 0.7, ph = s * 0.2, px = cx(r) - pw / 2;
  const list = [0.3, 0.7].map((f) => ({ x: px + pw * f, depth: 0, angle: 0 }));
  let active: (typeof list)[number] | null = null, holder: number | null = null, nextClick = 0, happy = 0;
  return {
    frame(dt, t) {
      happy = Math.max(0, happy - dt * 0.4);
      if (active && holder !== null && active.depth < 1) {
        active.depth = Math.min(1, active.depth + dt * 0.45);
        active.angle += dt * 8;
        if (t > nextClick) { nextClick = t + 0.14; env.audio.play(6 + Math.round(active.depth * 4), { vel: 0.2 }); }
        if (active.depth >= 1) {
          sparks.burst(active.x, py, '#FFF3C4', 8, 100, 3);
          env.audio.arpeggio([9, 12], 0.08, 0.45);
          if (list.every((o) => o.depth >= 1)) {
            happy = 3;
            setTimeout(() => list.forEach((o) => { o.depth = 0; }), 4000);
          }
        }
      }
      plank(ctx, px, py, pw, ph);
      if (happy > 0) drawFace(ctx, cx(r), py + ph * 0.55, ph * 2, ink, { happy: true });
      for (const sc of list) {
        const up = s * 0.16 * (1 - sc.depth);
        ctx.fillStyle = '#9AA3AD';
        ctx.fillRect(sc.x - 4, py - up, 8, up + 2);
        ctx.strokeStyle = '#6A7480'; ctx.lineWidth = 2;
        for (let k = 0; k < up; k += 5) { ctx.beginPath(); ctx.moveTo(sc.x - 4, py - up + k); ctx.lineTo(sc.x + 4, py - up + k + 3); ctx.stroke(); }
        ctx.fillStyle = '#B9C2CC';
        ctx.beginPath(); ctx.ellipse(sc.x, py - up, s * 0.045, s * 0.02, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#6A7480'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(sc.x - Math.cos(sc.angle) * s * 0.03, py - up); ctx.lineTo(sc.x + Math.cos(sc.angle) * s * 0.03, py - up); ctx.stroke();
      }
      // screwdriver above the active screw
      const sc = active ?? list[0];
      const up = s * 0.16 * (1 - sc.depth);
      const lift = holder !== null ? 0 : s * 0.06;
      ctx.fillStyle = '#9AA3AD';
      ctx.fillRect(sc.x - 3, py - up - s * 0.2 - lift, 6, s * 0.2);
      ctx.fillStyle = '#6CC17A';
      ctx.beginPath(); ctx.roundRect(sc.x - s * 0.05, py - up - s * 0.38 - lift, s * 0.1, s * 0.2, 10); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      const stripe = Math.sin(sc.angle) * s * 0.025;
      ctx.fillRect(sc.x + stripe - 3, py - up - s * 0.36 - lift, 6, s * 0.16);
    },
    down(id, x) {
      active = list.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a));
      holder = id;
      env.audio.play(5, { vel: 0.3 });
    },
    move() {},
    up(id) { if (holder === id) holder = null; },
    invite() { list[0].angle += 1; },
  };
}

/* ---------------- Tape measure: pull it out, let go, zip! ---------------- */

function tape({ ctx, env, r, ink }: Kit): Gadget {
  const s = size(r);
  const caseX = r.x + s * 0.24 + 10, caseY = cy(r);
  let len = 0, holder: number | null = null, lastMark = 0, zip = false;
  const maxLen = r.x + r.w - 24 - caseX;
  return {
    frame(dt) {
      if (holder === null && len > 0) {
        len = Math.max(0, len - dt * 900);
        if (len === 0 && zip) { zip = false; env.audio.play(2, { vel: 0.4, bloop: true }); }
      }
      // tape
      if (len > 2) {
        ctx.fillStyle = '#F7D774';
        ctx.fillRect(caseX, caseY + s * 0.03, len, s * 0.08);
        ctx.fillStyle = ink;
        for (let m = 0; m < len; m += 12) ctx.fillRect(caseX + m, caseY + s * 0.03, 2, m % 60 === 0 ? s * 0.05 : s * 0.025);
        ctx.font = `800 ${Math.round(s * 0.06)}px "Nunito Variable", Nunito, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (let m = 60, k = 1; m < len; m += 60, k++) ctx.fillText(String(k), caseX + m, caseY + s * 0.115);
        ctx.fillStyle = '#9AA3AD';
        ctx.fillRect(caseX + len - 3, caseY + s * 0.01, 8, s * 0.12);
      }
      // case
      ctx.fillStyle = '#F2C14E';
      ctx.beginPath(); ctx.roundRect(caseX - s * 0.2, caseY - s * 0.12, s * 0.22, s * 0.26, 14); ctx.fill();
      ctx.fillStyle = withAlpha(ink, 0.7);
      ctx.beginPath(); ctx.arc(caseX - s * 0.09, caseY + s * 0.01, s * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F2C14E';
      ctx.beginPath(); ctx.arc(caseX - s * 0.09, caseY + s * 0.01, s * 0.025, 0, Math.PI * 2); ctx.fill();
      // end hook, the thing to grab
      ctx.fillStyle = '#E8676B';
      ctx.beginPath(); ctx.roundRect(caseX + len - 2, caseY - s * 0.02, s * 0.06, s * 0.18, 6); ctx.fill();
    },
    down(id, x) {
      holder = id;
      len = clamp(x - caseX, 0, maxLen);
      env.audio.play(5, { vel: 0.3 });
    },
    move(id, x) {
      if (holder !== id) return;
      len = clamp(x - caseX, 0, maxLen);
      const mark = Math.floor(len / 60);
      if (mark !== lastMark) { lastMark = mark; env.audio.play(4 + mark, { vel: 0.35, pan: panFor(x, env.w) }); }
    },
    up(id) {
      if (holder !== id) return;
      holder = null;
      zip = len > 10;
      if (zip) env.audio.arpeggio([12, 10, 9, 7, 5], 0.04, 0.3);
      lastMark = 0;
    },
    invite() { len = 30; },
  };
}

type Kind = 'hammer' | 'drill' | 'roller' | 'saw' | 'screws' | 'tape';

/** Tool Bench: hammer nails, drill a hole for a picture, paint the fence, saw a plank, screw, measure. */
export const toolBench = makePanelBoard<Kind>(
  [
    ['hammer', 'drill', 'roller'],
    ['hammer', 'drill', 'roller', 'saw'],
    ['hammer', 'drill', 'roller', 'saw', 'screws', 'tape'],
  ],
  (kind, kit) =>
    kind === 'hammer' ? hammer(kit)
    : kind === 'drill' ? drill(kit)
    : kind === 'roller' ? roller(kit)
    : kind === 'saw' ? saw(kit)
    : kind === 'screws' ? screws(kit)
    : tape(kit),
);
