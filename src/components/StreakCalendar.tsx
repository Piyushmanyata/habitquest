import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useMemo } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { dayKey } from '../lib/gamification';

function lastDays(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

export default function StreakCalendar() {
  const entries = useHabitStore(s => s.entries);
  const streak = useHabitStore(s => s.currentStreak());
  const profile = useHabitStore(s => s.profile);

  const days = useMemo(() => lastDays(35), []);
  const dayInfo = useMemo(() => {
    const map: Record<string, { p: number; n: number; net: number }> = {};
    for (const e of entries) {
      const d = map[e.dayKey] ||= { p: 0, n: 0, net: 0 };
      d.net += e.xpDelta;
      if (e.sentiment === 'positive') d.p++;
      else if (e.sentiment === 'negative') d.n++;
    }
    return map;
  }, [entries]);

  // Flame intensity tied to current streak length
  const flameSize = Math.min(48, 28 + Math.min(streak, 30) * 0.7);
  const flameColor = streak >= 30 ? 'text-purple-400'
                   : streak >= 14 ? 'text-amber-300'
                   : streak >= 7  ? 'text-orange-400'
                   : streak >= 3  ? 'text-yellow-400'
                   : 'text-[var(--muted-2)]';
  const flameShadow = streak >= 30 ? 'drop-shadow(0 0 18px rgba(168,85,247,0.55))'
                    : streak >= 14 ? 'drop-shadow(0 0 16px rgba(251,191,36,0.55))'
                    : streak >= 7  ? 'drop-shadow(0 0 14px rgba(251,146,60,0.5))'
                    : streak >= 3  ? 'drop-shadow(0 0 10px rgba(250,204,21,0.4))'
                    : 'none';

  return (
    <div className="surface p-4 relative overflow-hidden">
      {/* glow halo when on a streak */}
      {streak >= 3 && (
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 pointer-events-none"
             style={{ background: streak >= 30 ? 'radial-gradient(circle, #a855f7, transparent 70%)'
                              : streak >= 14 ? 'radial-gradient(circle, #fbbf24, transparent 70%)'
                              : 'radial-gradient(circle, #fb923c, transparent 70%)' }} />
      )}

      <div className="flex items-center gap-3 relative">
        <motion.div
          animate={streak >= 1 ? { y: [-1, 1, -1], rotate: [-2, 2, -2] } : {}}
          transition={{ duration: 1.6, repeat: Infinity }}
          style={{ filter: flameShadow }}
        >
          <Flame className={flameColor} style={{ width: flameSize, height: flameSize, strokeWidth: 2 }} />
        </motion.div>
        <div className="flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-bold tracking-tight mono">{streak}</span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--muted-2)]">day{streak === 1 ? '' : 's'}</span>
          </div>
          <div className="text-[11px] text-[var(--muted)]">
            longest <span className="mono text-[var(--fg)]">{profile.longestStreak}d</span> · perfect days <span className="mono text-[var(--fg)]">{profile.perfectDays}</span>
          </div>
        </div>
      </div>

      {/* 35-day micro-calendar */}
      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] mb-1.5">last 5 weeks</div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(d => {
            const info = dayInfo[d];
            const today = d === dayKey();
            const cls = !info ? 'bg-[var(--line)]'
                     : info.net > 0 ? 'bg-[var(--accent)]'
                     : info.net < 0 ? 'bg-[var(--neg)]'
                     : 'bg-[var(--line-2)]';
            const intensity = !info ? 0.25 : Math.min(1, 0.4 + Math.abs(info.net) / 80);
            return (
              <div
                key={d}
                title={`${d}: ${info ? `${info.p}↑ ${info.n}↓ · ${info.net >= 0 ? '+' : ''}${info.net} XP` : 'no entries'}`}
                className={`aspect-square rounded ${cls} ${today ? 'ring-1 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--panel)]' : ''}`}
                style={{ opacity: intensity }}
              />
            );
          })}
        </div>
      </div>

      {streak === 0 && entries.length > 0 && (
        <div className="mt-3 text-[11px] text-[var(--muted)]">
          Log a positive today to start a new streak.
        </div>
      )}
    </div>
  );
}
