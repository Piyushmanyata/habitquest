// Pop-up "+N XP" / "+N gold" numbers that float upward from random positions
// near the journal area whenever XP/gold changes. Mid-screen, pointer-disabled.

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useHabitStore } from '../store/useHabitStore';

type Floater = {
  id: number;
  text: string;
  color: string;
  x: number;       // 0..100 (% across viewport)
  y: number;       // px from top
  size: number;    // font px
};

let nextId = 0;

export default function FloatingNumbers() {
  const last = useHabitStore(s => s.lastChange);
  const xp = useHabitStore(s => s.profile.xp);
  const gold = useHabitStore(s => s.profile.gold);
  const prevXp = useRef(xp);
  const prevGold = useRef(gold);
  const [items, setItems] = useState<Floater[]>([]);

  // Listen for XP changes
  useEffect(() => {
    const d = xp - prevXp.current;
    if (d !== 0) {
      const sign = d > 0 ? '+' : '';
      const color = d > 0 ? 'var(--accent)' : 'var(--neg)';
      const text = `${sign}${d} XP`;
      const size = Math.min(48, 22 + Math.abs(d) * 0.4);
      addFloater(text, color, size);
    }
    prevXp.current = xp;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xp]);

  // Listen for gold changes
  useEffect(() => {
    const d = gold - prevGold.current;
    if (d !== 0) {
      const sign = d > 0 ? '+' : '';
      const color = '#fbbf24'; // amber
      const text = `${sign}${d} 🪙`;
      const size = Math.min(46, 22 + Math.abs(d) * 0.35);
      // Slight delay so it staggers behind the XP floater
      setTimeout(() => addFloater(text, color, size), 60);
    }
    prevGold.current = gold;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gold]);

  function addFloater(text: string, color: string, size: number) {
    const id = ++nextId;
    const x = 35 + Math.random() * 30; // 35..65% (centred-ish)
    const y = 240 + Math.random() * 200; // somewhere mid-page
    setItems(prev => [...prev, { id, text, color, x, y, size }]);
    setTimeout(() => setItems(prev => prev.filter(p => p.id !== id)), 1800);
  }

  // Hide entirely on first render so we don't fire on mount.
  useEffect(() => {
    prevXp.current = xp;
    prevGold.current = gold;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  void last; // keep the dep watch active; the per-field effects above do the work

  return (
    <div className="pointer-events-none fixed inset-0 z-[55] overflow-hidden">
      <AnimatePresence>
        {items.map(it => (
          <motion.div
            key={it.id}
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 1, 0], y: -140, scale: [0.6, 1.15, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: 'easeOut', times: [0, 0.15, 0.7, 1] }}
            className="absolute font-display font-extrabold mono select-none"
            style={{
              left: `${it.x}%`,
              top: it.y,
              transform: 'translate(-50%, 0)',
              color: it.color,
              fontSize: it.size,
              textShadow: `0 0 24px ${it.color}, 0 2px 8px rgba(0,0,0,0.5)`,
              letterSpacing: '-0.02em',
            }}
          >
            {it.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
