import { useMemo } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { EMOTIONS, EMOTION_BY_ID } from '../lib/emotions';
import { CATEGORIES, CAT_BY_ID } from '../lib/categories';
import { dayKey } from '../lib/gamification';

function lastDayKeys(n: number) {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

export default function MoodPanel() {
  const entries = useHabitStore(s => s.entries);
  const withMood = useMemo(() => entries.filter(e => e.emotion && EMOTION_BY_ID[e.emotion]), [entries]);

  const dist = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of withMood) map.set(e.emotion!, (map.get(e.emotion!) || 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [withMood]);

  const totalMood = withMood.length;

  // Mood timeline (last 14 days) — net valence per day
  const days14 = useMemo(() => lastDayKeys(14), []);
  const moodPerDay = useMemo(() => {
    const out: Record<string, { pos: number; neg: number; neu: number }> = {};
    for (const e of withMood) {
      const em = EMOTION_BY_ID[e.emotion!];
      if (!em) continue;
      const d = out[e.dayKey] ||= { pos: 0, neg: 0, neu: 0 };
      if (em.valence === 'positive') d.pos++;
      else if (em.valence === 'negative') d.neg++;
      else d.neu++;
    }
    return out;
  }, [withMood]);

  // Category × dominant emotion
  const catMood = useMemo(() => {
    const out: Record<string, Record<string, number>> = {};
    for (const e of withMood) {
      const c = out[e.parentId] ||= {};
      c[e.emotion!] = (c[e.emotion!] || 0) + 1;
    }
    const result: { parentId: string; topEmotion: string; topCount: number; total: number }[] = [];
    for (const [pid, em] of Object.entries(out)) {
      let topE = '', topC = 0, total = 0;
      for (const [k, v] of Object.entries(em)) { total += v; if (v > topC) { topE = k; topC = v; } }
      result.push({ parentId: pid, topEmotion: topE, topCount: topC, total });
    }
    return result.sort((a, b) => b.total - a.total);
  }, [withMood]);

  if (entries.length === 0) {
    return (
      <div className="surface p-10 text-center">
        <div className="text-sm text-[var(--muted)]">No mood data yet.</div>
        <div className="text-xs text-[var(--muted-2)] mt-1">Add feelings or reflections to your journal entries.</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Tagged emotions" value={totalMood} />
        <Kpi label="Reflections" value={entries.filter(e => e.reflection).length} />
        <Kpi label="Honest slips" value={entries.filter(e => e.sentiment === 'negative').length} accent="neg" />
        <Kpi label="Total XP from bonuses" value={entries.reduce((a, e) => a + (e.bonusXp || 0), 0)} accent="pos" />
      </div>

      {totalMood === 0 && (
        <div className="surface p-6 text-center">
          <div className="text-sm text-[var(--muted)]">Sage hasn't tagged emotions yet.</div>
          <div className="text-xs text-[var(--muted-2)] mt-1">Tell the journal how you felt — "felt anxious", "really proud" — and the chart fills up.</div>
        </div>
      )}

      {totalMood > 0 && (
        <>
          {/* Emotion distribution bars */}
          <div className="surface p-4">
            <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3">Emotion distribution</h3>
            <div className="space-y-2">
              {EMOTIONS.filter(e => dist.some(([id]) => id === e.id)).map(em => {
                const count = dist.find(([id]) => id === em.id)?.[1] ?? 0;
                const pct = (count / totalMood) * 100;
                const color = em.valence === 'positive' ? 'var(--pos)' : em.valence === 'negative' ? 'var(--neg)' : 'var(--muted)';
                return (
                  <div key={em.id} className="flex items-center gap-2">
                    <span className="w-20 text-[12px] flex items-center gap-1.5">
                      <span>{em.emoji}</span>{em.label}
                    </span>
                    <div className="flex-1 h-2.5 bg-[var(--line)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="mono text-[10px] text-[var(--muted-2)] w-12 text-right">
                      {count} · {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 14-day mood timeline */}
          <div className="surface p-4">
            <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3">14-day mood timeline</h3>
            <div className="flex items-end gap-1.5 h-24">
              {days14.map(d => {
                const m = moodPerDay[d];
                const total = m ? m.pos + m.neg + m.neu : 0;
                const maxAcross = Math.max(1, ...days14.map(k => {
                  const x = moodPerDay[k]; return x ? x.pos + x.neg + x.neu : 0;
                }));
                const ratio = total / maxAcross;
                const posRatio = total ? m!.pos / total : 0;
                const negRatio = total ? m!.neg / total : 0;
                return (
                  <div key={d} className="flex-1 flex flex-col-reverse" style={{ height: '100%' }} title={`${d}: ${m?.pos ?? 0}↑ ${m?.neg ?? 0}↓ ${m?.neu ?? 0}~`}>
                    <div className="bg-[var(--neg)] rounded-t-sm" style={{ height: `${ratio * negRatio * 100}%` }} />
                    <div className="bg-[var(--muted-2)] opacity-50" style={{ height: `${ratio * (1 - posRatio - negRatio) * 100}%` }} />
                    <div className="bg-[var(--pos)] rounded-t-sm" style={{ height: `${ratio * posRatio * 100}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[9px] mono text-[var(--muted-2)] mt-1.5">
              <span>{days14[0].slice(5)}</span>
              <span>today</span>
            </div>
          </div>

          {/* Category × dominant emotion */}
          <div className="surface p-4">
            <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3">Category × dominant emotion</h3>
            <div className="space-y-2">
              {catMood.map(row => {
                const cat = CAT_BY_ID[row.parentId];
                const em = EMOTION_BY_ID[row.topEmotion];
                if (!cat || !em) return null;
                const pct = (row.topCount / row.total) * 100;
                return (
                  <div key={row.parentId} className="flex items-center gap-3">
                    <span className="text-[12px] w-40 flex items-center gap-1.5">
                      <span>{cat.emoji}</span>{cat.name}
                    </span>
                    <span className="text-[12px] flex items-center gap-1.5 text-[var(--fg)]">
                      <span>{em.emoji}</span>{em.label}
                    </span>
                    <span className="ml-auto mono text-[10px] text-[var(--muted-2)]">{pct.toFixed(0)}% · {row.total} entries</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mood by hour-of-day */}
          <MoodByHour entries={withMood} />

          {/* Strongest mood + intensity readout */}
          <MoodIntensity entries={withMood} />
        </>
      )}

      {/* Recent reflections */}
      {entries.filter(e => e.reflection).length > 0 && (
        <div className="surface p-4">
          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3">Recent reflections</h3>
          <div className="space-y-2.5">
            {entries.filter(e => e.reflection).slice(0, 6).map(e => (
              <div key={e.id} className="pl-3 border-l-2 hairline-2">
                <div className="text-[12px] text-[var(--fg)] leading-relaxed">"{e.reflection}"</div>
                <div className="text-[10px] text-[var(--muted-2)] mt-0.5">
                  on <span className="text-[var(--muted)]">{e.title}</span>
                  {e.emotion && EMOTION_BY_ID[e.emotion] && (
                    <> · <span>{EMOTION_BY_ID[e.emotion].emoji}</span> {EMOTION_BY_ID[e.emotion].label}</>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <span className="hidden">{Object.keys(CATEGORIES).length}</span>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: React.ReactNode; accent?: 'pos' | 'neg' }) {
  const cls = accent === 'pos' ? 'text-[var(--pos)]' : accent === 'neg' ? 'text-[var(--neg)]' : 'text-[var(--fg)]';
  return (
    <div className="surface p-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)]">{label}</div>
      <div className={`mono text-xl mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}

// ── Mood by hour-of-day — 24 columns × 1 row (dominant emotion per hour) ──
function MoodByHour({ entries }: { entries: any[] }) {
  // For each hour, find the dominant emotion.
  const byHour = useMemoOrSync(() => {
    const buckets: Record<number, Record<string, number>> = {};
    for (const e of entries) {
      if (!e.emotion) continue;
      const h = new Date(e.createdAt).getHours();
      const b = buckets[h] ||= {};
      b[e.emotion] = (b[e.emotion] || 0) + 1;
    }
    return Array.from({ length: 24 }, (_, h) => {
      const b = buckets[h] || {};
      let top = ''; let topC = 0; let total = 0;
      for (const [k, v] of Object.entries(b)) { total += v; if (v > topC) { topC = v; top = k; } }
      return { hour: h, top, count: total };
    });
  }, [entries]);

  const max = Math.max(1, ...byHour.map(b => b.count));

  return (
    <div className="surface p-4">
      <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3">Mood by hour</h3>
      <div className="flex items-end gap-[3px] h-20">
        {byHour.map(b => {
          const em = b.top ? EMOTION_BY_ID[b.top] : null;
          const ratio = b.count / max;
          const color = em
            ? (em.valence === 'positive' ? 'var(--pos)' : em.valence === 'negative' ? 'var(--neg)' : 'var(--muted)')
            : 'var(--line)';
          return (
            <div
              key={b.hour}
              className="flex-1 flex flex-col-reverse items-center gap-0.5"
              title={em ? `${b.hour}:00 — ${em.label} (${b.count} entries)` : `${b.hour}:00 — no data`}
            >
              <div className="w-full rounded-t-sm" style={{ height: `${ratio * 100}%`, background: color, opacity: b.count ? 0.5 + ratio * 0.5 : 0.2 }} />
              {em && b.count >= max * 0.4 && (
                <span className="text-[9px] leading-none">{em.emoji}</span>
              )}
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

// ── Mood + intensity scatter — average intensity per emotion ──
function MoodIntensity({ entries }: { entries: any[] }) {
  const stats = Object.values(EMOTION_BY_ID).map(em => {
    const xs = entries.filter(e => e.emotion === em.id);
    if (xs.length === 0) return null;
    const avg = xs.reduce((a, e) => a + (e.emotionIntensity || 1), 0) / xs.length;
    return { em, avg, count: xs.length };
  }).filter(Boolean) as { em: any; avg: number; count: number }[];

  if (stats.length === 0) return null;

  return (
    <div className="surface p-4">
      <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3">Mood intensity</h3>
      <div className="space-y-2">
        {stats.sort((a, b) => b.count - a.count).map(s => (
          <div key={s.em.id} className="flex items-center gap-2">
            <span className="w-24 text-[12px] flex items-center gap-1.5">
              <span>{s.em.emoji}</span>{s.em.label}
            </span>
            <div className="flex-1 flex gap-[2px]">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="flex-1 h-2 rounded-sm"
                  style={{
                    background: i <= Math.round(s.avg)
                      ? (s.em.valence === 'positive' ? 'var(--pos)' : s.em.valence === 'negative' ? 'var(--neg)' : 'var(--muted)')
                      : 'var(--line)',
                    opacity: i <= Math.round(s.avg) ? 0.5 + (i / 3) * 0.5 : 0.5,
                  }}
                />
              ))}
            </div>
            <span className="mono text-[10px] text-[var(--muted-2)] w-14 text-right">avg {s.avg.toFixed(1)} · {s.count}×</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// tiny shim so the new subcomponents above can use useMemo without re-importing
function useMemoOrSync<T>(factory: () => T, deps: any[]): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}
