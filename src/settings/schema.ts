export type ToyId = 'bubbles' | 'blobs' | 'paint' | 'shapes' | 'garden' | 'stars' | 'busy' | 'plugs' | 'gadgets' | 'kitchen' | 'mechanic'
  | 'locks' | 'laundry' | 'town' | 'tools' | 'remote' | 'phone';
export type Level = 'baby' | 'toddler' | 'little';
export type ThemeId = 'sky' | 'peach' | 'mint' | 'lavender' | 'night';
export type SoundStyle = 'chimes' | 'marimba' | 'musicbox';
export type AccessMode = 'everyone' | 'family';

export interface ToySetting {
  id: ToyId;
  on: boolean;
  level: Level | 'auto';
}

export interface Settings {
  v: 1;
  childName: string;
  photo: string | null;
  theme: ThemeId;
  age: Level;
  toys: ToySetting[];
  sound: { on: boolean; volume: number; style: SoundStyle };
  voice: { on: boolean; lang: string };
  time: { on: boolean; minutes: number };
  access: { mode: AccessMode; codeHash: string | null };
}

export const TOYS: { id: ToyId; name: string; blurb: string; accent: string }[] = [
  { id: 'bubbles', name: 'Bubble Pop', blurb: 'Tap bubbles to pop them. Hold to blow a new one.', accent: '#7FC4EC' },
  { id: 'blobs', name: 'Blob Band', blurb: 'Each blob sings a note. Drag them to change the song.', accent: '#F49AB4' },
  { id: 'paint', name: 'Splash of Colour', blurb: 'Glowing finger paint that slowly drifts and fades.', accent: '#F6B26B' },
  { id: 'shapes', name: 'Shape Friends', blurb: 'Drag shapes into their matching holes.', accent: '#8FCB9B' },
  { id: 'garden', name: 'Little Garden', blurb: 'Tap to plant seeds. Flowers grow and visitors come.', accent: '#A6D36F' },
  { id: 'stars', name: 'Counting Stars', blurb: 'Tap stars to light them up and count.', accent: '#F7D774' },
  { id: 'busy', name: 'Busy Board', blurb: 'Plug cables into sockets, flip light switches, press buttons and slide.', accent: '#F2A65A' },
  { id: 'plugs', name: 'Plug It In', blurb: 'Plug a lamp, fan, radio, toaster, phone and TV into a power strip and watch them work.', accent: '#F2C14E' },
  { id: 'kitchen', name: 'Kitchen', blurb: 'Cooker knobs, a bubbling pot, fridge, washing machine, microwave, kettle and blender.', accent: '#F4A9C0' },
  { id: 'mechanic', name: 'Little Mechanic', blurb: 'Horn, headlights, wipers, pump up a tyre, fill up with fuel, start the engine, unscrew wheel bolts.', accent: '#E8676B' },
  { id: 'locks', name: 'Keys & Locks', blurb: 'Little doors with padlocks. The right key opens each one and an animal friend says hello.', accent: '#B8A2E3' },
  { id: 'laundry', name: 'Laundry Day', blurb: 'Peg wet clothes on the line; the sun dries them, a cloud brings rain, a bird visits.', accent: '#5FAFE0' },
  { id: 'town', name: 'Town Road', blurb: 'Send vehicles out of the garage, work the traffic light, help ducks cross, wash the cars.', accent: '#6CC17A' },
  { id: 'tools', name: 'Tool Bench', blurb: 'Hammer nails, drill a hole for a picture, paint the fence, saw a plank, screw and measure.', accent: '#C99A6B' },
  { id: 'remote', name: 'Remote Control', blurb: 'Big remote buttons switch the TV channels, lamp, curtains, music and a robot vacuum.', accent: '#E8676B' },
  { id: 'phone', name: 'Phone Call', blurb: 'Ring an animal friend for a video call; dial with musical number keys.', accent: '#5FAFE0' },
  { id: 'gadgets', name: 'Home Gadgets', blurb: 'Doorbell, a door with a bolt, a water tap, padlock and key, a dial and a zipper.', accent: '#E8676B' },
];

export const LEVELS: { id: Level; name: string; ages: string }[] = [
  { id: 'baby', name: 'Baby', ages: '1–2' },
  { id: 'toddler', name: 'Toddler', ages: '2–3' },
  { id: 'little', name: 'Little kid', ages: '3–5' },
];

