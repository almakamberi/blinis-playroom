import { drawFace, withAlpha } from './util';

/** A small cast of original animal friends, shared by Keys & Locks and Phone Call. */
export type AnimalKind = 'blini' | 'cat' | 'puppy' | 'owl' | 'duck' | 'cow' | 'bunny' | 'frog' | 'chick';

export const ANIMALS: AnimalKind[] = ['cat', 'puppy', 'owl', 'duck', 'cow', 'bunny', 'frog', 'chick'];

/** Each friend "talks" in a little pentatonic tune (note index, duration in seconds). */
export const VOICES: Record<AnimalKind, [number, number][]> = {
  blini: [[5, 0.15], [7, 0.15], [9, 0.15], [12, 0.35]],
  cat: [[12, 0.25], [10, 0.35], [12, 0.2], [14, 0.4]],
  puppy: [[3, 0.15], [3, 0.3], [5, 0.15], [3, 0.3]],
  owl: [[7, 0.4], [5, 0.25], [7, 0.5]],
  duck: [[9, 0.12], [9, 0.12], [9, 0.25], [7, 0.3]],
  cow: [[0, 0.6], [2, 0.6]],
  bunny: [[10, 0.1], [12, 0.1], [14, 0.1], [12, 0.1], [10, 0.25]],
  frog: [[2, 0.2], [0, 0.2], [2, 0.2], [0, 0.3]],
  chick: [[14, 0.08], [15, 0.08], [14, 0.08], [15, 0.08], [17, 0.25]],
};

const BODY: Record<AnimalKind, string> = {
  blini: '#F6C978', cat: '#F2A65A', puppy: '#C99A6B', owl: '#A58BC9', duck: '#F7D774',
  cow: '#FFFFFF', bunny: '#F4C4D4', frog: '#7CCB7A', chick: '#FBE27A',
};

export const bodyColour = (k: AnimalKind) => BODY[k];

/**
 * Draw a friend centred at (x, y), roughly `s` across.
 * `talk` 0..1 opens the mouth; `happy` turns the eyes into smiles.
 */
