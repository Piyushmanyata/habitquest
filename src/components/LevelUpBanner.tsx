import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useHabitStore } from '../store/useHabitStore';
import { levelFromXp } from '../lib/gamification';

function playLevelUp() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [523, 659, 784, 1047]; // C E G C — major arpeggio
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'triangle';
      const t0 = ctx.currentTime + i * 0.08;
      o.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
      o.start(t0); o.stop(t0 + 0.4);
    });
  } catch {}
}

export default function LevelUpBanner() {
  const xp = useHabitStore(s => s.profile.xp);
  const lvl = levelFromXp(xp).level;
  const prevLvl = useRef(lvl);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (lvl > prevLvl.current) {
      setShown(lvl);
      playLevelUp();
      confetti({ particleCount: 220, spread: 150, startVelocity: 50, origin: { y: 0.4 }, colors: ['#c2f54a','#ffffff','#9be700','#ffe066','#ffffff'] });
      setTimeout(() => confetti({ particleCount: 120, spread: 80, angle: 60,  origin: { x: 0, y: 0.6 } }), 220);
      setTimeout(() => confetti({ particleCount: 120, spread: 80, angle: 120, origin: { x: 1, y: 0.6 } }), 220);
      const t = setTimeout(() => setShown(null), 2400);
      return () => clearTimeout(t);
    }
    prevLvl.current = lvl;
  }, [lvl]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] grid place-items-center">
      <AnimatePresence>
        {shown !== null && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotate: -6 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            className="px-8 py-6 rounded-2xl bg-[#0a0a0b] border-2 border-[var(--accent)] shadow-[0_0_60px_-10px_rgba(194,245,74,0.6)] text-center"
          >
            <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--accent)] mono">Level Up</div>
            <div className="font-display text-5xl font-bold mt-1 mono text-[var(--fg)]">L{shown}</div>
            <div className="text-[12px] text-[var(--muted)] mt-1">{flavorFor(shown)}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function flavorFor(lvl: number) {
  const flavors = [
    'Awakened.', 'Sharper edge.', 'Compound interest, alive.',
    'Old self filed under archive.', 'You out-ran yesterday.',
    'New gear unlocked.', 'Boss patterns get easier from here.',
    'Discipline tax: paid in full.', 'Future you sends thanks.',
  ];
  return flavors[lvl % flavors.length];
}
