import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { sfxComboTier } from '../lib/sfx';

const TIERS: { combo: number; label: string; color: string; glow: string }[] = [
  { combo: 3,  label: 'TRIPLE!',   color: '#c2f54a', glow: 'rgba(194,245,74,0.55)' },
  { combo: 5,  label: 'MEGA!',     color: '#fbbf24', glow: 'rgba(251,191,36,0.55)' },
  { combo: 7,  label: 'ULTRA!',    color: '#ec4899', glow: 'rgba(236,72,153,0.55)' },
  { combo: 10, label: 'GODLIKE!',  color: '#a855f7', glow: 'rgba(168,85,247,0.65)' },
];

function tone(freqA: number, freqB: number, dur: number, type: OscillatorType = 'sine', vol = 0.08, offset = 0) {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = type;
    const t0 = ctx.currentTime + offset;
    o.frequency.setValueAtTime(freqA, t0);
    o.frequency.exponentialRampToValueAtTime(freqB, t0 + dur * 0.5);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch {}
}

function tierFanfare(idx: number) {
  // Each higher tier adds more notes
  const ladders = [
    [[660, 990, 0.18]],
    [[660, 990, 0.18], [990, 1320, 0.22]],
    [[660, 990, 0.16], [990, 1320, 0.18], [1320, 1760, 0.22]],
    [[523, 784, 0.14], [659, 988, 0.14], [784, 1175, 0.14], [1047, 1568, 0.3]],
  ];
  const ladder = ladders[Math.min(idx, ladders.length - 1)];
  ladder.forEach(([a, b, d], i) => tone(a, b, d, 'sine', 0.08, i * 0.12));
}

export default function ComboCallout() {
  const combo = useHabitStore(s => s.combo);
  const prev = useRef(combo);
  const [shown, setShown] = useState<{ idx: number; at: number } | null>(null);

  useEffect(() => {
    // Only fire when crossing a tier upward.
    if (combo > prev.current) {
      const idx = TIERS.findIndex(t => t.combo === combo);
      if (idx >= 0) {
        setShown({ idx, at: Date.now() });
        sfxComboTier(idx);
        const t = setTimeout(() => setShown(null), 1500);
        return () => clearTimeout(t);
      }
    }
    prev.current = combo;
  }, [combo]);

  if (!shown) return null;
  const tier = TIERS[shown.idx];

  return (
    <div className="fixed inset-0 z-[55] grid place-items-center pointer-events-none">
      <AnimatePresence>
        <motion.div
          key={shown.at}
          initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 1.2, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 14 }}
          className="font-display font-extrabold tracking-tighter mono"
          style={{
            color: tier.color,
            fontSize: 'clamp(48px, 12vw, 140px)',
            textShadow: `0 0 32px ${tier.glow}, 0 0 60px ${tier.glow}`,
            letterSpacing: '-0.04em',
          }}
        >
          {tier.label}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
