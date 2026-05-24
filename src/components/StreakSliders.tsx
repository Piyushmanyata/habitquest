// Multi-format streak readout. For each window (1h / 6h / 12h / 24h / 3d / 7d)
// we count positive entries inside the window and display a slider that fills
// against the window's target — small windows have small targets, long windows
// expect a sustained habit. Each row also shows whether the user is on track or
// has *missed* their last expected log.

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Clock, Sun, Moon, Calendar, Trophy } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';

type Window = {
  id: string;
  label: string;
  /** Window length in hours. */
  hours: number;
  /** Target number of positives across the window to "max" the bar. */
  target: number;
  /** Icon for the row. */
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  /** Optional accent color override. */
  color?: string;
};

const WINDOWS: Window[] = [
  { id: 'h1',  label: '1 hour',  hours: 1,         target: 1,  Icon: Clock,    color: '#7dd3fc' },
  { id: 'h6',  label: '6 hours', hours: 6,         target: 3,  Icon: Sun,      color: '#fbbf24' },
  { id: 'h12', label: '12 hours',hours: 12,        target: 5,  Icon: Moon,     color: '#a855f7' },
  { id: 'h24', label: '24 hours',hours: 24,        target: 7,  Icon: Flame,    color: '#ff6b6b' },
  { id: 'd3',  label: '3 days',  hours: 24 * 3,    target: 15, Icon: Calendar, color: '#c2f54a' },
  { id: 'd7',  label: '7 days',  hours: 24 * 7,    target: 28, Icon: Trophy,   color: '#fb923c' },
];

export default function StreakSliders() {
  const entries = useHabitStore(s => s.entries);
  const hourlyStreak = useHabitStore(s => s.profile.hourlyStreak);
  const hourlyBest = useHabitStore(s => s.profile.hourlyBest);
  const dayStreak = useHabitStore(s => s.currentStreak());
  const longestStreak = useHabitStore(s => s.profile.longestStreak);

  const rows = useMemo(() => {
    const now = Date.now();
    return WINDOWS.map(w => {
      const cutoff = now - w.hours * 3600 * 1000;
      let positive = 0;
      let negative = 0;
      let xp = 0;
      let lastPosAt = 0;
      for (const e of entries) {
        const t = new Date(e.createdAt).getTime();
        if (t < cutoff) continue;
        xp += e.xpDelta;
        if (e.sentiment === 'positive') {
          positive++;
          if (t > lastPosAt) lastPosAt = t;
        } else if (e.sentiment === 'negative') {
          negative++;
        }
      }
      const pct = Math.min(1, positive / w.target);
      // "minutes since last positive in this window" — null if none.
      const minsSinceLast = lastPosAt ? Math.round((now - lastPosAt) / 60000) : null;
      return { w, positive, negative, xp, pct, minsSinceLast };
    });
  }, [entries]);

  return (
    <div className="surface p-4 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[radial-gradient(circle,rgba(194,245,74,0.10),transparent_70%)] pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.08),transparent_70%)] pointer-events-none" />

      <div className="flex items-center justify-between mb-3 relative">
        <div className="flex items-center gap-2">
          <Flame className="w-3.5 h-3.5 text-amber-300" />
          <h3 className="text-[13px] font-semibold text-[var(--fg)] leading-tight">Streak Bands</h3>
        </div>
        <div className="text-[10px] mono uppercase tracking-wider text-[var(--muted-2)]">
          hour <span className="text-[var(--accent)]">{hourlyStreak}</span> · best <span className="text-[var(--muted)]">{hourlyBest}</span> · day <span className="text-[var(--accent)]">{dayStreak}</span> · longest <span className="text-[var(--muted)]">{longestStreak}</span>
        </div>
      </div>

      <div className="space-y-2.5 relative">
        {rows.map((r, i) => {
          const onTrack = r.pct >= 0.6;
          const stale = r.minsSinceLast !== null && r.minsSinceLast > r.w.hours * 60 * 0.6;
          const empty = r.positive === 0;
          return (
            <motion.div
              key={r.w.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i, type: 'spring', stiffness: 110, damping: 18 }}
              className="group"
              title={`${r.positive} positives, ${r.negative} slips, ${r.xp >= 0 ? '+' : ''}${r.xp} XP in last ${r.w.label}`}
            >
              <div className="flex items-center gap-2 text-[11px] mb-1">
                <r.w.Icon className="w-3 h-3 shrink-0" style={{ color: r.w.color }} />
                <span className="text-[var(--muted)] w-14">{r.w.label}</span>
                <span className="mono text-[10px] text-[var(--muted-2)] ml-auto">
                  {r.positive}/{r.w.target}
                  {r.minsSinceLast !== null && (
                    <span className="ml-1.5 opacity-70">
                      · {r.minsSinceLast < 60
                        ? `${r.minsSinceLast}m ago`
                        : `${Math.floor(r.minsSinceLast / 60)}h ago`}
                    </span>
                  )}
                  {empty && <span className="ml-1.5 text-[var(--muted-2)]">— silent</span>}
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-[var(--line)] overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${r.pct * 100}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    background: `linear-gradient(90deg, ${r.w.color}cc, ${r.w.color})`,
                    boxShadow: r.pct > 0 ? `0 0 14px -2px ${r.w.color}88` : 'none',
                  }}
                />
                {/* Slider thumb */}
                {r.pct > 0 && (
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg)]"
                    initial={{ left: 0 }}
                    animate={{ left: `calc(${r.pct * 100}% - 6px)` }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      background: r.w.color,
                      boxShadow: `0 0 10px ${r.w.color}aa`,
                    }}
                  />
                )}
                {/* Stale warning tick */}
                {stale && !empty && (
                  <span
                    className="absolute -top-1 right-0 w-0.5 h-3.5 bg-[var(--neg)]"
                    title="No positive in over 60% of this window"
                  />
                )}
              </div>
              {/* Pip indicators every 25% */}
              <div className="flex justify-between mt-1 px-0.5">
                {[0.25, 0.5, 0.75, 1].map(p => (
                  <span
                    key={p}
                    className="w-0.5 h-0.5 rounded-full"
                    style={{
                      background: r.pct >= p ? r.w.color : 'var(--line-2)',
                      opacity: r.pct >= p ? 0.8 : 0.4,
                    }}
                  />
                ))}
              </div>
              {onTrack && r.pct >= 1 && (
                <div className="mt-0.5 text-[10px] mono uppercase tracking-wider" style={{ color: r.w.color }}>
                  ✓ window maxed
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
