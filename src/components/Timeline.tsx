import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Loader2 } from 'lucide-react';
import { useHabitStore, Entry } from '../store/useHabitStore';
import { CAT_BY_ID, findSub } from '../lib/categories';
import { useMemo } from 'react';

function relTime(iso: string) {
  const d = new Date(iso); const now = Date.now();
  const s = Math.floor((now - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function dayLabel(key: string) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(key + 'T00:00:00');
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function Timeline() {
  const entries = useHabitStore(s => s.entries);
  const remove = useHabitStore(s => s.deleteEntry);

  const groups = useMemo(() => {
    const map: Record<string, Entry[]> = {};
    for (const e of entries) (map[e.dayKey] ||= []).push(e);
    return Object.entries(map).sort((a, b) => a[0] < b[0] ? 1 : -1);
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="surface p-10 text-center">
        <div className="text-sm text-[var(--muted)]">Your journal is empty.</div>
        <div className="text-xs text-[var(--muted-2)] mt-1">Log your first action above — anything you did, good or bad.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(([day, list]) => (
        <section key={day}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">{dayLabel(day)}</h3>
            <div className="flex-1 h-px bg-[var(--line)]" />
            <span className="mono text-[10px] text-[var(--muted-2)]">{list.length}</span>
          </div>
          <div className="space-y-1.5">
            <AnimatePresence initial={false}>
              {list.map(e => <Row key={e.id} e={e} onDelete={remove} />)}
            </AnimatePresence>
          </div>
        </section>
      ))}
    </div>
  );
}

function Row({ e, onDelete }: { e: Entry; onDelete: (id: string) => void }) {
  const parent = CAT_BY_ID[e.parentId];
  const sub = findSub(e.parentId, e.subId);
  const sign = e.xpDelta > 0 ? '+' : '';
  const isPos = e.sentiment === 'positive';
  const isNeg = e.sentiment === 'negative';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="surface p-3.5 flex items-start gap-3 group"
    >
      <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${isPos ? 'bg-[var(--pos)]' : isNeg ? 'bg-[var(--neg)]' : 'bg-[var(--muted-2)]'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[15px] text-[var(--fg)] font-medium">{e.title}</span>
          {e.analyzing && <Loader2 className="w-3 h-3 animate-spin text-[var(--muted-2)]" />}
        </div>
        {e.quip && (
          <div className={`mt-1.5 text-[13px] leading-snug italic
            ${isPos ? 'text-[var(--pos)]' : isNeg ? 'text-[var(--neg)]' : 'text-[var(--fg)]'}`}>
            “{e.quip}”
          </div>
        )}
        <div className="mt-1 text-[11px] text-[var(--muted-2)] leading-relaxed">{e.reasoning}</div>
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {parent && sub && (
            <span className="chip"><span>{parent.emoji}</span>{parent.name} · {sub.name}</span>
          )}
          <span className={`chip ${isPos ? 'chip-pos' : isNeg ? 'chip-neg' : ''} mono`}>
            {sign}{e.xpDelta} XP
          </span>
          {e.multiplierAtTime > 1 && (
            <span className="chip mono text-[10px]" title="combo multiplier">×{e.multiplierAtTime.toFixed(2)}</span>
          )}
          {e.source === 'ai' && <span className="chip mono text-[10px]">AI</span>}
          <span className="ml-auto text-[10px] text-[var(--muted-2)] mono">{relTime(e.createdAt)}</span>
        </div>
      </div>
      <button
        onClick={() => onDelete(e.id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-[var(--muted-2)] hover:text-[var(--neg)] hover:bg-white/5 transition"
        aria-label="Delete entry"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
