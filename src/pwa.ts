// Capture Chrome's install prompt as early as possible so Parent Corner can offer it.
// It is never shown inside the playroom.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as BeforeInstallPromptEvent;
  listeners.forEach((l) => l());
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  listeners.forEach((l) => l());
});

export const canInstall = () => deferred !== null;
export const isStandalone = () => matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;

export function onInstallChange(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export async function promptInstall() {
  if (!deferred) return;
  await deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  listeners.forEach((l) => l());
}
