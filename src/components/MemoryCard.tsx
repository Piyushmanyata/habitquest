import { Brain, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';

export default function MemoryCard() {
  const memory = useHabitStore(s => s.memory());

  if (memory.totalEntries === 0) {
    return (
      <div className="surface p-4">
        <Header />
        <div className="text-[11px] text-[var(--muted-2)]">Log a few entries and HabitQuest will start learning your patterns.</div>
      </div>
    );
  }

  return (
    <div className="surface p-4">
      <Header />
      <div className="mt-3 space-y-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--muted-2)] mb-1">
            <TrendingUp className="w-3 h-3 text-[var(--pos)]" /> Frequent wins
          </div>
          {memory.topPositives.length === 0
            ? <div className="text-[11px] text-[var(--muted-2)]">— none yet —</div>
            : memory.topPositives.slice(0, 3).map(f => (
                <Row key={f.parentId + f.subId} emoji={f.emoji} name={f.subName} count={f.count} accent="pos" />
              ))}
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--muted-2)] mb-1">
            <TrendingDown className="w-3 h-3 text-[var(--neg)]" /> Recurring slips
          </div>
          {memory.topNegatives.length === 0
            ? <div className="text-[11px] text-[var(--muted-2)]">— none yet —</div>
            : memory.topNegatives.slice(0, 3).map(f => (
                <Row key={f.parentId + f.subId} emoji={f.emoji} name={f.subName} count={f.count} accent="neg" />
              ))}
        </div>
        <div className="flex items-center gap-3 pt-2 border-t hairline text-[11px] text-[var(--muted)]">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> peak {memory.peakHour ?? '—'}:00</span>
          <span className="mono">·</span>
          <span>{Math.round(memory.ratioPos * 100)}% positive</span>
          <span className="mono">·</span>
          <span>{Math.round(memory.consistency * 14)}/14d active</span>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Brain className="w-3.5 h-3.5 text-[var(--accent)]" />
        <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Memory</h3>
      </div>
      <span className="mono text-[10px] text-[var(--muted-2)]">learns from your logs</span>
    </div>
  );
}

function Row({ emoji, name, count, accent }: { emoji: string; name: string; count: number; accent: 'pos' | 'neg' }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[12px] text-[var(--fg)] flex items-center gap-1.5">
        <span>{emoji}</span>{name}
      </span>
      <span className={`mono text-[11px] ${accent === 'pos' ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}`}>×{count}</span>
    </div>
  );
}
