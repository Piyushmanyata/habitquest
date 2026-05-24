// Deep-insight visualisations imported by Analytics.tsx. Kept in a separate file
// to avoid bloating the main analytics component.

import { useMemo } from 'react';
import type { Entry } from '../store/useHabitStore';
import { EMOTION_BY_ID } from '../lib/emotions';
import { CAT_BY_ID } from '../lib/categories';

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

// ── Positivity-ratio trend (rolling 7-day) over last 30 days ──────────
export function PositivityTrend({ entries, days30 }: { entries: Entry[]; days30: string[] }) {
  const points = useMemo(() => {
    // For each day in days30, compute the 7-day trailing positivity ratio.
    const byDay: Record<string, { p: number; n: number }> = {};
    for (const e of entries) {
      const d = (byDay[e.dayKey] ||= { p: 0, n: 0 });
      if (e.sentiment === 'positive') d.p++;
      else if (e.sentiment === 'negative') d.n++;
    }
    return days30.map((d, i) => {
      const window = days30.slice(Math.max(0, i - 6), i + 1);
      let p = 0, n = 0;
      for (const k of window) {
        const v = byDay[k];
        if (v) { p += v.p; n += v.n; }
      }
      const ratio = (p + n) === 0 ? null : p / (p + n);
      return { d, ratio };
    });
  }, [entries, days30]);

  const w = 600, h = 80;
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  const path = points.map((pt, i) => {
    const x = i * step;
    const y = pt.ratio === null ? h / 2 : h - pt.ratio * h;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const area = `M0,${h} ${points.map((pt, i) => {
    const y = pt.ratio === null ? h / 2 : h - pt.ratio * h;
    return `L${(i * step).toFixed(1)},${y.toFixed(1)}`;
  }).join(' ')} L${w},${h} Z`;

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">7-day positivity ratio</h3>
        <span className="text-[10px] mono text-[var(--muted-2)]">last 30 days</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pratiofill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="var(--pos)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="var(--pos)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* 50% reference line */}
        <line x1="0" x2={w} y1={h / 2} y2={h / 2} stroke="rgba(255,255,255,0.08)" strokeDasharray="2,3" />
        <path d={area} fill="url(#pratiofill)" />
        <path d={path} fill="none" stroke="var(--pos)" strokeWidth="1.6" />
        {points.map((pt, i) => {
          const x = i * step;
          const y = pt.ratio === null ? h / 2 : h - pt.ratio * h;
          if (pt.ratio === null) return null;
          return <circle key={i} cx={x} cy={y} r="1.4" fill={pt.ratio >= 0.5 ? 'var(--pos)' : 'var(--neg)'} />;
        })}
      </svg>
      <div className="flex justify-between text-[9px] text-[var(--muted-2)] mono mt-1">
        <span>{days30[0].slice(5)}</span>
        <span>50% line</span>
        <span>today</span>
      </div>
    </div>
  );
}

