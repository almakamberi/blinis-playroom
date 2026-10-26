import type { ThemeId } from './schema';

export interface Palette {
  id: ThemeId;
  name: string;
  bg: string;
  bg2: string;
  ink: string;
  soft: string[]; // six gentle colours for toys
  night: boolean;
}

export const THEMES: Record<ThemeId, Palette> = {
  sky: {
    id: 'sky', name: 'Sky', bg: '#EAF4FB', bg2: '#D5E9F6', ink: '#3B4A5A', night: false,
    soft: ['#8EC5E8', '#F7B7A3', '#A9DDB8', '#F9D98A', '#C9B6E4', '#F4A9C0'],
  },
  peach: {
    id: 'peach', name: 'Peach', bg: '#FDF0E7', bg2: '#F8DECD', ink: '#5A4038', night: false,
    soft: ['#F4A78B', '#F9D27A', '#9ED4C4', '#F2A7BC', '#B9C4F0', '#C6DEA0'],
  },
  mint: {
    id: 'mint', name: 'Mint', bg: '#EAF7F0', bg2: '#D2EDDE', ink: '#355247', night: false,
    soft: ['#86D1B0', '#F6C177', '#8FC3EA', '#F5A9A0', '#CDB5E8', '#E8DC85'],
  },
  lavender: {
    id: 'lavender', name: 'Lavender', bg: '#F3EEFA', bg2: '#E3D9F3', ink: '#46405A', night: false,
    soft: ['#B8A2E3', '#F5B3C8', '#93CDE6', '#F7D58C', '#A8DDBE', '#F3B394'],
  },
  night: {
    id: 'night', name: 'Night-calm', bg: '#29252F', bg2: '#35303D', ink: '#E9DDC9', night: true,
    soft: ['#C9A877', '#C08E8A', '#8AA89C', '#A193BB', '#CDB57E', '#8EA2BC'],
  },
};

export function applyThemeToDocument(p: Palette) {
  const r = document.documentElement.style;
  r.setProperty('--bg', p.bg);
  r.setProperty('--bg2', p.bg2);
  r.setProperty('--ink', p.ink);
  p.soft.forEach((c, i) => r.setProperty(`--c${i}`, c));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.bg);
}
