// The app can live at the site root (Netlify, Vercel, Cloudflare) or in a
// subfolder (GitHub Pages: /blinis-playroom/). Vite's BASE_URL always ends in "/".
export const BASE = import.meta.env.BASE_URL;
export const PLAYROOM_URL = BASE;
export const PARENT_URL = `${BASE}parent/`;
export const absoluteUrl = (path: string) => new URL(path, location.origin).href;
export const isParentPath = () => location.pathname.startsWith(PARENT_URL.replace(/\/$/, ''));
