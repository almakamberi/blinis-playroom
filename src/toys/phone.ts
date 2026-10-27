import type { ToyFactory } from './types';
import { bodyColour, drawAnimal, speak, type AnimalKind } from './animals';
import { dist, drawFace, pick, rand, Sparks, withAlpha } from './util';

type Contact = AnimalKind | 'me';
type Screen = 'home' | 'keypad' | 'calling' | 'call';
interface Rect { x: number; y: number; w: number; h: number }

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '★', '0', '#'];

/** Phone Call: ring a friend, they answer on a video call and chat in their own little tune. */
export const phoneCall: ToyFactory = (ctx, env) => {
  const contacts: Contact[] = (
    [['blini', 'cat', 'puppy'], ['blini', 'cat', 'puppy', 'duck', 'cow'], ['blini', 'cat', 'puppy', 'duck', 'cow', 'owl']] as Contact[][]
  )[env.level].slice();
  if (env.photo) contacts.splice(Math.min(contacts.length, 3), 0, 'me');
  const hasKeypad = env.level >= 1;
  let photo: HTMLImageElement | null = null;
  if (env.photo) { photo = new Image(); photo.src = env.photo; }

  let phone: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let screen: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let view: Screen = 'home';
  let who: Contact = 'blini';
  let callStart = 0, talkUntil = 0, bounce = 0, nextChat = 0, digits = '', keyPress = -1, keyGlow = 0;
  let hearts: { x: number; y: number; life: number }[] = [];
  let now = 0;
  const sparks = new Sparks();
  const ink = '#3B3340';

  function layout() {
    const portrait = env.h > env.w * 1.1;
    if (portrait) {
      phone = { x: 36, y: 100, w: env.w - 72, h: env.h - 200 };
    } else {
      const h = env.h - 24, w = Math.min(h * 0.62, env.w - 260);
      phone = { x: env.w / 2 - w / 2, y: 12, w, h };
    }
    screen = { x: phone.x + 14, y: phone.y + 44, w: phone.w - 28, h: phone.h - 96 };
  }

  /* ---------- layout helpers per screen ---------- */

  function contactCells() {
    const cols = 2;
    const rows = Math.ceil(contacts.length / cols) + (hasKeypad ? 0.6 : 0);
    const cw = screen.w / cols, ch = screen.h / Math.max(rows, 2.5);
    const r = Math.min(cw, ch) * 0.38;
    return contacts.map((c, i) => ({
      c, r,
      x: screen.x + cw * ((i % cols) + 0.5),
      y: screen.y + 16 + ch * (Math.floor(i / cols) + 0.5),
    }));
  }
  const keypadBtn = () => ({ x: screen.x + screen.w / 2, y: screen.y + screen.h - Math.min(56, screen.w * 0.14), r: Math.min(40, screen.w * 0.11) });
  const hangBtn = () => ({ x: screen.x + screen.w / 2, y: screen.y + screen.h - Math.min(60, screen.w * 0.16), r: Math.min(44, screen.w * 0.13) });
  function keyCells() {
    const top = screen.y + screen.h * 0.2, bottom = screen.y + screen.h - screen.h * 0.2;
    const cw = screen.w / 3, ch = (bottom - top) / 4;
    const r = Math.min(cw, ch) * 0.38;
    return KEYS.map((k, i) => ({ k, i, r, x: screen.x + cw * ((i % 3) + 0.5), y: top + ch * (Math.floor(i / 3) + 0.5) }));
  }
  const callBtn = () => ({ x: screen.x + screen.w / 2, y: screen.y + screen.h - screen.h * 0.09, r: Math.min(38, screen.w * 0.11) });
  const backBtn = () => ({ x: screen.x + 34, y: screen.y + 30, r: 24 });

  /* ---------- drawing ---------- */

  function avatar(c: Contact, x: number, y: number, r: number, opts: { talk?: number; happy?: boolean } = {}) {
    ctx.fillStyle = c === 'me' ? '#FFF4DE' : withAlpha(bodyColour(c), 0.35);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    if (c === 'me') {
      if (photo && photo.complete && photo.naturalWidth) ctx.drawImage(photo, x - r, y - r, r * 2, r * 2);
      else { ctx.fillStyle = '#F6C978'; ctx.fillRect(x - r, y - r, r * 2, r * 2); drawFace(ctx, x, y, r * 1.4, '#4A3A2A', { happy: true }); }
    } else {
      drawAnimal(ctx, c, x, y + r * 0.15, r * 1.6, now, opts);
    }
    ctx.restore();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  }

  function handset(x: number, y: number, s: number, colour: string, down = false) {
    ctx.fillStyle = colour;
    ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(down ? Math.PI * 0.75 : -Math.PI * 0.25);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.roundRect(-s * 0.5, -s * 0.14, s, s * 0.28, s * 0.14); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-s * 0.55, -s * 0.3, s * 0.28, s * 0.4, s * 0.1); ctx.fill();
    ctx.beginPath(); ctx.roundRect(s * 0.27, -s * 0.3, s * 0.28, s * 0.4, s * 0.1); ctx.fill();
    ctx.restore();
  }

  function drawHome() {
    for (const cell of contactCells()) avatar(cell.c, cell.x, cell.y, cell.r, { happy: cell.c === who && bounce > 0 });
    if (hasKeypad) {
      const k = keypadBtn();
      ctx.fillStyle = '#6CC17A';
      ctx.beginPath(); ctx.arc(k.x, k.y, k.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(k.x + ((i % 3) - 1) * k.r * 0.38, k.y + (Math.floor(i / 3) - 1) * k.r * 0.38, k.r * 0.1, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  function drawKeypad() {
    // the number display
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.roundRect(screen.x + 70, screen.y + 12, screen.w - 90, screen.h * 0.11, 12); ctx.fill();
    ctx.fillStyle = ink;
    ctx.font = `800 ${Math.round(screen.h * 0.065)}px "Nunito Variable", Nunito, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(digits, screen.x + 70 + (screen.w - 90) / 2, screen.y + 12 + screen.h * 0.055);
    for (const c of keyCells()) {
      const pressed = keyPress === c.i ? keyGlow : 0;
      ctx.fillStyle = pressed > 0 ? withAlpha(['#E8676B', '#5FAFE0', '#F2C14E', '#6CC17A', '#B8A2E3'][c.i % 5], 0.6 + pressed * 0.4) : '#FFFFFF';
      ctx.beginPath(); ctx.arc(c.x, c.y + pressed * 2, c.r * (1 + pressed * 0.08), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ink;
      ctx.font = `800 ${Math.round(c.r * 0.9)}px "Nunito Variable", Nunito, sans-serif`;
      ctx.fillText(c.k, c.x, c.y + pressed * 2 + 2);
    }
    const b = callBtn();
    handset(b.x, b.y, b.r, '#6CC17A');
    const bk = backBtn();
    ctx.fillStyle = withAlpha(ink, 0.15);
    ctx.beginPath(); ctx.arc(bk.x, bk.y, bk.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bk.x + 6, bk.y - 10); ctx.lineTo(bk.x - 6, bk.y); ctx.lineTo(bk.x + 6, bk.y + 10); ctx.stroke();
  }

  function drawCalling() {
    const x = screen.x + screen.w / 2, y = screen.y + screen.h * 0.4;
    const r = Math.min(screen.w, screen.h) * 0.25;
    for (let k = 0; k < 3; k++) {
      const p = ((now - callStart) * 0.9 + k / 3) % 1;
      ctx.strokeStyle = withAlpha('#6CC17A', 1 - p); ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, y, r + p * r * 0.8, 0, Math.PI * 2); ctx.stroke();
    }
    avatar(who, x, y + Math.sin(now * 10) * 3, r);
    const h = hangBtn();
    handset(h.x, h.y, h.r, '#E8676B', true);
  }

  function drawCall() {
    // the friend fills the screen like a video call
    ctx.save();
    ctx.beginPath(); ctx.roundRect(screen.x, screen.y, screen.w, screen.h, 18); ctx.clip();
    ctx.fillStyle = who === 'me' ? '#FFF4DE' : withAlpha(bodyColour(who), 0.3);
    ctx.fillRect(screen.x, screen.y, screen.w, screen.h);
    const x = screen.x + screen.w / 2;
    const y = screen.y + screen.h * 0.44 - Math.sin(bounce * Math.PI) * 20;
    const s = Math.min(screen.w * 0.85, screen.h * 0.5);
    const talk = now < talkUntil ? Math.abs(Math.sin(now * 16)) : 0;
    if (who === 'me') {
      avatar('me', x, y, s * 0.45);
      for (let k = 0; k < 8; k++) {
        const a = now * 0.8 + (k * Math.PI) / 4;
        ctx.fillStyle = ['#E8676B', '#F2C14E', '#6CC17A', '#5FAFE0'][k % 4];
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, 6, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      drawAnimal(ctx, who, x, y, s, now, { talk, happy: bounce > 0.3 });
    }
    // little picture-in-picture of the child (or Blini) in the corner
    const pw = screen.w * 0.26, ph = pw * 1.25, px = screen.x + screen.w - pw - 12, py = screen.y + 12;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.roundRect(px - 3, py - 3, pw + 6, ph + 6, 12); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.clip();
    if (photo && photo.complete && photo.naturalWidth && who !== 'me') {
      const k = Math.max(pw / photo.naturalWidth, ph / photo.naturalHeight);
      ctx.drawImage(photo, px + pw / 2 - (photo.naturalWidth * k) / 2, py + ph / 2 - (photo.naturalHeight * k) / 2, photo.naturalWidth * k, photo.naturalHeight * k);
    } else {
      ctx.fillStyle = '#EAF4FB'; ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = '#F6C978'; ctx.beginPath(); ctx.arc(px + pw / 2, py + ph * 0.55, pw * 0.34, 0, Math.PI * 2); ctx.fill();
      drawFace(ctx, px + pw / 2, py + ph * 0.53, pw * 0.55, '#4A3A2A', { happy: true });
    }
    ctx.restore();
    for (const h of hearts) {
      ctx.globalAlpha = h.life;
      ctx.fillStyle = '#E8676B';
      ctx.beginPath();
      ctx.moveTo(h.x, h.y + 8);
      ctx.bezierCurveTo(h.x - 14, h.y - 2, h.x - 7, h.y - 13, h.x, h.y - 5);
      ctx.bezierCurveTo(h.x + 7, h.y - 13, h.x + 14, h.y - 2, h.x, h.y + 8);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    const h = hangBtn();
    handset(h.x, h.y, h.r, '#E8676B', true);
  }

  /* ---------- actions ---------- */

  function ring(c: Contact) {
    who = c;
    view = 'calling';
    callStart = now;
    for (let k = 0; k < 2; k++) {
      setTimeout(() => { if (view === 'calling') { env.audio.play(9, { vel: 0.4 }); setTimeout(() => env.audio.play(7, { vel: 0.4 }), 140); } }, k * 900);
    }
    setTimeout(() => { if (view === 'calling' && who === c) answer(); }, 2100);
  }

  function chat() {
    const voice: AnimalKind = who === 'me' ? 'blini' : who;
    talkUntil = now + speak((n, o) => env.audio.play(n, o), voice);
    bounce = 1;
    nextChat = now + rand(5, 8);
  }

  function answer() {
    view = 'call';
    env.audio.arpeggio([5, 9, 12], 0.07, 0.45);
    sparks.burst(screen.x + screen.w / 2, screen.y + screen.h * 0.44, '#FFFFFF', 12, 160, 4);
    setTimeout(chat, 350);
  }

  function hangUp() {
    view = 'home';
    talkUntil = 0;
    env.audio.arpeggio([9, 5, 2], 0.08, 0.35);
  }

  return {
    resize() { layout(); },
    frame(dt, t) {
      now = t;
      bounce = Math.max(0, bounce - dt * 1.5);
      keyGlow = Math.max(0, keyGlow - dt * 3);
      if (view === 'call' && t > nextChat) chat();
      for (const h of hearts) { h.life -= dt * 0.6; h.y -= dt * 60; h.x += Math.sin(h.y * 0.05) * 0.6; }
      hearts = hearts.filter((h) => h.life > 0);

      ctx.fillStyle = env.palette.bg;
      ctx.fillRect(0, 0, env.w, env.h);
      // a soft desk with a plant and a mug, for tablets where there's room around the phone
      ctx.fillStyle = env.palette.bg2;
      ctx.fillRect(0, env.h * 0.72, env.w, env.h);
      if (phone.x > 160) {
        const mx = phone.x / 2, my = env.h * 0.72;
        ctx.fillStyle = '#E8676B'; ctx.beginPath(); ctx.roundRect(mx - 26, my - 50, 52, 54, 10); ctx.fill();
        ctx.strokeStyle = '#E8676B'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(mx + 28, my - 24, 13, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        const px = phone.x + phone.w + (env.w - phone.x - phone.w) / 2;
        ctx.fillStyle = '#C99A6B'; ctx.beginPath(); ctx.moveTo(px - 26, my - 44); ctx.lineTo(px + 26, my - 44); ctx.lineTo(px + 18, my + 4); ctx.lineTo(px - 18, my + 4); ctx.fill();
        ctx.fillStyle = '#6CC17A';
        for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(px + k * 10, my - 70 - Math.abs(k) * -6, 9, 26, k * 0.3 + Math.sin(t + k) * 0.05, 0, Math.PI * 2); ctx.fill(); }
      }
      // phone body
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.roundRect(phone.x + 6, phone.y + 10, phone.w, phone.h, 40); ctx.fill();
      ctx.fillStyle = '#5FAFE0';
      ctx.beginPath(); ctx.roundRect(phone.x, phone.y, phone.w, phone.h, 40); ctx.fill();
      ctx.fillStyle = '#3B3340';
      ctx.beginPath(); ctx.roundRect(phone.x + phone.w / 2 - 30, phone.y + 18, 60, 10, 5); ctx.fill();
      ctx.fillStyle = '#EAF4FB';
      ctx.beginPath(); ctx.roundRect(screen.x, screen.y, screen.w, screen.h, 18); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(phone.x + phone.w / 2, phone.y + phone.h - 26, 14, 0, Math.PI * 2); ctx.fill();
      if (view === 'home') drawHome();
      else if (view === 'keypad') drawKeypad();
      else if (view === 'calling') drawCalling();
      else drawCall();
      sparks.draw(ctx, dt);
    },
    down(_id, x, y) {
      // the round home button under the screen always goes home
      if (dist(x, y, phone.x + phone.w / 2, phone.y + phone.h - 26) < 26) {
        if (view !== 'home') hangUp(); else env.audio.play(5, { vel: 0.3 });
        return;
      }
      if (view === 'home') {
        for (const cell of contactCells()) {
          if (dist(x, y, cell.x, cell.y) < cell.r + 8) {
            sparks.burst(cell.x, cell.y, cell.c === 'me' ? '#F2C14E' : bodyColour(cell.c), 8, 100, 4);
            return ring(cell.c);
          }
        }
        if (hasKeypad) {
          const k = keypadBtn();
          if (dist(x, y, k.x, k.y) < k.r + 8) { view = 'keypad'; digits = ''; env.audio.arpeggio([7, 9], 0.06, 0.35); return; }
        }
      } else if (view === 'keypad') {
        const bk = backBtn();
        if (dist(x, y, bk.x, bk.y) < bk.r + 8) { view = 'home'; env.audio.play(4, { vel: 0.3 }); return; }
        const b = callBtn();
        if (dist(x, y, b.x, b.y) < b.r + 8) {
          const friends = contacts.filter((c) => c !== 'me');
          return ring(pick(friends));
        }
        for (const c of keyCells()) {
          if (dist(x, y, c.x, c.y) < c.r + 6) {
            keyPress = c.i; keyGlow = 1;
            digits = (digits + c.k).slice(-8);
            env.audio.play(c.i, { vel: 0.45 });
            return;
          }
        }
      } else {
        const h = hangBtn();
        if (dist(x, y, h.x, h.y) < h.r + 10) return hangUp();
        if (view === 'call') {
          // tap the friend: they giggle and send hearts
          bounce = 1;
          for (let k = 0; k < 4; k++) hearts.push({ x: x + rand(-30, 30), y: y + rand(-10, 10), life: 1 });
          env.audio.arpeggio([9, 12, 14, 12], 0.07, 0.4);
          if (now > talkUntil) setTimeout(chat, 400);
          return;
        }
      }
      sparks.burst(x, y, env.palette.soft[2], 5, 60, 3);
      env.audio.play(2, { vel: 0.15 });
    },
    move() {},
    up() {},
    invite() {
      if (view === 'home') { bounce = 1; who = pick(contacts); }
      else if (view === 'call') chat();
    },
  };
};
