// Slow-drifting decorative particles behind the whole app. Pure CSS animations,
// no canvas, near-zero CPU.

import { useMemo } from 'react';

const COUNT = 28;
const PALETTE = [
  'rgba(194,245,74,0.55)',  // lime
  'rgba(125,211,252,0.45)', // sky
  'rgba(168,85,247,0.45)',  // purple
  'rgba(251,191,36,0.45)',  // amber
  'rgba(255,255,255,0.30)', // white
];

export default function AmbientParticles() {
  // Random params are deterministic per mount — no jitter on re-render.
  const particles = useMemo(() => {
    return Array.from({ length: COUNT }).map((_, i) => {
      const size = 2 + Math.random() * 4;
      const left = Math.random() * 100;
      const top  = Math.random() * 100;
      const delay = Math.random() * -28;        // start mid-animation
      const duration = 22 + Math.random() * 28; // 22-50s
      const drift = (Math.random() - 0.5) * 24; // horizontal sway in vw
      const color = PALETTE[i % PALETTE.length];
      const blur = size > 4 ? 1 : 0;
      return { size, left, top, delay, duration, drift, color, blur };
    });
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ contain: 'strict' }}
    >
      <style>{`
        @keyframes hq-drift {
          0%   { transform: translate3d(0,0,0) scale(1);   opacity: 0; }
          10%  { opacity: 1; }
          50%  { transform: translate3d(var(--drift), -40vh, 0) scale(1.15); }
          90%  { opacity: 1; }
          100% { transform: translate3d(calc(var(--drift) * 1.4), -85vh, 0) scale(0.85); opacity: 0; }
        }
      `}</style>
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
            background: p.color,
            filter: p.blur ? `blur(${p.blur}px)` : 'none',
            // @ts-expect-error custom var
            '--drift': `${p.drift}vw`,
            animation: `hq-drift ${p.duration}s linear ${p.delay}s infinite`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  );
}
