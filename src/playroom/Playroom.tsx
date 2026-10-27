import { useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { Blini } from '../components/Blini';
import { HoldButton } from '../components/HoldButton';
import { ToyIcon } from '../components/ToyIcon';
import { levelFor, type Level } from '../settings/schema';
import { isUnlocked, useSettings } from '../settings/store';
import { THEMES } from '../settings/themes';
import { TOY_FACTORIES } from '../toys';
import { ToyCanvas } from '../toys/ToyCanvas';
import { FamilyGate } from './FamilyGate';
import { PARENT_URL } from '../paths';

const LEVEL_NUM: Record<Level, 0 | 1 | 2> = { baby: 0, toddler: 1, little: 2 };
const PLAY_START_KEY = 'blini.playStart';

export function Playroom() {
  const settings = useSettings();
  const palette = THEMES[settings.theme];
  const toys = useMemo(() => settings.toys.filter((t) => t.on), [settings.toys]);
  const [unlocked, setUnlocked] = useState(() => isUnlocked(settings));
  const [hello, setHello] = useState(true);
  const [room, setRoom] = useState(0);
  const [menu, setMenu] = useState(false);
  const [bedtime, setBedtime] = useState(false);

  useEffect(() => {
    audio.configure(settings.sound);
    audio.configureVoice(settings.voice);
  }, [settings.sound, settings.voice]);

  useEffect(() => setUnlocked(isUnlocked(settings)), [settings.access]);
  useEffect(() => setRoom((r) => Math.min(r, Math.max(0, toys.length - 1))), [toys.length]);

  // The hello screen leaves on its own; a tap makes it leave sooner.
  useEffect(() => {
    if (!hello || !unlocked) return;
    const t = setTimeout(() => setHello(false), 3200);
    return () => clearTimeout(t);
  }, [hello, unlocked]);

  // First touch: wake up audio and ask for fullscreen when running in a browser tab.
  useEffect(() => {
    const first = () => {
      audio.unlock();
      const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
      if (!standalone && !document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
      }
    };
    window.addEventListener('pointerdown', first, { capture: true });
    return () => window.removeEventListener('pointerdown', first, { capture: true });
  }, []);

  // Absorb the Android back gesture so little hands don't leave by accident.
  useEffect(() => {
    history.pushState({ blini: true }, '');
    const onPop = () => history.pushState({ blini: true }, '');
    window.addEventListener('popstate', onPop);
    const noMenu = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', noMenu);
    return () => {
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('contextmenu', noMenu);
    };
  }, []);

  // Gentle play-time limit: counts only while the playroom is visible.
  const played = useRef(Number(sessionStorage.getItem(PLAY_START_KEY) || 0));
  useEffect(() => {
    if (!settings.time.on) {
      setBedtime(false);
      return;
    }
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      played.current += 5;
      sessionStorage.setItem(PLAY_START_KEY, String(played.current));
      if (played.current >= settings.time.minutes * 60) setBedtime(true);
    }, 5000);
    return () => clearInterval(id);
  }, [settings.time.on, settings.time.minutes]);

  useEffect(() => audio.setSleepy(bedtime), [bedtime]);

  const goParent = () => {
    sessionStorage.setItem('blini.gate', String(Date.now()));
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    location.href = PARENT_URL;
  };

  const wakeUp = () => {
    played.current = 0;
    sessionStorage.setItem(PLAY_START_KEY, '0');
    setBedtime(false);
  };

  if (!unlocked) return <FamilyGate codeHash={settings.access.codeHash!} onUnlock={() => setUnlocked(true)} />;

  const n = toys.length;
  const go = (i: number) => {
    setRoom(((i % n) + n) % n);
    setMenu(false);
  };

  return (
    <div className={`playroom ${palette.night ? 'is-night' : ''}`}>
      {n === 0 ? (
        <div className="empty-room">
          <Blini pose="sleepy" size={180} />
        </div>
      ) : (
        <div className="room-track" style={{ transform: `translate3d(${-room * 100}%,0,0)` }}>
          {toys.map((t, i) => (
            <section className="room" key={t.id} style={{ left: `${i * 100}%` }} aria-hidden={i !== room}>
              <ToyCanvas
                factory={TOY_FACTORIES[t.id]}
                palette={palette}
                level={LEVEL_NUM[levelFor(settings, t.id)]}
                active={!hello && !menu && !bedtime && i === room}
                photo={settings.photo}
              />
            </section>
          ))}
        </div>
      )}

      {n > 1 && (
        <>
          <button className="edge-bubble edge-left" aria-label="Previous toy" onClick={() => go(room - 1)}>
            <ToyIcon id={toys[(room - 1 + n) % n].id} size={44} />
          </button>
          <button className="edge-bubble edge-right" aria-label="Next toy" onClick={() => go(room + 1)}>
            <ToyIcon id={toys[(room + 1) % n].id} size={44} />
          </button>
        </>
      )}

      {n > 1 && (
        <button className="home-bubble" aria-label="All toys" onClick={() => setMenu(true)}>
          <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
            <circle cx="15" cy="15" r="8" fill="var(--c0)" />
            <circle cx="33" cy="15" r="8" fill="var(--c1)" />
            <circle cx="15" cy="33" r="8" fill="var(--c2)" />
            <circle cx="33" cy="33" r="8" fill="var(--c3)" />
          </svg>
        </button>
      )}

      <HoldButton className="parent-corner" label="Parent Corner: hold for 3 seconds" onDone={goParent}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" fill="currentColor" />
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
        </svg>
      </HoldButton>

      {menu && (
        <div className="toy-menu" onClick={() => setMenu(false)}>
          <div className="toy-menu-grid">
            {toys.map((t, i) => (
              <button key={t.id} className={`toy-menu-item ${i === room ? 'is-current' : ''}`} aria-label={t.id}
                onClick={(e) => { e.stopPropagation(); go(i); audio.play(3 + i, { vel: 0.4 }); }}>
                <ToyIcon id={t.id} size={72} />
              </button>
            ))}
          </div>
        </div>
      )}

      {hello && (
        <div className="hello" onPointerDown={() => { audio.unlock(); audio.arpeggio([5, 7, 9], 0.12, 0.4); setHello(false); }}>
          {settings.photo ? (
            <img className="child-badge" src={settings.photo} alt="" />
          ) : settings.childName ? (
            <div className="child-badge child-initial">{settings.childName.trim().charAt(0).toUpperCase()}</div>
          ) : null}
          <Blini pose="wave" size={220} className="hello-blini" />
        </div>
      )}

      {bedtime && (
        <div className="bedtime">
          <Blini pose="sleepy" size={200} />
          <HoldButton className="bedtime-wake" label="Grown-ups: hold 3 seconds to keep playing" onDone={wakeUp}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M15 4a8 8 0 1 0 5 13A7 7 0 0 1 15 4z" fill="currentColor" />
            </svg>
          </HoldButton>
        </div>
      )}
    </div>
  );
}
