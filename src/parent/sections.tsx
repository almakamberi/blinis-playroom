import { useEffect, useRef, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { audio } from '../audio/engine';
import { Blini } from '../components/Blini';
import { ToyIcon } from '../components/ToyIcon';
import { hashCode, LEVELS, TOYS, VOICE_LANGS, type Level, type SoundStyle, type ThemeId, type ToySetting } from '../settings/schema';
import { markUnlocked, resetSettings, setupLink, updateSettings, useSettings } from '../settings/store';
import { THEMES } from '../settings/themes';
import { canInstall, isStandalone, onInstallChange, promptInstall } from '../pwa';
import type { TabId } from './ParentCorner';
import { absoluteUrl, PLAYROOM_URL } from '../paths';

type SectionProps = { go: (t: TabId) => void };

function Card({ title, children, hint }: { title?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      {title && <h2>{title}</h2>}
      {hint && <p className="muted">{hint}</p>}
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true"><span className="toggle-thumb" /></span>
    </label>
  );
}

const childLabel = (name: string) => name.trim() || 'your child';

function useInstallable() {
  const [can, setCan] = useState(canInstall());
  useEffect(() => onInstallChange(() => setCan(canInstall())), []);
  return can;
}

function InstallButton() {
  const can = useInstallable();
  if (isStandalone()) return <p className="ok">✓ Installed on this device.</p>;
  if (!can) return null;
  return <button className="btn btn-primary" onClick={() => promptInstall()}>Install on this device</button>;
}

/* ---------------- Home ---------------- */

export function HomeSection({ go }: SectionProps) {
  const s = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const k = Math.max(size / img.width, size / img.height);
    const w = img.width * k, h = img.height * k;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    URL.revokeObjectURL(img.src);
    const data = c.toDataURL('image/jpeg', 0.85);
    updateSettings((x) => ({ ...x, photo: data }));
  };

  return (
    <>
      <Card title="Child profile" hint="Shown only here and, as a picture or initial, on the playroom’s hello screen. It never leaves this device.">
        <div className="profile">
          <button className="avatar" onClick={() => fileRef.current?.click()} aria-label="Choose a photo">
            {s.photo ? <img src={s.photo} alt="" /> : s.childName ? <span>{s.childName.trim().charAt(0).toUpperCase()}</span> : <Blini pose="wave" size={64} />}
          </button>
          <div className="profile-fields">
            <label className="field">
              <span>Child’s name</span>
              <input value={s.childName} maxLength={40} placeholder="e.g. Blin"
                onChange={(e) => updateSettings((x) => ({ ...x, childName: e.target.value }))} />
            </label>
            <div className="row">
              <button className="btn" onClick={() => fileRef.current?.click()}>{s.photo ? 'Change photo' : 'Add photo'}</button>
              {s.photo && <button className="btn btn-ghost" onClick={() => updateSettings((x) => ({ ...x, photo: null }))}>Remove photo</button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="open-playroom">
          <Blini pose="wave" size={120} />
          <div>
            <h2>Ready to play?</h2>
            <p className="muted">Hand the phone over once the playroom is open. To come back here, hold the small dotted circle in the top corner for 3 seconds.</p>
            <div className="row">
              <a className="btn btn-primary btn-big" href={PLAYROOM_URL}>Open Playroom</a>
              <InstallButton />
            </div>
          </div>
        </div>
      </Card>

      <div className="quick-grid">
        <button className="quick" onClick={() => go('toys')}><strong>Toys</strong><span>{s.toys.filter((t) => t.on).length} of {s.toys.length} on</span></button>
        <button className="quick" onClick={() => go('look')}><strong>Look & Sound</strong><span>{THEMES[s.theme].name}, {s.sound.on ? `${Math.round(s.sound.volume * 100)}% volume` : 'sound off'}</span></button>
        <button className="quick" onClick={() => go('time')}><strong>Time</strong><span>{s.time.on ? `Bedtime after ${s.time.minutes} min` : 'No limit'}</span></button>
        <button className="quick" onClick={() => go('who')}><strong>Who can play?</strong><span>{s.access.mode === 'family' ? 'Only my family' : 'Everyone'}</span></button>
      </div>
    </>
  );
}

/* ---------------- Toys ---------------- */

export function ToysSection() {
  const s = useSettings();
  const [dragId, setDragId] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  const setToys = (fn: (toys: ToySetting[]) => ToySetting[]) => updateSettings((x) => ({ ...x, toys: fn(x.toys) }));
  const move = (from: number, to: number) =>
    setToys((toys) => {
      if (to < 0 || to >= toys.length) return toys;
      const next = toys.slice();
      const [t] = next.splice(from, 1);
      next.splice(to, 0, t);
      return next;
    });

  // Pointer-based drag that works with touch as well as a mouse.
  const onHandleDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragId(id);
  };
  const onHandleMove = (e: React.PointerEvent) => {
    if (!dragId || !listRef.current) return;
    const rows = Array.from(listRef.current.children) as HTMLElement[];
    const from = s.toys.findIndex((t) => t.id === dragId);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect();
      if (e.clientY > r.top && e.clientY < r.bottom && i !== from) {
        const mid = r.top + r.height / 2;
        if ((i > from && e.clientY > mid) || (i < from && e.clientY < mid)) move(from, i);
        break;
      }
    }
  };

  return (
    <Card title="Toys" hint="Switch toys on or off, drag ☰ to change the order, and pick how hard each one is.">
      <ol className="toy-list" ref={listRef}>
        {s.toys.map((t, i) => {
          const meta = TOYS.find((m) => m.id === t.id)!;
          return (
            <li key={t.id} className={`toy-row ${t.on ? '' : 'is-off'} ${dragId === t.id ? 'is-dragging' : ''}`}>
              <button className="drag-handle" aria-label={`Drag to reorder ${meta.name}`}
                onPointerDown={(e) => onHandleDown(e, t.id)} onPointerMove={onHandleMove}
                onPointerUp={() => setDragId(null)} onPointerCancel={() => setDragId(null)}>☰</button>
              <div className="toy-thumb" style={{ background: meta.accent + '33' }}><ToyIcon id={t.id} size={48} /></div>
              <div className="toy-info">
                <strong>{meta.name}</strong>
                <span className="muted">{meta.blurb}</span>
                <label className="inline-select">
                  <span>Level</span>
                  <select value={t.level}
                    onChange={(e) => setToys((toys) => toys.map((x) => (x.id === t.id ? { ...x, level: e.target.value as Level | 'auto' } : x)))}>
                    <option value="auto">Automatic ({LEVELS.find((l) => l.id === s.age)!.name})</option>
                    {LEVELS.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.ages})</option>)}
                  </select>
                </label>
              </div>
              <div className="toy-actions">
                <Toggle label={t.on ? 'On' : 'Off'} checked={t.on}
                  onChange={(on) => setToys((toys) => toys.map((x) => (x.id === t.id ? { ...x, on } : x)))} />
                <div className="updown">
                  <button aria-label={`Move ${meta.name} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>▲</button>
                  <button aria-label={`Move ${meta.name} down`} disabled={i === s.toys.length - 1} onClick={() => move(i, i + 1)}>▼</button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {s.toys.every((t) => !t.on) && <p className="warn">All toys are off, so the playroom will only show a sleepy Blini.</p>}
    </Card>
  );
}

/* ---------------- Look & Sound ---------------- */

export function LookSoundSection() {
  const s = useSettings();
  const preview = (style: SoundStyle) => {
    audio.unlock();
    audio.configure({ ...s.sound, on: true, style });
    audio.arpeggio([5, 7, 9, 10, 12], 0.14, 0.6);
    setTimeout(() => audio.configure(s.sound), 1200);
  };

  return (
    <>
      <Card title="Colour theme">
        <div className="theme-grid">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => {
            const p = THEMES[id];
            return (
              <button key={id} className={`theme-swatch ${s.theme === id ? 'is-selected' : ''}`} aria-pressed={s.theme === id}
                style={{ background: p.bg, color: p.ink }} onClick={() => updateSettings((x) => ({ ...x, theme: id }))}>
                <span className="dots">{p.soft.slice(0, 5).map((c) => <i key={c} style={{ background: c }} />)}</span>
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Sound">
        <Toggle label="Sound" checked={s.sound.on} onChange={(on) => updateSettings((x) => ({ ...x, sound: { ...x.sound, on } }))} />
        <label className="field">
          <span>Maximum volume: {Math.round(s.sound.volume * 100)}%</span>
          <input type="range" min={5} max={100} step={5} value={Math.round(s.sound.volume * 100)} disabled={!s.sound.on}
            onChange={(e) => updateSettings((x) => ({ ...x, sound: { ...x.sound, volume: Number(e.target.value) / 100 } }))} />
        </label>
        <fieldset className="radio-cards" disabled={!s.sound.on}>
          <legend>Music style</legend>
          {([['marimba', 'Soft marimba'], ['chimes', 'Soft chimes'], ['musicbox', 'Music box']] as const).map(([id, name]) => (
            <label key={id} className={`radio-card ${s.sound.style === id ? 'is-selected' : ''}`}>
              <input type="radio" name="style" checked={s.sound.style === id}
                onChange={() => updateSettings((x) => ({ ...x, sound: { ...x.sound, style: id } }))} />
              <span>{name}</span>
              <button type="button" className="btn btn-small btn-ghost" onClick={() => preview(id)}>▶ Listen</button>
            </label>
          ))}
        </fieldset>
        <p className="muted small">Every note comes from one gentle five-note scale, so any mix of taps sounds pleasant.</p>
      </Card>

      <Card title={`Grows with ${childLabel(s.childName)}`} hint="Sets how busy and tricky the toys are. You can also override it per toy under Toys.">
        <div className="segmented" role="radiogroup">
          {LEVELS.map((l) => (
            <button key={l.id} role="radio" aria-checked={s.age === l.id} className={s.age === l.id ? 'is-selected' : ''}
              onClick={() => updateSettings((x) => ({ ...x, age: l.id }))}>
              <strong>{l.name}</strong><span>{l.ages} years</span>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Counting voice" hint="In Counting Stars, a voice can say each number. It uses the voices built into the phone, so availability depends on the device.">
        <Toggle label="Say the numbers" checked={s.voice.on} onChange={(on) => updateSettings((x) => ({ ...x, voice: { ...x.voice, on } }))} />
        <label className="field">
          <span>Language</span>
          <select value={s.voice.lang} disabled={!s.voice.on} onChange={(e) => updateSettings((x) => ({ ...x, voice: { ...x.voice, lang: e.target.value } }))}>
            {VOICE_LANGS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <button className="btn btn-ghost btn-small" disabled={!s.voice.on} onClick={() => {
          audio.unlock(); audio.configureVoice({ ...s.voice, on: true }); audio.configure({ ...s.sound, on: true }); audio.speakNumber(3);
          setTimeout(() => audio.configure(s.sound), 1500);
        }}>▶ Try it</button>
      </Card>
    </>
  );
}

/* ---------------- Time ---------------- */

export function TimeSection() {
  const s = useSettings();
  return (
    <Card title="Play time" hint="Off by default. When on, after the chosen time the playroom slowly dims, the sound fades out and a sleepy Blini says goodnight. Hold the moon button for 3 seconds to keep playing.">
      <Toggle label="Gentle bedtime fade" checked={s.time.on} onChange={(on) => updateSettings((x) => ({ ...x, time: { ...x.time, on } }))} />
      <label className="field">
        <span>Fade out after {s.time.minutes} minutes</span>
        <input type="range" min={5} max={60} step={5} value={s.time.minutes} disabled={!s.time.on}
          onChange={(e) => updateSettings((x) => ({ ...x, time: { ...x.time, minutes: Number(e.target.value) } }))} />
      </label>
      <div className="bedtime-preview"><Blini pose="sleepy" size={90} /><span className="muted">What the child sees at bedtime</span></div>
    </Card>
  );
}

/* ---------------- Who can play ---------------- */

function useQr(text: string) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(text, { margin: 1, width: 320, color: { dark: '#3B4A5A', light: '#FFFFFF' } }).then(setSrc).catch(() => setSrc(''));
  }, [text]);
  return src;
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="copy-field">
      <input ref={ref} readOnly value={value} onFocus={(e) => e.target.select()} />
      <button className="btn btn-primary" onClick={async () => {
        try { await navigator.clipboard.writeText(value); }
        catch { ref.current?.select(); document.execCommand('copy'); }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}>{copied ? 'Copied ✓' : 'Copy'}</button>
    </div>
  );
}

export function WhoSection() {
  const s = useSettings();
  const [code, setCode] = useState('');
  const link = setupLink(s);
  const qr = useQr(link);

  const saveCode = () => {
    if (code.length < 4) return;
    const h = hashCode(code);
    markUnlocked(h); // this device stays open for the family
    updateSettings((x) => ({ ...x, access: { mode: 'family', codeHash: h } }));
    setCode('');
  };

  return (
    <>
      <Card title="Who can play?">
        <div className="radio-cards">
          <label className={`radio-card ${s.access.mode === 'everyone' ? 'is-selected' : ''}`}>
            <input type="radio" name="access" checked={s.access.mode === 'everyone'}
              onChange={() => updateSettings((x) => ({ ...x, access: { ...x.access, mode: 'everyone' } }))} />
            <span><strong>Everyone</strong><br /><span className="muted">Anyone with the link can play straight away. (Default)</span></span>
          </label>
          <label className={`radio-card ${s.access.mode === 'family' ? 'is-selected' : ''}`}>
            <input type="radio" name="access" checked={s.access.mode === 'family'} disabled={!s.access.codeHash}
              onChange={() => updateSettings((x) => ({ ...x, access: { ...x.access, mode: 'family' } }))} />
            <span><strong>Only my family</strong><br /><span className="muted">Your setup link asks for a family code the first time it is opened on a new device.</span></span>
          </label>
        </div>
        <div className="field">
          <span>{s.access.codeHash ? 'Change family code' : 'Set a family code (4–8 digits)'}</span>
          <div className="row">
            <input inputMode="numeric" pattern="[0-9]*" maxLength={8} value={code} placeholder="e.g. 2468"
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} />
            <button className="btn" disabled={code.length < 4} onClick={saveCode}>Save code & turn on</button>
          </div>
        </div>
        <p className="muted small">
          Honest note: the family code is a light lock that keeps casual visitors out. There is no server or account yet, so it is not
          strong security. Please never put anything private in the playroom.
        </p>
      </Card>

      <Card title="Share this setup" hint="Grandparents or friends open this link to get the same toys, theme, sounds and rules. It does not include your child’s name or photo.">
        <CopyField value={link} />
        {qr && <img className="qr" src={qr} alt="QR code for the setup link" width={240} height={240} />}
      </Card>
    </>
  );
}

/* ---------------- Install ---------------- */

export function InstallSection() {
  const url = absoluteUrl(PLAYROOM_URL);
  const qr = useQr(url);
  return (
    <>
      <Card title="Put the Playroom on your Android home screen" hint="It then opens full screen like a normal app, with no browser bars, and works offline.">
        <InstallButton />
        <ol className="steps">
          <li>
            <PhoneMock><div className="mock-url">{url.replace(/^https?:\/\//, '')}</div><div className="mock-dots">⋮</div></PhoneMock>
            <div><strong>Open the link in Chrome</strong><p className="muted">On the child’s phone, open <code>{url.replace(/^https?:\/\//, '')}</code> in Chrome. Or scan the QR code below.</p></div>
          </li>
          <li>
            <PhoneMock><div className="mock-menu"><span>New tab</span><span className="hl">Add to Home screen</span><span>Settings</span></div></PhoneMock>
            <div><strong>Tap ⋮ then “Add to Home screen”</strong><p className="muted">Some phones say “Install app”. Then tap <em>Install</em> or <em>Add</em>.</p></div>
          </li>
          <li>
            <PhoneMock><div className="mock-home"><span className="mock-icon"><Blini pose="happy" size={34} /></span><small>Blini</small></div></PhoneMock>
            <div><strong>Open “Blini” from the home screen</strong><p className="muted">Open it once while online so every toy and sound is saved for offline play.</p></div>
          </li>
        </ol>
        <p className="muted small">Samsung Internet: tap the ☰ menu → <em>Add page to</em> → <em>Home screen</em>.</p>
        <p className="muted small">Tip: Android’s <em>App pinning</em> (Settings → Security → App pinning) stops a child leaving the app.</p>
      </Card>
      <Card title="QR code to the Playroom">
        {qr && <img className="qr" src={qr} alt="QR code for the Playroom" width={240} height={240} />}
        <CopyField value={url} />
      </Card>
    </>
  );
}

function PhoneMock({ children }: { children: ReactNode }) {
  return <div className="phone-mock" aria-hidden="true">{children}</div>;
}

/* ---------------- About & privacy ---------------- */

export function AboutSection() {
  return (
    <>
      <Card title="About Blini’s Playroom">
        <div className="about-blini">
          <Blini pose="wave" size={84} /><Blini pose="happy" size={84} /><Blini pose="sleepy" size={84} />
        </div>
        <p>A calm, open-ended set of toys for little ones aged about 1 to 5. No rules, no scores, no winning or losing, nothing to read.</p>
      </Card>
      <Card title="Privacy, in plain words">
        <ul className="plain-list">
          <li>Nothing about your child is collected, tracked or sold.</li>
          <li>No ads, no analytics, no in-app purchases, no links out of the playroom.</li>
          <li>All settings, including the name and photo, stay on this device in the browser’s storage.</li>
          <li>The setup link carries only toy, theme, sound and time settings, never the name or photo.</li>
          <li>Clearing the browser’s site data removes everything.</li>
        </ul>
      </Card>
      <Card title="Start over">
        <p className="muted">Puts every setting back to how it was the first time: open to everyone, all toys on, Sky theme.</p>
        <button className="btn btn-danger" onClick={() => {
          if (confirm('Reset everything to default? This removes the name, photo and all settings on this device.')) resetSettings();
        }}>Reset to default</button>
      </Card>
    </>
  );
}
