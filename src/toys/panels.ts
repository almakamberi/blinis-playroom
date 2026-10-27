import type { Palette } from '../settings/themes';
import type { ToyEnv, ToyFactory } from './types';
import { panFor, Ripples, Sparks, withAlpha } from './util';

/**
 * Shared engine for "board" toys (Home Gadgets, Kitchen, Little Mechanic):
 * a grid of wooden panels, each holding one self-contained gadget.
 */

export interface Rect { x: number; y: number; w: number; h: number }

/** One gadget lives in one panel of the board and handles its own touches. */
export interface Gadget {
  frame(dt: number, t: number): void;
  down(id: number, x: number, y: number): void;
  move(id: number, x: number, y: number): void;
  up(id: number, x: number, y: number): void;
  invite(): void;
}

export interface Kit {
  ctx: CanvasRenderingContext2D;
  env: ToyEnv;
  r: Rect;
  ink: string;
  sparks: Sparks;
  p: Palette;
}

export const cx = (r: Rect) => r.x + r.w / 2;
export const cy = (r: Rect) => r.y + r.h / 2;
export const size = (r: Rect) => Math.min(r.w, r.h);

/** A gadget that only reacts to taps. */
export const tapOnly = (g: Pick<Gadget, 'frame' | 'invite'> & { tap(x: number, y: number): void }): Gadget => ({
  frame: g.frame,
  invite: g.invite,
  down: (_id, x, y) => g.tap(x, y),
  move() {},
  up() {},
});

/**
 * Builds a board toy. `kindsByLevel` lists which gadgets appear at Baby,
 * Toddler and Little kid level (3, 4 or 6 panels lay out best).
 */
export function makePanelBoard<K extends string>(
  kindsByLevel: [K[], K[], K[]],
  make: (kind: K, kit: Kit, level: 0 | 1 | 2) => Gadget,
): ToyFactory {
  return (ctx, env) => {
    const kinds = kindsByLevel[env.level];
    let cells: { r: Rect; g: Gadget }[] = [];
    const owner = new Map<number, Gadget>();
    const sparks = new Sparks();
    const ripples = new Ripples();
    const ink = env.palette.night ? '#2A2530' : '#3B3340';

    function layout() {
      const n = kinds.length;
      const portrait = env.h > env.w * 1.1;
      // keep clear of the corner bubbles: above/below in portrait, beside in landscape
      const top = portrait ? 104 : 14, side = portrait ? 16 : 104;
      const W = env.w - side * 2, H = env.h - top * 2;
      const cols = portrait ? (n <= 3 ? 1 : 2) : n === 6 ? 3 : n;
      const rows = Math.ceil(n / cols);
      const gap = 10;
      const cw = (W - gap * (cols - 1)) / cols, ch = (H - gap * (rows - 1)) / rows;
      owner.clear();
      cells = kinds.map((k, i) => {
        const r: Rect = { x: side + (i % cols) * (cw + gap), y: top + Math.floor(i / cols) * (ch + gap), w: cw, h: ch };
        return { r, g: make(k, { ctx, env, r, ink, sparks, p: env.palette }, env.level) };
      });
    }

    const at = (x: number, y: number) => cells.find(({ r }) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);

    return {
      resize() { layout(); },
      frame(dt, t) {
        ctx.fillStyle = env.palette.bg;
        ctx.fillRect(0, 0, env.w, env.h);
        for (const { r, g } of cells) {
          ctx.fillStyle = env.palette.night ? '#3C342E' : '#D9BC91';
          ctx.beginPath(); ctx.roundRect(r.x, r.y + 5, r.w, r.h, 22); ctx.fill();
          ctx.fillStyle = env.palette.night ? '#4A4038' : '#EBD3AE';
          ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 22); ctx.fill();
          ctx.fillStyle = withAlpha(ink, 0.2);
          for (const [sx, sy] of [[r.x + 14, r.y + 14], [r.x + r.w - 14, r.y + 14], [r.x + 14, r.y + r.h - 14], [r.x + r.w - 14, r.y + r.h - 14]]) {
            ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
          }
          ctx.save();
          ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 22); ctx.clip();
          g.frame(dt, t);
          ctx.restore();
        }
        sparks.draw(ctx, dt);
        ripples.draw(ctx, dt);
      },
      down(id, x, y) {
        const c = at(x, y);
        if (!c) {
          ripples.add(x, y, env.palette.soft[2]);
          env.audio.play(1, { vel: 0.18, pan: panFor(x, env.w) });
          return;
        }
        owner.set(id, c.g);
        c.g.down(id, x, y);
      },
      move(id, x, y) { owner.get(id)?.move(id, x, y); },
      up(id, x, y) {
        owner.get(id)?.up(id, x, y);
        owner.delete(id);
      },
      invite() {
        cells[Math.floor(Math.random() * cells.length)]?.g.invite();
      },
    };
  };
}
