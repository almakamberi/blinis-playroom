import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Press and hold for `ms` to trigger. Shows a filling ring. Used for the parent gate. */
export function HoldButton({
  ms = 3000,
  onDone,
  className = '',
  label,
  children,
}: {
  ms?: number;
  onDone: () => void;
  className?: string;
  label: string;
  children?: ReactNode;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const stop = () => {
    window.clearTimeout(timer.current);
    setHolding(false);
  };
  useEffect(() => stop, []);

  return (
    <button
      type="button"
      aria-label={label}
      className={`hold-button ${holding ? 'is-holding' : ''} ${className}`}
      style={{ ['--hold-ms' as string]: `${ms}ms` }}
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setHolding(true);
        timer.current = window.setTimeout(() => {
          setHolding(false);
          onDone();
        }, ms);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        // keyboard users: holding Enter/Space also works
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
          setHolding(true);
          timer.current = window.setTimeout(() => { setHolding(false); onDone(); }, ms);
        }
      }}
      onKeyUp={stop}
    >
      <svg className="hold-ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="44" className="hold-ring-track" />
        <circle cx="50" cy="50" r="44" className="hold-ring-fill" pathLength={100} />
      </svg>
      {children}
    </button>
  );
}
