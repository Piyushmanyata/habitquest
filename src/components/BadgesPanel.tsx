// Full badge gallery — tier-grouped, with progress bars on every locked
// built-in badge and a separate section for AI-minted custom badges.
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Filter } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';
import {
  BADGES, BadgeTier, TIER_COLOR, TIER_ORDER, levelFromXp,
} from '../lib/gamification';

const TIER_LABEL: Record<BadgeTier, string> = {
  common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', mythic: 'Mythic',
};

export default function BadgesPanel() {
  const entries = useHabitStore(s => s.entries);
  const profile = useHabitStore(s => s.profile);
  const questsCompleted = useHabitStore(s => s.questsCompletedTotal);
  const comboBest = useHabitStore(s => s.comboBest);
  const customBadges = useHabitStore(s => s.customBadges);

  const [tierFilter, setTierFilter] = useState<BadgeTier | 'all'>('all');
  const [showEarnedOnly, setShowEarnedOnly] = useState(false);

  const ctx = useMemo(() => {
    const pos = entries.filter(e => e.sentiment === 'positive');
    const neg = entries.filter(e => e.sentiment === 'negative');
    const emos = new Set<string>();
    let reflections = 0;
    let heavy = 0;
    for (const e of entries) {
      if (e.emotion) emos.add(e.emotion);
      if (e.reflection) reflections++;
      if ((e.intensity || 0) >= 4) heavy++;
    }
    return {
      totalCompletions: pos.length,
      longestStreak: profile.longestStreak,
      level: levelFromXp(profile.xp).level,
      uniqueCategories: new Set(entries.map(e => e.parentId)).size,
      questsCompleted,
      perfectDays: profile.perfectDays,
      gold: profile.gold,
      hourlyBest: profile.hourlyBest,
      bossesDefeated: profile.bossesDefeated,
      comboBest,
      totalNegatives: neg.length,
      reflectionCount: reflections,
      uniqueEmotions: emos.size,
      highIntensityCount: heavy,
      totalEntries: entries.length,
    };
  }, [entries, profile, questsCompleted, comboBest]);

  const all = useMemo(() => BADGES.map(b => ({
    ...b,
    isEarned: b.earned(ctx),
    pct: b.progress ? b.progress(ctx) : (b.earned(ctx) ? 1 : 0),
    label: b.progressLabel ? b.progressLabel(ctx) : '',
  })), [ctx]);

  const filtered = useMemo(() => {
    let xs = all;
    if (tierFilter !== 'all') xs = xs.filter(b => b.tier === tierFilter);
    if (showEarnedOnly) xs = xs.filter(b => b.isEarned);
    return xs;
  }, [all, tierFilter, showEarnedOnly]);

  const byTier = useMemo(() => {
    const map: Record<BadgeTier, typeof filtered> = {
      common: [], rare: [], epic: [], legendary: [], mythic: [],
    };
    for (const b of filtered) map[b.tier].push(b);
    return map;
  }, [filtered]);

  const earnedCount = all.filter(b => b.isEarned).length + customBadges.length;
  const totalCount = all.length + customBadges.length;
  const earnedByTier = useMemo(() => {
    const map: Record<BadgeTier, { earned: number; total: number }> = {
      common: { earned: 0, total: 0 }, rare: { earned: 0, total: 0 },
      epic: { earned: 0, total: 0 }, legendary: { earned: 0, total: 0 }, mythic: { earned: 0, total: 0 },
    };
    for (const b of all) {
      map[b.tier].total++;
      if (b.isEarned) map[b.tier].earned++;
    }
    return map;
  }, [all]);

  return (
    <div className="surface p-5 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.10),transparent_70%)] pointer-events-none float-slow" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.08),transparent_70%)] pointer-events-none float-mid" />

      <div className="flex items-center justify-between mb-4 relative flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-amber-300" />
          <h3 className="text-[13px] font-semibold text-[var(--fg)] leading-tight">Badges</h3>
        </div>
        <div className="text-[10px] mono uppercase tracking-wider text-[var(--muted-2)]">
          <span className="text-amber-300">{earnedCount}</span> / {totalCount} earned
        </div>
      </div>

      {/* Tier-progress strip */}
      <div className="grid grid-cols-5 gap-1.5 mb-4 relative">
        {TIER_ORDER.map(t => {
          const { earned, total } = earnedByTier[t];
          const pct = total === 0 ? 0 : earned / total;
          return (
            <button
              key={t}
              onClick={() => setTierFilter(prev => prev === t ? 'all' : t)}
              className={`rounded-md p-1.5 border transition text-left ${tierFilter === t ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
              style={{ borderColor: TIER_COLOR[t] + (tierFilter === t ? 'cc' : '40') }}
              title={`${TIER_LABEL[t]} — ${earned}/${total}`}
            >
              <div className="text-[9px] mono uppercase tracking-wider" style={{ color: TIER_COLOR[t] }}>
                {TIER_LABEL[t]}
              </div>
              <div className="mt-0.5 mono text-[11px] text-[var(--fg)]">{earned}<span className="text-[var(--muted-2)]">/{total}</span></div>
              <div className="mt-1 h-0.5 bg-[var(--line)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full"
                  style={{ background: TIER_COLOR[t] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-3 relative gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px]">
          <Filter className="w-3 h-3 text-[var(--muted-2)]" />
          <button
            onClick={() => setTierFilter('all')}
            className={`px-2 py-0.5 rounded text-[10px] mono uppercase tracking-wider transition ${
              tierFilter === 'all' ? 'bg-[var(--fg)] text-[#0a0a0b]' : 'text-[var(--muted)] hover:bg-white/5'
            }`}
          >
            all tiers
          </button>
          <button
            onClick={() => setShowEarnedOnly(v => !v)}
            className={`px-2 py-0.5 rounded text-[10px] mono uppercase tracking-wider transition ${
              showEarnedOnly ? 'bg-amber-300 text-[#0a0a0b]' : 'text-[var(--muted)] hover:bg-white/5'
            }`}
          >
            earned only
          </button>
        </div>
        {tierFilter !== 'all' && (
          <span className="text-[10px] mono uppercase tracking-wider" style={{ color: TIER_COLOR[tierFilter] }}>
            filter: {TIER_LABEL[tierFilter]}
          </span>
        )}
      </div>

      {/* Custom badges minted by Sage */}
      {customBadges.length > 0 && tierFilter === 'all' && (
        <div className="mb-5 relative">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider mono text-purple-300 mb-2">
            <Sparkles className="w-3 h-3" /> minted by sage
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {customBadges.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.03 * i }}
                className="rounded-lg border-2 border-purple-400/60 bg-purple-500/5 p-2.5 flex items-start gap-2 tier-glow-epic"
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

      {/* Tier groups */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tierFilter + (showEarnedOnly ? '-e' : '')}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="space-y-4 relative"
        >
          {TIER_ORDER.map(tier => {
            const list = byTier[tier];
            if (!list || list.length === 0) return null;
            return (
              <div key={tier}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[10px] mono uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: TIER_COLOR[tier], color: '#0a0a0b' }}
                  >
                    {TIER_LABEL[tier]}
                  </span>
                  <span className="text-[10px] mono text-[var(--muted-2)]">
                    {list.filter(b => b.isEarned).length} / {list.length}
                  </span>
                  <div className="flex-1 h-px bg-[var(--line)]" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {list.map((b, i) => (
                    <motion.div
                      key={b.id}
                      whileHover={{ y: -2 }}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.02 * i, type: 'spring', stiffness: 220, damping: 22 }}
                      className={`rounded-lg p-2.5 border flex items-start gap-2 relative overflow-hidden ${
                        b.isEarned
                          ? `tier-glow-${tier} ${(tier === 'legendary' || tier === 'mythic') ? `tier-rim-${tier}` : ''}`
                          : 'opacity-80'
                      }`}
                      style={{
                        borderColor: b.isEarned ? TIER_COLOR[tier] + '88' : 'var(--line)',
                        background: b.isEarned
                          ? `linear-gradient(180deg, ${TIER_COLOR[tier]}10, transparent)`
                          : 'var(--panel-2)',
                      }}
                      title={b.description}
                    >
                      <div className={`text-2xl leading-none ${b.isEarned ? '' : 'grayscale opacity-50'}`}>{b.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11.5px] font-medium text-[var(--fg)] leading-tight truncate">{b.name}</span>
                          {b.isEarned && (
                            <span className="text-[10px]" style={{ color: TIER_COLOR[tier] }}>✓</span>
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--muted)] leading-snug mt-0.5">{b.description}</div>
                        {!b.isEarned && b.label && (
                          <>
                            <div className="mt-1 h-1 bg-[var(--line)] rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: TIER_COLOR[tier] + 'cc' }}
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
          })}
          {filtered.length === 0 && (
            <div className="text-[11px] text-[var(--muted-2)] py-6 text-center">
              No badges match this filter yet.
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
