import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronRight, Filter, Trash2 } from 'lucide-react';
import { useHabitStore, Entry } from '../store/useHabitStore';
import { CATEGORIES, CAT_BY_ID, findSub } from '../lib/categories';

type SentFilter = 'all' | 'positive' | 'negative' | 'neutral';
type SortBy = 'recent' | 'oldest' | 'xp-desc' | 'xp-asc' | 'intensity';

function relTime(iso: string) {
  const d = new Date(iso); const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  const days = Math.floor(s/86400);
  return days < 30 ? `${days}d ago` : d.toLocaleDateString();
}

export default function Logs() {
  const entries = useHabitStore(s => s.entries);
  const remove = useHabitStore(s => s.deleteEntry);

  const [query, setQuery] = useState('');
  const [sent, setSent] = useState<SentFilter>('all');
  const [sort, setSort] = useState<SortBy>('recent');
  const [openParents, setOpenParents] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.id)));

  // Apply filters
  const filtered = useMemo(() => {
    let xs = entries;
    if (sent !== 'all') xs = xs.filter(e => e.sentiment === sent);
    if (query.trim()) {
      const q = query.toLowerCase();
      xs = xs.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.text.toLowerCase().includes(q) ||
        e.quip.toLowerCase().includes(q),
      );
    }
    return xs;
  }, [entries, query, sent]);

  // Group by parent → sub
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, Entry[]>>();
    for (const e of filtered) {
      let parent = map.get(e.parentId);
      if (!parent) { parent = new Map(); map.set(e.parentId, parent); }
      const list = parent.get(e.subId) || [];
      list.push(e);
      parent.set(e.subId, list);
    }
    // Sort entries within each sub
    const sortFn = (a: Entry, b: Entry) => {
      if (sort === 'recent')   return b.createdAt.localeCompare(a.createdAt);
      if (sort === 'oldest')   return a.createdAt.localeCompare(b.createdAt);
      if (sort === 'xp-desc')  return b.xpDelta - a.xpDelta;
      if (sort === 'xp-asc')   return a.xpDelta - b.xpDelta;
      if (sort === 'intensity') return (b.intensity || 0) - (a.intensity || 0);
      return 0;
    };
    for (const subs of map.values()) {
      for (const list of subs.values()) list.sort(sortFn);
    }
    return map;
  }, [filtered, sort]);

  // Per-parent aggregates
  const parentStats = useMemo(() => {
    const stats: Record<string, { count: number; wins: number; slips: number; xp: number }> = {};
    for (const [pid, subs] of grouped) {
      const s = stats[pid] = { count: 0, wins: 0, slips: 0, xp: 0 };
      for (const list of subs.values()) {
        for (const e of list) {
          s.count++; s.xp += e.xpDelta;
          if (e.sentiment === 'positive') s.wins++;
          else if (e.sentiment === 'negative') s.slips++;
        }
      }
    }
    return stats;
  }, [grouped]);

  function toggleParent(pid: string) {
    setOpenParents(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid); else next.add(pid);
      return next;
    });
  }

  function expandAll() { setOpenParents(new Set(CATEGORIES.map(c => c.id))); }
  function collapseAll() { setOpenParents(new Set()); }

  const totalFiltered = filtered.length;
  const totalAll = entries.length;

  if (totalAll === 0) {
    return (
      <div className="surface p-10 text-center">
        <div className="text-sm text-[var(--muted)]">No logs yet.</div>
        <div className="text-xs text-[var(--muted-2)] mt-1">Head to the Journal tab and write your first entry.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="surface p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[var(--muted-2)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search titles, text, quips…"
            className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-[var(--muted-2)]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[10px] mono text-[var(--muted-2)] hover:text-[var(--fg)]">clear</button>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          <Filter className="w-3 h-3 text-[var(--muted-2)]" />
          <FilterChip active={sent === 'all'}      onClick={() => setSent('all')}>all</FilterChip>
          <FilterChip active={sent === 'positive'} onClick={() => setSent('positive')} color="pos">wins</FilterChip>
          <FilterChip active={sent === 'negative'} onClick={() => setSent('negative')} color="neg">slips</FilterChip>
          <FilterChip active={sent === 'neutral'}  onClick={() => setSent('neutral')}>neutral</FilterChip>
        </div>

        <select value={sort} onChange={e => setSort(e.target.value as SortBy)}
                className="text-[11px] mono px-2 py-1 rounded-md border hairline-2 bg-[var(--panel)]">
          <option value="recent">recent first</option>
          <option value="oldest">oldest first</option>
          <option value="xp-desc">XP high → low</option>
          <option value="xp-asc">XP low → high</option>
          <option value="intensity">intensity</option>
        </select>

        <div className="text-[10px] mono text-[var(--muted-2)] ml-auto">
          {totalFiltered} / {totalAll}
        </div>
        <button onClick={expandAll} className="text-[10px] mono text-[var(--muted-2)] hover:text-[var(--fg)]">expand</button>
        <span className="text-[var(--muted-2)]">·</span>
        <button onClick={collapseAll} className="text-[10px] mono text-[var(--muted-2)] hover:text-[var(--fg)]">collapse</button>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {CATEGORIES.map(parent => {
          const subs = grouped.get(parent.id);
          if (!subs || subs.size === 0) return null;
          const s = parentStats[parent.id];
          const expanded = openParents.has(parent.id);

          return (
            <div key={parent.id} className="surface">
              <button
                onClick={() => toggleParent(parent.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.02]"
              >
                {expanded
                  ? <ChevronDown  className="w-3.5 h-3.5 text-[var(--muted-2)]" />
                  : <ChevronRight className="w-3.5 h-3.5 text-[var(--muted-2)]" />
                }
                <span className="text-xl">{parent.emoji}</span>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-[13px]">{parent.name}</div>
                  <div className="text-[10px] text-[var(--muted-2)] mono">
                    {s.count} entries · {s.wins}↑ {s.slips}↓ ·
                    <span className={s.xp >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}> {s.xp >= 0 ? '+' : ''}{s.xp} XP</span>
                  </div>
                </div>
                <div className="flex gap-px h-1 w-32 rounded-full overflow-hidden bg-[var(--line)]">
                  <div className="bg-[var(--pos)]" style={{ width: `${s.count ? (s.wins / s.count) * 100 : 0}%` }} />
                  <div className="bg-[var(--neg)]" style={{ width: `${s.count ? (s.slips / s.count) * 100 : 0}%` }} />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-2 border-t hairline pt-3">
                      {[...subs.entries()].sort((a, b) => b[1].length - a[1].length).map(([subId, list]) => {
                        const sub = findSub(parent.id, subId);
                        const subXp = list.reduce((a, e) => a + e.xpDelta, 0);
                        return (
                          <div key={subId} className="surface-soft">
                            <div className="flex items-center gap-2 p-2.5">
                              <span>{sub?.emoji || '•'}</span>
                              <span className="text-[12px] font-medium text-[var(--fg)]">{sub?.name || subId}</span>
                              <span className="ml-auto mono text-[10px] text-[var(--muted-2)]">
                                {list.length} · <span className={subXp >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}>{subXp >= 0 ? '+' : ''}{subXp}</span>
                              </span>
                            </div>
                            <div className="px-2.5 pb-2.5 space-y-1.5">
                              {list.map(e => <LogRow key={e.id} e={e} onDelete={remove} parentEmoji={parent.emoji} />)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <span className="hidden">{Object.keys(CAT_BY_ID).length}</span>
    </div>
  );
}

function FilterChip({ children, active, onClick, color }: {
  children: React.ReactNode; active: boolean; onClick: () => void; color?: 'pos' | 'neg';
}) {
  const activeCls = color === 'pos'
    ? 'bg-[var(--accent)] text-[#0a0a0b]'
    : color === 'neg'
      ? 'bg-[var(--neg)] text-[#0a0a0b]'
      : 'bg-[var(--fg)] text-[#0a0a0b]';
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded text-[10px] mono uppercase tracking-wider transition
        ${active ? activeCls : 'text-[var(--muted)] hover:text-[var(--fg)] hover:bg-white/5'}`}
    >
      {children}
    </button>
  );
}

function LogRow({ e, parentEmoji, onDelete }: { e: Entry; parentEmoji: string; onDelete: (id: string) => void }) {
  const isPos = e.sentiment === 'positive';
  const isNeg = e.sentiment === 'negative';
  return (
    <div className="flex items-start gap-2 p-2 rounded border hairline-2 bg-[var(--panel-2)] group">
      <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${isPos ? 'bg-[var(--pos)]' : isNeg ? 'bg-[var(--neg)]' : 'bg-[var(--muted-2)]'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-medium text-[var(--fg)] truncate">{e.title}</span>
          <span className="text-[10px] text-[var(--muted-2)] mono shrink-0">{relTime(e.createdAt)}</span>
        </div>
        {e.quip && <div className={`text-[11px] italic mt-0.5 ${isPos ? 'text-[var(--pos)]' : isNeg ? 'text-[var(--neg)]' : 'text-[var(--muted)]'}`}>"{e.quip}"</div>}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className={`chip mono ${isPos ? 'chip-pos' : isNeg ? 'chip-neg' : ''}`}>
            {e.xpDelta >= 0 ? '+' : ''}{e.xpDelta} XP
          </span>
          {e.intensity && <span className="chip text-[10px]">i={e.intensity}</span>}
          {e.multiplierAtTime && e.multiplierAtTime > 1 && (
            <span className="chip text-[10px]">×{e.multiplierAtTime.toFixed(2)}</span>
          )}
          {e.source === 'ai' && <span className="chip text-[10px]">AI</span>}
          {e.batchId && <span className="chip text-[10px]" title="batch">⊞</span>}
        </div>
      </div>
      <button
        onClick={() => onDelete(e.id)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--muted-2)] hover:text-[var(--neg)] transition"
      >
        <Trash2 className="w-3 h-3" />
      </button>
      <span className="hidden">{parentEmoji}</span>
    </div>
  );
}
