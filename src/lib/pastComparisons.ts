// Per-day aggregates and day-over-day / rolling-average comparisons.
// Used by the Boss Report to give the AI deep context about how today
// compares to yesterday, last week, and the user's overall pattern.

import type { Entry } from '../store/useHabitStore';
import { CAT_BY_ID } from './categories';
import { dayKey } from './gamification';

export type DayStat = {
  day: string;
  count: number;
  wins: number;
  slips: number;
  netXp: number;
  avgIntensity: number;
  topCategoryId: string | null;
  topCategoryCount: number;
  perCategory: Record<string, { count: number; xp: number; wins: number; slips: number }>;
  hours: number[];           // hours when entries happened (for time-of-day)
};

function emptyDay(day: string): DayStat {
  return {
    day, count: 0, wins: 0, slips: 0, netXp: 0,
    avgIntensity: 0, topCategoryId: null, topCategoryCount: 0,
    perCategory: {}, hours: [],
  };
}

export function aggregateDay(entries: Entry[], day: string): DayStat {
  const today = emptyDay(day);
  const xs = entries.filter(e => e.dayKey === day);
  if (xs.length === 0) return today;
  let intensitySum = 0;
  for (const e of xs) {
    today.count++;
    today.netXp += e.xpDelta;
    intensitySum += e.intensity || 1;
    if (e.sentiment === 'positive') today.wins++;
    else if (e.sentiment === 'negative') today.slips++;
    today.hours.push(new Date(e.createdAt).getHours());
    const c = today.perCategory[e.parentId] ||= { count: 0, xp: 0, wins: 0, slips: 0 };
    c.count++; c.xp += e.xpDelta;
    if (e.sentiment === 'positive') c.wins++;
    else if (e.sentiment === 'negative') c.slips++;
  }
  today.avgIntensity = intensitySum / xs.length;
  let bestCat = '', bestCount = 0;
  for (const [pid, info] of Object.entries(today.perCategory)) {
    if (info.count > bestCount) { bestCount = info.count; bestCat = pid; }
  }
  today.topCategoryId = bestCat || null;
  today.topCategoryCount = bestCount;
  return today;
}

export type PastComparison = {
  today: DayStat;
  yesterday: DayStat;
  last7Avg: { count: number; wins: number; slips: number; netXp: number; avgIntensity: number };
  last30Avg: { count: number; wins: number; slips: number; netXp: number; avgIntensity: number };
  shifts: {
    netXpVsYesterday: number;          // delta XP today vs yesterday
    netXpVs7Avg: number;
    winsVsYesterday: number;
    slipsVsYesterday: number;
    biggestCategoryShift: {
      categoryId: string;
      categoryName: string;
      direction: 'up' | 'down';
      delta: number;                   // change in count today vs 7d avg
    } | null;
    timeWindowShift: 'earlier' | 'later' | 'same' | 'no-data';
  };
};

