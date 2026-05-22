import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useHabitStore } from '../store/useHabitStore';

const RARITY_BORDER: Record<string, string> = {
  common: 'border-[var(--line-2)]',
  rare:   'border-cyan-400/70',
  epic:   'border-fuchsia-400/80',
};
const RARITY_GLOW: Record<string, string> = {
  common: '',
  rare:   'shadow-[0_0_30px_-5px_rgba(34,211,238,0.45)]',
  epic:   'shadow-[0_0_40px_-5px_rgba(232,121,249,0.55)]',
};

export default function LootToast() {
  const loot = useHabitStore(s => s.lastLoot);
  const [visible, setVisible] = useState(loot);

  useEffect(() => {
    if (!loot) return;
    setVisible(loot);
    const t = setTimeout(() => setVisible(null), 2600);
    return () => clearTimeout(t);
  }, [loot?.at]);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <AnimatePresence>
        {visible && (
          <motion.div
            key={visible.at}
            initial={{ opacity: 0, y: -20, scale: 0.85, rotate: -3 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className={`surface px-4 py-3 flex items-center gap-3 border-2 ${RARITY_BORDER[visible.item.rarity]} ${RARITY_GLOW[visible.item.rarity]}`}
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}
              className="text-2xl"
            >
              {visible.item.emoji}
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[14px]">{visible.item.name}</span>
                <span className="mono text-[9px] uppercase tracking-wider text-[var(--muted-2)]">{visible.item.rarity}</span>
              </div>
              <div className="text-[11px] text-[var(--muted)]">{visible.item.description}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
