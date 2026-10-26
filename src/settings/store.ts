import { useSyncExternalStore } from 'react';
import { defaultSettings, sanitize, type Settings } from './schema';
import { absoluteUrl, PLAYROOM_URL } from '../paths';

const KEY = 'blini.settings.v1';
const UNLOCK_KEY = 'blini.unlocked';

const listeners = new Set<() => void>();

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? sanitize(JSON.parse(raw)) : defaultSettings();
  } catch {
    return defaultSettings();
  }
}

let current: Settings = read();

function emit() {
  for (const l of listeners) l();
}

export function getSettings(): Settings {
  return current;
}

export function setSettings(next: Settings) {
  current = sanitize(next);
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Storage full or blocked: keep the settings for this session only.
  }
  emit();
}

export function updateSettings(fn: (s: Settings) => Settings) {
  setSettings(fn(structuredClone(current)));
}

export function resetSettings() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  current = defaultSettings();
  emit();
}

// Keep Parent Corner and Playroom in sync when both are open in different tabs.
window.addEventListener('storage', (e) => {
  if (e.key === KEY || e.key === null) {
    current = read();
    emit();
  }
});

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings);
}

/* ---------- Family code unlock (per device) ---------- */

export function isUnlocked(s: Settings): boolean {
  if (s.access.mode !== 'family') return true;
  try {
    return localStorage.getItem(UNLOCK_KEY) === s.access.codeHash;
  } catch {
    return false;
  }
}

export function markUnlocked(hash: string) {
  try {
    localStorage.setItem(UNLOCK_KEY, hash);
  } catch {}
}

/* ---------- Setup links: /?s=<base64url(JSON)> ---------- */

function toB64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(b64: string) {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Everything except personal data (name and photo stay on this device). */
export function encodeSetup(s: Settings): string {
  const { childName: _n, photo: _p, ...shareable } = s;
  return toB64Url(JSON.stringify(shareable));
}

export function setupLink(s: Settings): string {
  return `${absoluteUrl(PLAYROOM_URL)}?s=${encodeSetup(s)}`;
}

/** If the URL carries a setup link, apply it (keeping local name/photo) and clean the URL. */
export function applySetupFromUrl() {
  const params = new URLSearchParams(location.search);
  const s = params.get('s');
  if (!s) return;
  try {
    const incoming = JSON.parse(fromB64Url(s));
    const local = getSettings();
    setSettings(sanitize({ ...incoming, childName: local.childName, photo: local.photo }));
  } catch {
    // Ignore broken links and keep the current setup.
  }
  params.delete('s');
  const qs = params.toString();
  history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : '') + location.hash);
}
