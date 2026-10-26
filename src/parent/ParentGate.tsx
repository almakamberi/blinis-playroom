import { useMemo, useState } from 'react';
import { Blini } from '../components/Blini';
import { HoldButton } from '../components/HoldButton';
import { PLAYROOM_URL } from '../paths';

/** Grown-ups only: hold for 3 seconds, or solve a sum. */
export function ParentGate({ onPass }: { onPass: () => void }) {
  const [a, b] = useMemo(() => [6 + Math.floor(Math.random() * 9), 5 + Math.floor(Math.random() * 9)], []);
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);

  return (
    <main className="gate">
      <div className="gate-card">
        <Blini pose="happy" size={96} />
        <h1>Parent Corner</h1>
        <p className="muted">This bit is for grown-ups.</p>

        <HoldButton className="gate-hold" label="Hold for 3 seconds" onDone={onPass}>
          <span>Hold for 3 seconds</span>
        </HoldButton>

        <div className="gate-or"><span>or</span></div>

        <form
          className="gate-sum"
          onSubmit={(e) => {
            e.preventDefault();
            if (Number(answer) === a + b) onPass();
            else { setWrong(true); setAnswer(''); }
          }}
        >
          <label htmlFor="gate-answer">What is {a} + {b}?</label>
          <div className="row">
            <input id="gate-answer" inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={answer}
              onChange={(e) => { setAnswer(e.target.value.replace(/\D/g, '')); setWrong(false); }} />
            <button className="btn" type="submit">Enter</button>
          </div>
          {wrong && <p className="error" role="alert">Not quite. Try again.</p>}
        </form>

        <a className="link-quiet" href={PLAYROOM_URL}>← Back to the Playroom</a>
      </div>
    </main>
  );
}
