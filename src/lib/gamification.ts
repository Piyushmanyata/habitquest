// XP curve, levels, streak math, badge definitions.

export const BASE_XP_PER_HABIT = 12;

export function xpForLevel(level: number): number {
  // Total XP needed to REACH `level`. Quadratic so leveling slows down.
  if (level <= 1) return 0;
  return Math.round(50 * Math.pow(level - 1, 1.7));
}

export function levelFromXp(totalXp: number): { level: number; intoLevel: number; toNext: number; pct: number } {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) level++;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const intoLevel = totalXp - floor;
  const toNext = next - floor;
  return { level, intoLevel, toNext, pct: Math.min(1, intoLevel / toNext) };
}

// ----- Streak helpers -----
export function dayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export function streakMultiplier(streak: number): number {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.75;
  if (streak >= 7)  return 1.5;
  if (streak >= 3)  return 1.25;
  return 1;
}

// ----- Badges -----
export type BadgeTier = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type Badge = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  tier: BadgeTier;
  group: 'logging' | 'streak' | 'level' | 'variety' | 'quests' | 'perfect' | 'gold' | 'mood' | 'combat' | 'wisdom';
  /** returns true if the user has earned this badge */
  earned: (ctx: BadgeCtx) => boolean;
  /** returns progress 0..1 toward earning it */
  progress?: (ctx: BadgeCtx) => number;
  /** human-readable progress like "8 / 10 completions" */
  progressLabel?: (ctx: BadgeCtx) => string;
};

export type BadgeCtx = {
  totalCompletions: number;
  longestStreak: number;
  level: number;
  uniqueCategories: number;
  questsCompleted: number;
  perfectDays: number;
  // ── new dimensions for richer badge progression ─────────────────
  gold: number;
  hourlyBest: number;
  bossesDefeated: number;
  comboBest: number;
  totalNegatives: number;
  reflectionCount: number;
  uniqueEmotions: number;
  highIntensityCount: number; // intensity 4 or 5
  totalEntries: number;
};

function pct(n: number, max: number) { return Math.min(1, n / max); }
function ratioLabel(now: number, max: number, unit: string) { return `${Math.min(now, max)} / ${max} ${unit}`; }

export const TIER_COLOR: Record<BadgeTier, string> = {
  common:    '#9ca3af',
  rare:      '#7dd3fc',
  epic:      '#a855f7',
  legendary: '#fbbf24',
  mythic:    '#ff4d6d',
};

