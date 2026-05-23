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
      const limeColors  = ['#c2f54a', '#ffffff', '#9be700', '#e6ffb3'];
      const mythicMix   = ['#c2f54a', '#7dd3fc', '#a855f7', '#ffd43b', '#ffffff'];
      const palette = last.combo >= 5 ? mythicMix : limeColors;

      // Main fountain from top.
      const main = Math.min(280, 70 + Math.abs(last.delta) * 3.5 + last.combo * 18);
      confetti({ particleCount: main, spread: 85, startVelocity: 45, scalar: 1.05,
        ticks: 220, gravity: 0.95, colors: palette, origin: { y: 0.15 } });

      // Side cannons for combo 3+ (left and right).
      if (last.combo >= 3) {
        setTimeout(() => confetti({ particleCount: 80, angle: 60,  spread: 60, startVelocity: 55, origin: { x: 0, y: 0.7 }, colors: palette }), 80);
        setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, startVelocity: 55, origin: { x: 1, y: 0.7 }, colors: palette }), 80);
      }
      // Heavy fountain finale for combo 5+ (the "MEGA" feel).
      if (last.combo >= 5) {
        setTimeout(() => confetti({ particleCount: 160, spread: 160, startVelocity: 55, scalar: 1.2, ticks: 280, colors: palette, origin: { y: 0.4 } }), 240);
      }
      // Star burst for combo 7+ (GODLIKE).
      if (last.combo >= 7) {
        setTimeout(() => confetti({ particleCount: 220, spread: 360, startVelocity: 35, scalar: 1.4, ticks: 320, shapes: ['star' as any], colors: ['#fbbf24', '#a855f7', '#ffffff'], origin: { y: 0.5 } }), 400);
      }
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
      // Triple-stage boss defeat — fountain, cross-cannons, star burst.
      const heroic = ['#ff6b6b', '#ffa94d', '#ffd43b', '#ffffff', '#c2f54a'];
      confetti({ particleCount: 320, spread: 150, startVelocity: 60, scalar: 1.15, ticks: 260,
                 colors: heroic, origin: { y: 0.3 } });
      setTimeout(() => confetti({ particleCount: 140, angle: 60,  spread: 75, startVelocity: 65, origin: { x: 0, y: 0.65 }, colors: heroic }), 180);
      setTimeout(() => confetti({ particleCount: 140, angle: 120, spread: 75, startVelocity: 65, origin: { x: 1, y: 0.65 }, colors: heroic }), 180);
      setTimeout(() => confetti({ particleCount: 220, spread: 360, startVelocity: 30, scalar: 1.5, ticks: 300, shapes: ['star' as any], colors: ['#fbbf24', '#ffd43b', '#ffffff'], origin: { y: 0.5 } }), 480);
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
