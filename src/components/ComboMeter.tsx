import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';

export default function ComboMeter() {
  const combo = useHabitStore(s => s.combo);
  const expires = useHabitStore(s => s.comboExpiresAt);
  const mult = useHabitStore(s => s.comboMultiplier());
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force(x => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const alive = Date.now() < expires && combo > 0;
  const remaining = Math.max(0, expires - Date.now());
  const pct = alive ? Math.min(1, remaining / (25 * 60 * 1000)) : 0;

  // Higher combo tiers get more aggressive animations + chromatic shift
  const tier = combo >= 7 ? 3 : combo >= 5 ? 2 : combo >= 3 ? 1 : 0;
  const flameColor = tier === 3 ? 'text-purple-400'
                   : tier === 2 ? 'text-pink-400'
                   : tier === 1 ? 'text-amber-300'
                   : 'text-orange-400';
  const barGradient = tier === 3 ? 'bg-gradient-to-r from-purple-500 via-pink-400 to-amber-300'
                    : tier === 2 ? 'bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-300'
                    : 'bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300';
  const flameSpeed = tier === 3 ? 0.55 : tier === 2 ? 0.7 : tier === 1 ? 0.9 : 1.2;

  return (
    <AnimatePresence>
      {alive && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.9 }}
          className={`surface px-3 py-2 flex items-center gap-3 ${tier >= 2 ? 'combo-rgb' : ''}`}
          style={tier >= 2
            ? { boxShadow: `0 0 28px -6px ${tier === 3 ? 'rgba(168,85,247,0.5)' : 'rgba(236,72,153,0.4)'}` }
            : {}}
        >
          <motion.div
            animate={{ scale: [1, 1.25, 1], rotate: tier >= 2 ? [0, -8, 8, 0] : 0 }}
            transition={{ duration: flameSpeed, repeat: Infinity }}
            className={flameColor}
          >
            <Flame className="w-4 h-4" />
          </motion.div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="mono font-semibold text-[var(--fg)] text-sm">×{mult.toFixed(2)}</span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--muted-2)]">combo {combo}</span>
            </div>
            <div className="mt-1 h-[3px] w-32 bg-[var(--line)] rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${barGradient}`}
                animate={{ width: `${pct * 100}%` }}
                transition={{ ease: 'linear', duration: 0.6 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
