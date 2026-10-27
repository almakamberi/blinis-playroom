import { cx, cy, makePanelBoard, size, tapOnly, type Gadget, type Kit } from './panels';
import { approach, clamp, dist, drawFace, panFor, rand, withAlpha } from './util';

const CAR = '#E8676B';

/* ---------------- Steering wheel and horn ---------------- */

function horn({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const x = cx(r), y = cy(r);
  const R = s * 0.36;
  let turn = 0, target = 0, squish = 0, waves = 0;
  return tapOnly({
    frame(dt) {
      turn = approach(turn, target, 5, dt);
      target = approach(target, 0, 1.5, dt);
      squish = Math.max(0, squish - dt * 4);
      waves = Math.max(0, waves - dt * 1.2);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(turn);
      ctx.strokeStyle = withAlpha(ink, 0.8); ctx.lineWidth = s * 0.07;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = s * 0.05;
      for (const a of [Math.PI / 2, Math.PI * 1.17, -Math.PI * 0.17]) {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke();
      }
      ctx.restore();
      const hr = s * 0.13 * (1 - squish * 0.15);
      ctx.fillStyle = CAR;
      ctx.beginPath(); ctx.arc(x, y, hr, 0, Math.PI * 2); ctx.fill();
      drawFace(ctx, x, y, hr * 1.7, '#FFFFFF', { happy: squish > 0 });
      if (waves > 0) {
        ctx.strokeStyle = withAlpha('#F2C14E', waves); ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (let k = 1; k <= 3; k++) {
          const rr = R + k * 10 + (1 - waves) * 20;
          ctx.beginPath(); ctx.arc(x, y, rr, -0.5, 0.5); ctx.stroke();
          ctx.beginPath(); ctx.arc(x, y, rr, Math.PI - 0.5, Math.PI + 0.5); ctx.stroke();
        }
      }
    },
    tap(tx, ty) {
      if (dist(tx, ty, x, y) < s * 0.2) {
        squish = 1; waves = 1;
        env.audio.play(4, { vel: 0.6, bloop: true });
        setTimeout(() => env.audio.play(4, { vel: 0.55, bloop: true }), 220);
        sparks.burst(x, y - R, '#F2C14E', 5, 70, 3);
      } else {
        target = tx < x ? -0.6 : 0.6; // turn the wheel
        env.audio.play(tx < x ? 3 : 5, { vel: 0.35, pan: panFor(tx, env.w) });
      }
    },
    invite() { target = 0.3; },
  });
}

/* ---------------- Car face with headlights ---------------- */

function headlights({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const x = cx(r), y = cy(r) - s * 0.06;
  const w = s * 0.8, h = s * 0.5;
  const btn = { x, y: y + h / 2 + s * 0.14 };
  let on = false, glow = 0, honk = 0;
  return tapOnly({
    frame(dt) {
      glow = approach(glow, on ? 1 : 0, 6, dt);
      honk = Math.max(0, honk - dt * 3);
      // beams
      if (glow > 0.02) {
        for (const sx of [-1, 1]) {
          const g = ctx.createRadialGradient(x + sx * w * 0.3, y + h * 0.1, 0, x + sx * w * 0.3, y + h * 0.1, s * 0.35);
          g.addColorStop(0, withAlpha('#FFF3C4', 0.8 * glow));
          g.addColorStop(1, withAlpha('#FFF3C4', 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(x + sx * w * 0.3, y + h * 0.1, s * 0.35, 0, Math.PI * 2); ctx.fill();
        }
      }
      // body
      ctx.fillStyle = CAR;
      ctx.beginPath(); ctx.roundRect(x - w / 2, y - h * 0.1, w, h * 0.7, s * 0.08); ctx.fill();
      ctx.beginPath(); ctx.roundRect(x - w * 0.36, y - h * 0.55, w * 0.72, h * 0.5, s * 0.08); ctx.fill();
      ctx.fillStyle = '#BFE3F5';
      ctx.beginPath(); ctx.roundRect(x - w * 0.3, y - h * 0.48, w * 0.6, h * 0.34, s * 0.05); ctx.fill();
      // headlight eyes
      for (const sx of [-1, 1]) {
        const ex = x + sx * w * 0.3, ey = y + h * 0.1;
        ctx.fillStyle = glow > 0.5 ? '#FFF3C4' : '#FFFFFF';
        ctx.beginPath(); ctx.arc(ex, ey, s * 0.07, 0, Math.PI * 2); ctx.fill();
        if (glow < 0.5) {
          // sleepy lids when the lights are off
          ctx.fillStyle = CAR;
          ctx.beginPath(); ctx.arc(ex, ey, s * 0.075, Math.PI, 0); ctx.fill();
        } else {
          ctx.fillStyle = ink;
          ctx.beginPath(); ctx.arc(ex, ey + 2, s * 0.025, 0, Math.PI * 2); ctx.fill();
        }
      }
      // grille smile
      ctx.strokeStyle = withAlpha(ink, 0.7); ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y + h * 0.15, w * (0.12 + honk * 0.04), 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
      // wheels
      ctx.fillStyle = withAlpha(ink, 0.85);
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.roundRect(x + sx * w * 0.32 - s * 0.06, y + h * 0.58, s * 0.12, s * 0.08, 6); ctx.fill(); }
      // light button
      ctx.fillStyle = on ? '#F2C14E' : '#FFFFFF';
      ctx.beginPath(); ctx.arc(btn.x, btn.y, s * 0.065, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = withAlpha(ink, 0.3); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = on ? '#FFFFFF' : '#F2C14E';
      ctx.beginPath(); ctx.arc(btn.x, btn.y, s * 0.025, 0, Math.PI * 2); ctx.fill();
    },
    tap(tx, ty) {
      if (Math.abs(tx - x) < w * 0.15 && Math.abs(ty - (y + h * 0.15)) < h * 0.2) {
        honk = 1;
        env.audio.play(5, { vel: 0.5, bloop: true });
        return;
      }
      on = !on;
      env.audio.play(on ? 9 : 4, { vel: 0.45, pan: panFor(tx, env.w) });
      if (on) sparks.burst(x, y + h * 0.1, '#FFF3C4', 8, 120, 4);
    },
    invite() { honk = 1; },
  });
}

/* ---------------- Windscreen wipers clearing the rain ---------------- */

function wipers({ ctx, env, r, ink }: Kit): Gadget {
  const s = size(r);
  const x = cx(r), y = cy(r);
  const w = s * 0.85, h = s * 0.55;
  const pivots = [{ x: x - w * 0.22, y: y + h * 0.42 }, { x: x + w * 0.22, y: y + h * 0.42 }];
  const L = h * 0.78;
  const REST = -Math.PI + 0.12; // blades lie flat when off
  let on = false, phase = 0, amp = 0, lastSide = 0, nextDrop = 0;
  let drops: { x: number; y: number; r: number }[] = [];
  return tapOnly({
    frame(dt, t) {
      if (t > nextDrop) {
        nextDrop = t + 0.18;
        if (drops.length < 40) drops.push({ x: x + rand(-w * 0.42, w * 0.42), y: y + rand(-h * 0.42, h * 0.35), r: rand(3, 6) });
      }
      amp = approach(amp, on ? 1 : 0, 4, dt);
      if (on || amp > 0.01) phase += dt * 3.2;
      const sweepAng = -Math.PI / 2 - Math.cos(phase) * 1.3;
      const ang = REST + (sweepAng - REST) * amp;
      const side = Math.sign(Math.cos(phase));
      if (on && side !== lastSide) { lastSide = side; env.audio.play(side > 0 ? 8 : 7, { vel: 0.18 }); }
      // the wiper blades clear drops they pass over
      if (amp > 0.3) {
        drops = drops.filter((d) => !pivots.some((p) => {
          const a = Math.atan2(d.y - p.y, d.x - p.x);
          return Math.abs(a - ang) < 0.12 && dist(d.x, d.y, p.x, p.y) < L;
        }));
      }
      // windscreen
      ctx.fillStyle = CAR;
      ctx.beginPath(); ctx.roundRect(x - w / 2 - 10, y - h / 2 - 10, w + 20, h + 20, s * 0.08); ctx.fill();
      ctx.fillStyle = '#BFE3F5';
      ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, s * 0.05); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.moveTo(x - w * 0.4, y + h * 0.2); ctx.lineTo(x - w * 0.1, y - h * 0.45); ctx.lineTo(x, y - h * 0.45); ctx.lineTo(x - w * 0.32, y + h * 0.3); ctx.fill();
      ctx.fillStyle = withAlpha('#5FAFE0', 0.6);
      for (const d of drops) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill(); }
      // blades (kept on the glass)
      ctx.save();
      ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h + 12, s * 0.05); ctx.clip();
      ctx.strokeStyle = withAlpha(ink, 0.85); ctx.lineCap = 'round';
      for (const p of pivots) {
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(ang) * L, p.y + Math.sin(ang) * L); ctx.stroke();
        ctx.fillStyle = withAlpha(ink, 0.85);
        ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      // lever
      ctx.fillStyle = on ? '#6CC17A' : '#FFFFFF';
      ctx.beginPath(); ctx.roundRect(x + w / 2 - s * 0.08, y + h / 2 + 14, s * 0.12, s * 0.06, 8); ctx.fill();
    },
    tap() {
      on = !on;
      env.audio.play(on ? 6 : 2, { vel: 0.4 });
    },
    invite() { drops.push({ x: x + rand(-w * 0.3, w * 0.3), y: y, r: 6 }); },
  });
}

/* ---------------- Tyre and pump ---------------- */

function tyre({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const wx = cx(r) - s * 0.16, wy = cy(r) + s * 0.08;
  const R = s * 0.25;
  const pump = { x: cx(r) + s * 0.28, y: cy(r) + s * 0.05 };
  let air = 0.15, plunger = 0, hiss = 0, full = false;
  return tapOnly({
    frame(dt) {
      plunger = Math.max(0, plunger - dt * 3);
      if (hiss > 0) {
        hiss -= dt;
        air = Math.max(0.15, air - dt * 0.5);
      }
      // tyre: squashed at the bottom when it's flat
      const ry = R * (0.72 + 0.28 * air);
      const ground = wy + R;
      const tyCy = ground - ry;
      ctx.fillStyle = withAlpha(ink, 0.15);
      ctx.beginPath(); ctx.ellipse(wx, ground + 3, R * 1.05, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = withAlpha(ink, 0.85);
      ctx.beginPath(); ctx.ellipse(wx, tyCy, R * (1 + (1 - air) * 0.12), ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#C9C2B8';
      ctx.beginPath(); ctx.arc(wx, tyCy, R * 0.5, 0, Math.PI * 2); ctx.fill();
      drawFace(ctx, wx, tyCy, R * 0.9, ink, { happy: full, sleepy: air < 0.4 });
      // hose
      ctx.strokeStyle = withAlpha(ink, 0.6); ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(wx + R * 0.75, tyCy - ry * 0.55); ctx.bezierCurveTo(wx + R * 1.3, tyCy - ry * 1.2, pump.x - s * 0.1, pump.y + s * 0.35, pump.x, pump.y + s * 0.25); ctx.stroke();
      // pump: barrel, plunger and T-handle
      const py = pump.y - s * 0.22 + plunger * s * 0.14;
      ctx.fillStyle = '#5FAFE0';
      ctx.beginPath(); ctx.roundRect(pump.x - s * 0.05, pump.y - s * 0.1, s * 0.1, s * 0.36, 8); ctx.fill();
      ctx.fillStyle = withAlpha(ink, 0.6);
      ctx.fillRect(pump.x - 3, py, 6, pump.y - s * 0.1 - py);
      ctx.fillStyle = '#F2C14E';
      ctx.beginPath(); ctx.roundRect(pump.x - s * 0.1, py - s * 0.035, s * 0.2, s * 0.05, 8); ctx.fill();
      // air gauge
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(pump.x, pump.y + s * 0.06, s * 0.04, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#E8676B'; ctx.lineWidth = 3;
      const ga = Math.PI * (0.8 + air * 1.4);
      ctx.beginPath(); ctx.moveTo(pump.x, pump.y + s * 0.06); ctx.lineTo(pump.x + Math.cos(ga) * s * 0.03, pump.y + s * 0.06 + Math.sin(ga) * s * 0.03); ctx.stroke();
    },
    tap(tx, ty) {
      if (dist(tx, ty, wx, wy) < R * 1.1) {
        if (air > 0.5) {
          hiss = 1.2; full = false;
          env.audio.arpeggio([9, 7, 5, 4, 2], 0.1, 0.25); // psssh
        } else {
          env.audio.play(1, { vel: 0.3, bloop: true });
        }
        return;
      }
      plunger = 1;
      if (air < 1) {
        air = Math.min(1, air + 0.17);
        env.audio.play(2 + Math.round(air * 8), { vel: 0.4, pan: panFor(tx, env.w) });
        if (air >= 1 && !full) {
          full = true;
          setTimeout(() => env.audio.arpeggio([9, 12, 14], 0.1, 0.5), 150);
          sparks.burst(wx, wy, '#F2C14E', 12, 160, 4);
        }
      } else {
        env.audio.play(10, { vel: 0.2 });
      }
    },
    invite() { plunger = 0.6; },
  });
}

/* ---------------- Fuel pump: drag the nozzle to the car ---------------- */

function fuel({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const car = { x: cx(r) - s * 0.18, y: cy(r) + s * 0.12 };
  const cap = { x: car.x + s * 0.2, y: car.y - s * 0.06 };
  const station = { x: cx(r) + s * 0.3, y: cy(r) - s * 0.05 };
  const home = { x: station.x - s * 0.1, y: station.y - s * 0.02 };
  const nozzle = { x: home.x, y: home.y, holder: null as number | null, gdx: 0, gdy: 0, docked: false };
  let level = 0.1, nextGlug = 0, full = false;
  return {
    frame(dt, t) {
      if (nozzle.docked) {
        level = Math.min(1, level + dt * 0.3);
        if (t > nextGlug && level < 1) { nextGlug = t + 0.25; env.audio.play(Math.round(level * 8), { vel: 0.2 }); }
        if (level >= 1 && !full) {
          full = true;
          env.audio.arpeggio([7, 9, 12], 0.1, 0.5);
          sparks.burst(car.x, car.y, '#6CC17A', 12, 150, 4);
        }
      } else {
        level = Math.max(0.1, level - dt * 0.02); // driving around uses fuel
        if (level < 0.9) full = false;
        if (nozzle.holder === null) {
          nozzle.x = approach(nozzle.x, home.x, 10, dt);
          nozzle.y = approach(nozzle.y, home.y, 10, dt);
        }
      }
      // station
      ctx.fillStyle = '#6CC17A';
      ctx.beginPath(); ctx.roundRect(station.x - s * 0.08, station.y - s * 0.3, s * 0.16, s * 0.6, 10); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.roundRect(station.x - s * 0.055, station.y - s * 0.24, s * 0.11, s * 0.12, 6); ctx.fill();
      ctx.fillStyle = '#6CC17A';
      ctx.fillRect(station.x - s * 0.04, station.y - s * 0.13 - s * 0.08 * level, s * 0.08, s * 0.08 * level);
      // hose
      ctx.strokeStyle = withAlpha(ink, 0.75); ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(station.x - s * 0.08, station.y + s * 0.1);
      ctx.bezierCurveTo(station.x - s * 0.2, station.y + s * 0.35, nozzle.x + s * 0.02, nozzle.y + s * 0.2, nozzle.x + s * 0.03, nozzle.y + s * 0.03);
      ctx.stroke();
      // car (side view)
      ctx.fillStyle = CAR;
      ctx.beginPath(); ctx.roundRect(car.x - s * 0.26, car.y - s * 0.08, s * 0.52, s * 0.14, 12); ctx.fill();
      ctx.beginPath(); ctx.roundRect(car.x - s * 0.15, car.y - s * 0.18, s * 0.28, s * 0.12, 12); ctx.fill();
      ctx.fillStyle = '#BFE3F5';
      ctx.beginPath(); ctx.roundRect(car.x - s * 0.12, car.y - s * 0.16, s * 0.1, s * 0.08, 5); ctx.fill();
      ctx.beginPath(); ctx.roundRect(car.x + s * 0.0, car.y - s * 0.16, s * 0.1, s * 0.08, 5); ctx.fill();
      ctx.fillStyle = withAlpha(ink, 0.85);
      for (const wx of [-0.16, 0.16]) { ctx.beginPath(); ctx.arc(car.x + s * wx, car.y + s * 0.07, s * 0.055, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = full ? '#6CC17A' : '#F2C14E';
      ctx.beginPath(); ctx.arc(cap.x, cap.y, s * 0.025, 0, Math.PI * 2); ctx.fill();
      // fuel gauge on the car
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.roundRect(car.x - s * 0.2, car.y + s * 0.15, s * 0.4, s * 0.05, 6); ctx.fill();
      ctx.fillStyle = level > 0.6 ? '#6CC17A' : level > 0.3 ? '#F2C14E' : '#E8676B';
      ctx.beginPath(); ctx.roundRect(car.x - s * 0.19, car.y + s * 0.16, s * 0.38 * level, s * 0.03, 4); ctx.fill();
      // nozzle
      ctx.save();
      ctx.translate(nozzle.x, nozzle.y);
      ctx.fillStyle = '#F2C14E';
      ctx.beginPath(); ctx.roundRect(-s * 0.02, -s * 0.03, s * 0.08, s * 0.07, 6); ctx.fill();
      ctx.fillStyle = withAlpha(ink, 0.7);
      ctx.fillRect(-s * 0.06, -s * 0.012, s * 0.05, s * 0.024);
      ctx.restore();
    },
    down(id, x, y) {
      if (dist(x, y, nozzle.x + s * 0.01, nozzle.y) < s * 0.12) {
        nozzle.holder = id;
        nozzle.gdx = nozzle.x - x; nozzle.gdy = nozzle.y - y;
        if (nozzle.docked) { nozzle.docked = false; env.audio.play(3, { vel: 0.35 }); }
        else env.audio.play(6, { vel: 0.25 });
        return;
      }
      env.audio.play(1, { vel: 0.2, pan: panFor(x, env.w) });
    },
    move(id, x, y) {
      if (nozzle.holder !== id) return;
      nozzle.x = clamp(x + nozzle.gdx, r.x + 20, r.x + r.w - 20);
      nozzle.y = clamp(y + nozzle.gdy, r.y + 20, r.y + r.h - 20);
    },
    up(id) {
      if (nozzle.holder !== id) return;
      nozzle.holder = null;
      if (dist(nozzle.x - s * 0.04, nozzle.y, cap.x, cap.y) < s * 0.14) {
        nozzle.docked = true;
        nozzle.x = cap.x + s * 0.045; nozzle.y = cap.y;
        env.audio.play(5, { vel: 0.4 });
      }
    },
    invite() { nozzle.y -= 6; },
  };
}

/* ---------------- Ignition key: start the engine, then off it goes ---------------- */

function engine({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const key = { x: cx(r) + s * 0.25, y: cy(r) + s * 0.22 };
  const roadY = cy(r) - s * 0.02;
  let running = false, keyTurn = 0, carX = 0, drive = 0, nextBeat = 0, beat = 0;
  let puffs: { x: number; y: number; life: number }[] = [];
  return tapOnly({
    frame(dt, t) {
      keyTurn = approach(keyTurn, running ? 1 : 0, 10, dt);
      if (running && t > nextBeat) {
        nextBeat = t + 0.28;
        beat++;
        env.audio.play(beat % 2 ? 0 : 2, { vel: drive > 0 ? 0.25 : 0.15 });
        puffs.push({ x: cx(r) + carX - s * 0.22, y: roadY - s * 0.02, life: 1 });
      }
      if (drive > 0) {
        drive -= dt;
        carX += dt * s * 0.9;
        if (carX > r.w / 2 + s * 0.3) carX = -r.w / 2 - s * 0.3; // around we go
        if (drive <= 0) drive = 0;
      } else {
        carX = approach(carX, 0, 3, dt);
      }
      const shake = running ? Math.sin(t * 45) * 1.5 : 0;
      // road
      ctx.fillStyle = withAlpha(ink, 0.55);
      ctx.fillRect(r.x, roadY + s * 0.09, r.w, s * 0.07);
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 8; i++) ctx.fillRect(r.x + ((i * s * 0.25 - (drive > 0 ? t * 200 : 0)) % r.w + r.w) % r.w, roadY + s * 0.12, s * 0.1, 3);
      // exhaust
      for (const p of puffs) {
        p.life -= dt * 1.2; p.x -= dt * 30; p.y -= dt * 12;
        if (p.life > 0) { ctx.fillStyle = `rgba(200,200,210,${p.life * 0.7})`; ctx.beginPath(); ctx.arc(p.x, p.y, 6 + (1 - p.life) * 8, 0, Math.PI * 2); ctx.fill(); }
      }
      puffs = puffs.filter((p) => p.life > 0);
      // car
      const x = cx(r) + carX, y = roadY + shake;
      ctx.fillStyle = CAR;
      ctx.beginPath(); ctx.roundRect(x - s * 0.22, y - s * 0.04, s * 0.44, s * 0.11, 12); ctx.fill();
      ctx.beginPath(); ctx.roundRect(x - s * 0.12, y - s * 0.13, s * 0.24, s * 0.1, 12); ctx.fill();
      ctx.fillStyle = '#BFE3F5';
      ctx.beginPath(); ctx.roundRect(x - s * 0.09, y - s * 0.11, s * 0.18, s * 0.06, 5); ctx.fill();
      ctx.fillStyle = running ? '#FFF3C4' : '#FFFFFF';
      ctx.beginPath(); ctx.arc(x + s * 0.2, y + s * 0.01, s * 0.02, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = withAlpha(ink, 0.85);
      for (const wx of [-0.13, 0.13]) { ctx.beginPath(); ctx.arc(x + s * wx, y + s * 0.07, s * 0.045, 0, Math.PI * 2); ctx.fill(); }
      // dashboard with ignition
      ctx.fillStyle = withAlpha(ink, 0.75);
      ctx.beginPath(); ctx.roundRect(cx(r) - s * 0.42, cy(r) + s * 0.14, s * 0.84, s * 0.2, 14); ctx.fill();
      // rev dial
      const dx = cx(r) - s * 0.18, dy = cy(r) + s * 0.25;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(dx, dy, s * 0.07, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#E8676B'; ctx.lineWidth = 3;
      const na = Math.PI + (running ? 0.4 + (drive > 0 ? 1.6 : 0.4) + Math.sin(t * 20) * 0.08 : 0.1);
      ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + Math.cos(na) * s * 0.06, dy + Math.sin(na) * s * 0.06); ctx.stroke();
      // ignition + key
      ctx.fillStyle = '#C9C2B8';
      ctx.beginPath(); ctx.arc(key.x, key.y, s * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(key.x, key.y);
      ctx.rotate(keyTurn * Math.PI / 2);
      ctx.fillStyle = '#F2C14E';
      ctx.beginPath(); ctx.roundRect(-s * 0.015, -s * 0.09, s * 0.03, s * 0.09, 3); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.04, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = running ? '#6CC17A' : '#E8676B';
      ctx.beginPath(); ctx.arc(cx(r) + s * 0.05, cy(r) + s * 0.25, s * 0.025, 0, Math.PI * 2); ctx.fill();
    },
    tap(tx, ty) {
      if (dist(tx, ty, key.x, key.y) < s * 0.16) {
        running = !running;
        drive = 0;
        if (running) { env.audio.arpeggio([0, 2, 4, 2], 0.08, 0.4); sparks.burst(key.x, key.y, '#F2C14E', 6, 80, 3); }
        else env.audio.arpeggio([4, 2, 0], 0.1, 0.3);
        return;
      }
      if (running) {
        drive = 3;
        env.audio.play(9, { vel: 0.5, bloop: true });
        setTimeout(() => env.audio.play(9, { vel: 0.45, bloop: true }), 200);
      } else {
        env.audio.play(1, { vel: 0.25 }); // the key first!
      }
    },
    invite() { carX = 8; },
  });
}

/* ---------------- Wheel bolts: unscrew them all, the wheel comes off ---------------- */

function bolts({ ctx, env, r, ink, sparks }: Kit): Gadget {
  const s = size(r);
  const wx = cx(r), wy = cy(r) - s * 0.06;
  const R = s * 0.3;
  const tray = { x: cx(r), y: cy(r) + s * 0.38 };
  const list = [0, 1, 2, 3].map((i) => ({ a: (i * Math.PI) / 2 + Math.PI / 4, out: 0, target: 0, spin: 0 }));
  let off = 0, offTarget = 0;
  return tapOnly({
    frame(dt) {
      for (const b of list) {
        b.out = approach(b.out, b.target, 4, dt);
        b.spin += dt * (Math.abs(b.out - b.target) > 0.02 ? 14 : 0);
      }
      off = approach(off, offTarget, 4, dt);
      // tray
      ctx.fillStyle = withAlpha(ink, 0.5);
      ctx.beginPath(); ctx.roundRect(tray.x - s * 0.22, tray.y - s * 0.04, s * 0.44, s * 0.08, 8); ctx.fill();
      // wheel (slides off to the right once the bolts are out)
      const x = wx + off * s * 0.2;
      const lift = off * s * 0.04;
      ctx.fillStyle = withAlpha(ink, 0.85);
      ctx.beginPath(); ctx.arc(x, wy - lift, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#C9C2B8';
      ctx.beginPath(); ctx.arc(x, wy - lift, R * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#B9B2AA';
      ctx.beginPath(); ctx.arc(x, wy - lift, R * 0.18, 0, Math.PI * 2); ctx.fill();
      if (off > 0.9) drawFace(ctx, x, wy - lift, R * 1.0, ink, { happy: true });
      // bolts: from the hub to the tray
      for (const [i, b] of list.entries()) {
        const hx = wx + Math.cos(b.a) * R * 0.4, hy = wy + Math.sin(b.a) * R * 0.4;
        const tx = tray.x - s * 0.15 + i * s * 0.1, ty = tray.y - s * 0.05;
        const bx = hx + (tx - hx) * b.out, by = hy + (ty - hy) * b.out - Math.sin(b.out * Math.PI) * s * 0.15;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(b.spin);
        ctx.fillStyle = '#F2C14E';
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3;
          const px = Math.cos(a) * s * 0.045, py = Math.sin(a) * s * 0.045;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = withAlpha(ink, 0.4);
        ctx.beginPath(); ctx.arc(0, 0, s * 0.015, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    },
    tap(tx, ty) {
      if (offTarget === 1) {
        // put the wheel back on and screw the bolts back in, one by one
        offTarget = 0;
        list.forEach((b, i) => setTimeout(() => { b.target = 0; env.audio.play(5 + i, { vel: 0.35 }); }, 300 + i * 250));
        return;
      }
      const hit = list.find((b) => b.target === 0 && dist(tx, ty, wx + Math.cos(b.a) * R * 0.4, wy + Math.sin(b.a) * R * 0.4) < s * 0.1);
      if (hit) {
        hit.target = 1;
        env.audio.arpeggio([8 - list.filter((b) => b.target === 1).length, 6], 0.08, 0.4);
        if (list.every((b) => b.target === 1)) {
          setTimeout(() => {
            offTarget = 1;
            env.audio.arpeggio([5, 7, 9, 12], 0.1, 0.5);
            sparks.burst(wx, wy, '#F2C14E', 12, 160, 4);
          }, 500);
        }
        return;
      }
      env.audio.play(2, { vel: 0.25, pan: panFor(tx, env.w) });
    },
    invite() { const b = list.find((o) => o.target === 0); if (b) b.spin += 0.6; },
  });
}

type Kind = 'horn' | 'lights' | 'wipers' | 'tyre' | 'fuel' | 'engine' | 'bolts';

/** Little Mechanic: horn, headlights, wipers, tyre pump, fuel pump, ignition key and wheel bolts. */
export const littleMechanic = makePanelBoard<Kind>(
  [
    ['horn', 'lights', 'wipers'],
    ['horn', 'lights', 'wipers', 'tyre'],
    ['lights', 'wipers', 'tyre', 'fuel', 'engine', 'bolts'],
  ],
  (kind, kit) =>
    kind === 'horn' ? horn(kit)
    : kind === 'lights' ? headlights(kit)
    : kind === 'wipers' ? wipers(kit)
    : kind === 'tyre' ? tyre(kit)
    : kind === 'fuel' ? fuel(kit)
    : kind === 'engine' ? engine(kit)
    : bolts(kit),
);
