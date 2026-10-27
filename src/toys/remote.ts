import type { ToyFactory } from './types';
import { drawAnimal, speak } from './animals';
import { approach, dist, drawFace, panFor, rand, Sparks, withAlpha } from './util';

type Btn = 'power' | 'channel' | 'light' | 'curtains' | 'music' | 'robot';
const BTN_COLOUR: Record<Btn, string> = {
  power: '#E8676B', channel: '#6CC17A', light: '#F2C14E', curtains: '#5FAFE0', music: '#B8A2E3', robot: '#F2A65A',
};
interface Rect { x: number; y: number; w: number; h: number }

/** Remote Control: a living room where big remote buttons switch the TV, lamp, curtains, music and robot vacuum. */
export const remoteControl: ToyFactory = (ctx, env) => {
  const buttons: Btn[] = (
    [['power', 'channel', 'light'], ['power', 'channel', 'light', 'curtains'], ['power', 'channel', 'light', 'curtains', 'music', 'robot']] as Btn[][]
  )[env.level];
  const has = (b: Btn) => buttons.includes(b);
  let room: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let remote: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let btnPos: { b: Btn; x: number; y: number; r: number; press: number }[] = [];
  const st = {
    tv: false, channel: 0, snow: 0, lamp: true, lampGlow: 1, curtains: 1, curtainsOpen: true,
    music: false, nextNote: 0, step: 0, led: 0, beam: null as null | { x: number; y: number; life: number },
  };
  const cat = { x: 0, y: 0, awake: 0, jump: 0, talkUntil: 0 };
  const robot = { x: 0, y: 0, state: 'docked' as 'docked' | 'cleaning' | 'home', t: 0, dir: 1, dockX: 0 };
  let crumbs: { x: number; y: number }[] = [];
  let notes: { x: number; y: number; life: number }[] = [];
  let now = 0;
  const sparks = new Sparks();
  const ink = '#3B3340';

  // where things are in the room (relative to the room rect)
  const win = () => ({ x: room.x + room.w * 0.05, y: room.y + room.h * 0.08, w: room.w * 0.27, h: room.h * 0.4 });
  const tv = () => ({ x: room.x + room.w * 0.4, y: room.y + room.h * 0.2, w: room.w * 0.36, h: room.h * 0.32 });
  const lampPos = () => ({ x: room.x + room.w * 0.9, y: room.y + room.h * 0.25 });
  const floorY = () => room.y + room.h * 0.74;
  const speaker = () => ({ x: room.x + room.w * 0.36, y: floorY() - room.h * 0.12 });

  function layout() {
    const portrait = env.h > env.w * 1.1;
    if (portrait) {
      room = { x: 16, y: 104, w: env.w - 32, h: env.h * 0.6 - 104 };
      remote = { x: 40, y: room.y + room.h + 16, w: env.w - 80, h: env.h - 104 - (room.y + room.h + 16) };
    } else {
      room = { x: 104, y: 14, w: env.w * 0.66 - 104, h: env.h - 28 };
      remote = { x: room.x + room.w + 18, y: 24, w: env.w - 104 - (room.x + room.w + 18), h: env.h - 48 };
    }
    const cols = portrait ? 3 : 2;
    const rows = Math.ceil(buttons.length / cols);
    const cw = remote.w / cols, ch = (remote.h - 40) / rows;
    const r = Math.min(cw, ch) * 0.36;
    btnPos = buttons.map((b, i) => ({
      b, r, press: 0,
      x: remote.x + cw * ((i % cols) + 0.5),
      y: remote.y + 40 + ch * (Math.floor(i / cols) + 0.5),
    }));
    cat.x = room.x + room.w * 0.18; cat.y = floorY() + room.h * 0.12;
    robot.dockX = room.x + room.w * 0.72;
    if (robot.state === 'docked') { robot.x = robot.dockX; }
    robot.y = floorY() + room.h * 0.16;
  }

  function target(b: Btn) {
    const t = tv(), w = win(), l = lampPos(), sp = speaker();
    return b === 'power' || b === 'channel' ? { x: t.x + t.w / 2, y: t.y + t.h / 2 }
      : b === 'light' ? l
      : b === 'curtains' ? { x: w.x + w.w / 2, y: w.y + w.h / 2 }
      : b === 'music' ? sp
      : { x: robot.x, y: robot.y };
  }

  function act(b: Btn) {
    switch (b) {
      case 'power':
        st.tv = !st.tv;
        st.snow = st.tv ? 0.3 : 0;
        env.audio.play(st.tv ? 9 : 4, { vel: 0.45 });
        break;
      case 'channel':
        if (!st.tv) { st.tv = true; }
        else st.channel = (st.channel + 1) % 6;
        st.snow = 0.3;
        env.audio.arpeggio([7 + (st.channel % 3), 10 + (st.channel % 3)], 0.08, 0.4);
        break;
      case 'light':
        st.lamp = !st.lamp;
        env.audio.play(st.lamp ? 10 : 5, { vel: 0.45 });
        break;
      case 'curtains':
        st.curtainsOpen = !st.curtainsOpen;
        env.audio.arpeggio(st.curtainsOpen ? [5, 7, 9] : [9, 7, 5], 0.06, 0.35);
        break;
      case 'music':
        st.music = !st.music;
        if (st.music) st.nextNote = now;
        env.audio.play(st.music ? 12 : 3, { vel: 0.4 });
        break;
      case 'robot':
        if (robot.state === 'docked') {
          robot.state = 'cleaning'; robot.t = now;
          crumbs = Array.from({ length: 7 }, () => ({ x: room.x + rand(room.w * 0.1, room.w * 0.9), y: floorY() + rand(room.h * 0.08, room.h * 0.22) }));
          env.audio.arpeggio([4, 7, 9, 12], 0.07, 0.35);
        } else {
          robot.state = 'home';
          env.audio.play(4, { vel: 0.3 });
        }
        break;
    }
  }

  function press(b: Btn) {
    const p = btnPos.find((o) => o.b === b);
    if (p) { p.press = 1; st.led = 0.3; const t = target(b); st.beam = { x: t.x, y: t.y, life: 0.5 }; }
    act(b);
  }

  /* ---------- drawing the room ---------- */

  function drawChannel(t: Rect) {
    ctx.save();
    ctx.beginPath(); ctx.roundRect(t.x, t.y, t.w, t.h, 8); ctx.clip();
    const cxv = t.x + t.w / 2, cyv = t.y + t.h / 2;
    switch (st.channel) {
      case 0: { // aquarium
        ctx.fillStyle = '#7FC4EC'; ctx.fillRect(t.x, t.y, t.w, t.h);
        for (let k = 0; k < 3; k++) {
          const fx = t.x + ((now * (20 + k * 12) + k * 70) % (t.w + 40)) - 20, fy = t.y + t.h * (0.3 + k * 0.22);
          ctx.fillStyle = ['#F2A65A', '#F4A9C0', '#F2C14E'][k];
          ctx.beginPath(); ctx.ellipse(fx, fy, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(fx - 10, fy); ctx.lineTo(fx - 20, fy - 7); ctx.lineTo(fx - 20, fy + 7); ctx.fill();
          ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(fx + 6, fy - 2, 1.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#6CC17A';
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(t.x + 14 + k * t.w * 0.28, t.y + t.h - 6, 5, 16 + Math.sin(now * 2 + k) * 3, Math.sin(now + k) * 0.2, 0, Math.PI * 2); ctx.fill(); }
        break;
      }
      case 1: { // space
        ctx.fillStyle = '#2E2A50'; ctx.fillRect(t.x, t.y, t.w, t.h);
        ctx.fillStyle = '#FFF1C9';
        for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.arc(t.x + ((k * 53) % t.w), t.y + ((k * 37) % t.h), 1.5, 0, Math.PI * 2); ctx.fill(); }
        const ry = cyv + Math.sin(now * 1.5) * t.h * 0.15;
        ctx.fillStyle = '#F2A65A'; ctx.beginPath(); ctx.moveTo(cxv - 6, ry + 18); ctx.lineTo(cxv + 6, ry + 18); ctx.lineTo(cxv, ry + 30 + Math.sin(now * 30) * 4); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect(cxv - 9, ry - 14, 18, 32, 9); ctx.fill();
        ctx.fillStyle = '#E8676B'; ctx.beginPath(); ctx.moveTo(cxv - 9, ry - 6); ctx.lineTo(cxv, ry - 24); ctx.lineTo(cxv + 9, ry - 6); ctx.fill();
        ctx.fillStyle = '#5FAFE0'; ctx.beginPath(); ctx.arc(cxv, ry, 4, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 2: { // farm with bouncing sheep
        ctx.fillStyle = '#BFE3F5'; ctx.fillRect(t.x, t.y, t.w, t.h);
        ctx.fillStyle = '#A9D69A'; ctx.beginPath(); ctx.ellipse(cxv, t.y + t.h, t.w * 0.7, t.h * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        for (let k = 0; k < 2; k++) {
          const sx = t.x + t.w * (0.32 + k * 0.36), sy = t.y + t.h * 0.66 - Math.abs(Math.sin(now * 3 + k)) * 12;
          ctx.fillStyle = '#FFFFFF';
          for (const [dx, dy] of [[-8, 0], [0, -5], [8, 0], [0, 4]]) { ctx.beginPath(); ctx.arc(sx + dx, sy + dy, 8, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(sx + 13, sy - 2, 5, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case 3: { // Blini dances
        ctx.fillStyle = '#F4A9C0'; ctx.fillRect(t.x, t.y, t.w, t.h);
        const bx = cxv + Math.sin(now * 3) * t.w * 0.2, by = cyv + 4 - Math.abs(Math.sin(now * 6)) * 8;
        ctx.fillStyle = '#F6C978'; ctx.beginPath(); ctx.arc(bx, by, t.h * 0.26, 0, Math.PI * 2); ctx.fill();
        drawFace(ctx, bx, by, t.h * 0.42, '#4A3A2A', { happy: true });
        break;
      }
      case 4: { // rain on flowers
        ctx.fillStyle = '#9FB3C8'; ctx.fillRect(t.x, t.y, t.w, t.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
        for (let k = 0; k < 16; k++) { const rx = t.x + ((k * 29) % t.w), ry = t.y + ((now * 120 + k * 41) % t.h); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 2, ry + 8); ctx.stroke(); }
        for (let k = 0; k < 3; k++) {
          const fx = t.x + t.w * (0.25 + k * 0.25), fy = t.y + t.h * 0.75;
          ctx.fillStyle = ['#E8676B', '#F2C14E', '#B8A2E3'][k];
          ctx.beginPath(); ctx.arc(fx, fy, 7, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      default: { // boat on the sea
        ctx.fillStyle = '#BFE3F5'; ctx.fillRect(t.x, t.y, t.w, t.h);
        const by = cyv + Math.sin(now * 2) * 4;
        ctx.fillStyle = '#E8676B'; ctx.beginPath(); ctx.moveTo(cxv - 22, by); ctx.lineTo(cxv + 22, by); ctx.lineTo(cxv + 14, by + 10); ctx.lineTo(cxv - 14, by + 10); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(cxv, by - 26); ctx.lineTo(cxv + 16, by - 2); ctx.lineTo(cxv, by - 2); ctx.fill();
        ctx.fillStyle = '#5FAFE0';
        ctx.beginPath(); ctx.moveTo(t.x, t.y + t.h);
        for (let x = 0; x <= t.w; x += 8) ctx.lineTo(t.x + x, cyv + 10 + Math.sin(now * 3 + x * 0.1) * 4);
        ctx.lineTo(t.x + t.w, t.y + t.h); ctx.fill();
      }
    }
    if (st.snow > 0) {
      for (let k = 0; k < 60; k++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#FFFFFF' : '#8A8590';
        ctx.fillRect(t.x + Math.random() * t.w, t.y + Math.random() * t.h, 4, 3);
      }
    }
    ctx.restore();
  }

  function drawRoom() {
    ctx.save();
    ctx.beginPath(); ctx.roundRect(room.x, room.y, room.w, room.h, 18); ctx.clip();
    drawRoomInside();
    ctx.restore();
  }

  function drawRoomInside() {
    // wall + floor
    ctx.fillStyle = '#FBEFD9';
    ctx.beginPath(); ctx.roundRect(room.x, room.y, room.w, room.h, 18); ctx.fill();
    ctx.fillStyle = '#E3C79F';
    ctx.beginPath(); ctx.roundRect(room.x, floorY(), room.w, room.y + room.h - floorY(), [0, 0, 18, 18]); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 2;
    for (let x = room.x + 40; x < room.x + room.w; x += 60) { ctx.beginPath(); ctx.moveTo(x, floorY()); ctx.lineTo(x - 20, room.y + room.h); ctx.stroke(); }
    // window and curtains
    const w = win();
    ctx.fillStyle = '#BFE3F5'; ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = '#FBD97A'; ctx.beginPath(); ctx.arc(w.x + w.w * 0.7, w.y + w.h * 0.3, w.w * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    const cl = w.x + ((now * 8) % (w.w + 40)) - 20;
    ctx.beginPath(); ctx.arc(cl, w.y + w.h * 0.55, 10, 0, Math.PI * 2); ctx.arc(cl + 12, w.y + w.h * 0.52, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5;
    ctx.strokeRect(w.x, w.y, w.w, w.h);
    ctx.beginPath(); ctx.moveTo(w.x + w.w / 2, w.y); ctx.lineTo(w.x + w.w / 2, w.y + w.h); ctx.stroke();
    const cw = (w.w / 2) * (1 - st.curtains * 0.8);
    ctx.fillStyle = '#5FAFE0';
    for (const side of [0, 1]) {
      const x = side === 0 ? w.x - 6 : w.x + w.w + 6 - cw;
      ctx.beginPath(); ctx.roundRect(x, w.y - 10, cw, w.h + 20, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + (cw * k) / 4, w.y - 6); ctx.lineTo(x + (cw * k) / 4, w.y + w.h + 6); ctx.stroke(); }
    }
    ctx.fillStyle = '#B8956A'; ctx.fillRect(w.x - 14, w.y - 14, w.w + 28, 6);
    // TV and cabinet
    const t = tv();
    ctx.fillStyle = '#C99A6B';
    ctx.beginPath(); ctx.roundRect(t.x - 14, t.y + t.h + 6, t.w + 28, floorY() - t.y - t.h - 6, 8); ctx.fill();
    ctx.fillStyle = '#3B3340';
    ctx.beginPath(); ctx.roundRect(t.x - 8, t.y - 8, t.w + 16, t.h + 16, 12); ctx.fill();
    if (st.tv) drawChannel(t);
    else { ctx.fillStyle = '#2E2A36'; ctx.beginPath(); ctx.roundRect(t.x, t.y, t.w, t.h, 8); ctx.fill(); }
    ctx.fillStyle = st.tv ? '#6CC17A' : '#E8676B';
    ctx.beginPath(); ctx.arc(t.x + t.w - 6, t.y + t.h + 2, 3, 0, Math.PI * 2); ctx.fill();
    // speaker
    if (has('music')) {
      const sp = speaker();
      const beat = st.music ? Math.abs(Math.sin(now * 8)) * 3 : 0;
      ctx.fillStyle = '#B8A2E3';
      ctx.beginPath(); ctx.roundRect(sp.x - 18, sp.y - 26, 36, 52, 8); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(sp.x, sp.y + 6, 10 + beat, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sp.x, sp.y - 14, 5, 0, Math.PI * 2); ctx.fill();
    }
    // lamp
    const l = lampPos();
    if (st.lampGlow > 0.02) {
      const g = ctx.createRadialGradient(l.x, l.y + 20, 0, l.x, l.y + 20, room.h * 0.6);
      g.addColorStop(0, withAlpha('#FFE9A8', 0.6 * st.lampGlow));
      g.addColorStop(1, withAlpha('#FFE9A8', 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, l.y + 20, room.h * 0.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#8A8590'; ctx.fillRect(l.x - 3, l.y, 6, floorY() - l.y + 10);
    ctx.beginPath(); ctx.ellipse(l.x, floorY() + 10, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F2C14E';
    ctx.beginPath(); ctx.moveTo(l.x - 16, l.y - 30); ctx.lineTo(l.x + 16, l.y - 30); ctx.lineTo(l.x + 28, l.y + 4); ctx.lineTo(l.x - 28, l.y + 4); ctx.fill();
    // rug + cat
    ctx.fillStyle = '#F4A9C0';
    ctx.beginPath(); ctx.ellipse(cat.x, cat.y + 16, room.w * 0.14, room.h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    const sleeping = cat.awake <= 0 && !st.music;
    const bob = st.music ? Math.sin(now * 8) * 3 : 0;
    const catY = cat.y - Math.sin(cat.jump * Math.PI) * 30 + bob;
    const cs = Math.min(room.w, room.h) * 0.2;
    // tail
    ctx.strokeStyle = '#F2A65A'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    const sway = st.music ? Math.sin(now * 8) * 0.6 : Math.sin(now) * 0.2;
    ctx.beginPath(); ctx.moveTo(cat.x + cs * 0.3, catY + cs * 0.3); ctx.quadraticCurveTo(cat.x + cs * 0.7, catY + cs * 0.1, cat.x + cs * (0.6 + sway * 0.3), catY - cs * 0.25); ctx.stroke();
    ctx.fillStyle = '#F2A65A';
    ctx.beginPath(); ctx.ellipse(cat.x + cs * 0.1, catY + cs * 0.3, cs * 0.42, cs * 0.24, 0, 0, Math.PI * 2); ctx.fill();
    drawAnimal(ctx, 'cat', cat.x - cs * 0.15, catY + cs * 0.05, cs * 0.75, now, { blink: sleeping, happy: st.music, talk: now < cat.talkUntil ? Math.abs(Math.sin(now * 16)) : 0 });
    if (sleeping) {
      ctx.fillStyle = withAlpha('#B8A2E3', 0.6 + Math.sin(now * 2) * 0.3);
      ctx.font = `800 ${Math.round(cs * 0.25)}px "Nunito Variable", Nunito, sans-serif`;
      ctx.fillText('z', cat.x + cs * 0.1, catY - cs * 0.45 - Math.sin(now * 2) * 4);
    }
    // robot vacuum
    if (has('robot')) {
      ctx.fillStyle = withAlpha(ink, 0.3);
      ctx.beginPath(); ctx.roundRect(robot.dockX - 26, robot.y - 30, 52, 16, 6); ctx.fill();
      ctx.fillStyle = '#9AA3AD';
      for (const c of crumbs) { ctx.beginPath(); ctx.arc(c.x, c.y, 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#F2A65A';
      ctx.beginPath(); ctx.ellipse(robot.x, robot.y, 26, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = robot.state === 'cleaning' && Math.sin(now * 10) > 0 ? '#6CC17A' : '#FFFFFF';
      ctx.beginPath(); ctx.arc(robot.x, robot.y - 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(robot.x + robot.dir * 14, robot.y - 2, 2, 0, Math.PI * 2); ctx.fill();
    }
    // floating music notes
    for (const nt of notes) {
      ctx.globalAlpha = nt.life;
      ctx.fillStyle = '#B8A2E3';
      ctx.beginPath(); ctx.ellipse(nt.x, nt.y, 7, 5, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(nt.x + 5, nt.y - 18, 3, 18);
    }
    ctx.globalAlpha = 1;
    // darkness when the lamp is off and the curtains are shut
    const dark = (1 - st.lampGlow) * 0.3 + (1 - st.curtains) * 0.2;
    if (dark > 0.01) {
      ctx.fillStyle = `rgba(30,25,45,${dark})`;
      ctx.beginPath(); ctx.roundRect(room.x, room.y, room.w, room.h, 18); ctx.fill();
      if (st.tv) {
        const t2 = tv();
        const g = ctx.createRadialGradient(t2.x + t2.w / 2, t2.y + t2.h / 2, 0, t2.x + t2.w / 2, t2.y + t2.h / 2, t2.w);
        g.addColorStop(0, 'rgba(180,220,255,0.25)'); g.addColorStop(1, 'rgba(180,220,255,0)');
        ctx.fillStyle = g; ctx.fillRect(room.x, room.y, room.w, room.h);
      }
    }
  }

  function drawIcon(b: Btn, x: number, y: number, r: number) {
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = r * 0.14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const k = r * 0.45;
    switch (b) {
      case 'power':
        ctx.beginPath(); ctx.arc(x, y, k, -Math.PI * 0.3, Math.PI * 1.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y - k * 1.2); ctx.lineTo(x, y - k * 0.2); ctx.stroke();
        break;
      case 'channel':
        for (const dx of [-0.5, 0.4]) { ctx.beginPath(); ctx.moveTo(x + dx * k - k * 0.4, y - k * 0.7); ctx.lineTo(x + dx * k + k * 0.5, y); ctx.lineTo(x + dx * k - k * 0.4, y + k * 0.7); ctx.fill(); }
        break;
      case 'light':
        ctx.beginPath(); ctx.arc(x, y - k * 0.2, k * 0.65, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x - k * 0.3, y + k * 0.4, k * 0.6, k * 0.45);
        break;
      case 'curtains':
        ctx.strokeRect(x - k * 0.8, y - k * 0.8, k * 1.6, k * 1.6);
        ctx.beginPath(); ctx.moveTo(x, y - k * 0.8); ctx.lineTo(x, y + k * 0.8); ctx.stroke();
        break;
      case 'music':
        ctx.beginPath(); ctx.ellipse(x - k * 0.25, y + k * 0.5, k * 0.4, k * 0.3, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x + k * 0.05, y - k * 0.8, r * 0.12, k * 1.3);
        ctx.beginPath(); ctx.moveTo(x + k * 0.1, y - k * 0.8); ctx.quadraticCurveTo(x + k * 0.8, y - k * 0.6, x + k * 0.6, y - k * 0.1); ctx.stroke();
        break;
      case 'robot':
        ctx.beginPath(); ctx.roundRect(x - k * 0.7, y - k * 0.5, k * 1.4, k * 1.1, k * 0.3); ctx.fill();
        ctx.fillStyle = BTN_COLOUR.robot;
        ctx.beginPath(); ctx.arc(x - k * 0.3, y, k * 0.15, 0, Math.PI * 2); ctx.arc(x + k * 0.3, y, k * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y - k * 0.5); ctx.lineTo(x, y - k * 0.9); ctx.stroke();
        break;
    }
  }

  function drawRemote() {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.roundRect(remote.x + 4, remote.y + 8, remote.w, remote.h, 36); ctx.fill();
    ctx.fillStyle = '#3B3340';
    ctx.beginPath(); ctx.roundRect(remote.x, remote.y, remote.w, remote.h, 36); ctx.fill();
    // the little light at the top that blinks when a button is pressed
    ctx.fillStyle = st.led > 0 ? '#E8676B' : '#5A5560';
    ctx.beginPath(); ctx.arc(remote.x + remote.w / 2, remote.y + 20, 7, 0, Math.PI * 2); ctx.fill();
    for (const p of btnPos) {
      const down = p.press * 4;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.arc(p.x, p.y + 5, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = BTN_COLOUR[p.b];
      ctx.beginPath(); ctx.arc(p.x, p.y + down, p.r, 0, Math.PI * 2); ctx.fill();
      drawIcon(p.b, p.x, p.y + down, p.r);
    }
  }

  return {
    resize() { layout(); },
    frame(dt, t) {
      now = t;
      st.snow = Math.max(0, st.snow - dt);
      st.led = Math.max(0, st.led - dt);
      st.lampGlow = approach(st.lampGlow, st.lamp ? 1 : 0, 6, dt);
      st.curtains = approach(st.curtains, st.curtainsOpen ? 1 : 0, 4, dt);
      for (const p of btnPos) p.press = Math.max(0, p.press - dt * 5);
      cat.awake = Math.max(0, cat.awake - dt);
      cat.jump = Math.max(0, cat.jump - dt * 1.5);
      if (st.music && t >= st.nextNote) {
        const tune = [5, 7, 9, 7, 10, 9, 7, 5, 4, 5, 7, 4];
        env.audio.play(tune[st.step % tune.length], { vel: 0.22 });
        st.step++;
        st.nextNote = t + 0.38;
        const sp = speaker();
        notes.push({ x: sp.x + rand(-10, 10), y: sp.y - 30, life: 1 });
      }
      for (const nt of notes) { nt.life -= dt * 0.7; nt.y -= dt * 40; nt.x += Math.sin(nt.y * 0.05) * 0.5; }
      notes = notes.filter((nt) => nt.life > 0);
      // robot vacuum
      if (robot.state === 'cleaning') {
        const c = crumbs[0];
        const tx = c ? c.x : robot.dockX;
        const ty = c ? c.y : floorY() + room.h * 0.16;
        robot.dir = tx > robot.x ? 1 : -1;
        robot.x = approach(robot.x, tx, 2.5, dt); robot.y = approach(robot.y, ty, 2.5, dt);
        if (c && dist(robot.x, robot.y, c.x, c.y) < 8) { crumbs.shift(); env.audio.play(10 + crumbs.length % 3, { vel: 0.2 }); }
        if (dist(robot.x, robot.y, cat.x, cat.y + 10) < 40 && cat.jump === 0) {
          cat.jump = 1; cat.awake = 2; cat.talkUntil = t + speak((n, o) => env.audio.play(n, o), 'cat');
        }
        if (!crumbs.length || t - robot.t > 14) robot.state = 'home';
      } else if (robot.state === 'home') {
        robot.x = approach(robot.x, robot.dockX, 2.5, dt);
        robot.y = approach(robot.y, floorY() + room.h * 0.16, 2.5, dt);
        robot.dir = robot.dockX > robot.x ? 1 : -1;
        if (dist(robot.x, robot.y, robot.dockX, floorY() + room.h * 0.16) < 3) { robot.state = 'docked'; env.audio.arpeggio([9, 5], 0.1, 0.3); }
      }

      ctx.fillStyle = env.palette.bg;
      ctx.fillRect(0, 0, env.w, env.h);
      drawRoom();
      if (st.beam) {
        st.beam.life -= dt;
        if (st.beam.life > 0) {
          ctx.strokeStyle = withAlpha('#E8676B', st.beam.life * 1.2);
          ctx.setLineDash([6, 10]); ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(remote.x + remote.w / 2, remote.y + 20); ctx.lineTo(st.beam.x, st.beam.y); ctx.stroke();
          ctx.setLineDash([]);
        } else st.beam = null;
      }
      drawRemote();
      sparks.draw(ctx, dt);
    },
    down(_id, x, y) {
      for (const p of btnPos) {
        if (dist(x, y, p.x, p.y) < p.r + 12) {
          sparks.burst(p.x, p.y, BTN_COLOUR[p.b], 6, 80, 3);
          return press(p.b);
        }
      }
      // tapping things in the room works too
      const t = tv(), w = win(), l = lampPos();
      if (x > t.x && x < t.x + t.w && y > t.y && y < t.y + t.h) return press(st.tv ? 'channel' : 'power');
      if (dist(x, y, l.x, l.y) < 50) return press('light');
      if (has('curtains') && x > w.x - 10 && x < w.x + w.w + 10 && y > w.y && y < w.y + w.h) return press('curtains');
      if (has('music') && dist(x, y, speaker().x, speaker().y) < 36) return press('music');
      if (has('robot') && dist(x, y, robot.x, robot.y) < 36) return press('robot');
      if (dist(x, y, cat.x, cat.y) < 50) {
        cat.awake = 3; cat.jump = 0.6;
        cat.talkUntil = now + speak((n, o) => env.audio.play(n, { ...o, pan: panFor(x, env.w) }), 'cat');
        return;
      }
      sparks.burst(x, y, env.palette.soft[1], 5, 60, 3);
      env.audio.play(2, { vel: 0.15 });
    },
    move() {},
    up() {},
    invite() { const p = btnPos[0]; if (p) p.press = 0.6; },
  };
};
