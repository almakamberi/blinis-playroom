import { cx, cy, makePanelBoard, size, tapOnly, type Gadget, type Kit } from './panels';
import { approach, dist, drawFace, panFor, rand, withAlpha } from './util';

interface Puff { x: number; y: number; r: number; life: number }

function drawPuffs(ctx: CanvasRenderingContext2D, puffs: Puff[], dt: number) {
  for (const p of puffs) {
    p.life -= dt * 0.7;
    p.y -= dt * 30;
    p.r += dt * 8;
    p.x += Math.sin(p.y * 0.05) * 0.3;
    if (p.life <= 0) continue;
    ctx.fillStyle = `rgba(255,255,255,${0.7 * p.life})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  return puffs.filter((p) => p.life > 0);
}

/* ---------------- Hob: two knobs, a bubbling pot and a frying egg ---------------- */

function hob({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const on = [false, false];
  const glow = [0, 0];
  const knobAng = [0, 0];
  let puffs: Puff[] = [];
  let lidHop = 0, nextBlub = 0, egg = 0;
  const top = { x: cx(r) - s * 0.45, y: cy(r) - s * 0.36, w: s * 0.9, h: s * 0.56 };
  const burner = [0, 1].map((i) => ({ x: cx(r) + (i === 0 ? -1 : 1) * s * 0.21, y: cy(r) - s * 0.08 }));
  const knob = [0, 1].map((i) => ({ x: cx(r) + (i === 0 ? -1 : 1) * s * 0.21, y: cy(r) + s * 0.32 }));
  const toggle = (i: number) => {
    on[i] = !on[i];
    env.audio.play(on[i] ? 6 + i : 2, { vel: 0.45, pan: panFor(burner[i].x, env.w) });
    if (on[i]) sparks.burst(burner[i].x, burner[i].y, '#F49A6B', 6, 70, 3);
  };
  return tapOnly({
    frame(dt, t) {
      for (const i of [0, 1]) {
        glow[i] = approach(glow[i], on[i] ? 1 : 0, 3, dt);
        knobAng[i] = approach(knobAng[i], on[i] ? Math.PI / 2 : 0, 12, dt);
      }
      lidHop = Math.max(0, lidHop - dt * 3);
      if (glow[1] > 0.6) egg = Math.min(1, egg + dt * 0.25);
      // cooker top
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.roundRect(top.x, top.y, top.w, top.h, s * 0.06); ctx.fill();
      ctx.strokeStyle = withAlpha(ink, 0.15); ctx.lineWidth = 2; ctx.stroke();
      for (const i of [0, 1]) {
        const b = burner[i];
        if (glow[i] > 0.02) {
          ctx.fillStyle = withAlpha('#F49A6B', 0.5 * glow[i]);
          ctx.beginPath(); ctx.arc(b.x, b.y, s * 0.16, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = glow[i] > 0.5 ? '#E8676B' : withAlpha(ink, 0.5);
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(b.x, b.y, s * 0.13, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(b.x, b.y, s * 0.07, 0, Math.PI * 2); ctx.stroke();
      }
      // pot on the left burner
      const p = burner[0];
      const boil = glow[0] > 0.7;
      const jig = boil ? Math.sin(t * 30) * 1.5 : 0;
      ctx.fillStyle = '#5FAFE0';
      ctx.beginPath(); ctx.roundRect(p.x - s * 0.13, p.y - s * 0.1, s * 0.26, s * 0.16, s * 0.04); ctx.fill();
      ctx.fillRect(p.x - s * 0.18, p.y - s * 0.07, s * 0.06, s * 0.03);
      ctx.fillRect(p.x + s * 0.12, p.y - s * 0.07, s * 0.06, s * 0.03);
      const ly = p.y - s * 0.11 - lidHop * s * 0.05 + jig;
      ctx.fillStyle = '#4A9AD0';
      ctx.beginPath(); ctx.ellipse(p.x, ly, s * 0.14, s * 0.03, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, ly - s * 0.03, s * 0.025, 0, Math.PI * 2); ctx.fill();
      if (boil) {
        if (Math.random() < dt * 4) puffs.push({ x: p.x + rand(-s * 0.08, s * 0.08), y: ly - 6, r: s * 0.025, life: 1 });
        if (t > nextBlub) { nextBlub = t + rand(0.4, 0.8); env.audio.play(Math.floor(rand(0, 3)), { vel: 0.12 }); lidHop = 0.3; }
      }
      // frying pan + egg on the right
      const f = burner[1];
      ctx.fillStyle = withAlpha(ink, 0.75);
      ctx.beginPath(); ctx.arc(f.x, f.y, s * 0.11, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(f.x + s * 0.1, f.y - s * 0.015, s * 0.12, s * 0.03);
      ctx.fillStyle = `rgba(255,255,255,${0.55 + egg * 0.45})`;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, s * 0.075, s * 0.06, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F7C04A';
      ctx.beginPath(); ctx.arc(f.x + s * 0.01, f.y, s * 0.03, 0, Math.PI * 2); ctx.fill();
      if (egg >= 1) drawFace(ctx, f.x, f.y + s * 0.005, s * 0.11, ink, { happy: true });
      if (glow[1] > 0.6 && Math.random() < dt * 6) sparks.burst(f.x + rand(-s * 0.08, s * 0.08), f.y, '#FFFFFF', 1, 50, 2);
      puffs = drawPuffs(ctx, puffs, dt);
      // knobs on the front
      ctx.fillStyle = '#EEF1F4';
      ctx.beginPath(); ctx.roundRect(top.x, cy(r) + s * 0.22, top.w, s * 0.2, s * 0.05); ctx.fill();
      for (const i of [0, 1]) {
        const k = knob[i];
        ctx.fillStyle = on[i] ? '#E8676B' : '#FFFFFF';
        ctx.beginPath(); ctx.arc(k.x, k.y, s * 0.075, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = withAlpha(ink, 0.3); ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = on[i] ? '#FFFFFF' : ink; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(k.x, k.y);
        ctx.lineTo(k.x + Math.sin(knobAng[i]) * s * 0.055, k.y - Math.cos(knobAng[i]) * s * 0.055);
        ctx.stroke();
      }
    },
    tap(x, y) {
      for (const i of [0, 1]) {
        if (dist(x, y, knob[i].x, knob[i].y) < s * 0.13 || dist(x, y, burner[i].x, burner[i].y) < s * 0.17) {
          if (i === 1 && !on[1] && egg >= 1) egg = 0; // a fresh egg
          return toggle(i);
        }
      }
      lidHop = 1;
      env.audio.play(4, { vel: 0.3 });
    },
    invite() { lidHop = 1; },
  });
}

/* ---------------- Fridge: open the door, the light comes on, tap the food ---------------- */

function fridge({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const w = s * 0.52, h = s * 0.86;
  const x = cx(r) - w / 2, y = cy(r) - h / 2;
  let open = 0, target = 0;
  const food = [
    { kind: 'apple', fx: 0.3, fy: 0.22, wig: 0, note: 5 },
    { kind: 'milk', fx: 0.68, fy: 0.2, wig: 0, note: 7 },
    { kind: 'cheese', fx: 0.32, fy: 0.52, wig: 0, note: 9 },
    { kind: 'carrot', fx: 0.7, fy: 0.52, wig: 0, note: 10 },
    { kind: 'egg', fx: 0.5, fy: 0.82, wig: 0, note: 12 },
  ];
  function drawFood(f: (typeof food)[number]) {
    const fx = x + w * f.fx, fy = y + h * f.fy;
    const q = s * 0.06;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(Math.sin(f.wig * 20) * f.wig * 0.3);
    switch (f.kind) {
      case 'apple':
        ctx.fillStyle = '#E8676B'; ctx.beginPath(); ctx.arc(0, 0, q, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6CC17A'; ctx.beginPath(); ctx.ellipse(q * 0.4, -q, q * 0.4, q * 0.2, -0.5, 0, Math.PI * 2); ctx.fill();
        break;
      case 'milk':
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-q * 0.7, -q * 1.1, q * 1.4, q * 2.1);
        ctx.fillStyle = '#5FAFE0'; ctx.fillRect(-q * 0.7, -q * 0.2, q * 1.4, q * 0.6);
        ctx.beginPath(); ctx.moveTo(-q * 0.7, -q * 1.1); ctx.lineTo(0, -q * 1.6); ctx.lineTo(q * 0.7, -q * 1.1); ctx.fillStyle = '#FFFFFF'; ctx.fill();
        break;
      case 'cheese':
        ctx.fillStyle = '#F7D774'; ctx.beginPath(); ctx.moveTo(-q, q * 0.6); ctx.lineTo(q, q * 0.6); ctx.lineTo(q, -q * 0.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#E8C055'; ctx.beginPath(); ctx.arc(q * 0.4, q * 0.15, q * 0.15, 0, Math.PI * 2); ctx.fill();
        break;
      case 'carrot':
        ctx.fillStyle = '#F2A65A'; ctx.beginPath(); ctx.moveTo(-q * 0.35, -q * 0.7); ctx.lineTo(q * 0.35, -q * 0.7); ctx.lineTo(0, q); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#6CC17A'; ctx.fillRect(-q * 0.1, -q * 1.1, q * 0.2, q * 0.4);
        break;
      default:
        ctx.fillStyle = '#FFF8EC'; ctx.beginPath(); ctx.ellipse(0, 0, q * 0.6, q * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  return tapOnly({
    frame(dt) {
      open = approach(open, target, 6, dt);
      for (const f of food) f.wig = Math.max(0, f.wig - dt);
      // inside
      ctx.fillStyle = '#E3EEF6';
      ctx.beginPath(); ctx.roundRect(x, y, w, h, s * 0.05); ctx.fill();
      if (open > 0.05) {
        ctx.fillStyle = withAlpha('#FFF6C8', 0.6 * open);
        ctx.beginPath(); ctx.roundRect(x + 4, y + 4, w - 8, h - 8, s * 0.04); ctx.fill();
        ctx.fillStyle = '#FFE08A';
        ctx.beginPath(); ctx.arc(cx(r), y + 12, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = withAlpha(ink, 0.2); ctx.lineWidth = 3;
        for (const fy of [0.36, 0.66]) { ctx.beginPath(); ctx.moveTo(x + 6, y + h * fy); ctx.lineTo(x + w - 6, y + h * fy); ctx.stroke(); }
        for (const f of food) drawFood(f);
      }
      // the door swings on the left hinge
      const k = Math.cos(open * Math.PI * 0.47);
      const dw = w * k;
      ctx.fillStyle = '#F4A9C0';
      ctx.beginPath(); ctx.roundRect(x, y, Math.max(4, dw), h, s * 0.05); ctx.fill();
      if (k > 0.3) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.roundRect(x + dw - s * 0.06, y + h * 0.3, s * 0.025, h * 0.25, 4); ctx.fill();
        // fridge magnets
        for (const [mx, my, c] of [[0.3, 0.2, '#F2C14E'], [0.5, 0.3, '#5FAFE0'], [0.35, 0.7, '#6CC17A']] as const) {
          ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + dw * mx, y + h * my, s * 0.03, 0, Math.PI * 2); ctx.fill();
        }
        drawFace(ctx, x + dw * 0.45, y + h * 0.5, dw * 0.55, ink, {});
      }
    },
    tap(tx, ty) {
      if (target === 1) {
        for (const f of food) {
          if (dist(tx, ty, x + w * f.fx, y + h * f.fy) < s * 0.09) {
            f.wig = 0.6;
            sparks.burst(x + w * f.fx, y + h * f.fy, '#FFF6C8', 6, 70, 3);
            env.audio.play(f.note, { vel: 0.5, pan: panFor(tx, env.w) });
            return;
          }
        }
        target = 0;
        env.audio.play(2, { vel: 0.4 });
      } else {
        target = 1;
        env.audio.arpeggio([7, 9, 12], 0.08, 0.4);
      }
    },
    invite() { food[0].wig = 0.6; },
  });
}

/* ---------------- Washing machine: start, spin, bubbles, ding ---------------- */

function washer({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const w = s * 0.72, h = s * 0.8;
  const x = cx(r) - w / 2, y = cy(r) - h / 2;
  const dx = cx(r), dy = y + h * 0.58, R = w * 0.3;
  const btn = { x: x + w * 0.8, y: y + h * 0.1 };
  let running = 0, angle = 0, speed = 0, nextHum = 0;
  let bubbles: { a: number; d: number; life: number }[] = [];
  const clothes = ['#E8676B', '#F2C14E', '#6CC17A', '#B8A2E3'];
  return tapOnly({
    frame(dt, t) {
      if (running > 0) {
        running -= dt;
        if (t > nextHum) { nextHum = t + 0.35; env.audio.play(Math.floor(t * 3) % 2 ? 0 : 2, { vel: 0.12 }); }
        if (Math.random() < dt * 8) bubbles.push({ a: rand(0, Math.PI * 2), d: rand(0, R * 0.8), life: 1 });
        if (running <= 0) {
          running = 0;
          env.audio.arpeggio([9, 12, 9, 12], 0.15, 0.5);
          sparks.burst(dx, dy, '#FFFFFF', 12, 160, 4);
        }
      }
      speed = approach(speed, running > 0 ? 9 : 0, 1.2, dt);
      angle += speed * dt;
      const shake = speed > 6 ? Math.sin(t * 50) * 1.5 : 0;
      ctx.save();
      ctx.translate(shake, 0);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.roundRect(x, y, w, h, s * 0.06); ctx.fill();
      ctx.strokeStyle = withAlpha(ink, 0.15); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#EEF1F4';
      ctx.fillRect(x + 4, y + h * 0.2, w - 8, 3);
      // dial and start button
      ctx.fillStyle = withAlpha(ink, 0.25);
      ctx.beginPath(); ctx.arc(x + w * 0.2, y + h * 0.1, s * 0.035, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = running > 0 ? '#6CC17A' : '#E8676B';
      ctx.beginPath(); ctx.arc(btn.x, btn.y, s * 0.045, 0, Math.PI * 2); ctx.fill();
      // drum
      ctx.fillStyle = '#C9C2B8';
      ctx.beginPath(); ctx.arc(dx, dy, R + 8, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(dx, dy, R, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#DCEBF5'; ctx.fillRect(dx - R, dy - R, R * 2, R * 2);
      if (speed > 0.5) {
        ctx.fillStyle = withAlpha('#7FC4EC', 0.7);
        ctx.fillRect(dx - R, dy + R * 0.1 + Math.sin(t * 6) * 3, R * 2, R);
      }
      clothes.forEach((c, i) => {
        const a = angle + (i * Math.PI) / 2;
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.ellipse(dx + Math.cos(a) * R * 0.45, dy + Math.sin(a) * R * 0.45, R * 0.3, R * 0.2, a, 0, Math.PI * 2); ctx.fill();
      });
      for (const b of bubbles) {
        b.life -= dt * 0.8;
        ctx.strokeStyle = `rgba(255,255,255,${b.life})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(dx + Math.cos(b.a) * b.d, dy + Math.sin(b.a) * b.d - (1 - b.life) * 20, 4 + (1 - b.life) * 4, 0, Math.PI * 2); ctx.stroke();
      }
      bubbles = bubbles.filter((b) => b.life > 0);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(dx - R * 0.35, dy - R * 0.4, R * 0.25, R * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },
    tap() {
      if (running > 0) {
        env.audio.play(4, { vel: 0.3 });
        return;
      }
      running = 6;
      env.audio.arpeggio([4, 7, 9], 0.08, 0.45);
    },
    invite() { angle += 0.6; },
  });
}

