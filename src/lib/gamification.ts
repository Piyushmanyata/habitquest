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
export type Badge = {
  id: string;
  name: string;
  emoji: string;
  description: string;
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
};

function pct(n: number, max: number) { return Math.min(1, n / max); }
function ratioLabel(now: number, max: number, unit: string) { return `${Math.min(now, max)} / ${max} ${unit}`; }

export const BADGES: Badge[] = [
  { id: 'first',     name: 'First Step',      emoji: '👣', description: 'Log your first positive entry.',
    earned: c => c.totalCompletions >= 1,
    progress: c => pct(c.totalCompletions, 1),
    progressLabel: c => ratioLabel(c.totalCompletions, 1, 'positives') },
  { id: 'ten',       name: 'Getting Going',   emoji: '🔟', description: 'Log 10 positive entries.',
    earned: c => c.totalCompletions >= 10,
    progress: c => pct(c.totalCompletions, 10),
    progressLabel: c => ratioLabel(c.totalCompletions, 10, 'positives') },
  { id: 'fifty',     name: 'Half Century',    emoji: '🏅', description: 'Log 50 positive entries.',
    earned: c => c.totalCompletions >= 50,
    progress: c => pct(c.totalCompletions, 50),
    progressLabel: c => ratioLabel(c.totalCompletions, 50, 'positives') },
  { id: 'hundo',     name: 'Centurion',       emoji: '💯', description: 'Log 100 positive entries.',
    earned: c => c.totalCompletions >= 100,
    progress: c => pct(c.totalCompletions, 100),
    progressLabel: c => ratioLabel(c.totalCompletions, 100, 'positives') },
  { id: 'fivehundred', name: 'Five Hundred',  emoji: '🎯', description: 'Log 500 positive entries — masterclass.',
    earned: c => c.totalCompletions >= 500,
    progress: c => pct(c.totalCompletions, 500),
    progressLabel: c => ratioLabel(c.totalCompletions, 500, 'positives') },
  { id: 's3',        name: 'On A Roll',       emoji: '🔥', description: 'Hit a 3-day streak.',
    earned: c => c.longestStreak >= 3,
    progress: c => pct(c.longestStreak, 3),
    progressLabel: c => ratioLabel(c.longestStreak, 3, 'days') },
  { id: 's7',        name: 'Week Warrior',    emoji: '⚔️', description: 'Hit a 7-day streak.',
    earned: c => c.longestStreak >= 7,
    progress: c => pct(c.longestStreak, 7),
    progressLabel: c => ratioLabel(c.longestStreak, 7, 'days') },
  { id: 's14',       name: 'Fortnight Force', emoji: '🌗', description: 'Hit a 14-day streak.',
    earned: c => c.longestStreak >= 14,
    progress: c => pct(c.longestStreak, 14),
    progressLabel: c => ratioLabel(c.longestStreak, 14, 'days') },
  { id: 's30',       name: 'Unbreakable',     emoji: '🛡️', description: '30-day streak — unbreakable.',
    earned: c => c.longestStreak >= 30,
    progress: c => pct(c.longestStreak, 30),
    progressLabel: c => ratioLabel(c.longestStreak, 30, 'days') },
  { id: 's100',      name: 'Centennial Soul', emoji: '🌌', description: '100-day streak — mythic.',
    earned: c => c.longestStreak >= 100,
    progress: c => pct(c.longestStreak, 100),
    progressLabel: c => ratioLabel(c.longestStreak, 100, 'days') },
  { id: 'lvl5',      name: 'Rising Hero',     emoji: '⭐', description: 'Reach level 5.',
    earned: c => c.level >= 5,
    progress: c => pct(c.level, 5),
    progressLabel: c => ratioLabel(c.level, 5, 'lvl') },
  { id: 'lvl10',     name: 'Veteran',         emoji: '🌟', description: 'Reach level 10.',
    earned: c => c.level >= 10,
    progress: c => pct(c.level, 10),
    progressLabel: c => ratioLabel(c.level, 10, 'lvl') },
  { id: 'lvl20',     name: 'Champion',        emoji: '👑', description: 'Reach level 20.',
    earned: c => c.level >= 20,
    progress: c => pct(c.level, 20),
    progressLabel: c => ratioLabel(c.level, 20, 'lvl') },
  { id: 'lvl30',     name: 'Mythic',          emoji: '🪐', description: 'Reach level 30 — top tier.',
    earned: c => c.level >= 30,
    progress: c => pct(c.level, 30),
    progressLabel: c => ratioLabel(c.level, 30, 'lvl') },
  { id: 'diverse',   name: 'Renaissance',     emoji: '🎭', description: 'Log in 4 different categories.',
    earned: c => c.uniqueCategories >= 4,
    progress: c => pct(c.uniqueCategories, 4),
    progressLabel: c => ratioLabel(c.uniqueCategories, 4, 'cats') },
  { id: 'allcats',   name: 'Renaissance Lord',emoji: '🌐', description: 'Log in all 7 categories at least once.',
    earned: c => c.uniqueCategories >= 7,
    progress: c => pct(c.uniqueCategories, 7),
    progressLabel: c => ratioLabel(c.uniqueCategories, 7, 'cats') },
  { id: 'q5',        name: 'Questmaster',     emoji: '📜', description: 'Finish 5 daily quests.',
    earned: c => c.questsCompleted >= 5,
    progress: c => pct(c.questsCompleted, 5),
    progressLabel: c => ratioLabel(c.questsCompleted, 5, 'quests') },
  { id: 'q25',       name: 'Quest King',      emoji: '👑', description: 'Finish 25 daily quests.',
    earned: c => c.questsCompleted >= 25,
    progress: c => pct(c.questsCompleted, 25),
    progressLabel: c => ratioLabel(c.questsCompleted, 25, 'quests') },
  { id: 'perfect3',  name: 'Triple Perfect',  emoji: '💎', description: '3 perfect days (3+ positives, 0 slips).',
    earned: c => c.perfectDays >= 3,
    progress: c => pct(c.perfectDays, 3),
    progressLabel: c => ratioLabel(c.perfectDays, 3, 'perfect') },
  { id: 'perfect14', name: 'Spotless Two-Wk', emoji: '✨', description: '14 perfect days.',
    earned: c => c.perfectDays >= 14,
    progress: c => pct(c.perfectDays, 14),
    progressLabel: c => ratioLabel(c.perfectDays, 14, 'perfect') },
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
