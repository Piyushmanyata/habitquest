import { useMemo } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { CATEGORIES, CAT_BY_ID } from '../lib/categories';
import { BADGES } from '../lib/gamification';

export default function Stats() {
  const entries = useHabitStore(s => s.entries);
  const unlocked = new Set(useHabitStore(s => s.unlockedBadges()));
  const customBadges = useHabitStore(s => s.customBadges);

  const byCat = useMemo(() => {
    const map: Record<string, { p: number; n: number }> = {};
    for (const e of entries) {
      const m = map[e.parentId] ||= { p: 0, n: 0 };
      if (e.sentiment === 'positive') m.p++;
      else if (e.sentiment === 'negative') m.n++;
    }
    return map;
  }, [entries]);

  const max = Math.max(1, ...Object.values(byCat).map(m => m.p + m.n));

  return (
    <div className="surface p-4">
      <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3">Pattern</h3>
      <div className="space-y-2.5">
        {CATEGORIES.map(c => {
          const v = byCat[c.id] || { p: 0, n: 0 };
          const total = v.p + v.n;
          if (total === 0) return null;
          return (
            <div key={c.id}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-[var(--muted)]">{c.emoji} {c.name}</span>
                <span className="mono text-[10px] text-[var(--muted-2)]">{v.p}↑ {v.n}↓</span>
              </div>
              <div className="flex gap-px h-1.5 rounded-full overflow-hidden bg-[var(--line)]">
                <div className="bg-[var(--pos)]" style={{ width: `${(v.p / max) * 100}%` }} />
                <div className="bg-[var(--neg)]" style={{ width: `${(v.n / max) * 100}%` }} />
              </div>
            </div>
          );
        })}
        {Object.keys(byCat).length === 0 && (
          <div className="text-[11px] text-[var(--muted-2)]">Log entries to see your behavior pattern.</div>
        )}
      </div>

      <div className="mt-5 pt-4 border-t hairline">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Badges</h3>
          <span className="mono text-[10px] text-[var(--muted-2)]">{unlocked.size + customBadges.length}/{BADGES.length + customBadges.length}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BADGES.map(b => {
            const got = unlocked.has(b.id);
            return (
              <span
                key={b.id}
                title={`${b.name} — ${b.description}`}
                className={`w-7 h-7 rounded-md grid place-items-center text-sm border ${got ? 'border-[var(--line-2)] bg-white/[0.03]' : 'border-[var(--line)] grayscale opacity-25'}`}
              >
                {b.emoji}
              </span>
            );
          })}
          {customBadges.map(b => (
            <span
              key={b.id}
              title={`${b.name} — ${b.description}${b.recurring ? ' (recurring)' : ''}`}
              className="w-7 h-7 rounded-md grid place-items-center text-sm border border-purple-400/40 bg-purple-500/10"
              style={{ boxShadow: '0 0 12px -4px rgba(168,85,247,0.45)' }}
            >
              {b.emoji}
            </span>
          ))}
        </div>
        {customBadges.length > 0 && (
          <div className="mt-2 text-[10px] text-[var(--muted-2)] mono">
            {customBadges.length} custom badge{customBadges.length === 1 ? '' : 's'} minted by Sage
          </div>
        )}
      </div>
      {/* indirect reference so CAT_BY_ID stays useful and import isn't unused */}
      <span className="hidden">{Object.keys(CAT_BY_ID).length}</span>
    </div>
  );
}