/* ---------------- Microwave: start, count down, ding ---------------- */

function microwave({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const w = s * 0.88, h = s * 0.58;
  const x = cx(r) - w / 2, y = cy(r) - h / 2;
  const win = { x: x + w * 0.06, y: y + h * 0.12, w: w * 0.6, h: h * 0.76 };
  const btn = { x: x + w * 0.83, y: y + h * 0.68 };
  let time = 0, lastSec = 0, plate = 0, ready = false;
  let puffs: Puff[] = [];
  return tapOnly({
    frame(dt) {
      const running = time > 0;
      if (running) {
        time -= dt;
        plate += dt * 2;
        const sec = Math.ceil(time);
        if (sec !== lastSec) { lastSec = sec; if (sec > 0) env.audio.play(10, { vel: 0.15 }); }
        if (time <= 0) {
          time = 0;
          ready = true;
          env.audio.play(14, { vel: 0.55 });
          setTimeout(() => env.audio.play(14, { vel: 0.45 }), 300);
          sparks.burst(win.x + win.w / 2, win.y + win.h / 2, '#FFE08A', 10, 140, 4);
        }
      }
      ctx.fillStyle = '#B9C2CC';
      ctx.beginPath(); ctx.roundRect(x, y, w, h, s * 0.05); ctx.fill();
      // window and inside
      ctx.fillStyle = running ? '#FFE9A8' : '#3A3540';
      ctx.beginPath(); ctx.roundRect(win.x, win.y, win.w, win.h, s * 0.03); ctx.fill();
      const px = win.x + win.w / 2, py = win.y + win.h * 0.72;
      ctx.fillStyle = withAlpha('#FFFFFF', 0.6);
      ctx.beginPath(); ctx.ellipse(px, py + 8, win.w * 0.36, win.h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
      const bx = px + Math.sin(plate) * win.w * 0.12;
      ctx.fillStyle = '#F2A65A';
      ctx.beginPath(); ctx.arc(bx, py - 4, win.h * 0.18, 0, Math.PI); ctx.fill();
      ctx.fillRect(bx - win.h * 0.2, py - 6, win.h * 0.4, 4);
      if (ready) {
        if (Math.random() < dt * 5) puffs.push({ x: bx + rand(-8, 8), y: py - 12, r: 4, life: 0.8 });
        drawFace(ctx, bx, py + win.h * 0.06, win.h * 0.25, ink, { happy: true });
      }
      ctx.save();
      ctx.beginPath(); ctx.roundRect(win.x, win.y, win.w, win.h, s * 0.03); ctx.clip();
      puffs = drawPuffs(ctx, puffs, dt);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath(); ctx.moveTo(win.x, win.y + win.h * 0.5); ctx.lineTo(win.x + win.w * 0.4, win.y); ctx.lineTo(win.x + win.w * 0.6, win.y); ctx.lineTo(win.x, win.y + win.h * 0.8); ctx.fill();
      // display
      ctx.fillStyle = '#2E2A36';
      ctx.beginPath(); ctx.roundRect(x + w * 0.72, y + h * 0.14, w * 0.22, h * 0.22, 6); ctx.fill();
      ctx.fillStyle = '#7CE08A';
      ctx.font = `800 ${Math.round(h * 0.16)}px "Nunito Variable", Nunito, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(running ? String(Math.ceil(time)) : ready ? '☺' : '0', x + w * 0.83, y + h * 0.255);
      ctx.fillStyle = running ? '#E8676B' : '#6CC17A';
      ctx.beginPath(); ctx.arc(btn.x, btn.y, s * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.moveTo(btn.x - s * 0.018, btn.y - s * 0.028); ctx.lineTo(btn.x + s * 0.028, btn.y); ctx.lineTo(btn.x - s * 0.018, btn.y + s * 0.028); ctx.fill();
    },
    tap() {
      if (time > 0) { time += 1; env.audio.play(8, { vel: 0.25 }); return; }
      ready = false;
      time = 3.99;
      lastSec = 4;
      env.audio.play(5, { vel: 0.4 });
    },
    invite() { plate += 0.5; },
  });
}

/* ---------------- Kettle: switch on, it rumbles, steams and clicks off ---------------- */

function kettle({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const kx = cx(r), ky = cy(r) + s * 0.05;
  let heat = 0, on = false, done = 0;
  let puffs: Puff[] = [];
  return tapOnly({
    frame(dt, t) {
      if (on) {
        heat = Math.min(1, heat + dt * 0.25);
        if (heat >= 1) {
          on = false;
          done = 2;
          env.audio.arpeggio([12, 14, 15, 17], 0.07, 0.4);
          for (let i = 0; i < 8; i++) puffs.push({ x: kx + s * 0.22 + rand(-6, 6), y: ky - s * 0.2 - i * 6, r: rand(5, 10), life: 1 });
        }
      } else {
        heat = Math.max(0, heat - dt * 0.05);
      }
      done = Math.max(0, done - dt);
      const rumble = on ? Math.sin(t * 40) * heat * 2 : 0;
      if (on && heat > 0.5 && Math.random() < dt * 6 * heat) puffs.push({ x: kx + s * 0.24, y: ky - s * 0.18, r: 4, life: 0.9 });
      // base
      ctx.fillStyle = withAlpha(ink, 0.6);
      ctx.beginPath(); ctx.roundRect(kx - s * 0.24, ky + s * 0.25, s * 0.48, s * 0.07, 8); ctx.fill();
      ctx.fillStyle = on ? '#E8676B' : withAlpha('#FFFFFF', 0.5);
      ctx.beginPath(); ctx.arc(kx + s * 0.15, ky + s * 0.285, s * 0.02, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(rumble, 0);
      // spout and handle
      ctx.fillStyle = '#F2A65A';
      ctx.beginPath(); ctx.moveTo(kx + s * 0.15, ky - s * 0.02); ctx.lineTo(kx + s * 0.28, ky - s * 0.18); ctx.lineTo(kx + s * 0.3, ky - s * 0.13); ctx.lineTo(kx + s * 0.18, ky + s * 0.08); ctx.fill();
      ctx.strokeStyle = '#F2A65A'; ctx.lineWidth = s * 0.04;
      ctx.beginPath(); ctx.arc(kx - s * 0.2, ky, s * 0.1, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
      // body
      ctx.fillStyle = '#F2A65A';
      ctx.beginPath(); ctx.roundRect(kx - s * 0.2, ky - s * 0.2, s * 0.4, s * 0.45, s * 0.12); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.roundRect(kx - s * 0.14, ky - s * 0.12, s * 0.06, s * 0.25, 8); ctx.fill();
      ctx.fillStyle = withAlpha(ink, 0.55);
      ctx.beginPath(); ctx.roundRect(kx - s * 0.08, ky - s * 0.25, s * 0.16, s * 0.06, 6); ctx.fill();
      // water window shows how hot it is
      ctx.fillStyle = withAlpha('#FFFFFF', 0.7);
      ctx.beginPath(); ctx.roundRect(kx + s * 0.07, ky - s * 0.1, s * 0.07, s * 0.26, 5); ctx.fill();
      ctx.fillStyle = heat > 0.7 ? '#E8676B' : '#7FC4EC';
      const wh = s * 0.24 * (0.3 + heat * 0.7);
      ctx.beginPath(); ctx.roundRect(kx + s * 0.08, ky + s * 0.15 - wh, s * 0.05, wh, 4); ctx.fill();
      drawFace(ctx, kx - s * 0.04, ky + s * 0.03, s * 0.3, ink, { happy: done > 0 || on });
      ctx.restore();
      puffs = drawPuffs(ctx, puffs, dt);
      if (done > 1.8) sparks.burst(kx + s * 0.28, ky - s * 0.18, '#FFFFFF', 2, 60, 3);
    },
    tap() {
      on = !on;
      env.audio.play(on ? 7 : 3, { vel: 0.45 });
      if (on && heat >= 1) heat = 0.2;
    },
    invite() { puffs.push({ x: kx + s * 0.24, y: ky - s * 0.18, r: 4, life: 0.7 }); },
  });
}

/* ---------------- Blender: fruit goes round and round and turns into a smoothie ---------------- */

function blender({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const bx = cx(r), by = cy(r);
  const jar = { x: bx - s * 0.17, y: by - s * 0.36, w: s * 0.34, h: s * 0.5 };
  const FRUIT = ['#E8676B', '#F2C14E', '#6CC17A', '#B8A2E3', '#F2A65A'];
  let fruit = [FRUIT[0], FRUIT[1], FRUIT[2]];
  let spin = 0, ang = 0, blend = 0, nextNote = 0, step = 0;
  const mix = () => fruit[0];
  return tapOnly({
    frame(dt, t) {
      if (spin > 0) {
        spin -= dt;
        blend = Math.min(1, blend + dt * 0.4);
        if (t > nextNote) { nextNote = t + 0.12; step++; env.audio.play(3 + (step % 8), { vel: 0.15 }); }
        if (spin <= 0) {
          env.audio.arpeggio([9, 12, 14], 0.1, 0.45);
          sparks.burst(bx, jar.y, mix(), 10, 130, 4);
        }
      }
      ang += dt * (spin > 0 ? 18 : 0.5);
      const shake = spin > 0 ? Math.sin(t * 45) * 1.5 : 0;
      ctx.save();
      ctx.translate(shake, 0);
      // base and button
      ctx.fillStyle = '#5FAFE0';
      ctx.beginPath(); ctx.roundRect(bx - s * 0.22, by + s * 0.14, s * 0.44, s * 0.22, s * 0.06); ctx.fill();
      ctx.fillStyle = spin > 0 ? '#6CC17A' : '#FFFFFF';
      ctx.beginPath(); ctx.arc(bx, by + s * 0.25, s * 0.055, 0, Math.PI * 2); ctx.fill();
      // jar
      ctx.save();
      ctx.beginPath(); ctx.roundRect(jar.x, jar.y, jar.w, jar.h, s * 0.04); ctx.clip();
      ctx.fillStyle = withAlpha('#FFFFFF', 0.6); ctx.fillRect(jar.x, jar.y, jar.w, jar.h);
      if (blend > 0) {
        ctx.fillStyle = withAlpha(mix(), 0.85 * blend);
        ctx.fillRect(jar.x, jar.y + jar.h * (1 - blend * 0.7), jar.w, jar.h);
      }
      if (blend < 1) {
        fruit.forEach((c, i) => {
          const a = ang + (i * Math.PI * 2) / 3;
          ctx.fillStyle = withAlpha(c, 1 - blend);
          ctx.beginPath(); ctx.arc(bx + Math.cos(a) * jar.w * 0.22, jar.y + jar.h * 0.68 + Math.sin(a) * jar.h * 0.12, s * 0.055, 0, Math.PI * 2); ctx.fill();
        });
      }
      ctx.restore();
      ctx.strokeStyle = withAlpha(ink, 0.35); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(jar.x, jar.y, jar.w, jar.h, s * 0.04); ctx.stroke();
      ctx.fillStyle = withAlpha(ink, 0.5);
      ctx.beginPath(); ctx.roundRect(jar.x - 4, jar.y - s * 0.05, jar.w + 8, s * 0.06, 6); ctx.fill();
      if (blend >= 1 && spin <= 0) drawFace(ctx, bx, jar.y + jar.h * 0.65, jar.w * 0.7, ink, { happy: true });
      ctx.restore();
    },
    tap() {
      if (spin > 0) return;
      if (blend >= 1) {
        // fresh fruit for another go
        blend = 0;
        const start = Math.floor(Math.random() * FRUIT.length);
        fruit = [0, 1, 2].map((i) => FRUIT[(start + i) % FRUIT.length]);
        env.audio.arpeggio([5, 7], 0.08, 0.35);
        return;
      }
      spin = 2.6;
      env.audio.play(2, { vel: 0.4 });
    },
    invite() { ang += 1; },
  });
}

type Kind = 'hob' | 'fridge' | 'washer' | 'microwave' | 'kettle' | 'blender';

/** Kitchen: a cooker with a pot and an egg, fridge, washing machine, microwave, kettle and blender. */
export const kitchen = makePanelBoard<Kind>(
  [
    ['hob', 'fridge', 'washer'],
    ['hob', 'fridge', 'washer', 'microwave'],
    ['hob', 'fridge', 'washer', 'microwave', 'kettle', 'blender'],
  ],
  (kind, kit) =>
    kind === 'hob' ? hob(kit)
    : kind === 'fridge' ? fridge(kit)
    : kind === 'washer' ? washer(kit)
    : kind === 'microwave' ? microwave(kit)
    : kind === 'kettle' ? kettle(kit)
    : blender(kit),
);
