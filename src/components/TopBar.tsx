import { motion } from 'framer-motion';
import { Settings as SettingsIcon, BookOpen, Coins } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';
import { levelFromXp } from '../lib/gamification';
import Mascot from './Mascot';
import ComboMeter from './ComboMeter';
import AnimatedNumber from './AnimatedNumber';

export default function TopBar({ onOpenSettings, onOpenRecap }: { onOpenSettings: () => void; onOpenRecap: () => void }) {
  const xp = useHabitStore(s => s.profile.xp);
  const gold = useHabitStore(s => s.profile.gold);
  const streak = useHabitStore(s => s.currentStreak());
  const todayNet = useHabitStore(s => s.todayNetXp());
  const lvl = levelFromXp(xp);

  return (
    <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-[var(--accent)] grid place-items-center">
          <span className="text-[#0a0a0b] font-bold text-sm">●</span>
        </div>
        <span className="font-medium text-[15px] tracking-tight">HabitQuest</span>
        <Mascot />
        <ComboMeter />
      </div>

      <div className="flex items-center gap-5">
        <Stat label="streak" value={`${streak}d`} />
        <Stat label="level" value={<AnimatedNumber value={lvl.level} />} />
        <div className="flex items-baseline gap-1.5" title="Gold — spend in Shop and Armory">
          <Coins className="w-3.5 h-3.5 text-amber-300 self-center" />
          <span className="mono text-sm font-medium text-amber-300"><AnimatedNumber value={gold} /></span>
          <span className="text-[10px] uppercase tracking-wider text-[var(--muted-2)]">gold</span>
        </div>
        <Stat
          label="today XP"
          value={<AnimatedNumber value={todayNet} sign />}
          accent={todayNet > 0 ? 'pos' : todayNet < 0 ? 'neg' : undefined}
        />
        <div className="hidden md:flex items-center gap-2 min-w-[140px]">
          <span className="mono text-[10px] text-[var(--muted-2)]">L{lvl.level}</span>
          <div className="flex-1 h-1 bg-[var(--line)] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[var(--accent)]"
              initial={{ width: 0 }}
              animate={{ width: `${lvl.pct * 100}%` }}
              transition={{ type: 'spring', stiffness: 80, damping: 18 }}
            />
          </div>
          <span className="mono text-[10px] text-[var(--muted-2)]">L{lvl.level + 1}</span>
        </div>
        <button
          onClick={onOpenRecap}
          title="Daily recap"
          className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--fg)] hover:bg-white/5"
        >
          <BookOpen className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--fg)] hover:bg-white/5"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: 'pos' | 'neg' }) {
  const cls = accent === 'pos' ? 'text-[var(--pos)]' : accent === 'neg' ? 'text-[var(--neg)]' : 'text-[var(--fg)]';
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`mono text-sm font-medium ${cls}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-[var(--muted-2)]">{label}</span>
    </div>
  );
}
