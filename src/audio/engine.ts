import type { SoundStyle } from '../settings/schema';

/**
 * Tiny synth: every note comes from one C-major pentatonic scale, so any
 * combination of taps sounds pleasant. Note index 0 = C4, 5 = C5, and so on.
 */
const PENTA = [0, 2, 4, 7, 9];
const BASE = 261.63;
const MAX_VOICES = 20;

export function noteFreq(i: number): number {
  const oct = Math.floor(i / 5);
  const deg = ((i % 5) + 5) % 5;
  return BASE * 2 ** ((oct * 12 + PENTA[deg]) / 12);
}

interface PlayOpts {
  vel?: number; // 0..1
  pan?: number; // -1..1
  bloop?: boolean; // little pitch drop, for pops
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = 0;
  private on = true;
  private volume = 0.7;
  private style: SoundStyle = 'marimba';
  private sleepy = false;
  private speech = { on: false, lang: 'en-GB' };

  configure(o: { on: boolean; volume: number; style: SoundStyle }) {
    this.on = o.on;
    this.volume = o.volume;
    this.style = o.style;
    this.applyGain();
  }

  configureVoice(v: { on: boolean; lang: string }) {
    this.speech = v;
  }

  /** Fade everything out (bedtime) or back in. */
  setSleepy(sleepy: boolean) {
    this.sleepy = sleepy;
    this.applyGain(3);
  }

  private applyGain(fade = 0.1) {
    if (!this.ctx || !this.master) return;
    const target = this.on && !this.sleepy ? this.volume * 0.55 : 0;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(target, now, fade / 3);
  }

  /** Must be called from a user gesture (first touch). Safe to call often. */
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx({ latencyHint: 'interactive' });
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 6;
      const soften = this.ctx.createBiquadFilter();
      soften.type = 'lowpass';
      soften.frequency.value = 5500;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(soften).connect(comp).connect(this.ctx.destination);
      this.applyGain();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  play(note: number, opts: PlayOpts = {}) {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.on || this.sleepy || this.voices >= MAX_VOICES) return;
    const vel = Math.max(0.05, Math.min(1, opts.vel ?? 0.6));
    const now = ctx.currentTime + 0.005;
    const f = noteFreq(note);

    const out = ctx.createGain();
    let dest: AudioNode = this.master;
    if (opts.pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, opts.pan)) * 0.6;
      p.connect(dest);
      dest = p;
    }
    out.connect(dest);

    // [frequency multiplier, level, decay seconds, wave]
    const partials: [number, number, number, OscillatorType][] =
      this.style === 'chimes'
        ? [[2, 1, 1.8, 'sine'], [5.52, 0.18, 0.7, 'sine'], [10.8, 0.05, 0.3, 'sine']]
        : this.style === 'musicbox'
          ? [[2, 1, 1.1, 'triangle'], [4, 0.2, 0.5, 'sine'], [8, 0.05, 0.2, 'sine']]
          : [[1, 1, 0.7, 'sine'], [4, 0.22, 0.1, 'sine'], [10, 0.04, 0.03, 'sine']];

    let longest = 0;
    for (const [mul, level, decay, wave] of partials) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(f * mul, now);
      if (opts.bloop) {
        osc.frequency.setValueAtTime(f * mul * 1.5, now);
        osc.frequency.exponentialRampToValueAtTime(f * mul, now + 0.08);
      }
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(level * vel * 0.4, now + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      osc.connect(g).connect(out);
      osc.start(now);
      osc.stop(now + decay + 0.05);
      longest = Math.max(longest, decay);
    }
    this.voices++;
    setTimeout(() => {
      this.voices--;
      out.disconnect();
    }, (longest + 0.1) * 1000);
  }

  /** Gentle arpeggio, for little celebrations. */
  arpeggio(notes: number[], gap = 0.12, vel = 0.5) {
    notes.forEach((n, i) => setTimeout(() => this.play(n, { vel }), i * gap * 1000));
  }

  speakNumber(n: number) {
    if (!this.speech.on || !this.on || this.sleepy || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(String(n));
    u.lang = this.speech.lang;
    u.rate = 0.8;
    u.pitch = 1.2;
    u.volume = Math.min(1, this.volume);
    const voice = speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith(this.speech.lang.slice(0, 2)));
    if (voice) u.voice = voice;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
}

export const audio = new AudioEngine();
