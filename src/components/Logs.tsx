// Logs tab — the full archive of every journal entry.
// Two view modes:
//   • by category (default)   — entries grouped by parent → sub
//   • by date                 — entries grouped by day (Today / Yesterday / full date)
// Both modes default to collapsed; user opens groups they care about.

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronDown, ChevronRight, Filter, Trash2,
  Maximize2, Minimize2, ArrowUpDown, X, LayoutGrid, Calendar,
} from 'lucide-react';
import { useHabitStore, Entry } from '../store/useHabitStore';
import { CATEGORIES, CAT_BY_ID, findSub } from '../lib/categories';

type SentFilter = 'all' | 'positive' | 'negative' | 'neutral';
type SortBy = 'recent' | 'oldest' | 'xp-desc' | 'xp-asc' | 'intensity';
type ViewMode = 'category' | 'date';

function relTime(iso: string) {
  const d = new Date(iso); const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86400);
  return days < 30 ? `${days}d ago` : d.toLocaleDateString();
}

function dayLabel(key: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(key + 'T00:00:00');
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: diff > 300 ? 'numeric' : undefined });
}

function clockTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function Logs() {
  const entries = useHabitStore(s => s.entries);
  const remove = useHabitStore(s => s.deleteEntry);

  const [query, setQuery] = useState('');
  const [sent, setSent] = useState<SentFilter>('all');
  const [sort, setSort] = useState<SortBy>('recent');
  const [view, setView] = useState<ViewMode>('category');
  // Defaults collapsed for both views — user expands what they care about.
  const [openParents, setOpenParents] = useState<Set<string>>(new Set());
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());

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

  // Sort comparator used in BOTH views.
  const sortFn = useMemo(() => (a: Entry, b: Entry) => {
    if (sort === 'recent')    return b.createdAt.localeCompare(a.createdAt);
    if (sort === 'oldest')    return a.createdAt.localeCompare(b.createdAt);
    if (sort === 'xp-desc')   return b.xpDelta - a.xpDelta;
    if (sort === 'xp-asc')    return a.xpDelta - b.xpDelta;
    if (sort === 'intensity') return (b.intensity || 0) - (a.intensity || 0);
    return 0;
  }, [sort]);

  // ── CATEGORY VIEW grouping (parent → sub → entries) ─────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, Entry[]>>();
    for (const e of filtered) {
      let parent = map.get(e.parentId);
      if (!parent) { parent = new Map(); map.set(e.parentId, parent); }
      const list = parent.get(e.subId) || [];
      list.push(e);
      parent.set(e.subId, list);
    }
    for (const subs of map.values()) {
      for (const list of subs.values()) list.sort(sortFn);
    }
    return map;
  }, [filtered, sortFn]);

  // Per-parent aggregates (category view)
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

  // ── DATE VIEW grouping (day → entries) ──────────────────────────────
  const byDay = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of filtered) {
      const list = map.get(e.dayKey) || [];
      list.push(e);
      map.set(e.dayKey, list);
    }
    for (const list of map.values()) list.sort(sortFn);
    // Always show days newest-first in date view headers, regardless of intra-day sort.
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered, sortFn]);

  const dayStats = useMemo(() => {
    const out: Record<string, { count: number; wins: number; slips: number; xp: number; neutral: number }> = {};
    for (const [day, list] of byDay) {
      const s = out[day] = { count: 0, wins: 0, slips: 0, xp: 0, neutral: 0 };
      for (const e of list) {
        s.count++; s.xp += e.xpDelta;
        if (e.sentiment === 'positive') s.wins++;
        else if (e.sentiment === 'negative') s.slips++;
        else s.neutral++;
      }
    }
    return out;
  }, [byDay]);

  function toggleParent(pid: string) {
    setOpenParents(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid); else next.add(pid);
      return next;
    });
  }
  function toggleDay(d: string) {
    setOpenDays(prev => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  }

  function expandAll() {
    if (view === 'category') setOpenParents(new Set(CATEGORIES.map(c => c.id)));
    else setOpenDays(new Set(byDay.map(([d]) => d)));
  }
  function collapseAll() {
    if (view === 'category') setOpenParents(new Set());
    else setOpenDays(new Set());
  }

  const totalFiltered = filtered.length;
  const totalAll = entries.length;

  // Aggregate KPIs across whatever's currently filtered.
  const kpis = useMemo(() => {
    let wins = 0, slips = 0, neutral = 0, xp = 0, intensitySum = 0;
    for (const e of filtered) {
      xp += e.xpDelta;
      intensitySum += (e.intensity || 0);
      if (e.sentiment === 'positive') wins++;
      else if (e.sentiment === 'negative') slips++;
      else neutral++;
    }
    return {
      wins, slips, neutral, xp,
      avgIntensity: filtered.length ? (intensitySum / filtered.length).toFixed(1) : '—',
      winRatio: wins + slips ? Math.round((wins / (wins + slips)) * 100) : null,
    };
  }, [filtered]);

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
      {/* KPI strip */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2"
      >
        <KpiTile label="Entries" value={`${totalFiltered}${totalFiltered !== totalAll ? `/${totalAll}` : ''}`} />
        <KpiTile label="Wins" value={kpis.wins} accent="pos" />
        <KpiTile label="Slips" value={kpis.slips} accent="neg" />
        <KpiTile label="Neutral" value={kpis.neutral} />
        <KpiTile label="Net XP" value={`${kpis.xp >= 0 ? '+' : ''}${kpis.xp}`} accent={kpis.xp >= 0 ? 'pos' : 'neg'} />
        <KpiTile label="Win rate" value={kpis.winRatio === null ? '—' : `${kpis.winRatio}%`} accent={kpis.winRatio !== null && kpis.winRatio >= 60 ? 'pos' : undefined} />
      </motion.div>

      {/* Toolbar */}
      <div className="surface p-3 flex flex-wrap items-center gap-2">
        {/* View-mode toggle — segmented button */}
        <div className="inline-flex rounded-md border hairline-2 overflow-hidden text-[11px] mono uppercase tracking-wider">
          <button
            onClick={() => setView('category')}
            title="Group by category"
            className={`px-2.5 py-1 flex items-center gap-1.5 transition ${
              view === 'category'
                ? 'bg-[var(--accent)] text-[#0a0a0b]'
                : 'text-[var(--muted)] hover:text-[var(--fg)] hover:bg-white/5'
            }`}
          >
            <LayoutGrid className="w-3 h-3" /> category
          </button>
          <button
            onClick={() => setView('date')}
            title="Group by date"
            className={`px-2.5 py-1 flex items-center gap-1.5 transition border-l hairline-2 ${
              view === 'date'
                ? 'bg-[var(--accent)] text-[#0a0a0b]'
                : 'text-[var(--muted)] hover:text-[var(--fg)] hover:bg-white/5'
            }`}
          >
            <Calendar className="w-3 h-3" /> date
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[160px]">
          <Search className="w-3.5 h-3.5 text-[var(--muted-2)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search titles, text, quips…"
            className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-[var(--muted-2)]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              title="Clear search"
              className="p-0.5 rounded text-[var(--muted-2)] hover:text-[var(--fg)] hover:bg-white/5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          <Filter className="w-3 h-3 text-[var(--muted-2)]" />
          <FilterChip active={sent === 'all'}      onClick={() => setSent('all')}>all</FilterChip>
          <FilterChip active={sent === 'positive'} onClick={() => setSent('positive')} color="pos">wins</FilterChip>
          <FilterChip active={sent === 'negative'} onClick={() => setSent('negative')} color="neg">slips</FilterChip>
          <FilterChip active={sent === 'neutral'}  onClick={() => setSent('neutral')}>neutral</FilterChip>
        </div>

        <label className="flex items-center gap-1 text-[11px] mono text-[var(--muted-2)]" title="Sort">
          <ArrowUpDown className="w-3 h-3" />
          <select value={sort} onChange={e => setSort(e.target.value as SortBy)}
                  className="px-2 py-1 rounded-md border hairline-2 bg-[var(--panel)]">
            <option value="recent">recent</option>
            <option value="oldest">oldest</option>
            <option value="xp-desc">XP ↓</option>
            <option value="xp-asc">XP ↑</option>
            <option value="intensity">intensity</option>
          </select>
        </label>

        <div className="text-[10px] mono text-[var(--muted-2)] ml-auto">
          {totalFiltered} / {totalAll}
        </div>
        <button
          onClick={expandAll}
          title="Expand all"
          className="p-1 rounded text-[var(--muted-2)] hover:text-[var(--fg)] hover:bg-white/5 transition"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={collapseAll}
          title="Collapse all"
          className="p-1 rounded text-[var(--muted-2)] hover:text-[var(--fg)] hover:bg-white/5 transition"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ────────── BY CATEGORY ────────── */}
      {view === 'category' && (
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
          {/* No-match state inside filter */}
          {grouped.size === 0 && (
            <div className="surface p-8 text-center">
              <div className="text-[12px] text-[var(--muted)]">No entries match your filters.</div>
            </div>
          )}
        </div>
      )}

      {/* ────────── BY DATE ────────── */}
      {view === 'date' && (
        <div className="space-y-3">
          {byDay.map(([day, list]) => {
            const s = dayStats[day];
            const expanded = openDays.has(day);
            return (
              <div key={day} className="surface">
                <button
                  onClick={() => toggleDay(day)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.02]"
                >
                  {expanded
                    ? <ChevronDown  className="w-3.5 h-3.5 text-[var(--muted-2)]" />
                    : <ChevronRight className="w-3.5 h-3.5 text-[var(--muted-2)]" />
                  }
                  <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-[13px]">{dayLabel(day)}</div>
                    <div className="text-[10px] text-[var(--muted-2)] mono">
                      {day} · {s.count} entries · {s.wins}↑ {s.slips}↓
                      {s.neutral > 0 && ` · ${s.neutral}~`}
                      {' · '}
                      <span className={s.xp >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}>
                        {s.xp >= 0 ? '+' : ''}{s.xp} XP
                      </span>
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
                      <div className="px-3 pb-3 pt-3 border-t hairline space-y-1.5">
                        {list.map(e => (
                          <DateRow key={e.id} e={e} onDelete={remove} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {byDay.length === 0 && (
            <div className="surface p-8 text-center">
              <div className="text-[12px] text-[var(--muted)]">No entries match your filters.</div>
            </div>
          )}
        </div>
      )}

      <span className="hidden">{Object.keys(CAT_BY_ID).length}</span>
    </div>
  );
}

function KpiTile({ label, value, accent }: { label: string; value: React.ReactNode; accent?: 'pos' | 'neg' }) {
  const cls = accent === 'pos' ? 'text-[var(--pos)]' : accent === 'neg' ? 'text-[var(--neg)]' : 'text-[var(--fg)]';
  return (
    <div className="surface p-2.5">
      <div className="text-[9.5px] uppercase tracking-wider text-[var(--muted-2)]">{label}</div>
      <div className={`mono text-lg mt-0.5 leading-tight ${cls}`}>{value}</div>
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

// Compact row used in the category view.
function LogRow({ e, parentEmoji, onDelete }: { e: Entry; parentEmoji: string; onDelete: (id: string) => void }) {
  const isPos = e.sentiment === 'positive';
  const isNeg = e.sentiment === 'negative';
  return (
    <div className="flex items-start gap-2 p-2 rounded border hairline-2 bg-[var(--panel-2)] group fade-up transition hover:border-[var(--line-2)] hover:bg-[var(--panel)]">
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

// Date-view row — leads with the clock time and shows category as a chip.
function DateRow({ e, onDelete }: { e: Entry; onDelete: (id: string) => void }) {
  const parent = CAT_BY_ID[e.parentId];
  const sub = findSub(e.parentId, e.subId);
  const isPos = e.sentiment === 'positive';
  const isNeg = e.sentiment === 'negative';
  return (
    <div className="flex items-start gap-2 p-2 rounded border hairline-2 bg-[var(--panel-2)] group fade-up transition hover:border-[var(--line-2)] hover:bg-[var(--panel)]">
      <span className="mono text-[10.5px] text-[var(--muted-2)] mt-0.5 w-12 tabular-nums shrink-0">{clockTime(e.createdAt)}</span>
      <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${isPos ? 'bg-[var(--pos)]' : isNeg ? 'bg-[var(--neg)]' : 'bg-[var(--muted-2)]'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-medium text-[var(--fg)] truncate">{e.title}</span>
          {parent && (
            <span className="chip text-[10px] shrink-0">
              <span>{parent.emoji}</span>{sub?.name || parent.name}
            </span>
          )}
        </div>
        {e.quip && <div className={`text-[11px] italic mt-0.5 ${isPos ? 'text-[var(--pos)]' : isNeg ? 'text-[var(--neg)]' : 'text-[var(--muted)]'}`}>"{e.quip}"</div>}
        {e.reflection && (
          <div className="mt-1 pl-2 border-l-2 hairline-2 text-[11px] text-[var(--muted)] leading-snug italic">
            {e.reflection}
          </div>
        )}
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
    </div>
  );
}
