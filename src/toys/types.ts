import type { Palette } from '../settings/themes';
import type { audio } from '../audio/engine';

export interface ToyEnv {
  /** Logical canvas size (CSS pixels, divided by the tablet scale); updated before resize(). */
  w: number;
  h: number;
  palette: Palette;
  /** 0 = baby, 1 = toddler, 2 = little kid */
  level: 0 | 1 | 2;
  audio: typeof audio;
  /** The child's photo from Parent Corner, if one was added (never leaves the device). */
  photo: string | null;
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
