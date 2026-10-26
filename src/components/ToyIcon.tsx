import type { ToyId } from '../settings/schema';
import type { ReactElement } from 'react';

/** Simple pictogram for each toy — used in the kid menu (no text) and Parent Corner. */
export function ToyIcon({ id, size = 64 }: { id: ToyId; size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      {ICONS[id]}
    </svg>
  );
}

const ICONS: Record<ToyId, ReactElement> = {
  bubbles: (
    <g fill="rgba(127,196,236,0.35)" stroke="#5FAFE0" strokeWidth="3">
      <circle cx="26" cy="36" r="16" />
      <circle cx="46" cy="20" r="10" />
      <circle cx="48" cy="46" r="6" />
      <path d="M17 30 a10 10 0 0 1 7 -6" stroke="#fff" strokeLinecap="round" fill="none" />
    </g>
  ),
  blobs: (
    <g>
      <path d="M8 50 C 6 30, 18 22, 22 22 C 28 22, 38 30, 36 50 Z" fill="#F49AB4" />
      <path d="M30 50 C 28 36, 38 30, 44 30 C 50 30, 58 36, 56 50 Z" fill="#9CC9F0" />
      <g fill="#3B3340">
        <circle cx="18" cy="36" r="2.2" /><circle cx="27" cy="36" r="2.2" />
        <circle cx="40" cy="41" r="2" /><circle cx="48" cy="41" r="2" />
      </g>
    </g>
  ),
  paint: (
    <g strokeLinecap="round" fill="none" strokeWidth="9">
      <path d="M10 44 C 20 20, 32 52, 44 26" stroke="#F6B26B" opacity="0.85" />
      <path d="M18 54 C 30 44, 42 56, 54 40" stroke="#F49AB4" opacity="0.8" />
      <circle cx="50" cy="16" r="5" fill="#9CC9F0" stroke="none" />
    </g>
  ),
  shapes: (
    <g>
      <circle cx="20" cy="22" r="11" fill="#8FCB9B" />
      <rect x="34" y="12" width="20" height="20" rx="5" fill="#F7B7A3" />
      <path d="M32 36 L46 58 L18 58 Z" fill="#C9B6E4" stroke="#C9B6E4" strokeWidth="5" strokeLinejoin="round" />
    </g>
  ),
  garden: (
    <g>
      <path d="M32 58 V 32" stroke="#6DB46A" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="24" cy="46" rx="8" ry="4" fill="#84C77B" transform="rotate(-25 24 46)" />
      <g fill="#F49AB4">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="32" cy="15" rx="7" ry="9" transform={`rotate(${a} 32 24)`} />
        ))}
      </g>
      <circle cx="32" cy="24" r="6" fill="#F9DC7A" />
    </g>
  ),
  stars: (
    <g>
      <circle cx="32" cy="32" r="30" fill="#4A4F80" />
      <path d="M32 12 L37 26 L52 26 L40 35 L44 50 L32 41 L20 50 L24 35 L12 26 L27 26 Z" fill="#FFD86E" stroke="#FFD86E" strokeWidth="3" strokeLinejoin="round" />
    </g>
  ),
};
