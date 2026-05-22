import { useEffect, useState } from 'react';
import { RefreshCw, Brain, Loader2 } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';

export default function WisdomPanel() {
  const wisdom = useHabitStore(s => s.wisdom);
  const refresh = useHabitStore(s => s.refreshWisdom);
  const entries = useHabitStore(s => s.entries);
  const [loading, setLoading] = useState(false);

  // Auto-load once if we have any entries and no cached wisdom.
  useEffect(() => {
    if (!wisdom && entries.length >= 2 && !loading) {
      setLoading(true);
      refresh().finally(() => setLoading(false));
    }
  }, [entries.length, wisdom, refresh, loading]);

  async function handleRefresh() {
    setLoading(true);
    await refresh();
    setLoading(false);
  }

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-[var(--accent)]" />
          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Wisdom</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || entries.length < 2}
          className="p-1 rounded-md text-[var(--muted-2)] hover:text-[var(--fg)] hover:bg-white/5 disabled:opacity-30"
          title="Generate fresh observations"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </button>
      </div>
      {entries.length < 2 ? (
        <div className="text-[11px] text-[var(--muted-2)]">Log a couple of entries and the AI oracle will spot patterns here.</div>
      ) : !wisdom && loading ? (
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
          <Loader2 className="w-3 h-3 animate-spin" /> AI is reading the tea leaves…
        </div>
      ) : wisdom ? (
        <ul className="space-y-2 text-[12px] leading-snug">
          {wisdom.lines.map((l, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[var(--accent)] mono text-[10px] mt-0.5">→</span>
              <span className="text-[var(--fg)]">{l}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-[11px] text-[var(--muted-2)]">Click ↻ to generate observations.</div>
      )}
    </div>
  );
}