// ── Gold accumulation curve ─────────────────────────────────────────
export function GoldCurve({ entries }: { entries: Entry[] }) {
  const series = useMemo(() => {
    // Sort entries by time, derive cumulative "approx gold" = sum of positive xp
    const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let cum = 0;
    const out: { at: number; cum: number }[] = [];
    for (const e of sorted) {
      if (e.sentiment === 'positive') cum += Math.max(0, e.xpDelta);
      out.push({ at: new Date(e.createdAt).getTime(), cum });
    }
    return out;
  }, [entries]);

  if (series.length === 0) {
    return (
      <div className="surface p-4">
        <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Gold growth</h3>
        <div className="text-[11px] text-[var(--muted-2)]">Log some positives to see your gold curve.</div>
      </div>
    );
  }

  const w = 600, h = 80;
  const minT = series[0].at, maxT = series[series.length - 1].at || (minT + 1);
  const maxC = Math.max(1, series[series.length - 1].cum);
  const pts = series.map(s => {
    const x = ((s.at - minT) / (maxT - minT)) * w;
    const y = h - (s.cum / maxC) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Gold growth (all time)</h3>
        <span className="text-[10px] mono text-amber-300">total ≈ {series[series.length - 1].cum}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" preserveAspectRatio="none">
        <defs>
          <linearGradient id="goldfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="#fbbf24" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#goldfill)" />
        <polyline points={pts} fill="none" stroke="#fbbf24" strokeWidth="1.6" />
      </svg>
    </div>
  );
}

// ── Best hours of the day (avg net XP per hour bucket) ─────────────
export function BestHours({ entries }: { entries: Entry[] }) {
  const buckets = useMemo(() => {
    const sums = Array.from({ length: 24 }, () => ({ xp: 0, count: 0, pos: 0, neg: 0 }));
    for (const e of entries) {
      const h = new Date(e.createdAt).getHours();
      const b = sums[h];
      b.xp += e.xpDelta;
      b.count++;
      if (e.sentiment === 'positive') b.pos++;
      else if (e.sentiment === 'negative') b.neg++;
    }
    return sums;
  }, [entries]);

  const maxAbs = Math.max(1, ...buckets.map(b => Math.abs(b.xp)));
  const peak = buckets.reduce((best, b, i) => b.xp > best.xp ? { hour: i, xp: b.xp } : best, { hour: -1, xp: -Infinity });
  const trough = buckets.reduce((worst, b, i) => b.xp < worst.xp ? { hour: i, xp: b.xp } : worst, { hour: -1, xp: Infinity });

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Best hours of the day</h3>
        <span className="text-[10px] mono text-[var(--muted-2)]">
          peak <span className="text-[var(--pos)]">{peak.hour >= 0 ? peak.hour + ':00' : '—'}</span>
          {' · '}
          trough <span className="text-[var(--neg)]">{trough.hour >= 0 ? trough.hour + ':00' : '—'}</span>
        </span>
      </div>
      <div className="flex items-end gap-[3px] h-20">
        {buckets.map((b, i) => {
          const ratio = b.xp === 0 ? 0 : Math.abs(b.xp) / maxAbs;
          const pos = b.xp >= 0;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col-reverse"
              title={`${i}:00 — ${b.pos}↑ ${b.neg}↓ · ${b.xp >= 0 ? '+' : ''}${b.xp} XP`}
            >
              <div
                className="rounded-t-sm"
                style={{
                  height: `${ratio * 100}%`,
                  background: pos ? 'var(--pos)' : 'var(--neg)',
                  opacity: 0.3 + ratio * 0.7,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] mono text-[var(--muted-2)] mt-1">
        <span>0</span><span>6</span><span>12</span><span>18</span><span>23</span>
      </div>
    </div>
  );
}

// ── Category momentum (last-7d vs prior-7d shift) ─────────────────
export function CategoryMomentum({ entries }: { entries: Entry[] }) {
  const rows = useMemo(() => {
    const now = Date.now();
    const cut7 = now - 7 * 86400 * 1000;
    const cut14 = now - 14 * 86400 * 1000;
    const recent: Record<string, number> = {};
    const prior: Record<string, number> = {};
    for (const e of entries) {
      const t = new Date(e.createdAt).getTime();
      if (t >= cut7) recent[e.parentId] = (recent[e.parentId] || 0) + 1;
      else if (t >= cut14) prior[e.parentId] = (prior[e.parentId] || 0) + 1;
    }
    const keys = new Set([...Object.keys(recent), ...Object.keys(prior)]);
    return Array.from(keys).map(k => {
      const cat = CAT_BY_ID[k];
      const r = recent[k] || 0;
      const p = prior[k] || 0;
      const delta = r - p;
      const pct = p === 0 ? (r > 0 ? 1 : 0) : (r - p) / Math.max(1, p);
      return { cat, r, p, delta, pct };
    }).filter(x => x.cat).sort((a, b) => b.delta - a.delta);
  }, [entries]);

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Category momentum</h3>
        <span className="text-[10px] mono text-[var(--muted-2)]">last 7d vs prior 7d</span>
      </div>
      {rows.length === 0 ? (
        <div className="text-[11px] text-[var(--muted-2)]">No category activity in the last 2 weeks.</div>
      ) : (
        <div className="space-y-1.5">
          {rows.map(r => {
            const up = r.delta > 0;
            const flat = r.delta === 0;
            return (
              <div key={r.cat.id} className="flex items-center gap-2 text-[11px]">
                <span className="w-44 flex items-center gap-1.5 text-[var(--muted)]">
                  <span>{r.cat.emoji}</span>{r.cat.name}
                </span>
                <span className="mono text-[10px] text-[var(--muted-2)] w-16">
                  {r.p}→{r.r}
                </span>
                <div className="flex-1 h-1.5 bg-[var(--line)] rounded-full overflow-hidden relative">
                  <div
                    className="absolute inset-y-0 left-1/2"
                    style={{
                      width: `${Math.min(50, Math.abs(r.pct) * 50)}%`,
                      background: up ? 'var(--pos)' : flat ? 'var(--muted)' : 'var(--neg)',
                      transform: up ? 'translateX(0)' : flat ? 'translateX(0)' : 'translateX(-100%)',
                      opacity: 0.85,
                    }}
                  />
                </div>
                <span className={`mono text-[10px] w-12 text-right ${up ? 'text-[var(--pos)]' : flat ? 'text-[var(--muted-2)]' : 'text-[var(--neg)]'}`}>
                  {up ? '+' : ''}{r.delta}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Intensity trend — average intensity over last 30 days ─────────
export function IntensityTrend({ entries, days30 }: { entries: Entry[]; days30: string[] }) {
  const data = useMemo(() => {
    const byDay: Record<string, { sum: number; count: number }> = {};
    for (const e of entries) {
      const d = byDay[e.dayKey] ||= { sum: 0, count: 0 };
      d.sum += e.intensity || 0;
      d.count++;
    }
    return days30.map(d => {
      const v = byDay[d];
      return v && v.count ? v.sum / v.count : null;
    });
  }, [entries, days30]);

  const w = 600, h = 80;
  const step = data.length > 1 ? w / (data.length - 1) : 0;
  const points = data.map((v, i) => {
    if (v === null) return null;
    return { x: i * step, y: h - (v / 5) * h };
  });

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Intensity trend</h3>
        <span className="text-[10px] mono text-[var(--muted-2)]">avg per day · last 30 days</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" preserveAspectRatio="none">
        {[1, 2, 3, 4].map(g => (
          <line key={g} x1="0" x2={w} y1={h - (g / 5) * h} y2={h - (g / 5) * h}
                stroke="rgba(255,255,255,0.06)" strokeDasharray="2,3" />
        ))}
        {points.map((pt, i) => {
          if (!pt) return null;
          const prev = points.slice(0, i).reverse().find(x => x !== null);
          if (!prev) return <circle key={i} cx={pt.x} cy={pt.y} r="1.5" fill="var(--accent)" />;
          return (
            <line key={i} x1={prev.x} y1={prev.y} x2={pt.x} y2={pt.y}
                  stroke="var(--accent)" strokeWidth="1.5" />
          );
        })}
        {points.map((pt, i) => pt && <circle key={`d-${i}`} cx={pt.x} cy={pt.y} r="1.6" fill="var(--accent)" />)}
      </svg>
      <div className="flex justify-between text-[9px] text-[var(--muted-2)] mono mt-1">
        <span>i=1</span><span>i=3 mid</span><span>i=5 epic</span>
      </div>
    </div>
  );
}

// ── Emotion ↔ XP correlation ────────────────────────────────────────
export function EmotionXp({ entries }: { entries: Entry[] }) {
  const rows = useMemo(() => {
    const map = new Map<string, { sum: number; count: number; pos: number; neg: number }>();
    for (const e of entries) {
      if (!e.emotion) continue;
      const r = map.get(e.emotion) || { sum: 0, count: 0, pos: 0, neg: 0 };
      r.sum += e.xpDelta;
      r.count++;
      if (e.sentiment === 'positive') r.pos++;
      else if (e.sentiment === 'negative') r.neg++;
      map.set(e.emotion, r);
    }
    return Array.from(map.entries()).map(([id, v]) => ({
      em: EMOTION_BY_ID[id], avg: v.sum / v.count, count: v.count, pos: v.pos, neg: v.neg,
    })).filter(r => r.em && r.count >= 2).sort((a, b) => b.avg - a.avg);
  }, [entries]);

  if (rows.length === 0) {
    return (
      <div className="surface p-4">
        <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Emotion ↔ XP</h3>
        <div className="text-[11px] text-[var(--muted-2)]">Tag emotions in your entries to see which moods drive your wins.</div>
      </div>
    );
  }
  const maxAbs = Math.max(1, ...rows.map(r => Math.abs(r.avg)));

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Emotion ↔ avg XP per entry</h3>
        <span className="text-[10px] mono text-[var(--muted-2)]">{rows.length} emotions seen</span>
      </div>
      <div className="space-y-1.5">
        {rows.map(r => {
          const pct = (Math.abs(r.avg) / maxAbs) * 50;
          const pos = r.avg >= 0;
          return (
            <div key={r.em.id} className="flex items-center gap-2 text-[11px]">
              <span className="w-24 flex items-center gap-1.5 text-[var(--muted)]">
                <span>{r.em.emoji}</span>{r.em.label}
              </span>
              <div className="flex-1 h-1.5 bg-[var(--line)] rounded-full overflow-hidden relative">
                <div
                  className="absolute inset-y-0"
                  style={{
                    width: `${pct}%`,
                    left: pos ? '50%' : `calc(50% - ${pct}%)`,
                    background: pos ? 'var(--pos)' : 'var(--neg)',
                    opacity: 0.85,
                  }}
                />
                <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--line-2)]" />
              </div>
              <span className={`mono text-[10px] w-14 text-right ${pos ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}`}>
                {r.avg >= 0 ? '+' : ''}{r.avg.toFixed(1)} XP
              </span>
              <span className="mono text-[9px] text-[var(--muted-2)] w-8 text-right">×{r.count}</span>
            </div>
          );
        })}
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
