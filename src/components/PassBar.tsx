import { motion } from 'framer-motion';
import { useHabitStore } from '../store/useHabitStore';
import { ITEM_BY_ID } from '../lib/shop';

export default function PassBar() {
  const passes = useHabitStore(s => s.passes);
  const customItems = useHabitStore(s => s.customItems);
  const usePass = useHabitStore(s => s.usePass);
  const lookup = (id: string) => ITEM_BY_ID[id] || customItems.find(i => i.id === id);
  const entries = Object.entries(passes).filter(([, n]) => n > 0);
  if (entries.length === 0) return null;

  return (
    <div className="surface p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Quick-log passes</span>
        <span className="text-[10px] text-[var(--muted-2)] ml-auto">tap to use · no penalty</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {entries.map(([id, n]) => {
          const item = lookup(id);
          if (!item) return null;
          return (
            <motion.button
              key={id}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => usePass(id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--line)] hover:bg-[#2f2f36] text-[12px] font-medium border hairline-2"
            >
              <span>{item.emoji}</span>
              <span>{item.name}</span>
              <span className="mono text-[10px] text-[var(--accent)]">×{n}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
