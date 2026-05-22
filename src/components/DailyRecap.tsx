import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';
import { generateDailyRecap } from '../lib/ai';

export default function DailyRecap({ open, onClose }: { open: boolean; onClose: () => void }) {
  const todayEntries = useHabitStore(s => s.todayEntries());
  const apiKey = useHabitStore(s => s.apiKey);
  const [recap, setRecap] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true); setRecap('');
    generateDailyRecap(
      todayEntries.map(e => ({ title: e.title, sentiment: e.sentiment, xpDelta: e.xpDelta })),
      { apiKey }
    ).then(r => { setRecap(r); setLoading(false); });
  }, [open]);

  const pos = todayEntries.filter(e => e.sentiment === 'positive').length;
  const neg = todayEntries.filter(e => e.sentiment === 'negative').length;
  const net = todayEntries.reduce((a, e) => a + e.xpDelta, 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/75 grid place-items-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="surface w-full max-w-lg p-6"
            initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-[15px] font-medium">Boss Report — Today</h2>
              </div>
              <button onClick={onClose} className="p-1 rounded-md hover:bg-white/5 text-[var(--muted)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-5">
              <Tile label="wins"  value={pos}  accent="pos" />
              <Tile label="slips" value={neg}  accent="neg" />
              <Tile label="net"   value={`${net >= 0 ? '+' : ''}${net}`} accent={net >= 0 ? 'pos' : 'neg'} />
            </div>

            <div className="min-h-[120px] text-[14px] leading-relaxed text-[var(--fg)]">
              {loading ? (
                <div className="flex items-center gap-2 text-[var(--muted)] text-[13px]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  DeepSeek is reviewing your day…
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{recap || 'Nothing logged today.'}</p>
              )}
            </div>

            <div className="mt-4 text-[10px] text-[var(--muted-2)] mono uppercase tracking-wider">
              {apiKey ? 'powered by deepseek-chat' : 'local summary (add a key for AI report)'}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Tile({ label, value, accent }: { label: string; value: React.ReactNode; accent?: 'pos' | 'neg' }) {
  const cls = accent === 'pos' ? 'text-[var(--pos)]' : accent === 'neg' ? 'text-[var(--neg)]' : 'text-[var(--fg)]';
  return (
    <div className="rounded-md border hairline px-3 py-2.5 bg-[var(--panel)]">
      <div className={`mono text-lg ${cls}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)]">{label}</div>
    </div>
  );
}
