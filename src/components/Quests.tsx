import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { Gift } from 'lucide-react';

export default function Quests() {
  const quests = useHabitStore(s => s.quests);
  const refresh = useHabitStore(s => s.refreshQuests);
  const claim = useHabitStore(s => s.claimQuest);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Daily Quests</h3>
        <span className="mono text-[10px] text-[var(--muted-2)]">resets 00:00</span>
      </div>
      <div className="space-y-3">
        {quests.map(q => {
          const pct = Math.min(1, q.progress / q.target);
          return (
            <div key={q.id} className="group">
              <div className="flex items-start gap-2.5">
                <div className="text-base leading-none mt-0.5">{q.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-medium text-[var(--fg)] truncate">{q.title}</span>
                    <span className="mono text-[10px] text-[var(--muted-2)] shrink-0">+{q.xpReward}</span>
                  </div>
                  <div className="text-[11px] text-[var(--muted)] leading-snug">{q.description}</div>
                  <div className="mt-1.5 h-[3px] bg-[var(--line)] rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${q.claimed ? 'bg-[var(--muted-2)]' : 'bg-[var(--accent)]'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct * 100}%` }}
                      transition={{ type: 'spring', stiffness: 80, damping: 16 }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="mono text-[10px] text-[var(--muted-2)]">{q.progress}/{q.target}</span>
                    {q.completed && !q.claimed && (
                      <button
                        onClick={() => { claim(q.id); confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } }); }}
                        className="text-[10px] mono uppercase tracking-wider text-[var(--accent)] hover:underline flex items-center gap-1"
                      >
                        <Gift className="w-3 h-3" /> Claim
                      </button>
                    )}
                    {q.claimed && <span className="mono text-[10px] text-[var(--muted-2)]">claimed</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
