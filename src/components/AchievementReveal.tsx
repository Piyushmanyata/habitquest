import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { useHabitStore } from '../store/useHabitStore';
import { BADGES } from '../lib/gamification';

type Reveal = { kind: 'built'; emoji: string; name: string; description: string; at: number }
            | { kind: 'custom'; emoji: string; name: string; description: string; at: number; recurring: boolean };

export default function AchievementReveal() {
  const lastBuilt   = useHabitStore(s => s.lastAchievement);
  const lastCustom  = useHabitStore(s => s.lastCustomBadge);
  const clearBuilt  = useHabitStore(s => s.clearLastAchievement);
  const clearCustom = useHabitStore(s => s.clearLastCustomBadge);
  const [shown, setShown] = useState<Reveal | null>(null);

  // Built-in
  useEffect(() => {
    if (!lastBuilt) return;
    const badge = BADGES.find(b => b.id === lastBuilt.id);
    if (!badge) return;
    setShown({ kind: 'built', emoji: badge.emoji, name: badge.name, description: badge.description, at: lastBuilt.at });
    confetti({ particleCount: 200, spread: 120, startVelocity: 45, origin: { y: 0.4 }, colors: ['#c2f54a','#ffd43b','#ffffff','#ec4899'] });
    const t = setTimeout(() => { setShown(null); clearBuilt(); }, 3200);
    return () => clearTimeout(t);
  }, [lastBuilt?.at, clearBuilt]);

  // Custom
  useEffect(() => {
    if (!lastCustom) return;
    const b = lastCustom.badge;
    setShown({ kind: 'custom', emoji: b.emoji, name: b.name, description: b.description, at: lastCustom.at, recurring: b.recurring });
    confetti({ particleCount: 260, spread: 140, startVelocity: 50, origin: { y: 0.4 }, colors: ['#a855f7','#7dd3fc','#c2f54a','#ffd43b','#ffffff'] });
    setTimeout(() => confetti({ particleCount: 120, spread: 90, origin: { x: 0.2, y: 0.5 } }), 180);
    setTimeout(() => confetti({ particleCount: 120, spread: 90, origin: { x: 0.8, y: 0.5 } }), 360);
    const t = setTimeout(() => { setShown(null); clearCustom(); }, 3800);
    return () => clearTimeout(t);
  }, [lastCustom?.at, clearCustom]);

  if (!shown) return null;
  const accent = shown.kind === 'custom' ? '#a855f7' : 'var(--accent)';
  const glow = shown.kind === 'custom' ? 'rgba(168,85,247,0.55)' : 'rgba(194,245,74,0.55)';
  const label = shown.kind === 'custom' ? 'Custom Badge Minted by Sage' : 'Achievement Unlocked';

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center pointer-events-none">
      <AnimatePresence>
        <motion.div
          key={shown.at}
          initial={{ scale: 0.5, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          className="px-8 py-7 rounded-2xl bg-[#0a0a0b] text-center max-w-sm"
          style={{ border: '2px solid ' + accent, boxShadow: `0 0 60px -10px ${glow}` }}
        >
          <div className="text-[10px] uppercase tracking-[0.3em] mono" style={{ color: accent }}>{label}</div>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.15 }}
            className="text-6xl mt-3"
          >
            {shown.emoji}
          </motion.div>
          <div className="font-display text-2xl font-bold mt-2">{shown.name}</div>
          <div className="text-[12px] text-[var(--muted)] mt-1.5">{shown.description}</div>
          {shown.kind === 'custom' && shown.recurring && (
            <div className="mt-3 inline-block px-2 py-0.5 rounded-full text-[10px] mono uppercase tracking-wider bg-[rgba(168,85,247,0.15)] text-purple-300">
              recurring
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
