import type { ToyFactory } from './types';
import { approach, clamp, dist, panFor, Ripples, shuffle, Sparks, withAlpha } from './util';

interface Rect { x: number; y: number; w: number; h: number }
interface Switch { x: number; y: number; on: boolean; anim: number; color: string; note: number }
interface Button { x: number; y: number; r: number; press: number; glow: number; color: string; note: number }
interface Socket { x: number; y: number; color: string; shake: number; glow: number }
interface Cable {
  color: string;
  note: number;
  rootX: number;
  rootY: number;
  restX: number;
  restY: number;
  x: number;
  y: number;
  holder: number | null;
  gdx: number;
  gdy: number;
  socket: Socket | null;
  wiggle: number;
}

const CABLE_COLOURS = ['#E8676B', '#5FAFE0', '#F2C14E', '#6CC17A'];

/**
 * Busy Board: flip light switches, press big buttons, slide the music slider
 * and plug coloured cables into their sockets. Everything on = a little light show.
 */
export const busyBoard: ToyFactory = (ctx, env) => {
  const n = [2, 3, 4][env.level];
  const anySocket = env.level === 0; // babies: any cable fits any socket
  const steps = 8;
  let switches: Switch[] = [];
  let buttons: Button[] = [];
  let sockets: Socket[] = [];
  let cables: Cable[] = [];
  const slider = { x0: 0, x1: 0, y: 0, v: 0, step: 0, holder: null as number | null, glow: 0 };
  let board: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let cableBand: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let show = 0; // light-show timer
  let wasComplete = false;
  let now = 0;
  const sparks = new Sparks();
  const ripples = new Ripples();
  const ink = env.palette.night ? '#2A2530' : '#3B3340';
  const wood = env.palette.night ? '#4A4038' : '#EBD3AE';
  const woodDark = env.palette.night ? '#3C342E' : '#D9BC91';

  function layout() {
    // Keep clear of the corner bubbles: above/below the board in portrait, beside it in landscape.
    const portrait = env.h > env.w * 1.1;
    const top = portrait ? 104 : 14, side = portrait ? 16 : 104;
    board = { x: side, y: top, w: env.w - side * 2, h: env.h - top * 2 };
    let swBand: Rect, btnBand: Rect;
    if (portrait) {
      const h = board.h;
      swBand = { x: board.x, y: board.y, w: board.w, h: h * 0.3 };
      btnBand = { x: board.x, y: board.y + h * 0.3, w: board.w, h: h * 0.24 };
      cableBand = { x: board.x, y: board.y + h * 0.54, w: board.w, h: h * 0.46 };
    } else {
      const half = board.w * 0.5;
      swBand = { x: board.x, y: board.y, w: half, h: board.h * 0.55 };
      btnBand = { x: board.x, y: board.y + board.h * 0.55, w: half, h: board.h * 0.45 };
      cableBand = { x: board.x + half, y: board.y, w: half, h: board.h };
    }

    const old = switches;
    switches = Array.from({ length: n }, (_, i) => ({
      x: swBand.x + (swBand.w / (n + 1)) * (i + 1),
      y: swBand.y + swBand.h * 0.62,
      on: old[i]?.on ?? false,
      anim: old[i]?.on ? 1 : 0,
      color: env.palette.soft[i % env.palette.soft.length],
      note: 5 + i * 2,
    }));

    const nb = env.level === 0 ? 2 : 3;
    const sliderOn = env.level > 0;
    const btnArea = sliderOn ? btnBand.w * 0.55 : btnBand.w;
    const r = Math.min(btnArea / (nb + 1) * 0.42, btnBand.h * 0.3, 46);
    buttons = Array.from({ length: nb }, (_, i) => ({
      x: btnBand.x + (btnArea / (nb + 1)) * (i + 1),
      y: btnBand.y + btnBand.h * 0.5,
      r, press: 0, glow: 0,
      color: CABLE_COLOURS[(i + 1) % CABLE_COLOURS.length],
      note: [2, 4, 7][i],
    }));
    if (sliderOn) {
      slider.x0 = btnBand.x + btnArea + 28;
      slider.x1 = btnBand.x + btnBand.w - 28;
      slider.y = btnBand.y + btnBand.h * 0.5;
    } else {
      slider.x0 = slider.x1 = -1000;
    }

    // Sockets along the top of the cable band (shuffled so cables cross), plugs resting at the bottom.
    const colours = CABLE_COLOURS.slice(0, n);
    const socketOrder = shuffle(colours);
    const colX = (i: number) => cableBand.x + (cableBand.w / (n + 1)) * (i + 1);
    sockets = socketOrder.map((color, i) => ({ x: colX(i), y: cableBand.y + Math.min(70, cableBand.h * 0.22), color, shake: 0, glow: 0 }));
    cables = colours.map((color, i) => {
      const rootX = colX(i);
      const rootY = cableBand.y + cableBand.h - 6;
      const restY = cableBand.y + cableBand.h * 0.62;
      return {
        color, note: 3 + i * 2, rootX, rootY, restX: rootX, restY, x: rootX, y: restY,
        holder: null, gdx: 0, gdy: 0, socket: null, wiggle: 0.5,
      };
    });
    wasComplete = false;
  }

  const complete = () => switches.every((s) => s.on) && cables.every((c) => c.socket);

  function checkComplete() {
    const c = complete();
    if (c && !wasComplete) {
      show = 3.2;
      setTimeout(() => env.audio.arpeggio([5, 7, 9, 10, 12, 14, 15], 0.12, 0.5), 250);
    }
    wasComplete = c;
  }

  /* ---------- drawing ---------- */

  function drawBoard() {
    ctx.fillStyle = woodDark;
    ctx.beginPath();
    ctx.roundRect(board.x, board.y + 6, board.w, board.h, 30);
    ctx.fill();
    ctx.fillStyle = wood;
    ctx.beginPath();
    ctx.roundRect(board.x, board.y, board.w, board.h, 30);
    ctx.fill();
    // gentle wood grain
    ctx.strokeStyle = withAlpha(env.palette.night ? '#000000' : '#B8956A', 0.12);
    ctx.lineWidth = 2;
    for (let i = 1; i < 7; i++) {
      const y = board.y + (board.h / 7) * i;
      ctx.beginPath();
      ctx.moveTo(board.x + 20, y);
      ctx.bezierCurveTo(board.x + board.w * 0.3, y - 8, board.x + board.w * 0.7, y + 8, board.x + board.w - 20, y);
      ctx.stroke();
    }
    // corner screws
    ctx.fillStyle = withAlpha(ink, 0.25);
    for (const [sx, sy] of [[board.x + 18, board.y + 18], [board.x + board.w - 18, board.y + 18], [board.x + 18, board.y + board.h - 18], [board.x + board.w - 18, board.y + board.h - 18]]) {
      ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
    }
  }

  function lit(base: boolean, i: number) {
    // During the light show everything chases in turn.
    if (show > 0) return Math.sin(now * 10 - i * 1.2) > 0;
    return base;
  }

  function drawSwitch(s: Switch, i: number) {
    const bw = 44, bh = 70;
    // bulb above
    const by = s.y - bh / 2 - 46;
    const on = lit(s.on, i);
    if (on) {
      ctx.fillStyle = withAlpha(s.color, 0.3);
      ctx.beginPath(); ctx.arc(s.x, by, 38, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = on ? s.color : withAlpha('#FFFFFF', env.palette.night ? 0.25 : 0.75);
    ctx.strokeStyle = withAlpha(ink, 0.35);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s.x, by, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = withAlpha(ink, 0.35);
    ctx.fillRect(s.x - 10, by + 22, 20, 10);
    if (on) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(s.x - 8, by - 8, 6, 0, Math.PI * 2); ctx.fill();
    }
    // switch plate
    ctx.fillStyle = env.palette.night ? '#5A5048' : '#FFF8EC';
    ctx.strokeStyle = withAlpha(ink, 0.25);
    ctx.beginPath(); ctx.roundRect(s.x - bw / 2, s.y - bh / 2, bw, bh, 14); ctx.fill(); ctx.stroke();
    // lever
    const t = s.anim;
    const ly = s.y + (1 - 2 * t) * 16;
    ctx.fillStyle = s.on ? s.color : '#B9B2AA';
    ctx.beginPath(); ctx.roundRect(s.x - 15, ly - 13, 30, 26, 10); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.roundRect(s.x - 10, ly - 9, 20, 6, 3); ctx.fill();
  }

  function drawButton(b: Button, i: number) {
    const glow = Math.max(b.glow, show > 0 && lit(false, i + 4) ? 1 : 0);
    ctx.fillStyle = withAlpha(ink, 0.25);
    ctx.beginPath(); ctx.ellipse(b.x, b.y + b.r * 0.35, b.r * 1.15, b.r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
    if (glow > 0) {
      ctx.fillStyle = withAlpha(b.color, 0.35 * glow);
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.7, 0, Math.PI * 2); ctx.fill();
    }
    const down = b.press * b.r * 0.25;
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.ellipse(b.x, b.y + down, b.r, b.r * (0.85 - b.press * 0.15), 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.ellipse(b.x - b.r * 0.3, b.y - b.r * 0.3 + down, b.r * 0.3, b.r * 0.18, -0.5, 0, Math.PI * 2); ctx.fill();
  }

  function drawSlider() {
    if (slider.x1 < 0) return;
    const { x0, x1, y } = slider;
    const kx = x0 + (x1 - x0) * slider.v;
    ctx.fillStyle = withAlpha(ink, 0.18);
    ctx.beginPath(); ctx.roundRect(x0 - 14, y - 9, x1 - x0 + 28, 18, 9); ctx.fill();
    const grad = ctx.createLinearGradient(x0, 0, x1, 0);
    CABLE_COLOURS.forEach((c, i) => grad.addColorStop(i / (CABLE_COLOURS.length - 1), c));
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.roundRect(x0 - 14, y - 9, kx - x0 + 28, 18, 9); ctx.fill();
    // notches
    ctx.fillStyle = withAlpha(ink, 0.3);
    for (let i = 0; i < steps; i++) {
      const nx = x0 + ((x1 - x0) * i) / (steps - 1);
      ctx.beginPath(); ctx.arc(nx, y + 24, 3, 0, Math.PI * 2); ctx.fill();
    }
    // knob
    ctx.fillStyle = withAlpha(ink, 0.2);
    ctx.beginPath(); ctx.arc(kx, y + 4, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = env.palette.night ? '#E9DDC9' : '#FFFFFF';
    ctx.beginPath(); ctx.arc(kx, y, 26 + slider.glow * 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = withAlpha(ink, 0.2); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(kx - 6, y - 10); ctx.lineTo(kx - 6, y + 10); ctx.moveTo(kx + 6, y - 10); ctx.lineTo(kx + 6, y + 10); ctx.stroke();
  }

  function drawSocket(s: Socket, i: number) {
    const shake = Math.sin(s.shake * 30) * s.shake * 8;
    const x = s.x + shake;
    const glow = Math.max(s.glow, show > 0 && lit(false, i + 8) ? 1 : 0);
    if (glow > 0) {
      ctx.fillStyle = withAlpha(s.color, 0.35 * glow);
      ctx.beginPath(); ctx.arc(x, s.y, 46, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = s.color;
    ctx.beginPath(); ctx.roundRect(x - 32, s.y - 32, 64, 64, 18); ctx.fill();
    ctx.fillStyle = env.palette.night ? '#3A3340' : '#FFF8EC';
    ctx.beginPath(); ctx.roundRect(x - 24, s.y - 24, 48, 48, 13); ctx.fill();
    ctx.fillStyle = withAlpha(ink, 0.7);
    ctx.beginPath(); ctx.roundRect(x - 12, s.y - 10, 7, 18, 3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x + 5, s.y - 10, 7, 18, 3); ctx.fill();
  }

  function cablePath(c: Cable) {
    const py = c.y + 28; // bottom of the plug
    ctx.beginPath();
    ctx.moveTo(c.rootX, c.rootY);
    const sag = Math.max(40, Math.abs(c.x - c.rootX) * 0.4);
    ctx.bezierCurveTo(c.rootX, c.rootY - 30, c.x, py + sag, c.x, py);
  }

  function drawCable(c: Cable) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = withAlpha('#000000', 0.12);
    ctx.lineWidth = 16;
    ctx.save(); ctx.translate(2, 4); cablePath(c); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 13;
    cablePath(c); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 4;
    cablePath(c); ctx.stroke();
  }

  function drawPlug(c: Cable) {
    const wig = Math.sin(c.wiggle * 20) * c.wiggle * 0.25;
    const lift = c.holder !== null ? 1.08 : 1;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(wig);
    ctx.scale(lift, lift);
    if (!c.socket) {
      // prongs (hidden inside the socket once plugged)
      ctx.fillStyle = '#C9C2B8';
      ctx.beginPath(); ctx.roundRect(-12, -36, 7, 16, 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(5, -36, 7, 16, 2); ctx.fill();
    }
    ctx.fillStyle = c.color;
    ctx.beginPath(); ctx.roundRect(-24, -24, 48, 52, 14); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.roundRect(-16, -18, 10, 30, 5); ctx.fill();
    ctx.restore();
  }

  /* ---------- toy interface ---------- */

  return {
    resize() { layout(); },
    frame(dt, t) {
      now = t;
      show = Math.max(0, show - dt);
      slider.glow = Math.max(0, slider.glow - dt * 3);
      for (const s of switches) s.anim = approach(s.anim, s.on ? 1 : 0, 18, dt);
      for (const b of buttons) {
        b.press = Math.max(0, b.press - dt * 4);
        b.glow = Math.max(0, b.glow - dt * 1.2);
      }
      for (const s of sockets) {
        s.shake = Math.max(0, s.shake - dt);
        const plugged = cables.some((c) => c.socket === s);
        s.glow = approach(s.glow, plugged ? 0.8 : 0, 6, dt);
      }
      for (const c of cables) {
        c.wiggle = Math.max(0, c.wiggle - dt);
        if (c.holder === null) {
          const tx = c.socket ? c.socket.x : c.restX;
          const ty = c.socket ? c.socket.y + 30 : c.restY;
          c.x = approach(c.x, tx, 12, dt);
          c.y = approach(c.y, ty, 12, dt);
        }
      }

      ctx.fillStyle = env.palette.bg;
      ctx.fillRect(0, 0, env.w, env.h);
      drawBoard();
      switches.forEach(drawSwitch);
      buttons.forEach(drawButton);
      drawSlider();
      sockets.forEach(drawSocket);
      // cables under plugs; held plug on top
      for (const c of cables) drawCable(c);
      const order = cables.slice().sort((a, b) => Number(a.holder !== null) - Number(b.holder !== null));
      for (const c of order) drawPlug(c);
      sparks.draw(ctx, dt);
      ripples.draw(ctx, dt);
    },
    down(id, x, y) {
      // plugs first (they can sit on top of sockets)
      for (let i = cables.length - 1; i >= 0; i--) {
        const c = cables[i];
        if (c.holder === null && dist(x, y, c.x, c.y) < 46) {
          c.holder = id;
          c.gdx = c.x - x;
          c.gdy = c.y - y;
          if (c.socket) {
            c.socket = null; // unplug
            env.audio.play(c.note - 2, { vel: 0.35, pan: panFor(x, env.w) });
            wasComplete = false;
          } else {
            env.audio.play(c.note, { vel: 0.3, pan: panFor(x, env.w) });
          }
          c.wiggle = 0.3;
          return;
        }
      }
      for (const s of switches) {
        if (Math.abs(x - s.x) < 42 && y > s.y - 125 && y < s.y + 50) {
          s.on = !s.on;
          env.audio.play(s.on ? s.note : s.note - 3, { vel: s.on ? 0.55 : 0.3, pan: panFor(x, env.w) });
          if (s.on) sparks.burst(s.x, s.y - 81, s.color, 8, 90, 4);
          checkComplete();
          return;
        }
      }
      for (const b of buttons) {
        if (dist(x, y, b.x, b.y) < b.r + 18) {
          b.press = 1;
          b.glow = 1;
          env.audio.play(b.note, { vel: 0.6, bloop: true, pan: panFor(x, env.w) });
          return;
        }
      }
      if (slider.x1 > 0 && x > slider.x0 - 40 && x < slider.x1 + 40 && Math.abs(y - slider.y) < 44) {
        slider.holder = id;
        this.move(id, x, y);
        return;
      }
      ripples.add(x, y, env.palette.soft[1]);
      env.audio.play(1, { vel: 0.18, pan: panFor(x, env.w) });
    },
    move(id, x, y) {
      if (slider.holder === id) {
        slider.v = clamp((x - slider.x0) / (slider.x1 - slider.x0), 0, 1);
        const step = Math.round(slider.v * (steps - 1));
        if (step !== slider.step) {
          slider.step = step;
          slider.glow = 1;
          env.audio.play(2 + step, { vel: 0.45, pan: panFor(x, env.w) });
        }
        return;
      }
      const c = cables.find((o) => o.holder === id);
      if (!c) return;
      c.x = clamp(x + c.gdx, 30, env.w - 30);
      c.y = clamp(y + c.gdy, 40, env.h - 40);
    },
    up(id) {
      if (slider.holder === id) {
        slider.holder = null;
        return;
      }
      const c = cables.find((o) => o.holder === id);
      if (!c) return;
      c.holder = null;
      // nearest free socket within reach
      let best: Socket | null = null;
      let bd = 70;
      for (const s of sockets) {
        const d = dist(c.x, c.y - 30, s.x, s.y);
        if (d < bd && !cables.some((o) => o.socket === s)) { bd = d; best = s; }
      }
      if (best && (anySocket || best.color === c.color)) {
        c.socket = best;
        c.wiggle = 0.6;
        sparks.burst(best.x, best.y, c.color, 14, 200, 5);
        env.audio.arpeggio([c.note, c.note + 2, c.note + 4], 0.08, 0.55);
        checkComplete();
      } else if (best) {
        best.shake = 0.4; // "not this one" — the plug slides home
        env.audio.play(c.note - 4, { vel: 0.3 });
      } else {
        env.audio.play(c.note - 2, { vel: 0.2 });
      }
    },
    invite() {
      const c = cables.find((o) => !o.socket);
      if (c) c.wiggle = 0.9;
      const s = switches.find((o) => !o.on);
      if (s) s.anim = 0.35;
    },
  };
};
