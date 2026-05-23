// Full badge gallery — built-in + AI-minted custom badges, with progress
// bars on every locked built-in badge so the user can see how close they are.
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Sparkles } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';
import { BADGES, levelFromXp } from '../lib/gamification';

export default function BadgesPanel() {
  const entries = useHabitStore(s => s.entries);
  const profile = useHabitStore(s => s.profile);
  const questsCompleted = useHabitStore(s => s.questsCompletedTotal);
  const customBadges = useHabitStore(s => s.customBadges);

  const ctx = useMemo(() => ({
    totalCompletions: entries.filter(e => e.sentiment === 'positive').length,
    longestStreak: profile.longestStreak,
    level: levelFromXp(profile.xp).level,
    uniqueCategories: new Set(entries.map(e => e.parentId)).size,
    questsCompleted,
    perfectDays: profile.perfectDays,
  }), [entries, profile, questsCompleted]);

  const builtin = useMemo(() => BADGES.map(b => ({
    ...b,
    isEarned: b.earned(ctx),
    pct: b.progress ? b.progress(ctx) : (b.earned(ctx) ? 1 : 0),
    label: b.progressLabel ? b.progressLabel(ctx) : '',
  })), [ctx]);

  const earnedCount = builtin.filter(b => b.isEarned).length + customBadges.length;
  const totalCount  = builtin.length + customBadges.length;

  return (
    <div className="surface p-5 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.10),transparent_70%)] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.08),transparent_70%)] pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative">
        <div className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-amber-300" />
          <h3 className="text-[13px] font-semibold text-[var(--fg)] leading-tight">Badges</h3>
        </div>
        <div className="text-[10px] mono uppercase tracking-wider text-[var(--muted-2)]">
          <span className="text-amber-300">{earnedCount}</span> / {totalCount} earned
        </div>
      </div>

      {/* Custom badges minted by Sage — special section */}
      {customBadges.length > 0 && (
        <div className="mb-5 relative">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider mono text-purple-300 mb-2">
            <Sparkles className="w-3 h-3" /> minted by sage
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {customBadges.map(b => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-lg border-2 border-purple-400/60 bg-purple-500/5 p-2.5 flex items-start gap-2"
                style={{ boxShadow: '0 0 20px -8px rgba(168,85,247,0.45)' }}
                title={b.description}
              >
                <div className="text-2xl leading-none">{b.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11.5px] font-medium text-[var(--fg)] leading-tight truncate">{b.name}</div>
                  <div className="text-[10px] text-purple-300/80 leading-snug mt-0.5">{b.description}</div>
                  {b.recurring && (
                    <span className="mt-1 inline-block text-[8.5px] mono uppercase tracking-wider text-purple-300/70">recurring</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Built-in badges — every badge always visible, locked shows progress */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 relative">
        {builtin.map(b => (
          <motion.div
            key={b.id}
            whileHover={{ y: -2 }}
            className={`rounded-lg p-2.5 border flex items-start gap-2 transition relative overflow-hidden ${
              b.isEarned
                ? 'border-amber-300/45 bg-amber-300/5'
                : 'border-[var(--line)] bg-[var(--panel-2)] opacity-80'
            }`}
            style={b.isEarned ? { boxShadow: '0 0 20px -10px rgba(251,191,36,0.5)' } : {}}
            title={b.description}
          >
            <div className={`text-2xl leading-none ${b.isEarned ? '' : 'grayscale opacity-50'}`}>{b.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11.5px] font-medium text-[var(--fg)] leading-tight truncate">{b.name}</span>
                {b.isEarned && <span className="text-amber-300 text-[10px]">✓</span>}
              </div>
              <div className="text-[10px] text-[var(--muted)] leading-snug mt-0.5">{b.description}</div>
              {!b.isEarned && b.label && (
                <>
                  <div className="mt-1 h-1 bg-[var(--line)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-amber-300/70 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${b.pct * 100}%` }}
                      transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                    />
                  </div>
                  <div className="text-[9px] mono text-[var(--muted-2)] mt-0.5">{b.label}</div>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
