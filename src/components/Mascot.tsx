import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { useHabitStore } from '../store/useHabitStore';

// Picks an emoji vibe based on recent activity and active combo.
function pickMascot(entries: { sentiment: string; createdAt: string }[], combo: number, multAlive: boolean) {
  const recent = entries.slice(0, 3);
  const lastNeg = entries.find(e => e.sentiment === 'negative');
  const recentlyBad = lastNeg && Date.now() - new Date(lastNeg.createdAt).getTime() < 15 * 60 * 1000;
  if (combo >= 4 && multAlive) return { face: '🤩', label: 'unstoppable' };
  if (combo >= 2 && multAlive) return { face: '🔥', label: 'cooking' };
  if (recentlyBad) return { face: '😬', label: 'rough patch' };
  if (recent.some(e => e.sentiment === 'positive')) return { face: '🙂', label: 'steady' };
  if (entries.length === 0) return { face: '😴', label: 'sleepy' };
  return { face: '🫥', label: 'neutral' };
}

export default function Mascot() {
  const entries = useHabitStore(s => s.entries);
  const combo = useHabitStore(s => s.combo);
  const expires = useHabitStore(s => s.comboExpiresAt);
  const multAlive = Date.now() < expires;

  const mascot = useMemo(() => pickMascot(entries, combo, multAlive), [entries, combo, multAlive]);

  return (
    <div className="flex items-center gap-2">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={mascot.face}
          initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotate: 20 }}
          transition={{ type: 'spring', stiffness: 280, damping: 16 }}
          className="text-2xl select-none"
          aria-label={mascot.label}
          title={mascot.label}
        >
          {mascot.face}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
