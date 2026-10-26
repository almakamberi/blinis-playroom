import { useEffect, useState } from 'react';
import { Blini } from '../components/Blini';
import { useSettings } from '../settings/store';
import { applyThemeToDocument, THEMES } from '../settings/themes';
import { ParentGate } from './ParentGate';
import { PLAYROOM_URL } from '../paths';
import {
  AboutSection, HomeSection, InstallSection, LookSoundSection, TimeSection, ToysSection, WhoSection,
} from './sections';

const GATE_KEY = 'blini.gate';
const GATE_GRACE_MS = 2 * 60 * 1000;

const TABS = [
  { id: 'home', label: 'Home', C: HomeSection },
  { id: 'toys', label: 'Toys', C: ToysSection },
  { id: 'look', label: 'Look & Sound', C: LookSoundSection },
  { id: 'time', label: 'Time', C: TimeSection },
  { id: 'who', label: 'Who can play?', C: WhoSection },
  { id: 'install', label: 'Install', C: InstallSection },
  { id: 'about', label: 'About & privacy', C: AboutSection },
] as const;
export type TabId = (typeof TABS)[number]['id'];

function initialTab(): TabId {
  const h = location.hash.slice(1);
  return (TABS.find((t) => t.id === h)?.id ?? 'home') as TabId;
}

export function ParentCorner() {
  const settings = useSettings();
  const [passed, setPassed] = useState(() => {
    const t = Number(sessionStorage.getItem(GATE_KEY) || 0);
    return Date.now() - t < GATE_GRACE_MS;
  });
  const [tab, setTab] = useState<TabId>(initialTab);

  useEffect(() => {
    // Parent Corner always uses a light, calm look; the night theme is for the kid app.
    applyThemeToDocument(THEMES.sky);
    document.body.classList.add('is-parent');
    return () => document.body.classList.remove('is-parent');
  }, []);

  useEffect(() => {
    history.replaceState(null, '', `#${tab}`);
    window.scrollTo({ top: 0 });
  }, [tab]);

  if (!passed) {
    return (
      <ParentGate
        onPass={() => {
          sessionStorage.setItem(GATE_KEY, String(Date.now()));
          setPassed(true);
        }}
      />
    );
  }

  const Current = TABS.find((t) => t.id === tab)!.C;
  const name = settings.childName.trim();

  return (
    <div className="parent">
      <header className="parent-header">
        <a className="brand" href="#home" onClick={(e) => { e.preventDefault(); setTab('home'); }}>
          <Blini pose="happy" size={40} />
          <span>
            <strong>Parent Corner</strong>
            <small>{name ? `${name}'s Playroom` : "Blini's Playroom"}</small>
          </span>
        </a>
        <a className="btn btn-primary btn-small" href={PLAYROOM_URL}>Open Playroom</a>
      </header>
      <div className="parent-body">
        <nav className="parent-nav" aria-label="Settings sections">
          {TABS.map((t) => (
            <button key={t.id} className={t.id === tab ? 'is-active' : ''} aria-current={t.id === tab ? 'page' : undefined}
              onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <main className="parent-main">
          <Current go={setTab} />
        </main>
      </div>
    </div>
  );
}
