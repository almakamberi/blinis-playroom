import { useState } from 'react';
import { Blini } from '../components/Blini';
import { hashCode } from '../settings/schema';
import { markUnlocked } from '../settings/store';

/** Shown once per device when the parent chose "Only my family". For the grown-up, not the child. */
export function FamilyGate({ codeHash, onUnlock }: { codeHash: string; onUnlock: () => void }) {
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);

  const press = (d: string) => {
    setWrong(false);
    const next = (code + d).slice(0, 8);
    setCode(next);
    if (hashCode(next) === codeHash) {
      markUnlocked(codeHash);
      onUnlock();
    } else if (next.length >= 8) {
      setWrong(true);
      setCode('');
    }
  };

  return (
    <div className="family-gate">
      <Blini pose="happy" size={120} />
      <p className="family-gate-title">Family code</p>
      <div className={`family-dots ${wrong ? 'is-wrong' : ''}`} aria-live="polite">
        {code.length ? '•'.repeat(code.length) : ' '}
      </div>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => press(d)}>{d}</button>
        ))}
        <button onClick={() => { setCode(''); setWrong(false); }} aria-label="Clear">⌫</button>
        <button onClick={() => press('0')}>0</button>
        <span />
      </div>
      <p className="family-gate-hint">Ask the family who shared this playroom for the code.</p>
    </div>
  );
}
