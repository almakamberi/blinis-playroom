import type { Palette } from '../settings/themes';
import type { audio } from '../audio/engine';

export interface ToyEnv {
  /** Canvas size in CSS pixels; updated before resize() is called. */
  w: number;
  h: number;
  palette: Palette;
  /** 0 = baby, 1 = toddler, 2 = little kid */
  level: 0 | 1 | 2;
  audio: typeof audio;
}

export interface Toy {
  resize(): void;
  /** dt in seconds (clamped), t in seconds since the toy started. Draws a frame. */
  frame(dt: number, t: number): void;
  down(id: number, x: number, y: number): void;
  move(id: number, x: number, y: number): void;
  up(id: number, x: number, y: number): void;
  /** Called after ~30 s without touches: a tiny, quiet "come play" animation. */
  invite(): void;
}

export type ToyFactory = (ctx: CanvasRenderingContext2D, env: ToyEnv) => Toy;
