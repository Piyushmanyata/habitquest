// Derives a compact "user profile" from logged entries. Used to:
//   (a) personalize AI categorization (passed in the system prompt)
//   (b) drive the Memory card in the sidebar
//   (c) generate smarter daily quests in the future.

import type { Entry } from '../store/useHabitStore';
import { CAT_BY_ID, findSub } from './categories';

export type HabitFreq = {
  parentId: string;
  subId: string;
  parentName: string;
  subName: string;
  emoji: string;
  count: number;
  avgIntensity: number;
};

export type UserMemory = {
  totalEntries: number;
  totalPositives: number;
  totalNegatives: number;
  ratioPos: number;          // 0..1
  peakHour: number | null;
  topPositives: HabitFreq[];
  topNegatives: HabitFreq[];
  commonWords: string[];     // 5-10 frequent tokens
  recentTitles: string[];    // last 6 titles
  hourHistogram: number[];   // 24 ints
  consistency: number;       // 0..1 — how regularly user logs
};

const STOPWORDS = new Set([
  'the','a','an','to','of','for','in','on','at','and','or','but','my','i','was','were','is','are','be','been','i\'m','im',
  'with','from','this','that','it','its','it\'s','about','just','some','any','all','as','if','then','than','have','had','has',
  'do','did','does','done','very','really','more','today','yesterday','minutes','minute','min','mins','hour','hours','hr','hrs',
]);

function topK<T>(arr: T[], n: number, key: (x: T) => number): T[] {
  return [...arr].sort((a, b) => key(b) - key(a)).slice(0, n);
}

export function deriveMemory(entries: Entry[]): UserMemory {
  if (entries.length === 0) {
    return {
      totalEntries: 0, totalPositives: 0, totalNegatives: 0, ratioPos: 0,
      peakHour: null, topPositives: [], topNegatives: [], commonWords: [],
      recentTitles: [], hourHistogram: new Array(24).fill(0), consistency: 0,
    };
  }

  const totalPositives = entries.filter(e => e.sentiment === 'positive').length;
  const totalNegatives = entries.filter(e => e.sentiment === 'negative').length;
  const ratioPos = totalPositives / Math.max(1, totalPositives + totalNegatives);

  // Hour histogram + peak hour
  const hourHistogram = new Array(24).fill(0);
  for (const e of entries) hourHistogram[new Date(e.createdAt).getHours()]++;
  let peakHour: number | null = null, peakCount = 0;
  hourHistogram.forEach((c, h) => { if (c > peakCount) { peakCount = c; peakHour = h; } });

  // Per (parent/sub) aggregation
  type Acc = { count: number; intSum: number };
  const mapPos = new Map<string, Acc>();
  const mapNeg = new Map<string, Acc>();
  for (const e of entries) {
    const key = `${e.parentId}::${e.subId}`;
    const map = e.sentiment === 'positive' ? mapPos : e.sentiment === 'negative' ? mapNeg : null;
    if (!map) continue;
    const acc = map.get(key) || { count: 0, intSum: 0 };
    acc.count++;
    acc.intSum += e.intensity || 1;
    map.set(key, acc);
  }
  const toFreq = (key: string, a: Acc): HabitFreq => {
    const [parentId, subId] = key.split('::');
    const parent = CAT_BY_ID[parentId];
    const sub = findSub(parentId, subId);
    return {
      parentId, subId,
      parentName: parent?.name || parentId,
      subName: sub?.name || subId,
      emoji: sub?.emoji || parent?.emoji || '•',
      count: a.count,
      avgIntensity: a.intSum / a.count,
    };
  };
  const topPositives = topK([...mapPos.entries()].map(([k, a]) => toFreq(k, a)), 5, x => x.count);
  const topNegatives = topK([...mapNeg.entries()].map(([k, a]) => toFreq(k, a)), 5, x => x.count);

  // Common words
  const wc = new Map<string, number>();
  for (const e of entries.slice(0, 200)) {
    for (const tok of e.text.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/)) {
      if (tok.length < 3 || STOPWORDS.has(tok)) continue;
      wc.set(tok, (wc.get(tok) || 0) + 1);
    }
  }
  const commonWords = topK([...wc.entries()], 8, ([, c]) => c).filter(([, c]) => c > 1).map(([w]) => w);

  // Recent titles
  const recentTitles = entries.slice(0, 6).map(e => e.title);

  // Consistency = unique days logged in last 14 days / 14
  const lastDays = new Set<string>();
  const cutoff = Date.now() - 14 * 86400 * 1000;
  for (const e of entries) {
    if (new Date(e.createdAt).getTime() >= cutoff) lastDays.add(e.dayKey);
  }
  const consistency = Math.min(1, lastDays.size / 14);

  return {
    totalEntries: entries.length,
    totalPositives, totalNegatives, ratioPos,
    peakHour, topPositives, topNegatives,
    commonWords, recentTitles, hourHistogram, consistency,
  };
}

/** Compact one-paragraph summary for AI system prompt. ~300 chars max. */
export function memoryAsPrompt(mem: UserMemory): string {
  if (mem.totalEntries < 3) return '';
  const pos = mem.topPositives.slice(0, 3).map(f => `${f.subName.toLowerCase()} (${f.count}×)`).join(', ') || 'none yet';
  const neg = mem.topNegatives.slice(0, 3).map(f => `${f.subName.toLowerCase()} (${f.count}×)`).join(', ') || 'none yet';
  const peak = mem.peakHour !== null ? `${mem.peakHour}:00` : '—';
  const ratio = Math.round(mem.ratioPos * 100);
  const recent = mem.recentTitles.slice(0, 4).map(t => `"${t}"`).join(', ');
  return [
    `USER CONTEXT (use to better understand new entries — do NOT mention this in output):`,
    `- Frequent wins: ${pos}`,
    `- Recurring slips: ${neg}`,
    `- Peak log hour: ${peak} · Positive ratio: ${ratio}%`,
    recent ? `- Recent entries (don't repeat them; build on the pattern): ${recent}` : '',
  ].filter(Boolean).join('\n');
}
