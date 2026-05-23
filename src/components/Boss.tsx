import { motion, AnimatePresence } from 'framer-motion';
import { Skull } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';
import { useEffect, useState } from 'react';

export default function Boss() {
  const boss = useHabitStore(s => s.todaysBoss());
  const [hit, setHit] = useState(false);
  const [shown, setShown] = useState(boss.hpLeft);

  useEffect(() => {
    if (shown !== boss.hpLeft) {
      setHit(true);
      const t1 = setTimeout(() => setHit(false), 280);
      const t2 = setTimeout(() => setShown(boss.hpLeft), 60);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [boss.hpLeft]);

  const pct = Math.max(0, Math.min(1, boss.hpLeft / boss.maxHp));
  const dead = boss.defeated || boss.hpLeft <= 0;
  const lowHp = !dead && pct < 0.25;

  return (
    <div className={`surface p-4 relative ${lowHp ? 'pulse-red' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider flex items-center gap-2">
          Today's Boss
          {boss.bossIndex > 0 && (
            <span className="mono text-[9px] px-1.5 py-0.5 rounded bg-amber-300/15 text-amber-300 border border-amber-300/30">
              wave {boss.bossIndex + 1}
            </span>
          )}
        </h3>
        {dead ? (
          <span className="chip chip-pos mono">DEFEATED · +{boss.xpReward}</span>
        ) : (
          <span className={`mono text-[10px] ${lowHp ? 'text-[var(--neg)]' : 'text-[var(--muted-2)]'}`}>{boss.hpLeft}/{boss.maxHp} HP</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <motion.div
          animate={
            hit
              ? { x: [0, -4, 4, -3, 3, 0], filter: ['none', 'brightness(1.6)', 'none'] }
              : dead
                ? { y: 0, rotate: 0 }
                : { y: [0, -3, 0], rotate: lowHp ? [0, -2, 2, 0] : 0 }
          }
          transition={
            hit
              ? { duration: 0.32 }
              : dead
                ? {}
                : { duration: lowHp ? 0.9 : 2.4, repeat: Infinity, ease: 'easeInOut' }
          }
          className={`text-4xl ${dead ? 'grayscale opacity-40' : ''}`}
        >
          {dead ? <Skull className="w-10 h-10 text-[var(--muted-2)]" /> : boss.emoji}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className={`text-[14px] font-semibold ${dead ? 'line-through text-[var(--muted-2)]' : 'text-[var(--fg)]'}`}>{boss.name}</div>
          <div className="text-[11px] text-[var(--muted)] italic">{boss.flavor}</div>
          <div className="mt-2 h-2 bg-[var(--line)] rounded-full overflow-hidden relative">
            <motion.div
              className={`h-full ${lowHp ? 'bg-gradient-to-r from-rose-600 via-rose-400 to-orange-300' : 'bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300'}`}
              initial={{ width: '100%' }}
              animate={{ width: `${pct * 100}%` }}
              transition={{ type: 'spring', stiffness: 80, damping: 14 }}
            />
            <AnimatePresence>
              {hit && (
                <motion.div
                  initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white"
                  transition={{ duration: 0.28 }}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      {!dead && (
        <div className="mt-2 text-[10px] text-[var(--muted-2)]">
          Positive entries deal damage. Defeat for <span className="mono text-[var(--accent)]">+{boss.xpReward} XP</span>.
        </div>
      )}
    </div>
  );
}
