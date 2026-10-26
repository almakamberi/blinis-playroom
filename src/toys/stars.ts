import type { ToyFactory } from './types';
import { dist, drawFace, panFor, rand, Sparks } from './util';

interface Star { x: number; y: number; r: number; n: number; twinkle: number; phase: number; pulse: number }

/** Counting Stars: tap each star to light it up and count (1–3, 1–5, 1–10 by level). */
export const countingStars: ToyFactory = (ctx, env) => {
  const total = [3, 5, 10][env.level];
  let stars: Star[] = [];
  let count = 0;
  let bigNumber = { n: 0, life: 0 };
  let done = 0; // seconds since finishing, 0 = not finished
  const sparks = new Sparks();
  let dust: { x: number; y: number; r: number; p: number }[] = [];
  let now = 0;
  const top = env.palette.night ? '#1E1B26' : '#3E4573';
  const bottom = env.palette.night ? '#3A3043' : '#7A6FA6';

  function scatter() {
    const r = Math.min([62, 52, 42][env.level], Math.min(env.w, env.h) * 0.1);
    stars = [];
    let guard = 0;
    while (stars.length < total && guard++ < 2000) {
      const x = rand(r + 20, env.w - r - 20);
      const y = rand(r + 110, env.h - r - 110);
      if (stars.every((s) => dist(s.x, s.y, x, y) > r * 2.6)) stars.push({ x, y, r, n: 0, twinkle: 0, phase: rand(0, 6), pulse: 0 });
    }
    count = 0;
    done = 0;
  }

  function starPath(x: number, y: number, r: number) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.5;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  return {
    resize() {
      scatter();
      dust = Array.from({ length: 60 }, () => ({ x: rand(0, env.w), y: rand(0, env.h), r: rand(0.8, 2.2), p: rand(0, 6) }));
    },
    frame(dt, t) {
      now = t;
      bigNumber.life = Math.max(0, bigNumber.life - dt * 0.7);
      if (done > 0) {
        done += dt;
        if (done > 6) scatter();
      }
      const g = ctx.createLinearGradient(0, 0, 0, env.h);
      g.addColorStop(0, top);
      g.addColorStop(1, bottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, env.w, env.h);
      for (const d of dust) {
        ctx.fillStyle = `rgba(255,248,220,${0.3 + Math.sin(t * 1.5 + d.p) * 0.25})`;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
      }

      // constellation line once all are counted
      if (done > 0) {
        const ordered = stars.slice().sort((a, b) => a.n - b.n);
        const k = Math.min(1, done / 2) * (ordered.length - 1);
        ctx.strokeStyle = 'rgba(255,240,190,0.55)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ordered[0].x, ordered[0].y);
        for (let i = 1; i <= Math.ceil(k); i++) {
          const a = ordered[i - 1], b = ordered[i];
          const f = Math.min(1, k - (i - 1));
          ctx.lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
        }
        ctx.stroke();
      }

      for (const s of stars) {
        s.twinkle = Math.max(0, s.twinkle - dt * 1.5);
        s.pulse = Math.max(0, s.pulse - dt * 0.6);
        const lit = s.n > 0;
        const k = 1 + Math.sin(t * 2 + s.phase) * 0.04 + Math.sin(s.twinkle * Math.PI) * 0.25 + Math.sin(s.pulse * Math.PI * 3) * 0.12;
        if (lit) {
          ctx.fillStyle = 'rgba(255,230,150,0.18)';
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 1.6 * k, 0, Math.PI * 2); ctx.fill();
        }
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(Math.sin(t + s.phase) * 0.08 + s.twinkle * 0.6);
        ctx.fillStyle = lit ? '#FFD86E' : 'rgba(255,240,210,0.35)';
        ctx.strokeStyle = lit ? '#FFD86E' : 'rgba(255,240,210,0.7)';
        ctx.lineJoin = 'round';
        ctx.lineWidth = s.r * 0.15;
        starPath(0, 0, s.r * k);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        if (lit) {
          drawFace(ctx, s.x, s.y + s.r * 0.08, s.r * 0.9, '#6B4A1E', { happy: true });
          ctx.fillStyle = 'rgba(255,245,215,0.85)';
          ctx.font = `800 ${Math.round(s.r * 0.5)}px "Nunito Variable", Nunito, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(s.n), s.x, s.y + s.r * 1.35);
        }
      }

      if (bigNumber.life > 0) {
        ctx.globalAlpha = Math.min(1, bigNumber.life * 1.5) * 0.85;
        ctx.fillStyle = '#FFF1C9';
        const fs = Math.min(env.w, env.h) * (0.3 + (1 - bigNumber.life) * 0.05);
        ctx.font = `900 ${Math.round(fs)}px "Nunito Variable", Nunito, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(bigNumber.n), env.w / 2, env.h / 2);
        ctx.globalAlpha = 1;
      }
      sparks.draw(ctx, dt);
    },
    down(_id, x, y) {
      let best: Star | null = null;
      let bd = Infinity;
      for (const s of stars) {
        const d = dist(x, y, s.x, s.y);
        if (d < s.r * 1.3 && d < bd) { bd = d; best = s; }
      }
      if (!best) {
        sparks.burst(x, y, '#FFF1C9', 6, 70, 3);
        env.audio.play(12, { vel: 0.15, pan: panFor(x, env.w) });
        return;
      }
      best.twinkle = 1;
      if (best.n > 0 || done > 0) {
        env.audio.play(4 + best.n, { vel: 0.4, pan: panFor(x, env.w) });
        return;
      }
      count++;
      best.n = count;
      bigNumber = { n: count, life: 1 };
      sparks.burst(best.x, best.y, '#FFD86E', 12, 160, 5);
      env.audio.play(4 + count, { vel: 0.6, pan: panFor(x, env.w) });
      env.audio.speakNumber(count);
      if (count === total) {
        done = 0.001;
        setTimeout(() => env.audio.arpeggio([5, 7, 9, 10, 12, 14, 15], 0.14, 0.45), 900);
      }
    },
    move() {},
    up() {},
    invite() {
      const next = stars.find((s) => s.n === 0);
      if (next) next.pulse = 1;
    },
  };
};

