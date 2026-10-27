import { useEffect, useRef } from 'react';
import { audio } from '../audio/engine';
import type { Palette } from '../settings/themes';
import type { Toy, ToyEnv, ToyFactory } from './types';

const IDLE_MS = 30_000;
let lastTouch = performance.now();
window.addEventListener('pointerdown', () => (lastTouch = performance.now()), { capture: true, passive: true });

interface Props {
  factory: ToyFactory;
  palette: Palette;
  level: 0 | 1 | 2;
  active: boolean;
  photo?: string | null;
}

/**
 * Toys are designed for a phone-sized "logical" canvas. On tablets everything is
 * scaled up so toys stay big and chunky instead of small and far apart.
 */
export const uiScale = (w: number, h: number) => Math.min(1.7, Math.max(1, Math.min(w, h) / 470));

/** Cap the backing-store size so big tablets keep a smooth 60 fps. */
const MAX_PIXELS = 3_600_000;

/**
 * Hosts one toy on a canvas: handles DPR, resizing, the animation loop (only
 * while the room is on screen), multi-touch pointers and the idle invitation.
 */
export function ToyCanvas({ factory, palette, level, active, photo = null }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const startRef = useRef<() => void>(() => {});
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    const env: ToyEnv = { w: 1, h: 1, palette, level, audio, photo };
    let k = 1;
    let toy: Toy | null = null;
    let raf = 0;
    let last = 0;
    let t = 0;
    let lastInvite = 0;

    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_PIXELS / (w * h)));
      k = uiScale(w, h);
      env.w = w / k;
      env.h = h / k;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
      if (!toy) toy = factory(ctx, env);
      toy.resize();
      toy.frame(0, t); // draw immediately so sliding rooms are never blank
    };

    const loop = (ms: number) => {
      raf = 0;
      if (!activeRef.current || !toy) return;
      const dt = last ? Math.min(0.05, (ms - last) / 1000) : 0;
      last = ms;
      t += dt;
      const idle = performance.now() - lastTouch;
      if (idle > IDLE_MS && performance.now() - lastInvite > IDLE_MS) {
        lastInvite = performance.now();
        toy.invite();
      }
      toy.frame(dt, t);
      raf = requestAnimationFrame(loop);
    };
    startRef.current = () => {
      if (!raf && activeRef.current) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    startRef.current();

    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) / k, (e.clientY - r.top) / k] as const;
    };
    const onDown = (e: PointerEvent) => {
      if (!toy) return;
      e.preventDefault();
      audio.unlock();
      canvas.setPointerCapture(e.pointerId);
      toy.down(e.pointerId, ...pos(e));
    };
    const onMove = (e: PointerEvent) => {
      if (!toy) return;
      // Coalesced events give smoother paint strokes on fast fingers.
      const evs = e.getCoalescedEvents?.() ?? [e];
      for (const ev of evs.length ? evs : [e]) toy.move(e.pointerId, ...pos(ev));
    };
    const onUp = (e: PointerEvent) => toy?.up(e.pointerId, ...pos(e));

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      raf = 0;
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [factory, palette, level, photo]);

  useEffect(() => {
    if (active) startRef.current();
  }, [active]);

  return <canvas ref={canvasRef} className="toy-canvas" />;
}
