import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';
import { dayKey } from '../lib/gamification';

export default function CheckinBanner() {
  const lastCheckinDay = useHabitStore(s => s.lastCheckinDay);
  const performCheckin = useHabitStore(s => s.performCheckin);
  const [bonus, setBonus] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const today = dayKey();
  const showPrompt = lastCheckinDay !== today && !dismissed;

  useEffect(() => {
    // Auto-show on first render of a new day. User can dismiss or claim.
    if (showPrompt) {
      // small delay so the page settles
      const t = setTimeout(() => {}, 0);
      return () => clearTimeout(t);
    }
  }, [showPrompt]);

  function claim() {
    const b = performCheckin();
    setBonus(b);
    setTimeout(() => setBonus(null), 1800);
  }

  return (
    <>
      <AnimatePresence>
        {showPrompt && bonus === null && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="surface px-3 py-2 flex items-center gap-2 mb-4"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="text-[12px]">Daily check-in available.</span>
            <button onClick={claim} className="btn btn-primary !py-1 !px-2.5 text-[11px] ml-auto">
              Claim +25 XP
            </button>
            <button onClick={() => setDismissed(true)} className="p-1 text-[var(--muted-2)] hover:text-[var(--fg)]">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
        {bonus !== null && bonus > 0 && (
          <motion.div
            key="ok"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="surface px-3 py-2 flex items-center gap-2 mb-4 border-[var(--accent)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="text-[12px] text-[var(--accent)] mono">+{bonus} XP — welcome back.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
