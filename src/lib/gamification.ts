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
};

export type BadgeCtx = {
  totalCompletions: number;
  longestStreak: number;
  level: number;
  uniqueCategories: number;
  questsCompleted: number;
  perfectDays: number;
};

export const BADGES: Badge[] = [
  { id: 'first',     name: 'First Step',      emoji: '👣', description: 'Complete your first habit',     earned: c => c.totalCompletions >= 1 },
  { id: 'ten',       name: 'Getting Going',   emoji: '🔟', description: 'Complete 10 habits',            earned: c => c.totalCompletions >= 10 },
  { id: 'fifty',     name: 'Half Century',    emoji: '🏅', description: 'Complete 50 habits',            earned: c => c.totalCompletions >= 50 },
  { id: 'hundo',     name: 'Centurion',       emoji: '💯', description: 'Complete 100 habits',           earned: c => c.totalCompletions >= 100 },
  { id: 's3',        name: 'On A Roll',       emoji: '🔥', description: '3-day streak',                  earned: c => c.longestStreak >= 3 },
  { id: 's7',        name: 'Week Warrior',    emoji: '⚔️', description: '7-day streak',                  earned: c => c.longestStreak >= 7 },
  { id: 's30',       name: 'Unbreakable',     emoji: '🛡️', description: '30-day streak',                 earned: c => c.longestStreak >= 30 },
  { id: 'lvl5',      name: 'Rising Hero',     emoji: '⭐', description: 'Reach level 5',                  earned: c => c.level >= 5 },
  { id: 'lvl10',     name: 'Veteran',         emoji: '🌟', description: 'Reach level 10',                 earned: c => c.level >= 10 },
  { id: 'diverse',   name: 'Renaissance',     emoji: '🎭', description: 'Cover 4 different categories',  earned: c => c.uniqueCategories >= 4 },
  { id: 'q5',        name: 'Questmaster',     emoji: '📜', description: 'Finish 5 daily quests',         earned: c => c.questsCompleted >= 5 },
  { id: 'perfect3',  name: 'Triple Perfect',  emoji: '💎', description: '3 perfect days',                earned: c => c.perfectDays >= 3 },
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