export function drawAnimal(
  ctx: CanvasRenderingContext2D,
  kind: AnimalKind,
  x: number,
  y: number,
  s: number,
  t: number,
  opts: { talk?: number; happy?: boolean; blink?: boolean } = {},
) {
  const ink = '#3B3340';
  const c = BODY[kind];
  const r = s * 0.42;
  ctx.save();
  // ears / extras behind the head
  ctx.fillStyle = c;
  switch (kind) {
    case 'cat':
      for (const sx of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(x + sx * r * 0.85, y - r * 0.25); ctx.lineTo(x + sx * r * 0.55, y - r * 1.15); ctx.lineTo(x + sx * r * 0.1, y - r * 0.75); ctx.fill();
      }
      break;
    case 'puppy':
      ctx.fillStyle = '#8F6A48';
      for (const sx of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(x + sx * r * 0.9, y + r * 0.05 + Math.sin(t * 3 + sx) * 2, r * 0.28, r * 0.55, sx * 0.3, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'owl':
      for (const sx of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(x + sx * r * 0.75, y - r * 0.5); ctx.lineTo(x + sx * r * 0.85, y - r * 1.1); ctx.lineTo(x + sx * r * 0.3, y - r * 0.8); ctx.fill();
      }
      break;
    case 'cow':
      ctx.fillStyle = '#E8D5B5';
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + sx * r * 0.75, y - r * 0.85, r * 0.12, r * 0.25, sx * -0.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#FFFFFF';
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + sx * r * 1.05, y - r * 0.35, r * 0.3, r * 0.15, sx * 0.4, 0, Math.PI * 2); ctx.fill(); }
      break;
    case 'bunny':
      for (const sx of [-1, 1]) {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.ellipse(x + sx * r * 0.4, y - r * 1.25, r * 0.22, r * 0.6, sx * 0.15 + Math.sin(t * 2 + sx) * 0.05, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#F7A9BE';
        ctx.beginPath(); ctx.ellipse(x + sx * r * 0.4, y - r * 1.2, r * 0.1, r * 0.4, sx * 0.15, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'frog':
      for (const sx of [-1, 1]) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + sx * r * 0.5, y - r * 0.75, r * 0.38, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'blini':
      ctx.strokeStyle = '#F3E2C4'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.bezierCurveTo(x - r * 0.25, y - r * 1.25, x + r * 0.25, y - r * 1.4, x, y - r * 1.65); ctx.stroke();
      break;
    default:
      break;
  }
  // head
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.95, 0, 0, Math.PI * 2); ctx.fill();
  if (kind === 'cow') {
    ctx.strokeStyle = withAlpha(ink, 0.12); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#3B3340';
    ctx.beginPath(); ctx.ellipse(x - r * 0.5, y - r * 0.45, r * 0.25, r * 0.2, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.55, y + r * 0.05, r * 0.18, r * 0.22, -0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.ellipse(x - r * 0.4, y - r * 0.5, r * 0.18, r * 0.1, -0.6, 0, Math.PI * 2); ctx.fill();

  // eyes
  const talk = opts.talk ?? 0;
  if (kind === 'owl') {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + sx * r * 0.38, y - r * 0.15, r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ink;
      if (opts.happy) { ctx.strokeStyle = ink; ctx.lineWidth = r * 0.08; ctx.beginPath(); ctx.arc(x + sx * r * 0.38, y - r * 0.1, r * 0.13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(x + sx * r * 0.38, y - r * 0.15, r * 0.13, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.fillStyle = '#F2A65A';
    ctx.beginPath(); ctx.moveTo(x - r * 0.1, y + r * 0.1); ctx.lineTo(x + r * 0.1, y + r * 0.1); ctx.lineTo(x, y + r * (0.3 + talk * 0.15)); ctx.fill();
  } else if (kind === 'duck' || kind === 'chick') {
    drawFace(ctx, x, y - r * 0.15, r * 1.6, ink, { happy: opts.happy, blink: opts.blink });
    ctx.fillStyle = '#F2A65A';
    const open = talk * r * 0.18;
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.2 - open / 2, r * (kind === 'duck' ? 0.38 : 0.18), r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.2 + open / 2, r * (kind === 'duck' ? 0.32 : 0.15), r * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    // generic friendly face with an opening mouth
    const ex = r * 0.36, ey = y - r * 0.12;
    ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineCap = 'round'; ctx.lineWidth = r * 0.08;
    for (const sx of [-1, 1]) {
      if (opts.happy) { ctx.beginPath(); ctx.arc(x + sx * ex, ey + r * 0.05, r * 0.12, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      else if (opts.blink) { ctx.beginPath(); ctx.moveTo(x + sx * ex - r * 0.1, ey); ctx.lineTo(x + sx * ex + r * 0.1, ey); ctx.stroke(); }
      else {
        ctx.beginPath(); ctx.arc(x + sx * ex, ey, r * 0.11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + sx * ex + r * 0.04, ey - r * 0.04, r * 0.035, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = ink;
      }
    }
    if (kind === 'cow') {
      ctx.fillStyle = '#F7B7C4';
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.45, r * 0.5, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ink;
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(x + sx * r * 0.2, y + r * 0.42, r * 0.06, 0, Math.PI * 2); ctx.fill(); }
    } else if (kind === 'puppy' || kind === 'cat' || kind === 'bunny') {
      ctx.fillStyle = kind === 'puppy' ? ink : '#F28FA0';
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.12, r * 0.1, r * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    }
    // mouth
    const my = y + r * (kind === 'cow' ? 0.68 : 0.32);
    if (talk > 0.1) {
      ctx.fillStyle = '#C2645E';
      ctx.beginPath(); ctx.ellipse(x, my, r * 0.14, r * 0.05 + talk * r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = ink; ctx.lineWidth = r * 0.07;
      ctx.beginPath(); ctx.arc(x, my - r * 0.08, r * 0.14, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    }
    if (kind === 'cat') {
      ctx.strokeStyle = withAlpha(ink, 0.5); ctx.lineWidth = 2;
      for (const sx of [-1, 1]) for (const dy of [-0.04, 0.06]) {
        ctx.beginPath(); ctx.moveTo(x + sx * r * 0.3, y + r * (0.15 + dy)); ctx.lineTo(x + sx * r * 0.85, y + r * (0.08 + dy * 2)); ctx.stroke();
      }
    }
    // cheeks
    ctx.fillStyle = 'rgba(244,140,150,0.35)';
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + sx * r * 0.6, y + r * 0.2, r * 0.13, r * 0.08, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  if (kind === 'chick') {
    ctx.fillStyle = '#F2A65A';
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.98, r * 0.08, r * 0.16, 0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Plays a friend's little tune; calls onNote with each note's duration so the mouth can move. */
export function speak(
  play: (note: number, opts: { vel: number }) => void,
  kind: AnimalKind,
  onNote?: (dur: number) => void,
) {
  let at = 0;
  for (const [n, d] of VOICES[kind]) {
    setTimeout(() => { play(n, { vel: 0.5 }); onNote?.(d); }, at * 1000);
    at += d;
  }
  return at;
}
