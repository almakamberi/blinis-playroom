export type BliniPose = 'wave' | 'sleepy' | 'happy';

/**
 * Blini: a round, warm little pancake-blob with a curl of steam on top.
 * Original character for Blini's Playroom.
 */
export function Blini({ pose = 'wave', size = 200, className = '' }: { pose?: BliniPose; size?: number; className?: string }) {
  const happy = pose === 'happy';
  const sleepy = pose === 'sleepy';
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`blini blini-${pose} ${className}`}
      aria-hidden="true"
    >
      <ellipse cx="100" cy="184" rx="58" ry="9" fill="rgba(0,0,0,0.08)" />
      {/* steam curl */}
      <path className="blini-steam" d="M100 52 C 88 40, 112 32, 100 18" fill="none" stroke="#F3E2C4" strokeWidth="7" strokeLinecap="round" />
      {/* body */}
      <path className="blini-body"
        d="M100 52 C 150 52, 176 88, 174 128 C 172 165, 140 180, 100 180 C 60 180, 28 165, 26 128 C 24 88, 50 52, 100 52 Z"
        fill="#F6C978" />
      <path d="M100 60 C 140 60, 164 90, 164 120 C 150 98, 128 84, 100 84 C 72 84, 50 98, 36 120 C 36 90, 60 60, 100 60 Z" fill="#F9D892" />
      <ellipse cx="70" cy="80" rx="12" ry="7" fill="#FFF3D6" opacity="0.8" transform="rotate(-25 70 80)" />
      {/* arms (drawn over the body edge so they read as arms, not ears) */}
      <g fill="#EDB765">
        <ellipse cx={happy ? 30 : 32} cy={happy ? 104 : 134} rx="12" ry="19"
          transform={happy ? 'rotate(-50 30 104)' : 'rotate(25 32 134)'} />
        <g className={pose === 'wave' ? 'blini-arm-wave' : undefined}>
          <ellipse cx={happy || pose === 'wave' ? 170 : 168} cy={happy || pose === 'wave' ? 104 : 134} rx="12" ry="19"
            transform={happy || pose === 'wave' ? 'rotate(50 170 104)' : 'rotate(-25 168 134)'} />
        </g>
      </g>
      {/* eyes */}
      {sleepy ? (
        <g stroke="#4A3A2A" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M70 118 q 9 8 18 0" />
          <path d="M112 118 q 9 8 18 0" />
        </g>
      ) : happy ? (
        <g stroke="#4A3A2A" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M70 120 q 9 -11 18 0" />
          <path d="M112 120 q 9 -11 18 0" />
        </g>
      ) : (
        <g fill="#4A3A2A" className="blini-eyes">
          <ellipse cx="79" cy="116" rx="7" ry="8.5" />
          <ellipse cx="121" cy="116" rx="7" ry="8.5" />
          <circle cx="81.5" cy="113" r="2.4" fill="#fff" />
          <circle cx="123.5" cy="113" r="2.4" fill="#fff" />
        </g>
      )}
      {/* cheeks */}
      <ellipse cx="60" cy="136" rx="11" ry="7" fill="#F2948F" opacity="0.5" />
      <ellipse cx="140" cy="136" rx="11" ry="7" fill="#F2948F" opacity="0.5" />
      {/* mouth */}
      {sleepy ? (
        <ellipse cx="100" cy="142" rx="5" ry="4" fill="#4A3A2A" />
      ) : (
        <path d={happy ? 'M86 134 q 14 18 28 0 z' : 'M88 136 q 12 12 24 0'} fill={happy ? '#C2645E' : 'none'}
          stroke="#4A3A2A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {sleepy && (
        <g fill="#B9A7D8" className="blini-zz">
          <path d="M150 50 h16 l-16 18 h16" fill="none" stroke="#B9A7D8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M172 26 h11 l-11 12 h11" fill="none" stroke="#B9A7D8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
}