export const TIER_ORDER: BadgeTier[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

export const BADGES: Badge[] = [
  // ═══ LOGGING — sheer volume of positives ══════════════════════════════
  { id: 'first',     name: 'First Step',      emoji: '👣', tier: 'common', group: 'logging',
    description: 'Log your first positive entry.',
    earned: c => c.totalCompletions >= 1,
    progress: c => pct(c.totalCompletions, 1),
    progressLabel: c => ratioLabel(c.totalCompletions, 1, 'positives') },
  { id: 'ten',       name: 'Getting Going',   emoji: '🔟', tier: 'common', group: 'logging',
    description: 'Log 10 positive entries.',
    earned: c => c.totalCompletions >= 10,
    progress: c => pct(c.totalCompletions, 10),
    progressLabel: c => ratioLabel(c.totalCompletions, 10, 'positives') },
  { id: 'fifty',     name: 'Half Century',    emoji: '🏅', tier: 'rare', group: 'logging',
    description: 'Log 50 positive entries.',
    earned: c => c.totalCompletions >= 50,
    progress: c => pct(c.totalCompletions, 50),
    progressLabel: c => ratioLabel(c.totalCompletions, 50, 'positives') },
  { id: 'hundo',     name: 'Centurion',       emoji: '💯', tier: 'epic', group: 'logging',
    description: 'Log 100 positive entries.',
    earned: c => c.totalCompletions >= 100,
    progress: c => pct(c.totalCompletions, 100),
    progressLabel: c => ratioLabel(c.totalCompletions, 100, 'positives') },
  { id: 'fivehundred', name: 'Five Hundred',  emoji: '🎯', tier: 'legendary', group: 'logging',
    description: 'Log 500 positive entries — masterclass.',
    earned: c => c.totalCompletions >= 500,
    progress: c => pct(c.totalCompletions, 500),
    progressLabel: c => ratioLabel(c.totalCompletions, 500, 'positives') },
  { id: 'thousand',  name: 'Iron Habit',      emoji: '⚙️', tier: 'mythic', group: 'logging',
    description: '1,000 positive entries logged. Mythic-level discipline.',
    earned: c => c.totalCompletions >= 1000,
    progress: c => pct(c.totalCompletions, 1000),
    progressLabel: c => ratioLabel(c.totalCompletions, 1000, 'positives') },

  // ═══ STREAK — multi-day discipline ═══════════════════════════════════
  { id: 's3',        name: 'On A Roll',       emoji: '🔥', tier: 'common', group: 'streak',
    description: 'Hit a 3-day streak.',
    earned: c => c.longestStreak >= 3,
    progress: c => pct(c.longestStreak, 3),
    progressLabel: c => ratioLabel(c.longestStreak, 3, 'days') },
  { id: 's7',        name: 'Week Warrior',    emoji: '⚔️', tier: 'rare', group: 'streak',
    description: 'Hit a 7-day streak.',
    earned: c => c.longestStreak >= 7,
    progress: c => pct(c.longestStreak, 7),
    progressLabel: c => ratioLabel(c.longestStreak, 7, 'days') },
  { id: 's14',       name: 'Fortnight Force', emoji: '🌗', tier: 'rare', group: 'streak',
    description: 'Hit a 14-day streak.',
    earned: c => c.longestStreak >= 14,
    progress: c => pct(c.longestStreak, 14),
    progressLabel: c => ratioLabel(c.longestStreak, 14, 'days') },
  { id: 's30',       name: 'Unbreakable',     emoji: '🛡️', tier: 'epic', group: 'streak',
    description: '30-day streak — unbreakable.',
    earned: c => c.longestStreak >= 30,
    progress: c => pct(c.longestStreak, 30),
    progressLabel: c => ratioLabel(c.longestStreak, 30, 'days') },
  { id: 's60',       name: 'Two-Month Titan', emoji: '🗿', tier: 'legendary', group: 'streak',
    description: '60-day streak — granite consistency.',
    earned: c => c.longestStreak >= 60,
    progress: c => pct(c.longestStreak, 60),
    progressLabel: c => ratioLabel(c.longestStreak, 60, 'days') },
  { id: 's100',      name: 'Centennial Soul', emoji: '🌌', tier: 'mythic', group: 'streak',
    description: '100-day streak — mythic.',
    earned: c => c.longestStreak >= 100,
    progress: c => pct(c.longestStreak, 100),
    progressLabel: c => ratioLabel(c.longestStreak, 100, 'days') },

  // ═══ LEVEL — XP curve milestones ═════════════════════════════════════
  { id: 'lvl5',      name: 'Rising Hero',     emoji: '⭐', tier: 'common', group: 'level',
    description: 'Reach level 5.',
    earned: c => c.level >= 5,
    progress: c => pct(c.level, 5),
    progressLabel: c => ratioLabel(c.level, 5, 'lvl') },
  { id: 'lvl10',     name: 'Veteran',         emoji: '🌟', tier: 'rare', group: 'level',
    description: 'Reach level 10.',
    earned: c => c.level >= 10,
    progress: c => pct(c.level, 10),
    progressLabel: c => ratioLabel(c.level, 10, 'lvl') },
  { id: 'lvl20',     name: 'Champion',        emoji: '👑', tier: 'epic', group: 'level',
    description: 'Reach level 20.',
    earned: c => c.level >= 20,
    progress: c => pct(c.level, 20),
    progressLabel: c => ratioLabel(c.level, 20, 'lvl') },
  { id: 'lvl30',     name: 'Mythic',          emoji: '🪐', tier: 'legendary', group: 'level',
    description: 'Reach level 30 — top tier.',
    earned: c => c.level >= 30,
    progress: c => pct(c.level, 30),
    progressLabel: c => ratioLabel(c.level, 30, 'lvl') },
  { id: 'lvl50',     name: 'Ascendant',       emoji: '☄️', tier: 'mythic', group: 'level',
    description: 'Reach level 50 — into mythic territory.',
    earned: c => c.level >= 50,
    progress: c => pct(c.level, 50),
    progressLabel: c => ratioLabel(c.level, 50, 'lvl') },

  // ═══ VARIETY — breadth of life logged ════════════════════════════════
  { id: 'diverse',   name: 'Renaissance',     emoji: '🎭', tier: 'common', group: 'variety',
    description: 'Log in 4 different categories.',
    earned: c => c.uniqueCategories >= 4,
    progress: c => pct(c.uniqueCategories, 4),
    progressLabel: c => ratioLabel(c.uniqueCategories, 4, 'cats') },
  { id: 'allcats',   name: 'Renaissance Lord',emoji: '🌐', tier: 'epic', group: 'variety',
    description: 'Log in all 7 categories at least once.',
    earned: c => c.uniqueCategories >= 7,
    progress: c => pct(c.uniqueCategories, 7),
    progressLabel: c => ratioLabel(c.uniqueCategories, 7, 'cats') },

  // ═══ QUESTS — short-term goal hits ═══════════════════════════════════
  { id: 'q5',        name: 'Questmaster',     emoji: '📜', tier: 'common', group: 'quests',
    description: 'Finish 5 daily quests.',
    earned: c => c.questsCompleted >= 5,
    progress: c => pct(c.questsCompleted, 5),
    progressLabel: c => ratioLabel(c.questsCompleted, 5, 'quests') },
  { id: 'q25',       name: 'Quest King',      emoji: '👑', tier: 'rare', group: 'quests',
    description: 'Finish 25 daily quests.',
    earned: c => c.questsCompleted >= 25,
    progress: c => pct(c.questsCompleted, 25),
    progressLabel: c => ratioLabel(c.questsCompleted, 25, 'quests') },
  { id: 'q100',      name: 'Quest Emperor',   emoji: '📿', tier: 'epic', group: 'quests',
    description: 'Finish 100 daily quests.',
    earned: c => c.questsCompleted >= 100,
    progress: c => pct(c.questsCompleted, 100),
    progressLabel: c => ratioLabel(c.questsCompleted, 100, 'quests') },

  // ═══ PERFECT DAYS — clean wins, zero slips ═══════════════════════════
  { id: 'perfect3',  name: 'Triple Perfect',  emoji: '💎', tier: 'rare', group: 'perfect',
    description: '3 perfect days (3+ positives, 0 slips).',
    earned: c => c.perfectDays >= 3,
    progress: c => pct(c.perfectDays, 3),
    progressLabel: c => ratioLabel(c.perfectDays, 3, 'perfect') },
  { id: 'perfect14', name: 'Spotless Two-Wk', emoji: '✨', tier: 'epic', group: 'perfect',
    description: '14 perfect days.',
    earned: c => c.perfectDays >= 14,
    progress: c => pct(c.perfectDays, 14),
    progressLabel: c => ratioLabel(c.perfectDays, 14, 'perfect') },
  { id: 'perfect50', name: 'Marble Month×2',  emoji: '🏛️', tier: 'mythic', group: 'perfect',
    description: '50 perfect days. The marble life.',
    earned: c => c.perfectDays >= 50,
    progress: c => pct(c.perfectDays, 50),
    progressLabel: c => ratioLabel(c.perfectDays, 50, 'perfect') },

  // ═══ GOLD — economic milestones ══════════════════════════════════════
  { id: 'gold100',   name: 'First Hoard',     emoji: '🪙', tier: 'common', group: 'gold',
    description: 'Accumulate 100 gold total.',
    earned: c => c.gold >= 100,
    progress: c => pct(c.gold, 100),
    progressLabel: c => ratioLabel(c.gold, 100, 'gold') },
  { id: 'gold500',   name: 'Treasure Chest',  emoji: '💰', tier: 'rare', group: 'gold',
    description: 'Hold 500 gold at once.',
    earned: c => c.gold >= 500,
    progress: c => pct(c.gold, 500),
    progressLabel: c => ratioLabel(c.gold, 500, 'gold') },
  { id: 'gold2500',  name: 'Vault Walker',    emoji: '🏦', tier: 'epic', group: 'gold',
    description: 'Hold 2,500 gold at once.',
    earned: c => c.gold >= 2500,
    progress: c => pct(c.gold, 2500),
    progressLabel: c => ratioLabel(c.gold, 2500, 'gold') },
  { id: 'gold10k',   name: 'Dragon Hoard',    emoji: '🐉', tier: 'legendary', group: 'gold',
    description: 'Hold 10,000 gold at once.',
    earned: c => c.gold >= 10000,
    progress: c => pct(c.gold, 10000),
    progressLabel: c => ratioLabel(c.gold, 10000, 'gold') },

  // ═══ MOOD — emotional self-awareness ═════════════════════════════════
  { id: 'reflect5',  name: 'Inner Voice',     emoji: '🗯️', tier: 'common', group: 'mood',
    description: 'Write 5 reflections in your journal.',
    earned: c => c.reflectionCount >= 5,
    progress: c => pct(c.reflectionCount, 5),
    progressLabel: c => ratioLabel(c.reflectionCount, 5, 'reflections') },
  { id: 'reflect30', name: 'Therapist',       emoji: '🪞', tier: 'epic', group: 'mood',
    description: 'Write 30 reflections.',
    earned: c => c.reflectionCount >= 30,
    progress: c => pct(c.reflectionCount, 30),
    progressLabel: c => ratioLabel(c.reflectionCount, 30, 'reflections') },
  { id: 'mood7',     name: 'Mood Spectrum',   emoji: '🌈', tier: 'rare', group: 'mood',
    description: 'Tag 7 distinct emotions.',
    earned: c => c.uniqueEmotions >= 7,
    progress: c => pct(c.uniqueEmotions, 7),
    progressLabel: c => ratioLabel(c.uniqueEmotions, 7, 'emotions') },
  { id: 'mood13',    name: 'Full Palette',    emoji: '🎨', tier: 'legendary', group: 'mood',
    description: 'Tag all 13 emotions at least once.',
    earned: c => c.uniqueEmotions >= 13,
    progress: c => pct(c.uniqueEmotions, 13),
    progressLabel: c => ratioLabel(c.uniqueEmotions, 13, 'emotions') },
  { id: 'honest10',  name: 'Brutally Honest', emoji: '🪤', tier: 'rare', group: 'mood',
    description: 'Log 10 slips honestly — self-awareness counts.',
    earned: c => c.totalNegatives >= 10,
    progress: c => pct(c.totalNegatives, 10),
    progressLabel: c => ratioLabel(c.totalNegatives, 10, 'slips logged') },

  // ═══ COMBAT — boss + combo achievements ══════════════════════════════
  { id: 'boss1',     name: 'First Slay',      emoji: '🗡️', tier: 'common', group: 'combat',
    description: 'Defeat your first boss.',
    earned: c => c.bossesDefeated >= 1,
    progress: c => pct(c.bossesDefeated, 1),
    progressLabel: c => ratioLabel(c.bossesDefeated, 1, 'bosses') },
  { id: 'boss10',    name: 'Beast Hunter',    emoji: '🏹', tier: 'rare', group: 'combat',
    description: 'Defeat 10 bosses.',
    earned: c => c.bossesDefeated >= 10,
    progress: c => pct(c.bossesDefeated, 10),
    progressLabel: c => ratioLabel(c.bossesDefeated, 10, 'bosses') },
  { id: 'boss50',    name: 'Boss Slayer',     emoji: '⚔️', tier: 'epic', group: 'combat',
    description: 'Defeat 50 bosses.',
    earned: c => c.bossesDefeated >= 50,
    progress: c => pct(c.bossesDefeated, 50),
    progressLabel: c => ratioLabel(c.bossesDefeated, 50, 'bosses') },
  { id: 'boss200',   name: 'Demon Lord',      emoji: '👹', tier: 'mythic', group: 'combat',
    description: 'Defeat 200 bosses. Mythic huntmaster.',
    earned: c => c.bossesDefeated >= 200,
    progress: c => pct(c.bossesDefeated, 200),
    progressLabel: c => ratioLabel(c.bossesDefeated, 200, 'bosses') },
  { id: 'combo5',    name: 'Combo Crafter',   emoji: '🎇', tier: 'common', group: 'combat',
    description: 'Hit a 5-combo.',
    earned: c => c.comboBest >= 5,
    progress: c => pct(c.comboBest, 5),
    progressLabel: c => ratioLabel(c.comboBest, 5, 'combo') },
  { id: 'combo10',   name: 'Combo King',      emoji: '💥', tier: 'epic', group: 'combat',
    description: 'Hit a 10-combo.',
    earned: c => c.comboBest >= 10,
    progress: c => pct(c.comboBest, 10),
    progressLabel: c => ratioLabel(c.comboBest, 10, 'combo') },

  // ═══ WISDOM — hourly + intensity + meta ══════════════════════════════
  { id: 'hour6',     name: 'Hourly Habit',    emoji: '⏰', tier: 'common', group: 'wisdom',
    description: 'Log in 6 consecutive hours.',
    earned: c => c.hourlyBest >= 6,
    progress: c => pct(c.hourlyBest, 6),
    progressLabel: c => ratioLabel(c.hourlyBest, 6, 'hours') },
  { id: 'hour12',    name: 'Half-Day Pulse',  emoji: '🕛', tier: 'rare', group: 'wisdom',
    description: 'Log every hour for 12 hours straight.',
    earned: c => c.hourlyBest >= 12,
    progress: c => pct(c.hourlyBest, 12),
    progressLabel: c => ratioLabel(c.hourlyBest, 12, 'hours') },
  { id: 'hour24',    name: 'Full Cycle',      emoji: '🕰️', tier: 'legendary', group: 'wisdom',
    description: 'Log every hour for 24 hours. Inhuman.',
    earned: c => c.hourlyBest >= 24,
    progress: c => pct(c.hourlyBest, 24),
    progressLabel: c => ratioLabel(c.hourlyBest, 24, 'hours') },
  { id: 'intense5',  name: 'Heavy Lifter',    emoji: '🏋️', tier: 'rare', group: 'wisdom',
    description: 'Log 5 intensity-4+ entries.',
    earned: c => c.highIntensityCount >= 5,
    progress: c => pct(c.highIntensityCount, 5),
    progressLabel: c => ratioLabel(c.highIntensityCount, 5, 'heavy') },
  { id: 'intense25', name: 'Hard Mode',       emoji: '🦾', tier: 'epic', group: 'wisdom',
    description: 'Log 25 intensity-4+ entries.',
    earned: c => c.highIntensityCount >= 25,
    progress: c => pct(c.highIntensityCount, 25),
    progressLabel: c => ratioLabel(c.highIntensityCount, 25, 'heavy') },
  { id: 'intense100',name: 'Epic Workhorse',  emoji: '🐉', tier: 'mythic', group: 'wisdom',
    description: 'Log 100 intensity-4+ entries.',
    earned: c => c.highIntensityCount >= 100,
    progress: c => pct(c.highIntensityCount, 100),
    progressLabel: c => ratioLabel(c.highIntensityCount, 100, 'heavy') },
];

// ----- Daily quests -----
export type QuestKind =
  | 'complete_n_habits'
  | 'complete_in_category'
  | 'perfect_day'
  | 'comeback'
  | 'combo'
  | 'slay_beast';

export type Quest = {
  id: string;
  kind: QuestKind;
  title: string;
  description: string;
  emoji: string;
  target: number;
  progress: number;
  xpReward: number;
  meta?: { parentId?: string };
  completed: boolean;
  claimed: boolean;
  dayKey: string;
};

import { CATEGORIES } from './categories';

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function generateDailyQuests(seedDayKey: string, _totalHabits: number): Quest[] {
  const quests: Quest[] = [];

  // Always include Daily Drive
  quests.push({
    id: `${seedDayKey}-drive`, kind: 'complete_n_habits',
    title: 'Daily Drive', description: 'Log 3 positive actions today',
    emoji: '⚡', target: 3, progress: 0, xpReward: 30,
    completed: false, claimed: false, dayKey: seedDayKey,
  });

  // Random category focus
  const cat = rand(CATEGORIES.filter(c => c.id !== 'breaking'));
  quests.push({
    id: `${seedDayKey}-cat`, kind: 'complete_in_category',
    title: `${cat.emoji} ${cat.name} Focus`,
    description: `Log 1 positive in ${cat.name}`,
    emoji: cat.emoji, target: 1, progress: 0, xpReward: 40,
    meta: { parentId: cat.id },
    completed: false, claimed: false, dayKey: seedDayKey,
  });

  // Rotate the third quest between Comeback / Combo / Slay / Perfect
  const pool: Quest[] = [
    {
      id: `${seedDayKey}-combo`, kind: 'combo',
      title: 'Combo King',
      description: 'Hit a 3+ positive combo (no negatives between)',
      emoji: '🔥', target: 3, progress: 0, xpReward: 60,
      completed: false, claimed: false, dayKey: seedDayKey,
    },
    {
      id: `${seedDayKey}-comeback`, kind: 'comeback',
      title: 'Comeback Kid',
      description: 'Recover from a slip with a positive within 1 hour',
      emoji: '🌀', target: 1, progress: 0, xpReward: 50,
      completed: false, claimed: false, dayKey: seedDayKey,
    },
    {
      id: `${seedDayKey}-perfect`, kind: 'perfect_day',
      title: 'Perfect Day',
      description: '3+ positives, zero negatives, all day',
      emoji: '💎', target: 1, progress: 0, xpReward: 75,
      completed: false, claimed: false, dayKey: seedDayKey,
    },
    {
      id: `${seedDayKey}-slay`, kind: 'slay_beast',
      title: 'Slay The Beast',
      description: 'Bounce back from a bad-habit slip with anything positive',
      emoji: '⚔️', target: 1, progress: 0, xpReward: 55,
      completed: false, claimed: false, dayKey: seedDayKey,
    },
  ];
  quests.push(rand(pool));

  return quests;
}
