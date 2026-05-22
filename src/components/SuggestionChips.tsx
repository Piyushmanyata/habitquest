import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';
import { memoryAsPrompt } from '../lib/memory';
import { suggestEntries } from '../lib/aiSuggest';

export default function SuggestionChips({ onPick }: { onPick: (text: string) => void }) {
  const memory = useHabitStore(s => s.memory());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const ctx = memoryAsPrompt(memory);
      const out = await suggestEntries(ctx || 'New user, no pattern data yet.');
      setSuggestions(out);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (suggestions.length === 0 && !loading) return null;

  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-[var(--accent)]" />
        try one
      </span>
      <AnimatePresence>
        {loading ? (
          <motion.span key="l" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-[11px] text-[var(--muted)] flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> sage is thinking…
          </motion.span>
        ) : (
          suggestions.map((s, i) => (
            <motion.button
              key={s + i}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onPick(s)}
              className="px-2.5 py-1 rounded-full text-[11px] bg-[var(--line)] hover:bg-[#2f2f36] border hairline-2 text-[var(--fg)]"
            >
              {s}
            </motion.button>
          ))
        )}
      </AnimatePresence>
      <button
        onClick={load}
        disabled={loading}
        className="ml-1 p-1 rounded text-[var(--muted-2)] hover:text-[var(--fg)] hover:bg-white/5 disabled:opacity-30"
        title="Refresh"
      >
        <RefreshCw className="w-3 h-3" />
      </button>
    </div>
  );
}
