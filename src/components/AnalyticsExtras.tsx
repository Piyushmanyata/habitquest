// Deep-insight visualisations imported by Analytics.tsx. Kept in a separate file
// to avoid bloating the main analytics component.

import { useMemo } from 'react';
import type { Entry } from '../store/useHabitStore';

type ByDay = Record<string, { net: number; p: number; n: number; count: number }>;

export function DeepInsights({ entries, byDay, days30 }: {
  entries: Entry[];
  byDay: ByDay;
  days30: string[];
}) {
  // Best / worst day in the last 30 days.
  const { bestDay, worstDay, bestNet, worstNet } = useMemo(() => {
    let best = '', worst = '';
    let bestNet = -Infinity, worstNet = Infinity;
    for (const d of days30) {
      const v = byDay[d]?.net ?? 0;
      if (v > bestNet)  { bestNet = v;  best = d; }
      if (v < worstNet) { worstNet = v; worst = d; }
    }
    return { bestDay: best, worstDay: worst, bestNet, worstNet };
  }, [days30, byDay]);

  // Intensity distribution across all entries.
  const intensityBuckets = useMemo(() => {
    const b = [0, 0, 0, 0, 0];
    for (const e of entries) {
      const i = Math.max(1, Math.min(5, e.intensity || 1));
      b[i - 1]++;
    }
    return b;
  }, [entries]);

  // Most common slip sub-category + the hour it usually happens.
  const { topSlipLabel, topSlipHour, topSlipCount } = useMemo(() => {
    const counts = new Map<string, { count: number; hours: number[] }>();
    for (const e of entries) {
      if (e.sentiment !== 'negative') continue;
      const k = `${e.parentId}:${e.subId}`;
      const row = counts.get(k) || { count: 0, hours: [] };
      row.count++;
      row.hours.push(new Date(e.createdAt).getHours());
      counts.set(k, row);
    }
    let top = ''; let topCount = 0; let topHours: number[] = [];
    for (const [k, v] of counts) {
      if (v.count > topCount) { topCount = v.count; top = k; topHours = v.hours; }
    }
    const avgHour = topHours.length
      ? Math.round(topHours.reduce((a, b) => a + b, 0) / topHours.length)
      : null;
    return { topSlipLabel: top.replace(':', ' · '), topSlipHour: avgHour, topSlipCount: topCount };
  }, [entries]);

  // 7-day rolling avg net XP — used as a momentum readout.
  const rolling7 = useMemo(() => {
    const last7 = days30.slice(-7);
    const sum = last7.reduce((a, d) => a + (byDay[d]?.net ?? 0), 0);
    return Math.round(sum / 7);
  }, [days30, byDay]);

  const maxI = Math.max(1, ...intensityBuckets);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="surface p-4">
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] mb-1">Best day</div>
        {bestNet > -Infinity ? (
          <>
            <div className="font-display text-2xl mono text-[var(--pos)]">+{bestNet}</div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">{bestDay || '—'}</div>
          </>
        ) : (
          <div className="text-[11px] text-[var(--muted-2)]">No data.</div>
        )}
        <div className="mt-3 text-[10px] uppercase tracking-wider text-[var(--muted-2)]">7-day rolling avg</div>
        <div className={`font-display text-lg mono ${rolling7 >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}`}>
          {rolling7 >= 0 ? '+' : ''}{rolling7} XP/day
        </div>
      </div>

      <div className="surface p-4">
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] mb-1">Worst day</div>
        {worstNet < Infinity ? (
          <>
            <div className={`font-display text-2xl mono ${worstNet < 0 ? 'text-[var(--neg)]' : 'text-[var(--muted)]'}`}>
              {worstNet >= 0 ? '+' : ''}{worstNet}
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">{worstDay || '—'}</div>
          </>
        ) : (
          <div className="text-[11px] text-[var(--muted-2)]">No data.</div>
        )}
        <div className="mt-3 text-[10px] uppercase tracking-wider text-[var(--muted-2)]">Recurring slip</div>
        {topSlipLabel ? (
          <div className="text-[12px] text-[var(--neg)] mt-0.5">
            {topSlipLabel} · <span className="mono">{topSlipCount}×</span>
            {topSlipHour !== null && <span className="text-[var(--muted-2)]"> · usually {topSlipHour}:00</span>}
          </div>
        ) : (
          <div className="text-[11px] text-[var(--muted-2)] mt-0.5">No slips logged.</div>
        )}
      </div>

      <div className="surface p-4">
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] mb-2">Intensity distribution</div>
        <div className="flex items-end gap-1 h-16">
          {intensityBuckets.map((c, i) => {
            const ratio = c / maxI;
            return (
              <div key={i} className="flex-1 flex flex-col items-center" title={`Intensity ${i + 1} — ${c} entries`}>
                <div className="w-full bg-[var(--accent)] rounded-t-sm" style={{ height: `${ratio * 100}%`, opacity: 0.35 + (i / 4) * 0.6 }} />
                <span className="text-[9px] mono text-[var(--muted-2)] mt-1">{i + 1}</span>
              </div>
            );
          })}
        </div>
        <div className="text-[10px] text-[var(--muted-2)] mt-1">1 = token, 5 = epic</div>
      </div>
    </div>
  );
}

// ── Streak history: per-day "alive streak" length over last 30 days ──
export function StreakHistory({ days30, byDay }: { days30: string[]; byDay: ByDay }) {
  const history = useMemo(() => {
    let run = 0;
    return days30.map(d => {
      const v = byDay[d];
      const ok = v && v.p >= 1 && (v.net ?? 0) >= 0;
      if (ok) run++;
      else run = 0;
      return run;
    });
  }, [days30, byDay]);
  const max = Math.max(1, ...history);
  return (
    <div className="flex items-end gap-[3px] h-24">
      {days30.map((d, i) => {
        const h = history[i];
        const ratio = h / max;
        return (
          <div key={d} className="flex-1 flex flex-col-reverse" title={`${d} — ${h}-day streak`}>
            <div
              className="rounded-t-sm"
              style={{
                height: `${ratio * 100}%`,
                background: h >= 14 ? '#a855f7' : h >= 7 ? '#fbbf24' : h >= 3 ? '#fb923c' : 'var(--accent)',
                opacity: h === 0 ? 0.15 : 0.5 + ratio * 0.5,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
