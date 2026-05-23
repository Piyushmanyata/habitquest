import { useMemo } from 'react';
import { useHabitStore, Entry } from '../store/useHabitStore';
import { DeepInsights, StreakHistory } from './AnalyticsExtras';
import { CATEGORIES, CAT_BY_ID } from '../lib/categories';
import { dayKey } from '../lib/gamification';

function lastNDayKeys(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const WEEKDAYS_SHORT = ['S','M','T','W','T','F','S'];

export default function Analytics() {
  const entries = useHabitStore(s => s.entries);
  const comboBest = useHabitStore(s => s.comboBest);
  const profile = useHabitStore(s => s.profile);
  const questsCompleted = useHabitStore(s => s.questsCompletedTotal);

  const days90 = useMemo(() => lastNDayKeys(90), []);
  const days30 = useMemo(() => lastNDayKeys(30), []);
  const days7  = useMemo(() => lastNDayKeys(7),  []);

  const byDay = useMemo(() => {
    const map: Record<string, { net: number; p: number; n: number; count: number }> = {};
    for (const e of entries) {
      const m = map[e.dayKey] ||= { net: 0, p: 0, n: 0, count: 0 };
      m.net += e.xpDelta; m.count++;
      if (e.sentiment === 'positive') m.p++;
      else if (e.sentiment === 'negative') m.n++;
    }
    return map;
  }, [entries]);

  const byCategory = useMemo(() => {
    const map: Record<string, { p: number; n: number; xp: number; intensitySum: number; count: number }> = {};
    for (const e of entries) {
      const m = map[e.parentId] ||= { p: 0, n: 0, xp: 0, intensitySum: 0, count: 0 };
      m.xp += e.xpDelta; m.count++; m.intensitySum += e.intensity || 1;
      if (e.sentiment === 'positive') m.p++;
      else if (e.sentiment === 'negative') m.n++;
    }
    return map;
  }, [entries]);

  // 7-day × 24-hour grid
  const weekHourGrid = useMemo(() => {
    const cutoff = Date.now() - 28 * 86400 * 1000;
    const grid: { p: number; n: number }[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({ p: 0, n: 0 }))
    );
    for (const e of entries) {
      const t = new Date(e.createdAt);
      if (t.getTime() < cutoff) continue;
      const dow = t.getDay();
      const hour = t.getHours();
      const cell = grid[dow][hour];
      if (e.sentiment === 'positive') cell.p++;
      else if (e.sentiment === 'negative') cell.n++;
    }
    return grid;
  }, [entries]);

  const comebackRate = useMemo(() => computeComebackRate(entries), [entries]);
  const recoverTime = useMemo(() => avgRecoveryMinutes(entries), [entries]);

  // 30-day KPIs
  const activeDays30 = useMemo(() => days30.filter(d => byDay[d]).length, [days30, byDay]);
  const xp30 = useMemo(() => days30.reduce((a, d) => a + (byDay[d]?.net ?? 0), 0), [days30, byDay]);
  const pace7 = useMemo(() => days7.reduce((a, d) => a + (byDay[d]?.net ?? 0), 0), [days7, byDay]);
  const totalPos = entries.filter(e => e.sentiment === 'positive').length;
  const totalNeg = entries.filter(e => e.sentiment === 'negative').length;
  const winRatio = totalPos + totalNeg > 0 ? totalPos / (totalPos + totalNeg) : 0;

  // Keyword breakdown
  const { posWords, negWords } = useMemo(() => extractKeywords(entries), [entries]);

  const heatMax = Math.max(1, ...days90.map(d => byDay[d]?.net ?? 0).map(Math.abs));
  const whgMax = Math.max(1, ...weekHourGrid.flat().map(c => c.p + c.n));
  const catTotal = Math.max(1, ...Object.values(byCategory).map(c => c.p + c.n));

  if (entries.length === 0) {
    return (
      <div className="surface p-10 text-center">
        <div className="text-sm text-[var(--muted)]">No data yet.</div>
        <div className="text-xs text-[var(--muted-2)] mt-1">Log entries on the Journal tab to see your patterns.</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Kpi label="Total XP" value={profile.xp} />
        <Kpi label="30-day XP" value={`${xp30 >= 0 ? '+' : ''}${xp30}`} accent={xp30 >= 0 ? 'pos' : 'neg'} />
        <Kpi label="7-day pace" value={`${pace7 >= 0 ? '+' : ''}${pace7}`} accent={pace7 >= 0 ? 'pos' : 'neg'} />
        <Kpi label="Active 30d" value={`${activeDays30}/30`} />
        <Kpi label="Comebacks" value={comebackRate === null ? '—' : `${comebackRate}%`} accent={comebackRate !== null && comebackRate >= 50 ? 'pos' : undefined} />
        <Kpi label="Best combo" value={`×${comboBest}`} accent={comboBest >= 3 ? 'pos' : undefined} />
      </div>

      {/* Win ratio + Donut */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-3">
        <Panel title="Win / Slip ratio (all time)">
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-display text-3xl mono text-[var(--pos)]">{Math.round(winRatio * 100)}%</span>
            <span className="text-[11px] text-[var(--muted-2)] mono">{totalPos} wins · {totalNeg} slips</span>
          </div>
          <div className="h-3 bg-[var(--line)] rounded-full overflow-hidden flex">
            <div className="bg-[var(--pos)]" style={{ width: `${winRatio * 100}%` }} />
            <div className="bg-[var(--neg)] flex-1" />
          </div>
          {recoverTime !== null && (
            <div className="text-[11px] text-[var(--muted-2)] mt-3">
              Avg recovery after a slip: <span className="mono text-[var(--fg)]">{recoverTime}</span> min
            </div>
          )}
        </Panel>

        <Panel title="Category mix">
          <CategoryDonut byCategory={byCategory} />
        </Panel>
      </div>

      {/* 90-day heatmap */}
      <Panel title="Last 90 days · net XP per day">
        <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px]" style={{ maxWidth: 540 }}>
          {days90.map(d => {
            const v = byDay[d]?.net ?? null;
            const cls = v === null ? 'bg-[var(--line)]' : v > 0 ? 'bg-[var(--accent)]' : v < 0 ? 'bg-[var(--neg)]' : 'bg-[var(--line-2)]';
            const intensity = v === null ? 0.25 : Math.min(1, 0.25 + Math.abs(v) / heatMax * 0.85);
            return (
              <div key={d} title={`${d}: ${v ?? 0} XP`}
                   className={`aspect-square rounded-[2px] ${cls}`}
                   style={{ opacity: intensity }} />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-[var(--muted-2)] mono">
          <span>−</span>
          <div className="flex gap-1">
            {[0.3, 0.5, 0.7, 1].map((o, i) => <div key={i} className="w-3 h-3 rounded-[2px] bg-[var(--accent)]" style={{ opacity: o }} />)}
          </div>
          <span>+</span>
        </div>
      </Panel>

      {/* XP velocity line + 30-day sparkline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Panel title="7-day XP velocity">
          <BigSparkline values={days7.map(d => byDay[d]?.net ?? 0)} labels={days7.map(d => d.slice(5))} />
        </Panel>
        <Panel title="30-day sentiment trend">
          <BigSparkline values={days30.map(d => byDay[d]?.net ?? 0)} dense />
        </Panel>
      </div>

      {/* 7-day × 24-hour grid */}
      <Panel title="When you log (last 28 days)">
        <div className="overflow-x-auto">
          <table className="text-[10px] mono text-[var(--muted-2)] border-separate border-spacing-[2px]">
            <thead>
              <tr>
                <th className="w-8" />
                {Array.from({ length: 24 }, (_, h) => (
                  <th key={h} className="font-normal pb-1 text-center" style={{ minWidth: 14 }}>
                    {h % 6 === 0 ? h : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekHourGrid.map((row, dow) => (
                <tr key={dow}>
                  <td className="pr-1 text-right">{WEEKDAYS_SHORT[dow]}</td>
                  {row.map((cell, h) => {
                    const total = cell.p + cell.n;
                    const ratio = total / whgMax;
                    const pos = total ? cell.p / total : 0;
                    const color = total === 0
                      ? 'rgba(255,255,255,0.04)'
                      : pos >= 0.5
                        ? `rgba(194,245,74,${0.18 + ratio * 0.7})`
                        : `rgba(255,107,107,${0.18 + ratio * 0.7})`;
                    return (
                      <td key={h}>
                        <div title={`${WEEKDAYS[dow]} ${h}:00 — ${cell.p}↑ ${cell.n}↓`}
                             className="w-[14px] h-[14px] rounded-[2px]"
                             style={{ background: color }} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-[10px] text-[var(--muted-2)] mono mt-2">
          Greener = more wins · Redder = more slips · Brighter = more entries
        </div>
      </Panel>

      {/* Mood radar by category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Panel title="Mood radar (positivity by category)">
          <MoodRadar byCategory={byCategory} />
        </Panel>

        <Panel title="Category XP breakdown">
          <div className="space-y-2">
            {CATEGORIES.map(c => {
              const v = byCategory[c.id] || { p: 0, n: 0, xp: 0, intensitySum: 0, count: 0 };
              const total = v.p + v.n;
              if (total === 0) return null;
              const avgIntensity = v.count > 0 ? (v.intensitySum / v.count).toFixed(1) : '—';
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[var(--muted)]">{c.emoji} {c.name}</span>
                    <span className="mono text-[10px] text-[var(--muted-2)]">
                      {v.p}↑ {v.n}↓ · avg int {avgIntensity} · <span className={v.xp >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}>{v.xp >= 0 ? '+' : ''}{v.xp}</span>
                    </span>
                  </div>
                  <div className="flex gap-px h-1.5 rounded-full overflow-hidden bg-[var(--line)]">
                    <div className="bg-[var(--pos)]" style={{ width: `${(v.p / catTotal) * 100}%` }} />
                    <div className="bg-[var(--neg)]" style={{ width: `${(v.n / catTotal) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Deep insights — best/worst day, intensity distribution, top slip */}
      <DeepInsights entries={entries} byDay={byDay} days30={days30} />

      {/* Streak history (last 30 days) */}
      <Panel title="Streak history — last 30 days">
        <StreakHistory days30={days30} byDay={byDay} />
      </Panel>

      {/* Keyword clouds — clickable to set the search filter on Logs (best-effort) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Panel title="Top words in WINS">
          <WordCloud words={posWords} accent="pos" />
        </Panel>
        <Panel title="Top words in SLIPS">
          <WordCloud words={negWords} accent="neg" />
        </Panel>
      </div>

      <div className="text-[10px] text-[var(--muted-2)] mono uppercase tracking-wider text-center pt-2">
        bosses defeated: {profile.bossesDefeated} · perfect days: {profile.perfectDays} · longest streak: {profile.longestStreak}d · quests claimed: {questsCompleted}
      </div>
      <span className="hidden">{Object.keys(CAT_BY_ID).length}</span>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────

function computeComebackRate(entries: Entry[]): number | null {
  const negs = entries.filter(e => e.sentiment === 'negative');
  if (negs.length === 0) return null;
  let recovered = 0;
  for (const n of negs) {
    const nt = new Date(n.createdAt).getTime();
    const ok = entries.some(e =>
      e.sentiment === 'positive' &&
      e.dayKey === n.dayKey &&
      new Date(e.createdAt).getTime() > nt &&
      new Date(e.createdAt).getTime() - nt < 60 * 60 * 1000
    );
    if (ok) recovered++;
  }
  return Math.round((recovered / negs.length) * 100);
}

function avgRecoveryMinutes(entries: Entry[]): number | null {
  const negs = entries.filter(e => e.sentiment === 'negative');
  if (!negs.length) return null;
  const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const recoveries: number[] = [];
  for (const n of negs) {
    const nt = new Date(n.createdAt).getTime();
    const next = sorted.find(e => e.sentiment === 'positive' && new Date(e.createdAt).getTime() > nt);
    if (next) {
      const dt = (new Date(next.createdAt).getTime() - nt) / 60000;
      if (dt < 24 * 60) recoveries.push(dt);
    }
  }
  if (!recoveries.length) return null;
  return Math.round(recoveries.reduce((a, b) => a + b, 0) / recoveries.length);
}

const STOPWORDS = new Set(['a','an','the','and','or','but','if','of','to','for','in','on','at','my','i','me','was','were','be','been','have','had','has','do','did','done','this','that','it','with','from','some','any','all','as','then','than','very','really','more','today','yesterday','minute','minutes','min','mins','hour','hours','hr','hrs','pages']);

function extractKeywords(entries: Entry[]): { posWords: [string, number][]; negWords: [string, number][] } {
  const countPos = new Map<string, number>();
  const countNeg = new Map<string, number>();
  for (const e of entries) {
    const map = e.sentiment === 'positive' ? countPos : e.sentiment === 'negative' ? countNeg : null;
    if (!map) continue;
    for (const tok of (e.text || '').toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/)) {
      if (tok.length < 3 || STOPWORDS.has(tok)) continue;
      map.set(tok, (map.get(tok) || 0) + 1);
    }
  }
  const sortBy = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  return { posWords: sortBy(countPos), negWords: sortBy(countNeg) };
}

// ── tiny render components ──────────────────────────────────────────────

function Kpi({ label, value, accent }: { label: string; value: React.ReactNode; accent?: 'pos' | 'neg' }) {
  const cls = accent === 'pos' ? 'text-[var(--pos)]' : accent === 'neg' ? 'text-[var(--neg)]' : 'text-[var(--fg)]';
  return (
    <div className="surface p-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)]">{label}</div>
      <div className={`mono text-xl mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface p-4">
      <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function BigSparkline({ values, labels, dense }: { values: number[]; labels?: string[]; dense?: boolean }) {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values, 1);
  const range = (max - min) || 1;
  const w = 200, h = 60;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  const zeroY = h - ((0 - min) / range) * h;
  // Area fill
  const areaPath = `M0,${h} ${values.map((v,i) => `L${i*step},${h - ((v - min) / range) * h}`).join(' ')} L${w},${h} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" x2={w} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
        <path d={areaPath} fill="url(#sparkfill)" />
        <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        {!dense && values.map((v, i) => (
          <circle key={i} cx={i * step} cy={h - ((v - min) / range) * h} r="1.6"
                  fill={v >= 0 ? 'var(--pos)' : 'var(--neg)'} />
        ))}
      </svg>
      {labels && (
        <div className="flex justify-between text-[9px] text-[var(--muted-2)] mono mt-1">
          {labels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
    </div>
  );
}

function CategoryDonut({ byCategory }: { byCategory: Record<string, { p: number; n: number; count: number }> }) {
  const data = CATEGORIES
    .map(c => ({ cat: c, count: byCategory[c.id]?.count ?? 0 }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count);
  const total = data.reduce((a, b) => a + b.count, 0);
  if (total === 0) return <div className="text-[11px] text-[var(--muted-2)]">No data.</div>;

  const r = 38, cx = 50, cy = 50;
  let cum = 0;
  const palette = ['#c2f54a','#7dd3fc','#fbbf24','#ec4899','#a855f7','#10b981','#fb923c'];
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 100 100" className="w-28 h-28">
        {data.map((d, i) => {
          const frac = d.count / total;
          const startAngle = cum * Math.PI * 2 - Math.PI / 2;
          const endAngle = (cum + frac) * Math.PI * 2 - Math.PI / 2;
          cum += frac;
          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy + r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy + r * Math.sin(endAngle);
          const large = frac > 0.5 ? 1 : 0;
          const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
          return <path key={d.cat.id} d={path} fill={palette[i % palette.length]} opacity={0.85} />;
        })}
        <circle cx={cx} cy={cy} r={24} fill="var(--panel)" />
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="9" fill="var(--muted)" fontFamily="Geist Mono">
          {total}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize="6" fill="var(--muted-2)" fontFamily="Geist Mono">
          entries
        </text>
      </svg>
      <div className="flex-1 space-y-1">
        {data.slice(0, 5).map((d, i) => (
          <div key={d.cat.id} className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full" style={{ background: palette[i % palette.length] }} />
            <span className="text-[var(--fg)]">{d.cat.emoji} {d.cat.name}</span>
            <span className="ml-auto mono text-[var(--muted-2)]">{Math.round((d.count / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MoodRadar({ byCategory }: { byCategory: Record<string, { p: number; n: number }> }) {
  const cats = CATEGORIES.filter(c => byCategory[c.id]?.p || byCategory[c.id]?.n);
  if (cats.length < 3) return <div className="text-[11px] text-[var(--muted-2)]">Log entries in 3+ categories to see your mood radar.</div>;

  const cx = 100, cy = 90, R = 70;
  const angle = (i: number) => (i / cats.length) * Math.PI * 2 - Math.PI / 2;
  const point = (i: number, value: number) => {
    const a = angle(i);
    return { x: cx + R * value * Math.cos(a), y: cy + R * value * Math.sin(a) };
  };

  // value = positivity (0..1) per category
  const values = cats.map(c => {
    const v = byCategory[c.id] || { p: 0, n: 0 };
    return (v.p + v.n) > 0 ? v.p / (v.p + v.n) : 0;
  });

  const polygonPts = values.map((v, i) => {
    const p = point(i, v);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 200 180" className="w-full h-48">
      {/* concentric grids */}
      {[0.25, 0.5, 0.75, 1].map(r => (
        <polygon key={r}
          points={cats.map((_, i) => {
            const p = point(i, r);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          }).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      ))}
      {/* axes */}
      {cats.map((_, i) => {
        const p = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />;
      })}
      {/* user shape */}
      <polygon points={polygonPts} fill="rgba(194,245,74,0.18)" stroke="var(--accent)" strokeWidth="1.4" />
      {values.map((v, i) => {
        const p = point(i, v);
        return <circle key={i} cx={p.x} cy={p.y} r="2" fill="var(--accent)" />;
      })}
      {/* labels */}
      {cats.map((c, i) => {
        const a = angle(i);
        const lx = cx + (R + 14) * Math.cos(a);
        const ly = cy + (R + 14) * Math.sin(a);
        return (
          <text key={c.id} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                fontSize="9" fill="var(--muted)">{c.emoji}</text>
        );
      })}
    </svg>
  );
}

function WordCloud({ words, accent }: { words: [string, number][]; accent: 'pos' | 'neg' }) {
  if (words.length === 0) return <div className="text-[11px] text-[var(--muted-2)]">No data yet.</div>;
  const max = Math.max(...words.map(w => w[1]));
  return (
    <div className="flex flex-wrap gap-2 items-baseline">
      {words.map(([w, c]) => {
        const size = 11 + (c / max) * 14; // 11..25px
        const opacity = 0.4 + (c / max) * 0.6;
        return (
          <span key={w}
                className={accent === 'pos' ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}
                style={{ fontSize: `${size}px`, opacity, lineHeight: 1.1, fontWeight: 500 }}>
            {w}
          </span>
        );
      })}
    </div>
  );
}