export const VOICE_LANGS: { id: string; name: string }[] = [
  { id: 'en-GB', name: 'English (UK)' },
  { id: 'en-US', name: 'English (US)' },
  { id: 'sq-AL', name: 'Shqip' },
  { id: 'de-DE', name: 'Deutsch' },
  { id: 'fr-FR', name: 'Français' },
  { id: 'es-ES', name: 'Español' },
  { id: 'it-IT', name: 'Italiano' },
  { id: 'nl-NL', name: 'Nederlands' },
  { id: 'pl-PL', name: 'Polski' },
  { id: 'pt-PT', name: 'Português' },
  { id: 'tr-TR', name: 'Türkçe' },
  { id: 'uk-UA', name: 'Українська' },
];

export function defaultSettings(): Settings {
  return {
    v: 1,
    childName: '',
    photo: null,
    theme: 'sky',
    age: 'toddler',
    toys: TOYS.map((t) => ({ id: t.id, on: true, level: 'auto' })),
    sound: { on: true, volume: 0.7, style: 'marimba' },
    voice: { on: false, lang: 'en-GB' },
    time: { on: false, minutes: 20 },
    access: { mode: 'everyone', codeHash: null },
  };
}

const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;

const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const TOY_IDS = TOYS.map((t) => t.id);
const LEVEL_IDS: Level[] = ['baby', 'toddler', 'little'];

/** Merge untrusted input (localStorage, setup links) into a valid Settings object. */
export function sanitize(input: unknown): Settings {
  const d = defaultSettings();
  const s = obj(input);
  const sound = obj(s.sound);
  const voice = obj(s.voice);
  const time = obj(s.time);
  const access = obj(s.access);

  const seen = new Set<ToyId>();
  const toys: ToySetting[] = [];
  if (Array.isArray(s.toys)) {
    for (const raw of s.toys) {
      const t = obj(raw);
      const id = oneOf(t.id, TOY_IDS, 'bubbles');
      if (t.id !== id || seen.has(id)) continue;
      seen.add(id);
      toys.push({ id, on: bool(t.on, true), level: oneOf(t.level, [...LEVEL_IDS, 'auto'] as const, 'auto') });
    }
  }
  // Toys added in later versions show up at the end, switched on.
  for (const t of d.toys) if (!seen.has(t.id)) toys.push(t);

  const photo = typeof s.photo === 'string' && s.photo.startsWith('data:image/') && s.photo.length < 400_000 ? s.photo : null;
  const codeHash = typeof access.codeHash === 'string' && /^[0-9a-f]{8,32}$/.test(access.codeHash) ? access.codeHash : null;
  const mode = oneOf(access.mode, ['everyone', 'family'] as const, 'everyone');

  return {
    v: 1,
    childName: typeof s.childName === 'string' ? s.childName.slice(0, 40) : d.childName,
    photo,
    theme: oneOf(s.theme, ['sky', 'peach', 'mint', 'lavender', 'night'] as const, d.theme),
    age: oneOf(s.age, LEVEL_IDS, d.age),
    toys,
    sound: {
      on: bool(sound.on, d.sound.on),
      volume: num(sound.volume, 0, 1, d.sound.volume),
      style: oneOf(sound.style, ['chimes', 'marimba', 'musicbox'] as const, d.sound.style),
    },
    voice: {
      on: bool(voice.on, d.voice.on),
      lang: typeof voice.lang === 'string' && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(voice.lang) ? voice.lang : d.voice.lang,
    },
    time: { on: bool(time.on, d.time.on), minutes: Math.round(num(time.minutes, 5, 120, d.time.minutes)) },
    // Family mode without a code would lock everyone out, so fall back to open.
    access: { mode: mode === 'family' && codeHash ? 'family' : 'everyone', codeHash },
  };
}

export function levelFor(settings: Settings, id: ToyId): Level {
  const t = settings.toys.find((x) => x.id === id);
  return !t || t.level === 'auto' ? settings.age : t.level;
}

/**
 * Small non-cryptographic hash (cyrb53) for the family code. It is only a
 * light "keep casual visitors out" lock — there is no server in v1.
 */
export function hashCode(code: string): string {
  const str = 'blini:' + code.trim();
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ((h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0'));
}
