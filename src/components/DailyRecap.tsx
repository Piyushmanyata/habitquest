import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { X, Loader2, Sparkles, TrendingUp, TrendingDown, Eye, ArrowRight } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';
import { generateDailyRecap, BossReport } from '../lib/ai';
import { derivePastComparisons, comparisonsAsPrompt } from '../lib/pastComparisons';
import { deriveMemory, memoryAsPrompt } from '../lib/memory';

export default function DailyRecap({ open, onClose }: { open: boolean; onClose: () => void }) {
  const apiKey = useHabitStore(s => s.apiKey);
  const todayEntries = useHabitStore(s => s.todayEntries());
  const allEntries = useHabitStore(s => s.entries);
  const [report, setReport] = useState<BossReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true); setReport(null);

    const comparisons = derivePastComparisons(allEntries);
    const comparisonsPrompt = comparisonsAsPrompt(comparisons);
    const memoryPrompt = memoryAsPrompt(deriveMemory(allEntries));

    generateDailyRecap(
      todayEntries.map(e => ({
        title: e.title, sentiment: e.sentiment, xpDelta: e.xpDelta,
        parentId: e.parentId, intensity: e.intensity,
      })),
      { apiKey, comparisons: comparisonsPrompt, memoryContext: memoryPrompt }
    ).then(r => { setReport(r); setLoading(false); });
  }, [open]);

  const comparisons = open ? derivePastComparisons(allEntries) : null;
  const pos = todayEntries.filter(e => e.sentiment === 'positive').length;
  const neg = todayEntries.filter(e => e.sentiment === 'negative').length;
  const net = todayEntries.reduce((a, e) => a + e.xpDelta, 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/75 grid place-items-center p-4 overflow-auto"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="surface w-full max-w-xl my-6 p-6"
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

            {/* KPI tiles */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Tile label="wins"  value={pos} accent="pos" />
              <Tile label="slips" value={neg} accent="neg" />
              <Tile label="net"   value={`${net >= 0 ? '+' : ''}${net}`} accent={net >= 0 ? 'pos' : 'neg'} />
            </div>

            {/* Trend deltas */}
            {comparisons && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <DeltaTile label="vs Yesterday"
                  value={comparisons.shifts.netXpVsYesterday}
                  hint={`${comparisons.yesterday.wins}↑ ${comparisons.yesterday.slips}↓ yesterday`} />
                <DeltaTile label="vs 7-day avg"
                  value={comparisons.shifts.netXpVs7Avg}
                  hint={`avg ${comparisons.last7Avg.netXp} XP/day`} />
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-[var(--muted)] text-[13px] py-4">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Sage is studying your day and the past week…
              </div>
            )}

            {report && !loading && (
              <div className="space-y-3.5">
                <ReportLine label="Today" body={report.headline} accent="lime" />
                <ReportLine label="Trend" icon={<Eye className="w-3 h-3" />} body={report.trend} accent="info" />
                <ReportLine label="Biggest win" icon={<TrendingUp className="w-3 h-3" />} body={report.biggestWin} accent="pos" />
                <ReportLine label="Biggest slip" icon={<TrendingDown className="w-3 h-3" />} body={report.biggestSlip} accent="neg" />
                <ReportLine label="Pattern Sage spotted" body={report.patternCallout} accent="purple" emphasis />
                <ReportLine label="Tomorrow's move" icon={<ArrowRight className="w-3 h-3" />} body={report.tomorrowMove} accent="warm" emphasis />
              </div>
            )}

            <div className="mt-5 text-[10px] text-[var(--muted-2)] mono uppercase tracking-wider">
              {apiKey ? 'deep analysis · sage' : 'local summary (add a key for AI report)'}
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

function DeltaTile({ label, value, hint }: { label: string; value: number; hint: string }) {
  const sign = value >= 0 ? '+' : '';
  const cls = value > 0 ? 'text-[var(--pos)]' : value < 0 ? 'text-[var(--neg)]' : 'text-[var(--muted)]';
  return (
    <div className="rounded-md border hairline px-3 py-2 bg-[var(--panel)]">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)]">{label}</div>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className={`mono text-lg ${cls}`}>{sign}{value}</span>
        <span className="text-[10px] text-[var(--muted-2)]">XP · {hint}</span>
      </div>
    </div>
  );
}

const ACCENT_BAR: Record<string, string> = {
  lime:   'border-l-[var(--accent)]',
  pos:    'border-l-[var(--pos)]',
  neg:    'border-l-[var(--neg)]',
  warm:   'border-l-amber-400',
  info:   'border-l-sky-300',
  purple: 'border-l-purple-400',
};
const ACCENT_TXT: Record<string, string> = {
  lime:   'text-[var(--accent)]',
  pos:    'text-[var(--pos)]',
  neg:    'text-[var(--neg)]',
  warm:   'text-amber-300',
  info:   'text-sky-300',
  purple: 'text-purple-300',
};

function ReportLine({ label, body, icon, accent = 'lime', emphasis }: {
  label: string; body: string; icon?: React.ReactNode; accent?: keyof typeof ACCENT_BAR; emphasis?: boolean;
}) {
  return (
    <div className={`pl-3 border-l-2 ${ACCENT_BAR[accent]}`}>
      <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider mono ${ACCENT_TXT[accent]}`}>
        {icon}{label}
      </div>
      <div className={`mt-1 text-[14px] leading-relaxed ${emphasis ? 'text-[var(--fg)]' : 'text-[var(--fg)]'}`}>
        {body}
      </div>
    </div>
  );
}
