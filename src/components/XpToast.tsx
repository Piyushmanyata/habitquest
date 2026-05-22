import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useHabitStore } from '../store/useHabitStore';

export default function XpToast() {
  const last = useHabitStore(s => s.lastChange);
  const [visible, setVisible] = useState<typeof last>(null);

  useEffect(() => {
    if (!last) return;
    setVisible(last);
    const t = setTimeout(() => setVisible(null), 1600);
    return () => clearTimeout(t);
  }, [last?.at]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <AnimatePresence>
        {visible && (
          <motion.div
            key={visible.at}
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 240, damping: 20 }}
            className={`px-3.5 py-1.5 rounded-md mono text-[12px] font-medium border bg-[#0a0a0b]
              ${visible.delta >= 0 ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--neg)] text-[var(--neg)]'}`}
          >
            {visible.delta >= 0 ? '+' : ''}{visible.delta} XP
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
