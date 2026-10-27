import type { ToyFactory } from './types';
import { approach, clamp, dist, drawFace, panFor, rand, Sparks, withAlpha } from './util';

type VKind = 'car' | 'bus' | 'fire' | 'icecream' | 'tractor' | 'taxi';
const ORDER: VKind[] = ['car', 'bus', 'fire', 'icecream', 'tractor', 'taxi'];
const CAR_COLOURS = ['#E8676B', '#5FAFE0', '#B8A2E3', '#6CC17A'];
const LEN: Record<VKind, number> = { car: 70, bus: 120, fire: 115, icecream: 95, tractor: 70, taxi: 70 };
const SPEED: Record<VKind, number> = { car: 95, bus: 70, fire: 100, icecream: 75, tractor: 55, taxi: 90 };

interface Vehicle {
  kind: VKind; colour: string; x: number; v: number; len: number;
  bounce: number; shine: number; spin: number; siren: number;
}

type Light = 'green' | 'amber' | 'red' | 'redamber';

/** Town Road: send vehicles out of the garage, run the traffic light, help the ducks cross, wash the cars. */
export const townRoad: ToyFactory = (ctx, env) => {
  const maxV = [4, 5, 6][env.level];
  const hasDucks = env.level >= 1;
  const hasWash = env.level >= 2;
  let vehicles: Vehicle[] = [];
  let nextKind = 0;
  let roadY = 0, roadH = 76, now = 0;
  const garage = { x: 0, door: 0, shake: 0 };
  const light = { x: 0, state: 'green' as Light, timer: 0, redSince: 0 };
  const crossing = { x: 0, active: false, t: 0, btnGlow: 0 };
  const wash = { x: 0, on: 0, spin: 0 };
  let ducks: { x: number; y: number; delay: number; big: boolean; swim: number }[] = [];
  const pondY = () => roadY + roadH / 2 + Math.min(110, (env.h - roadY - roadH / 2) * 0.45);
  let bubbles: { x: number; y: number; r: number; life: number }[] = [];
  const sparks = new Sparks();
  const ink = env.palette.night ? '#2A2530' : '#3B3340';
  const night = env.palette.night;

  function layout() {
    const portrait = env.h > env.w * 1.1;
    roadY = portrait ? env.h * 0.6 : env.h * 0.66;
    roadH = portrait ? 80 : 74;
    garage.x = portrait ? 70 : 150;
    light.x = env.w * (hasDucks ? 0.56 : 0.6);
    crossing.x = env.w * 0.36;
    wash.x = env.w * 0.8;
    if (!vehicles.length) {
      spawn(garage.x + 120); spawn(garage.x + 300);
    }
  }

  function spawn(x = garage.x) {
    const kind = ORDER[nextKind % ORDER.length];
    nextKind++;
    vehicles.push({
      kind, colour: kind === 'car' ? CAR_COLOURS[nextKind % CAR_COLOURS.length] : '', x, v: 30,
      len: LEN[kind], bounce: 0.5, shine: 0, spin: 0, siren: 0,
    });
  }

  const stopLine = () => light.x - 34;
  const lightStops = () => light.state !== 'green';

  function toggleLight() {
    if (light.state === 'green') { light.state = 'amber'; light.timer = 1.2; }
    else if (light.state === 'red') { light.state = 'redamber'; light.timer = 0.9; }
    else return;
    env.audio.play(light.state === 'amber' ? 7 : 5, { vel: 0.45, pan: panFor(light.x, env.w) });
  }

  function vehicleSound(v: Vehicle) {
    const pan = panFor(v.x, env.w);
    const seq: Record<VKind, [number, number][]> = {
      car: [[7, 0], [7, 0.18]],
      taxi: [[9, 0], [9, 0.15], [9, 0.3]],
      bus: [[2, 0], [0, 0.3]],
      fire: [[9, 0], [7, 0.3], [9, 0.6], [7, 0.9]],
      icecream: [[10, 0], [12, 0.15], [14, 0.3], [12, 0.45], [10, 0.6], [12, 0.75], [15, 0.9]],
      tractor: [[0, 0], [0, 0.15], [0, 0.3], [2, 0.45]],
    };
    for (const [nn, at] of seq[v.kind]) setTimeout(() => env.audio.play(nn, { vel: 0.45, pan, bloop: v.kind === 'car' || v.kind === 'taxi' }), at * 1000);
    if (v.kind === 'fire') v.siren = 1.4;
  }

  /* ---------- drawing ---------- */

  function wheel(x: number, y: number, r: number, spin: number) {
    ctx.fillStyle = '#3B3340';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#C9C2B8';
    ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8A8590'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(spin) * r * 0.4, y + Math.sin(spin) * r * 0.4); ctx.lineTo(x - Math.cos(spin) * r * 0.4, y - Math.sin(spin) * r * 0.4); ctx.stroke();
  }

  function drawVehicle(v: Vehicle) {
    const y = roadY - Math.abs(Math.sin(v.bounce * Math.PI * 2)) * v.bounce * 10;
    const L = v.len, x = v.x - L / 2;
    const base = y + roadH * 0.08;
    const glowFront = night || v.siren > 0;
    if (glowFront) {
      ctx.fillStyle = withAlpha('#FFF3C4', 0.35);
      ctx.beginPath(); ctx.moveTo(x + L, base - 18); ctx.lineTo(x + L + 70, base - 34); ctx.lineTo(x + L + 70, base + 6); ctx.fill();
    }
    switch (v.kind) {
      case 'car': case 'taxi': {
        const c = v.kind === 'taxi' ? '#F2C14E' : v.colour;
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.roundRect(x, base - 30, L, 24, 10); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x + L * 0.18, base - 50, L * 0.58, 26, 10); ctx.fill();
        ctx.fillStyle = '#BFE3F5';
        ctx.beginPath(); ctx.roundRect(x + L * 0.24, base - 45, L * 0.2, 15, 4); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x + L * 0.49, base - 45, L * 0.2, 15, 4); ctx.fill();
        if (v.kind === 'taxi') {
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect(x + L * 0.38, base - 58, L * 0.22, 9, 3); ctx.fill();
          ctx.fillStyle = ink; for (let k = 0; k < 4; k++) ctx.fillRect(x + L * 0.08 + k * 14, base - 20, 7, 5);
        }
        wheel(x + L * 0.22, base - 4, 11, v.spin); wheel(x + L * 0.78, base - 4, 11, v.spin);
        break;
      }
      case 'bus':
        ctx.fillStyle = '#F2C14E';
        ctx.beginPath(); ctx.roundRect(x, base - 62, L, 56, 12); ctx.fill();
        ctx.fillStyle = '#BFE3F5';
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.roundRect(x + 8 + k * (L - 16) / 4, base - 54, (L - 16) / 4 - 6, 20, 4); ctx.fill(); }
        ctx.fillStyle = withAlpha(ink, 0.2); ctx.fillRect(x, base - 26, L, 5);
        wheel(x + L * 0.2, base - 4, 12, v.spin); wheel(x + L * 0.8, base - 4, 12, v.spin);
        break;
      case 'fire': {
        ctx.fillStyle = '#E8676B';
        ctx.beginPath(); ctx.roundRect(x, base - 46, L, 40, 8); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x + L * 0.66, base - 62, L * 0.34, 30, 8); ctx.fill();
        ctx.fillStyle = '#BFE3F5'; ctx.beginPath(); ctx.roundRect(x + L * 0.72, base - 57, L * 0.2, 14, 4); ctx.fill();
        ctx.strokeStyle = '#C9C2B8'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x + 6, base - 52); ctx.lineTo(x + L * 0.62, base - 52); ctx.stroke();
        for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x + 10 + k * L * 0.1, base - 56); ctx.lineTo(x + 10 + k * L * 0.1, base - 48); ctx.stroke(); }
        const flash = v.siren > 0 && Math.sin(now * 20) > 0;
        ctx.fillStyle = flash ? '#5FAFE0' : withAlpha('#5FAFE0', 0.5);
        ctx.beginPath(); ctx.roundRect(x + L * 0.76, base - 70, 14, 8, 3); ctx.fill();
        if (flash) { ctx.fillStyle = withAlpha('#5FAFE0', 0.3); ctx.beginPath(); ctx.arc(x + L * 0.76 + 7, base - 66, 22, 0, Math.PI * 2); ctx.fill(); }
        wheel(x + L * 0.18, base - 4, 12, v.spin); wheel(x + L * 0.5, base - 4, 12, v.spin); wheel(x + L * 0.84, base - 4, 12, v.spin);
        break;
      }
      case 'icecream':
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.roundRect(x, base - 56, L, 50, 12); ctx.fill();
        ctx.fillStyle = '#F4A9C0'; ctx.fillRect(x, base - 26, L, 10);
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + 10 + k * (L - 20) / 4, base - 56, 7, 0, Math.PI); ctx.fill(); }
        ctx.fillStyle = '#BFE3F5'; ctx.beginPath(); ctx.roundRect(x + L * 0.66, base - 50, L * 0.26, 18, 4); ctx.fill();
        // the cone on the roof
        ctx.fillStyle = '#E0A85E';
        ctx.beginPath(); ctx.moveTo(x + L * 0.32, base - 62); ctx.lineTo(x + L * 0.44, base - 62); ctx.lineTo(x + L * 0.38, base - 44); ctx.fill();
        ctx.fillStyle = '#F4A9C0'; ctx.beginPath(); ctx.arc(x + L * 0.38, base - 68, 10, 0, Math.PI * 2); ctx.fill();
        wheel(x + L * 0.2, base - 4, 11, v.spin); wheel(x + L * 0.8, base - 4, 11, v.spin);
        break;
      case 'tractor':
        ctx.fillStyle = '#6CC17A';
        ctx.beginPath(); ctx.roundRect(x + L * 0.35, base - 34, L * 0.65, 22, 6); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x + L * 0.05, base - 58, L * 0.42, 40, 6); ctx.fill();
        ctx.fillStyle = '#BFE3F5'; ctx.beginPath(); ctx.roundRect(x + L * 0.12, base - 52, L * 0.28, 16, 4); ctx.fill();
        ctx.fillStyle = withAlpha(ink, 0.7); ctx.fillRect(x + L * 0.8, base - 50, 5, 18);
        wheel(x + L * 0.25, base - 18, 20, v.spin); wheel(x + L * 0.82, base - 8, 10, v.spin);
        break;
    }
    // a smile on the front
    ctx.fillStyle = '#FFF3C4';
    ctx.beginPath(); ctx.arc(x + L - 4, base - 20, 4, 0, Math.PI * 2); ctx.fill();
    if (v.shine > 0) {
      for (let k = 0; k < 3; k++) {
        const a = now * 3 + k * 2.1;
        const sx = v.x + Math.cos(a) * L * 0.5, sy = y - 30 + Math.sin(a) * 26;
        ctx.fillStyle = withAlpha('#FFFFFF', v.shine);
        ctx.beginPath(); ctx.moveTo(sx, sy - 7); ctx.lineTo(sx + 2, sy - 2); ctx.lineTo(sx + 7, sy); ctx.lineTo(sx + 2, sy + 2); ctx.lineTo(sx, sy + 7); ctx.lineTo(sx - 2, sy + 2); ctx.lineTo(sx - 7, sy); ctx.lineTo(sx - 2, sy - 2); ctx.fill();
      }
    }
  }

  function drawScenery() {
    ctx.fillStyle = env.palette.bg;
    ctx.fillRect(0, 0, env.w, env.h);
    // sun and slow clouds
    const skyTop = Math.max(40, roadY - 330);
    ctx.fillStyle = night ? '#E9DDB0' : '#FBD97A';
    ctx.beginPath(); ctx.arc(env.w * 0.78, skyTop + 50, 34, 0, Math.PI * 2); ctx.fill();
    drawFace(ctx, env.w * 0.78, skyTop + 50, 54, '#7A5A2A', { happy: !night, sleepy: night });
    ctx.fillStyle = night ? 'rgba(255,255,255,0.25)' : '#FFFFFF';
    for (let k = 0; k < 3; k++) {
      const x = ((now * (8 + k * 4) + k * env.w * 0.4) % (env.w + 160)) - 80, y = skyTop + 30 + k * 40;
      ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.arc(x + 22, y - 8, 24, 0, Math.PI * 2); ctx.arc(x + 46, y, 18, 0, Math.PI * 2); ctx.fill();
    }
    // hills and houses
    ctx.fillStyle = night ? '#3E4A3E' : '#CBE7C0';
    ctx.beginPath(); ctx.moveTo(0, roadY - 70); ctx.quadraticCurveTo(env.w * 0.3, roadY - 170, env.w * 0.6, roadY - 80); ctx.quadraticCurveTo(env.w * 0.85, roadY - 140, env.w, roadY - 90); ctx.lineTo(env.w, roadY); ctx.lineTo(0, roadY); ctx.fill();
    const houses = [[0.4, '#F4A9C0'], [0.68, '#F2C14E'], [0.92, '#B8A2E3']] as const;
    for (const [hx, c] of houses) {
      const x = env.w * hx, y = roadY - roadH / 2 - 14;
      ctx.fillStyle = c; ctx.fillRect(x - 26, y - 44, 52, 44);
      ctx.fillStyle = '#E8676B'; ctx.beginPath(); ctx.moveTo(x - 34, y - 44); ctx.lineTo(x, y - 74); ctx.lineTo(x + 34, y - 44); ctx.fill();
      ctx.fillStyle = night ? '#FFE08A' : '#FFFFFF'; ctx.fillRect(x - 16, y - 32, 12, 12); ctx.fillRect(x + 4, y - 32, 12, 12);
    }
    // pavement, road, grass
    ctx.fillStyle = night ? '#6A6470' : '#E3DED6';
    ctx.fillRect(0, roadY - roadH / 2 - 14, env.w, 14);
    ctx.fillStyle = night ? '#4A4550' : '#8A8590';
    ctx.fillRect(0, roadY - roadH / 2, env.w, roadH);
    ctx.fillStyle = night ? '#4E5F4E' : '#A9D69A';
    ctx.fillRect(0, roadY + roadH / 2, env.w, env.h);
    // trees and the duck pond in the park below the road
    const parkTop = roadY + roadH / 2;
    for (const tx of [0.18, 0.62, 0.9]) {
      const x = env.w * tx, y = parkTop + Math.min(150, (env.h - parkTop) * 0.55);
      ctx.fillStyle = '#B8956A'; ctx.fillRect(x - 5, y - 30, 10, 34);
      ctx.fillStyle = night ? '#4F6F4C' : '#7CC27A';
      ctx.beginPath(); ctx.arc(x, y - 44, 26, 0, Math.PI * 2); ctx.arc(x - 16, y - 30, 18, 0, Math.PI * 2); ctx.arc(x + 16, y - 30, 18, 0, Math.PI * 2); ctx.fill();
    }
    if (hasDucks) {
      ctx.fillStyle = night ? '#4C6A86' : '#9FD3F0';
      ctx.beginPath(); ctx.ellipse(crossing.x, pondY() + 6, 70, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(crossing.x - 20, pondY() + 6, 16, 4, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let x = 0; x < env.w; x += 50) ctx.fillRect(x, roadY + roadH * 0.3, 26, 4);
    // stop line
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(stopLine() + 26, roadY - roadH / 2, 5, roadH * 0.75);
    if (hasDucks) {
      for (let k = 0; k < 5; k++) ctx.fillRect(crossing.x - 26, roadY - roadH / 2 + 4 + k * (roadH / 5), 52, roadH / 10);
    }
  }

  function drawLight() {
    const x = light.x, top = roadY - roadH / 2 - 150;
    ctx.fillStyle = withAlpha(ink, 0.6); ctx.fillRect(x - 4, top + 70, 8, 80);
    ctx.fillStyle = '#3B3340'; ctx.beginPath(); ctx.roundRect(x - 22, top, 44, 100, 12); ctx.fill();
    const lamps: [string, boolean][] = [
      ['#E8676B', light.state === 'red' || light.state === 'redamber'],
      ['#F2C14E', light.state === 'amber' || light.state === 'redamber'],
      ['#6CC17A', light.state === 'green'],
    ];
    lamps.forEach(([c, on], i) => {
      const ly = top + 18 + i * 32;
      if (on) { ctx.fillStyle = withAlpha(c, 0.35); ctx.beginPath(); ctx.arc(x, ly, 22, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = on ? c : withAlpha(c, 0.2);
      ctx.beginPath(); ctx.arc(x, ly, 12, 0, Math.PI * 2); ctx.fill();
    });
  }

  function drawGarage() {
    const gx = garage.x, gy = roadY + roadH / 2;
    const w = 120, h = 130;
    const shake = Math.sin(garage.shake * 40) * garage.shake * 4;
    ctx.fillStyle = '#F2A65A';
    ctx.beginPath(); ctx.roundRect(gx - w / 2 + shake, gy - h, w, h, 12); ctx.fill();
    ctx.fillStyle = '#E8676B';
    ctx.beginPath(); ctx.moveTo(gx - w / 2 - 10 + shake, gy - h + 6); ctx.lineTo(gx + shake, gy - h - 34); ctx.lineTo(gx + w / 2 + 10 + shake, gy - h + 6); ctx.fill();
    // the roller door goes up as vehicles come out
    const dh = (h - 30) * (1 - garage.door);
    ctx.fillStyle = withAlpha(ink, 0.65);
    ctx.fillRect(gx - w / 2 + 12 + shake, gy - h + 30, w - 24, h - 30);
    ctx.fillStyle = '#FFF4DE';
    ctx.fillRect(gx - w / 2 + 12 + shake, gy - h + 30, w - 24, dh);
    ctx.strokeStyle = withAlpha(ink, 0.15); ctx.lineWidth = 2;
    for (let yy = gy - h + 40; yy < gy - h + 30 + dh; yy += 12) { ctx.beginPath(); ctx.moveTo(gx - w / 2 + 12 + shake, yy); ctx.lineTo(gx + w / 2 - 12 + shake, yy); ctx.stroke(); }
    drawFace(ctx, gx + shake, gy - h + 12, 40, ink, { happy: garage.door > 0.3 });
  }

  function drawCrossing() {
    if (!hasDucks) return;
    const x = crossing.x + 44, y = roadY - roadH / 2 - 70;
    ctx.fillStyle = withAlpha(ink, 0.6); ctx.fillRect(x - 3, y, 6, 70);
    ctx.fillStyle = '#3B3340'; ctx.beginPath(); ctx.roundRect(x - 20, y - 18, 40, 36, 8); ctx.fill();
    ctx.fillStyle = crossing.active ? '#6CC17A' : withAlpha('#6CC17A', 0.25);
    // a little walking duck sign
    ctx.beginPath(); ctx.ellipse(x - 2, y + 2, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 7, y - 7, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F2C14E';
    ctx.beginPath(); ctx.arc(x, y + 32, 10 + crossing.btnGlow * 3, 0, Math.PI * 2); ctx.fill();
    for (const d of ducks) {
      if (d.delay > 0) continue;
      const s = d.big ? 1 : 0.6;
      const step = d.swim > 0 ? Math.sin(now * 3 + d.x) * 3 : Math.sin(now * 12 + d.x) * 2;
      ctx.fillStyle = d.big ? '#FFFFFF' : '#FBE27A';
      ctx.beginPath(); ctx.ellipse(d.x, d.y + step * 0.3, 16 * s, 12 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(d.x + 10 * s, d.y - 12 * s, 8 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F2A65A';
      ctx.beginPath(); ctx.moveTo(d.x + 16 * s, d.y - 13 * s); ctx.lineTo(d.x + 24 * s, d.y - 10 * s); ctx.lineTo(d.x + 16 * s, d.y - 8 * s); ctx.fill();
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(d.x + 12 * s, d.y - 14 * s, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawWash() {
    if (!hasWash) return;
    const x = wash.x, top = roadY - roadH / 2 - 120, w = 130;
    ctx.fillStyle = withAlpha('#5FAFE0', 0.25);
    ctx.fillRect(x - w / 2, top + 26, w, roadY + roadH * 0.1 - top - 26);
    ctx.fillStyle = '#5FAFE0';
    ctx.beginPath(); ctx.roundRect(x - w / 2 - 10, top, w + 20, 30, 12); ctx.fill();
    ctx.fillRect(x - w / 2 - 10, top, 12, roadY + roadH * 0.1 - top);
    ctx.fillRect(x + w / 2 - 2, top, 12, roadY + roadH * 0.1 - top);
    // spinning brushes
    for (const bx of [x - 30, x + 30]) {
      for (let k = 0; k < 6; k++) {
        const yy = top + 40 + k * 14;
        const sw = Math.sin(wash.spin + k) * 14 * (0.3 + wash.on * 0.7);
        ctx.strokeStyle = ['#E8676B', '#F2C14E', '#6CC17A'][k % 3]; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(bx - sw, yy); ctx.lineTo(bx + sw, yy); ctx.stroke();
      }
    }
    ctx.fillStyle = wash.on > 0.5 ? '#6CC17A' : '#FFFFFF';
    ctx.beginPath(); ctx.arc(x + w / 2 + 30, top + 60, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5FAFE0'; ctx.beginPath(); ctx.arc(x + w / 2 + 30, top + 60, 6, 0, Math.PI * 2); ctx.fill();
    for (const b of bubbles) {
      ctx.strokeStyle = withAlpha('#FFFFFF', b.life); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
    }
  }

  return {
    resize() { layout(); },
    frame(dt, t) {
      now = t;
      garage.door = approach(garage.door, 0, 1.2, dt);
      garage.shake = Math.max(0, garage.shake - dt);
      crossing.btnGlow = Math.max(0, crossing.btnGlow - dt * 2);
      // traffic light timing (and a gentle auto-green so nobody waits forever)
      if (light.timer > 0) {
        light.timer -= dt;
        if (light.timer <= 0) {
          light.state = light.state === 'amber' ? 'red' : 'green';
          if (light.state === 'red') light.redSince = t;
          env.audio.play(light.state === 'red' ? 3 : 9, { vel: 0.35 });
        }
      }
      if (light.state === 'red' && t - light.redSince > 9) toggleLight();
      // ducks
      // the duck family waddles over the road and down to their pond for a swim
      for (const d of ducks) {
        if (d.delay > 0) { d.delay -= dt; continue; }
        if (d.y < pondY()) {
          d.y = Math.min(pondY(), d.y + dt * 38);
          if (Math.random() < dt * 0.8) env.audio.play(d.big ? 7 : 12, { vel: 0.25, pan: panFor(d.x, env.w) });
        } else {
          d.swim += dt;
          d.x += Math.sin(d.swim * 0.6 + (d.big ? 0 : 1)) * dt * 14;
        }
      }
      crossing.active = ducks.some((d) => d.delay > 0 || d.y < roadY + roadH / 2 + 14);
      // car wash
      wash.on = Math.max(0, wash.on - dt * 0.08);
      wash.spin += dt * (2 + wash.on * 14);
      if (wash.on > 0.2 && Math.random() < dt * 16) bubbles.push({ x: wash.x + rand(-60, 60), y: roadY - rand(10, 90), r: rand(4, 10), life: 1 });
      for (const b of bubbles) { b.life -= dt * 0.7; b.y -= dt * 20; }
      bubbles = bubbles.filter((b) => b.life > 0);

      // traffic
      vehicles.sort((a, b) => a.x - b.x);
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        const front = v.x + v.len / 2;
        let room = Infinity;
        const ahead = vehicles[i + 1];
        if (ahead) room = Math.min(room, ahead.x - ahead.len / 2 - front - 18);
        if (lightStops() && front < stopLine() + 26) room = Math.min(room, stopLine() + 22 - front);
        if (crossing.active && front < crossing.x - 30) room = Math.min(room, crossing.x - 34 - front);
        const target = clamp(room * 2.2, 0, SPEED[v.kind]);
        v.v = approach(v.v, target, room < 30 ? 10 : 2, dt);
        v.x += v.v * dt;
        v.spin += (v.v * dt) / 11;
        v.bounce = Math.max(0, v.bounce - dt * 1.5);
        v.siren = Math.max(0, v.siren - dt * 0.5);
        if (hasWash && wash.on > 0.2 && Math.abs(v.x - wash.x) < 50) {
          if (v.shine < 0.9) env.audio.play(11, { vel: 0.15 });
          v.shine = 1;
        } else v.shine = Math.max(0, v.shine - dt * 0.15);
        if (v.x - v.len / 2 > env.w + 30) v.x = garage.x - 40; // round the block and home again
      }

      drawScenery();
      drawWash();
      for (const v of vehicles) drawVehicle(v);
      drawGarage();
      drawLight();
      drawCrossing();
      sparks.draw(ctx, dt);
    },
    down(_id, x, y) {
      // garage: out comes the next vehicle
      if (Math.abs(x - garage.x) < 70 && y > roadY + roadH / 2 - 170 && y < roadY + roadH / 2 + 10) {
        const blocked = vehicles.some((v) => Math.abs(v.x - garage.x) < 90);
        if (vehicles.length >= maxV || blocked) {
          garage.shake = 0.5; env.audio.play(1, { vel: 0.3 });
          return;
        }
        garage.door = 1;
        spawn();
        env.audio.arpeggio([4, 7, 9], 0.08, 0.45);
        return;
      }
      // traffic light
      if (Math.abs(x - light.x) < 40 && y > roadY - roadH / 2 - 160 && y < roadY - roadH / 2 - 40) return toggleLight();
      // duck crossing button
      if (hasDucks && dist(x, y, crossing.x + 44, roadY - roadH / 2 - 38) < 34) {
        crossing.btnGlow = 1;
        env.audio.play(10, { vel: 0.4 }); setTimeout(() => env.audio.play(10, { vel: 0.35 }), 180);
        if (!crossing.active) {
          crossing.active = true;
          ducks = [0, 1, 2, 3].map((k) => ({ x: crossing.x - 6 + (k % 2) * 8, y: roadY - roadH / 2 - 12, delay: 1.4 + k * 0.6, big: k === 0, swim: 0 }));
        }
        return;
      }
      // car wash button
      if (hasWash && dist(x, y, wash.x + 95, roadY - roadH / 2 - 60) < 34) {
        wash.on = 1;
        env.audio.arpeggio([12, 10, 12, 14], 0.07, 0.35);
        return;
      }
      // vehicles
      for (const v of vehicles) {
        if (Math.abs(x - v.x) < v.len / 2 + 10 && y > roadY - 80 && y < roadY + roadH / 2 + 10) {
          v.bounce = 1;
          vehicleSound(v);
          sparks.burst(v.x, roadY - 40, '#FFF3C4', 6, 80, 3);
          return;
        }
      }
      sparks.burst(x, y, env.palette.soft[0], 5, 60, 3);
      env.audio.play(2, { vel: 0.15 });
    },
    move() {},
    up() {},
    invite() {
      garage.shake = 0.3;
      const v = vehicles[0];
      if (v) v.bounce = 0.6;
    },
  };
};
