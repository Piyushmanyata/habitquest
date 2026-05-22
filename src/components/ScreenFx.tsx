import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useHabitStore } from '../store/useHabitStore';
import { sfxPositive, sfxNegative, sfxLoot, sfxBossDefeat } from '../lib/sfx';

export default function ScreenFx() {
  const last = useHabitStore(s => s.lastChange);
  const lastLoot = useHabitStore(s => s.lastLoot);
  const bossesDefeated = useHabitStore(s => s.profile.bossesDefeated);
  const prevBosses = useRef(bossesDefeated);
  const [flash, setFlash] = useState<null | 'pos' | 'neg'>(null);
  const [shake, setShake] = useState(false);

  // Entry feedback
  useEffect(() => {
    if (!last) return;
    const isPos = last.sentiment === 'positive' || last.delta > 0;
    const isNeg = last.sentiment === 'negative' || last.delta < 0;
    if (isPos) {
      setFlash('pos');
      const burst = Math.min(220, 60 + Math.abs(last.delta) * 3 + last.combo * 15);
      confetti({ particleCount: burst, spread: 75, startVelocity: 40, scalar: 0.9,
        colors: ['#c2f54a', '#ffffff', '#9be700', '#e6ffb3'], origin: { y: 0.18 } });
      if (last.combo >= 3) setTimeout(() => confetti({ particleCount: 120, spread: 140, origin: { y: 0.4 } }), 120);
      sfxPositive(Math.max(1, Math.min(5, Math.abs(last.delta) / 10)));
    } else if (isNeg) {
      setFlash('neg');
      setShake(true);
      setTimeout(() => setShake(false), 380);
      sfxNegative();
    }
    const t = setTimeout(() => setFlash(null), 500);
    return () => clearTimeout(t);
  }, [last?.at]);

  // Loot feedback
  useEffect(() => { if (lastLoot) sfxLoot((lastLoot?.item.rarity as any) || 'common'); }, [lastLoot?.at]);

  // Boss-defeat fanfare
  useEffect(() => {
    if (bossesDefeated > prevBosses.current) {
      sfxBossDefeat();
      confetti({ particleCount: 250, spread: 140, startVelocity: 55,
        colors: ['#ff6b6b', '#ffa94d', '#ffd43b', '#ffffff'], origin: { y: 0.35 } });
      setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.5 } }), 250);
    }
    prevBosses.current = bossesDefeated;
  }, [bossesDefeated]);

  return (
    <>
      <AnimatePresence>
        {flash && (
          <motion.div
            className={`pointer-events-none fixed inset-0 z-40 ${flash === 'pos'
              ? 'bg-[radial-gradient(ellipse_at_top,rgba(194,245,74,0.18),transparent_60%)]'
              : 'bg-[radial-gradient(ellipse_at_center,rgba(255,107,107,0.20),transparent_60%)]'}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
        )}
      </AnimatePresence>
      <style>{`
        ${shake ? `#root { animation: hq-shake 0.36s cubic-bezier(.36,.07,.19,.97) both; }` : ''}
        @keyframes hq-shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
          40%, 60% { transform: translate3d(3px, 0, 0); }
        }
      `}</style>
    </>
  );
}