export function derivePastComparisons(entries: Entry[]): PastComparison {
  const today = dayKey();
  const todayStat = aggregateDay(entries, today);

  // Yesterday
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterdayKey = dayKey(y);
  const yesterdayStat = aggregateDay(entries, yesterdayKey);

  // Past N-day averages (excluding today)
  function avgOver(daysBack: number) {
    const days: string[] = [];
    for (let i = 1; i <= daysBack; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(dayKey(d));
    }
    let count = 0, wins = 0, slips = 0, netXp = 0, intensitySum = 0, intensityN = 0;
    for (const dk of days) {
      const s = aggregateDay(entries, dk);
      count += s.count; wins += s.wins; slips += s.slips; netXp += s.netXp;
      if (s.count > 0) { intensitySum += s.avgIntensity * s.count; intensityN += s.count; }
    }
    const n = Math.max(1, daysBack);
    return {
      count: +(count / n).toFixed(1),
      wins: +(wins / n).toFixed(1),
      slips: +(slips / n).toFixed(1),
      netXp: +(netXp / n).toFixed(1),
      avgIntensity: intensityN > 0 ? +(intensitySum / intensityN).toFixed(1) : 0,
    };
  }
  const last7Avg = avgOver(7);
  const last30Avg = avgOver(30);

  // Per-category delta — today vs 7d avg per category
  const past7Cats: Record<string, number> = {};
  for (let i = 1; i <= 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = aggregateDay(entries, dayKey(d));
    for (const [pid, info] of Object.entries(ds.perCategory)) {
      past7Cats[pid] = (past7Cats[pid] || 0) + info.count;
    }
  }
  let bestShift: PastComparison['shifts']['biggestCategoryShift'] = null;
  let biggestAbs = 0;
  const allCatIds = new Set([...Object.keys(todayStat.perCategory), ...Object.keys(past7Cats)]);
  for (const pid of allCatIds) {
    const todayCount = todayStat.perCategory[pid]?.count ?? 0;
    const avgPerDay = (past7Cats[pid] || 0) / 7;
    const delta = todayCount - avgPerDay;
    if (Math.abs(delta) > biggestAbs) {
      biggestAbs = Math.abs(delta);
      bestShift = {
        categoryId: pid,
        categoryName: CAT_BY_ID[pid]?.name || pid,
        direction: delta >= 0 ? 'up' : 'down',
        delta: +delta.toFixed(1),
      };
    }
  }

  // Time-of-day shift — average hour today vs past 7
  function avgHour(stats: DayStat[]) {
    const all = stats.flatMap(s => s.hours);
    if (!all.length) return null;
    return all.reduce((a, b) => a + b, 0) / all.length;
  }
  const pastStats: DayStat[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    pastStats.push(aggregateDay(entries, dayKey(d)));
  }
  const todayHr = avgHour([todayStat]);
  const pastHr = avgHour(pastStats);
  let timeWindowShift: PastComparison['shifts']['timeWindowShift'] = 'no-data';
  if (todayHr !== null && pastHr !== null) {
    const diff = todayHr - pastHr;
    if (diff < -1.5) timeWindowShift = 'earlier';
    else if (diff > 1.5) timeWindowShift = 'later';
    else timeWindowShift = 'same';
  }

  return {
    today: todayStat,
    yesterday: yesterdayStat,
    last7Avg,
    last30Avg,
    shifts: {
      netXpVsYesterday: todayStat.netXp - yesterdayStat.netXp,
      netXpVs7Avg: +(todayStat.netXp - last7Avg.netXp).toFixed(1),
      winsVsYesterday: todayStat.wins - yesterdayStat.wins,
      slipsVsYesterday: todayStat.slips - yesterdayStat.slips,
      biggestCategoryShift: bestShift,
      timeWindowShift,
    },
  };
}

/** Compact human-readable prompt block for the AI. */
export function comparisonsAsPrompt(c: PastComparison): string {
  const t = c.today;
  const y = c.yesterday;
  const sign = (n: number) => (n >= 0 ? '+' : '') + n;
  const topCat = (s: DayStat) => s.topCategoryId
    ? `${CAT_BY_ID[s.topCategoryId]?.name || s.topCategoryId} (${s.topCategoryCount})`
    : '—';
  const shift = c.shifts.biggestCategoryShift;
  const shiftLine = shift
    ? `${shift.categoryName} ${shift.direction === 'up' ? '↑' : '↓'} ${Math.abs(shift.delta).toFixed(1)}/day vs 7d avg`
    : 'no notable category shifts';

  return [
    `TODAY: ${t.count} entries · ${t.wins}↑ ${t.slips}↓ · net ${sign(t.netXp)} XP · avg intensity ${t.avgIntensity.toFixed(1)} · top cat: ${topCat(t)}`,
    `YESTERDAY: ${y.count} entries · ${y.wins}↑ ${y.slips}↓ · net ${sign(y.netXp)} XP · top cat: ${topCat(y)}`,
    `LAST 7-DAY AVG: ${c.last7Avg.count}/day · ${c.last7Avg.wins}↑ ${c.last7Avg.slips}↓ · net ${sign(c.last7Avg.netXp)} XP/day`,
    `LAST 30-DAY AVG: ${c.last30Avg.count}/day · net ${sign(c.last30Avg.netXp)} XP/day`,
    `SHIFTS vs YESTERDAY: wins ${sign(c.shifts.winsVsYesterday)}, slips ${sign(c.shifts.slipsVsYesterday)}, net XP ${sign(c.shifts.netXpVsYesterday)}`,
    `vs 7-DAY AVG: net XP ${sign(c.shifts.netXpVs7Avg)}`,
    `CATEGORY SHIFT TODAY: ${shiftLine}`,
    `TIME WINDOW: ${c.shifts.timeWindowShift === 'no-data' ? 'no past data' :
                    c.shifts.timeWindowShift === 'earlier' ? 'logging earlier than usual' :
                    c.shifts.timeWindowShift === 'later' ? 'logging later than usual' :
                    'same as usual'}`,
  ].join('\n');
}
