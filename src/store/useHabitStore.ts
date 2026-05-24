// Journal-style store with combo system, AI quips, multipliers, and more game-feel.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { analyzeEntry, EntryAnalysis, ReactionTone } from '../lib/ai';
import { analyzeMultiEntries, splitForHeuristic } from '../lib/aiMulti';
import { suggestQuestFromRecent } from '../lib/aiQuests';
import { heuristicAnalyze } from '../lib/heuristic';
import { speak as ttsSpeak } from '../lib/tts';
import { mintCustomBadge, CustomBadge } from '../lib/aiBadges';
import { sendChatMessage } from '../lib/aiChat';
import { GEAR_BY_ID, aggregateBonuses, GearSlot, AggregateBonuses } from '../lib/gear';
import {
  dayKey, generateDailyQuests, levelFromXp,
  Quest, BADGES,
} from '../lib/gamification';
import { LootItem, rollLoot } from '../lib/loot';
import { Boss, bossForDay, damageFor } from '../lib/boss';
import { deriveMemory, memoryAsPrompt, UserMemory } from '../lib/memory';
import { ITEM_BY_ID, ShopItem, SHOP_ITEMS } from '../lib/shop';
import { priceCustomItem, generateDailyChallenge, generateWisdom, AiChallenge } from '../lib/aiExtras';

export type Entry = {
  id: string;
  text: string;
  title: string;
  createdAt: string;
  dayKey: string;
  parentId: string;
  subId: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  intensity: number;
  baseDelta: number;       // raw XP before combo multiplier
  xpDelta: number;         // actually applied delta
  comboAtTime: number;     // combo count at the time of logging
  multiplierAtTime: number;
  reasoning: string;
  quip: string;
  tone: ReactionTone;
  source: 'ai' | 'rules';
  analyzing?: boolean;
  batchId?: string;
  emotion?: string;
  emotionIntensity?: number;
  reflection?: string;
  bonusXp?: number;        // honest-log + reflection + emotion bonuses (already included in xpDelta)
};

type Profile = {
  xp: number; gold: number;
  perfectDays: number; longestStreak: number; bossesDefeated: number;
  hourlyStreak: number; hourlyBest: number;
  /** ms epoch of the last hour-block in which the user logged anything */
  lastHourlyTick: number;
};
type LastChange = { delta: number; at: number; sentiment: Entry['sentiment']; combo: number } | null;
type LastLoot = { item: LootItem; at: number } | null;
type BossState = { day: string; bossIndex: number; hpLeft: number; defeated: boolean; defeatedAt?: number };
type Inventory = { focus: number; crit: number; freeze: number };
type ActiveBuffs = { focus: boolean; crit: boolean };

type State = {
  entries: Entry[];
  profile: Profile;
  quests: Quest[];
  questsDay: string;
  questsCompletedTotal: number;
  lastChange: LastChange;
  lastLoot: LastLoot;
  apiKey: string;
  combo: number;
  comboBest: number;
  comboExpiresAt: number;
  inventory: Inventory;
  passes: Record<string, number>;     // passId → count
  buffs: ActiveBuffs;
  boss: BossState | null;
  lastCheckinDay: string;
  lastPurchase: { itemId: string; at: number } | null;

  customItems: ShopItem[];
  aiChallenge: (AiChallenge & { day: string; claimed: boolean; completedAt?: number }) | null;
  wisdom: { lines: string[]; at: number } | null;
  trophy: { expiresAt: number } | null;
  lastAchievement: { id: string; at: number } | null;
  wager: { day: string; amount: number; resolved: 'win' | 'lose' | null } | null;
  ttsEnabled: boolean;
  ttsVoice: string;
  tone: 'savage' | 'balanced' | 'encouraging';
  customBadges: CustomBadge[];
  lastCustomBadge: { badge: CustomBadge; at: number } | null;
  chatHistory: { role: 'user' | 'assistant'; content: string; at: number }[];
  gearOwned: string[];
  gearEquipped: Partial<Record<GearSlot, string>>;
  lastGear: { id: string; action: 'bought' | 'equipped'; at: number } | null;

  setApiKey: (k: string) => void;
  addEntry: (text: string) => Promise<Entry>;
  deleteEntry: (id: string) => void;
  refreshQuests: () => void;
  claimQuest: (id: string) => void;
  todayEntries: () => Entry[];
  todayNetXp: () => number;
  currentStreak: () => number;
  unlockedBadges: () => string[];
  comboMultiplier: () => number;
  useItem: (kind: 'focus' | 'crit') => void;
  todaysBoss: () => Boss & { hpLeft: number; defeated: boolean; bossIndex: number };

  // shop + memory + check-in
  memory: () => UserMemory;
  buyItem: (itemId: string) => { ok: boolean; reason?: string };
  usePass: (passId: string) => Promise<Entry | null>;
  performCheckin: () => number;

  // new: custom shop items, daily challenge, wisdom, trophy
  addCustomItem: (text: string) => Promise<{ ok: boolean; reason?: string; item?: ShopItem }>;
  removeCustomItem: (id: string) => void;
  ensureDailyChallenge: () => Promise<void>;
  completeChallenge: () => void;
  refreshWisdom: () => Promise<void>;
  trophyActive: () => boolean;
  allShopItems: () => ShopItem[];
  clearLastAchievement: () => void;
  placeWager: (amount: number) => { ok: boolean; reason?: string };
  resolveWagerIfDue: () => void;
  setTts: (enabled: boolean, voice?: string) => void;
  setTone: (tone: 'savage' | 'balanced' | 'encouraging') => void;
  addEntries: (text: string) => Promise<Entry[]>;
  completeAiQuest: (questId: string) => void;
  clearLastCustomBadge: () => void;
  removeCustomBadge: (id: string) => void;
  sendChat: (msg: string) => Promise<void>;
  clearChat: () => void;
  buyGear: (id: string) => { ok: boolean; reason?: string };
  equipGear: (id: string) => void;
  unequipGear: (slot: GearSlot) => void;
  gearBonuses: () => AggregateBonuses;
};

const COMBO_WINDOW_MS = 25 * 60 * 1000; // 25 min idle resets combo

function ensureBoss(b: BossState | null): BossState & { name: string; emoji: string; flavor: string; maxHp: number; xpReward: number } {
  const today = dayKey();
  if (!b || b.day !== today) {
    // New day -> fresh chain starting at boss #0.
    const def = bossForDay(today, 0);
    return { day: today, bossIndex: 0, hpLeft: def.maxHp, defeated: false,
             name: def.name, emoji: def.emoji, flavor: def.flavor, maxHp: def.maxHp, xpReward: def.xpReward };
  }
  // Same day: regenerate definition from the index in state.
  const def = bossForDay(today, b.bossIndex ?? 0);
  return { ...b, bossIndex: b.bossIndex ?? 0,
           name: def.name, emoji: def.emoji, flavor: def.flavor, maxHp: def.maxHp, xpReward: def.xpReward };
}

/** Spawn the NEXT boss in today's chain. Called immediately after a defeat. */
function spawnNextBoss(prev: BossState): BossState & { name: string; emoji: string; flavor: string; maxHp: number; xpReward: number } {
  const nextIndex = (prev.bossIndex ?? 0) + 1;
  const def = bossForDay(prev.day, nextIndex);
  return { day: prev.day, bossIndex: nextIndex, hpLeft: def.maxHp, defeated: false,
           name: def.name, emoji: def.emoji, flavor: def.flavor, maxHp: def.maxHp, xpReward: def.xpReward };
}

function multiplierFor(combo: number) {
  if (combo >= 6) return 3;
  if (combo >= 4) return 2.25;
  if (combo >= 2) return 1.5;
  if (combo >= 1) return 1.25;
  return 1;
}

function recomputeQuestProgress(q: Quest, entries: Entry[], today: string, comboBest: number): Quest {
  const todays = entries.filter(e => e.dayKey === today);
  const positives = todays.filter(e => e.sentiment === 'positive');
  let progress = 0;
  if (q.kind === 'complete_n_habits') progress = positives.length;
  else if (q.kind === 'complete_in_category') progress = positives.filter(e => e.parentId === q.meta?.parentId).length;
  else if (q.kind === 'perfect_day') {
    const negs = todays.filter(e => e.sentiment === 'negative').length;
    progress = positives.length >= 3 && negs === 0 ? 1 : 0;
  } else if (q.kind === 'comeback') {
    // log a positive within 60min after a negative, same day
    const sorted = [...todays].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let hit = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].sentiment === 'negative') {
        for (let j = i + 1; j < sorted.length; j++) {
          if (sorted[j].sentiment === 'positive' &&
              new Date(sorted[j].createdAt).getTime() - new Date(sorted[i].createdAt).getTime() < 60 * 60 * 1000) {
            hit = 1; break;
          }
        }
      }
      if (hit) break;
    }
    progress = hit;
  } else if (q.kind === 'combo') {
    progress = Math.min(q.target, comboBest);
  } else if (q.kind === 'slay_beast') {
    // log a positive in a category right after slipping in 'breaking'
    const sorted = [...todays].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let hit = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].parentId === 'breaking' && sorted[i].sentiment === 'negative') {
        if (sorted[i + 1]?.sentiment === 'positive') { hit = 1; break; }
      }
    }
    progress = hit;
  }
  return { ...q, progress, completed: progress >= q.target };
}

function computeStreak(entries: Entry[]): number {
  const byDay: Record<string, number> = {};
  const positives: Record<string, number> = {};
  for (const e of entries) {
    byDay[e.dayKey] = (byDay[e.dayKey] || 0) + e.xpDelta;
    if (e.sentiment === 'positive') positives[e.dayKey] = (positives[e.dayKey] || 0) + 1;
  }
  if (Object.keys(byDay).length === 0) return 0;
  const today = dayKey();
  let cursor = today;
  let streak = 0;
  let walkedBack = false;
  for (;;) {
    const ok = (positives[cursor] || 0) >= 1 && (byDay[cursor] ?? 0) >= 0;
    if (ok) {
      streak++;
      const d = new Date(cursor + 'T00:00:00'); d.setDate(d.getDate() - 1);
      cursor = dayKey(d);
    } else if (streak === 0 && !walkedBack) {
      walkedBack = true;
      const d = new Date(cursor + 'T00:00:00'); d.setDate(d.getDate() - 1);
      cursor = dayKey(d);
    } else break;
    if (streak > 3650) break;
  }
  return streak;
}

function buildNarration(entries: Entry[]): string {
  if (!entries.length) return '';
  if (entries.length === 1) {
    const e = entries[0];
    const sign = e.xpDelta >= 0 ? 'plus' : 'minus';
    return `${e.title}. ${e.quip || ''} ${sign} ${Math.abs(e.xpDelta)} X P.`;
  }
  const total = entries.reduce((a, e) => a + e.xpDelta, 0);
  const sign = total >= 0 ? 'plus' : 'minus';
  const titles = entries.map(e => e.title).join('. ');
  return `Logged ${entries.length} things. ${titles}. Net ${sign} ${Math.abs(total)} X P.`;
}

// Apply a single EntryAnalysis to the store state, returning the saved Entry.
function applyOneEntry(quick: EntryAnalysis, batchId: string, get: any, set: any): Entry {
  const id = crypto.randomUUID();
  const now = new Date();
  const sNow = get();
  const liveCombo = Date.now() < sNow.comboExpiresAt ? sNow.combo : 0;

  let baseDelta = quick.xpDelta;
  // Penalty leeway — soften negative XP so users still log slips honestly.
  if (quick.sentiment === 'negative') baseDelta = Math.max(-25, baseDelta);

  let mult = quick.sentiment === 'positive' ? multiplierFor(liveCombo) : 1;
  const useFocus = sNow.buffs.focus && quick.sentiment === 'positive';
  const useCrit  = sNow.buffs.crit  && quick.sentiment === 'positive';
  if (useFocus) mult *= 2;
  if (useCrit)  mult *= 3;
  if (quick.sentiment === 'positive' && sNow.trophy && Date.now() < sNow.trophy.expiresAt) mult *= 1.1;

  // Gear bonuses (apply only to positive entries)
  const gear = aggregateBonuses(sNow.gearEquipped);
  if (quick.sentiment === 'positive') {
    mult *= gear.xpMultiplier;
    const catBonus = gear.categoryBoost[quick.parentId];
    if (catBonus) mult *= (1 + catBonus);
  }

  let xpDelta = Math.round(baseDelta * mult);

  // Bonuses for richer journaling
  let bonusXp = 0;
  if (quick.sentiment === 'negative') bonusXp += 3;           // honest-log bonus
  if (quick.reflection)                bonusXp += 5;          // wrote a reflection
  if (quick.emotion && quick.emotion !== 'neutral') bonusXp += 3; // tagged an emotion
  xpDelta += bonusXp;

  const entry: Entry = {
    id, text: quick.title, title: quick.title,
    createdAt: now.toISOString(), dayKey: dayKey(now),
    parentId: quick.parentId, subId: quick.subId,
    sentiment: quick.sentiment, intensity: quick.intensity,
    baseDelta, xpDelta,
    comboAtTime: liveCombo, multiplierAtTime: mult,
    reasoning: quick.reasoning, quip: quick.quip, tone: quick.tone,
    source: quick.source, analyzing: false,
    batchId,
    emotion: quick.emotion,
    emotionIntensity: quick.emotionIntensity,
    reflection: quick.reflection,
    bonusXp,
  };

  set((s: State) => {
    const entries = [entry, ...s.entries];
    const xp = Math.max(0, s.profile.xp + entry.xpDelta);
    let combo = s.combo, comboBest = s.comboBest, comboExpiresAt = s.comboExpiresAt;
    if (Date.now() >= comboExpiresAt) combo = 0;
    if (entry.sentiment === 'positive') {
      combo += 1;
      comboExpiresAt = Date.now() + COMBO_WINDOW_MS + gear.comboExtendSec * 1000;
      comboBest = Math.max(comboBest, combo);
    } else if (entry.sentiment === 'negative') {
      combo = 0; comboExpiresAt = 0;
    }
    // consume buffs
    const buffs = {
      focus: s.buffs.focus && !useFocus,
      crit:  s.buffs.crit  && !useCrit,
    };
    // boss damage
    let boss = ensureBoss(s.boss);
    let trophy = s.trophy;
    let bossesDefeated = s.profile.bossesDefeated;
    if (entry.sentiment === 'positive') {
      const dmg = Math.round(damageFor(entry.intensity, mult) * gear.bossDamageMultiplier);
      boss = { ...boss, hpLeft: Math.max(0, boss.hpLeft - dmg) };
      if (boss.hpLeft <= 0 && !boss.defeated) {
        boss = { ...boss, defeated: true, defeatedAt: Date.now() };
      }
    }
    let finalXp = xp;
    // Gold accrues ONLY on positive sentiment (productive actions).
    let goldGain = entry.sentiment === 'positive' ? Math.max(0, entry.xpDelta) : 0;

    // Hourly streak: every distinct calendar-hour block that has at least one
    // entry continues the streak. Positives within a new hour earn +5 bonus gold.
    const hourMs = 60 * 60 * 1000;
    const currentHourBucket = Math.floor(Date.now() / hourMs);
    const lastHourBucket = Math.floor((s.profile.lastHourlyTick || 0) / hourMs);
    let hourlyStreak = s.profile.hourlyStreak;
    let hourlyBest   = s.profile.hourlyBest;
    let lastHourlyTick = s.profile.lastHourlyTick;
    if (currentHourBucket > lastHourBucket) {
      if (currentHourBucket - lastHourBucket === 1) {
        hourlyStreak += 1;
      } else if (lastHourBucket === 0) {
        hourlyStreak = 1;
      } else {
        hourlyStreak = 1; // gap > 1 hour resets
      }
      hourlyBest = Math.max(hourlyBest, hourlyStreak);
      lastHourlyTick = Date.now();
      // Hourly-positive bonus (only the first positive in a fresh hour rewards gold).
      if (entry.sentiment === 'positive') goldGain += 5;
    }
    if (boss.defeated && (!s.boss || !s.boss.defeated)) {
      finalXp += boss.xpReward;
      goldGain += Math.round(boss.xpReward * 0.5);
      bossesDefeated += 1;
      trophy = { expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
      // Spawn the next boss in today's chain immediately — escalation continues.
      boss = spawnNextBoss(boss);
    }
    // loot
    let lastLoot = s.lastLoot;
    let inventory = s.inventory;
    if (entry.sentiment === 'positive') {
      const drop = rollLoot(entry.intensity, combo);
      if (drop) {
        lastLoot = { item: drop, at: Date.now() };
        switch (drop.kind) {
          case 'xp_boost_small': finalXp += 10; goldGain += 8; break;
          case 'xp_boost_big':   finalXp += 25; goldGain += 20; break;
          case 'focus_token':    inventory = { ...inventory, focus: inventory.focus + 1 }; break;
          case 'crit_strike':    inventory = { ...inventory, crit: inventory.crit + 1 }; break;
          case 'streak_freeze':  inventory = { ...inventory, freeze: inventory.freeze + 1 }; break;
        }
      }
    }
    const finalGold = s.profile.gold + goldGain;
    const prevBadgeIds = new Set(BADGES.filter(b => b.earned(badgeCtxFor(s))).map(b => b.id));
    return rederive(
      {
        ...s, entries,
        profile: { ...s.profile, xp: finalXp, gold: finalGold, bossesDefeated, hourlyStreak, hourlyBest, lastHourlyTick },
        combo, comboBest, comboExpiresAt, buffs, boss, trophy, inventory, lastLoot,
      },
      { delta: entry.xpDelta, sentiment: entry.sentiment, combo },
      prevBadgeIds,
    );
  });

  return entry;
}

function badgeCtxFor(s: State) {
  const pos = s.entries.filter(e => e.sentiment === 'positive');
  const neg = s.entries.filter(e => e.sentiment === 'negative');
  const emos = new Set<string>();
  let reflections = 0;
  let heavy = 0;
  for (const e of s.entries) {
    if (e.emotion) emos.add(e.emotion);
    if (e.reflection) reflections++;
    if ((e.intensity || 0) >= 4) heavy++;
  }
  return {
    totalCompletions: pos.length,
    longestStreak: s.profile.longestStreak,
    level: levelFromXp(s.profile.xp).level,
    uniqueCategories: new Set(s.entries.map(e => e.parentId)).size,
    questsCompleted: s.questsCompletedTotal,
    perfectDays: s.profile.perfectDays,
    gold: s.profile.gold,
    hourlyBest: s.profile.hourlyBest,
    bossesDefeated: s.profile.bossesDefeated,
    comboBest: s.comboBest,
    totalNegatives: neg.length,
    reflectionCount: reflections,
    uniqueEmotions: emos.size,
    highIntensityCount: heavy,
    totalEntries: s.entries.length,
  };
}

function rederive(s: State, change?: { delta: number; sentiment: Entry['sentiment']; combo: number }, prevBadgeIds?: Set<string>): State {
  const today = dayKey();
  const dayMap: Record<string, { p: number; n: number }> = {};
  for (const e of s.entries) {
    const d = dayMap[e.dayKey] ||= { p: 0, n: 0 };
    if (e.sentiment === 'positive') d.p++;
    else if (e.sentiment === 'negative') d.n++;
  }
  const perfectDays = Object.values(dayMap).filter(d => d.p >= 3 && d.n === 0).length;
  const longestStreak = Math.max(s.profile.longestStreak, computeStreak(s.entries));
  const next: State = {
    ...s,
    profile: { ...s.profile, perfectDays, longestStreak },
    quests: s.quests.length ? s.quests.map(q => recomputeQuestProgress(q, s.entries, today, s.comboBest)) : s.quests,
    lastChange: change ? { delta: change.delta, sentiment: change.sentiment, combo: change.combo, at: Date.now() } : s.lastChange,
  };
  // Detect newly unlocked badges
  if (prevBadgeIds) {
    const nowIds = new Set(BADGES.filter(b => b.earned(badgeCtxFor(next))).map(b => b.id));
    for (const id of nowIds) {
      if (!prevBadgeIds.has(id)) { next.lastAchievement = { id, at: Date.now() }; break; }
    }
  }
  return next;
}

export const useHabitStore = create<State>()(
  persist(
    (set, get) => ({
      entries: [],
      profile: {
        xp: 0, gold: 0,
        perfectDays: 0, longestStreak: 0, bossesDefeated: 0,
        hourlyStreak: 0, hourlyBest: 0, lastHourlyTick: 0,
      },
      quests: [],
      questsDay: '',
      questsCompletedTotal: 0,
      lastChange: null,
      lastLoot: null,
      apiKey: '',
      combo: 0,
      comboBest: 0,
      comboExpiresAt: 0,
      inventory: { focus: 0, crit: 0, freeze: 0 },
      passes: {},
      buffs: { focus: false, crit: false },
      boss: null,
      lastCheckinDay: '',
      lastPurchase: null,
      customItems: [],
      aiChallenge: null,
      wisdom: null,
      trophy: null,
      lastAchievement: null,
      wager: null,
      ttsEnabled: true,
      ttsVoice: '',
      tone: 'balanced',
      customBadges: [],
      lastCustomBadge: null,
      chatHistory: [],
      // Starter gear: free body + legs equipped from the start so the doll isn't empty.
      gearOwned: ['b-linen', 'l-linen'],
      gearEquipped: { body: 'b-linen', legs: 'l-linen' },
      lastGear: null,

      setApiKey(k) {
        const v = k.trim();
        set({ apiKey: v });
        // store under both names so getKey() finds it whichever priority order it uses
        if (v) {
          localStorage.setItem(v.startsWith('sk-or-') ? 'hq-openrouter-key' : 'hq-deepseek-key', v);
        } else {
          localStorage.removeItem('hq-openrouter-key');
          localStorage.removeItem('hq-deepseek-key');
        }
      },

      comboMultiplier() {
        const s = get();
        const live = Date.now() < s.comboExpiresAt ? s.combo : 0;
        return multiplierFor(live);
      },

      async addEntry(text) {
        const trimmed = text.trim();
        if (!trimmed) throw new Error('empty');
        const id = crypto.randomUUID();
        const now = new Date();

        const quick = heuristicAnalyze(trimmed);
        const sNow = get();
        const liveCombo = Date.now() < sNow.comboExpiresAt ? sNow.combo : 0;

        const baseDelta = quick.xpDelta;
        let mult = quick.sentiment === 'positive' ? multiplierFor(liveCombo) : 1;
        // apply active buffs to positives
        const useFocus = sNow.buffs.focus && quick.sentiment === 'positive';
        const useCrit  = sNow.buffs.crit  && quick.sentiment === 'positive';
        if (useFocus) mult *= 2;
        if (useCrit) mult *= 3;
        // Trophy buff: +10% positive XP for 24h after defeating a boss.
        if (quick.sentiment === 'positive' && sNow.trophy && Date.now() < sNow.trophy.expiresAt) mult *= 1.1;
        const xpDelta = Math.round(baseDelta * mult);

        const entry: Entry = {
          id, text: trimmed, title: quick.title,
          createdAt: now.toISOString(), dayKey: dayKey(now),
          parentId: quick.parentId, subId: quick.subId,
          sentiment: quick.sentiment, intensity: quick.intensity,
          baseDelta, xpDelta,
          comboAtTime: liveCombo, multiplierAtTime: mult,
          reasoning: quick.reasoning, quip: quick.quip, tone: quick.tone,
          source: quick.source, analyzing: true,
        };

        let droppedLoot: LootItem | null = null;

        set(s => {
          const entries = [entry, ...s.entries];
          const xp = Math.max(0, s.profile.xp + entry.xpDelta);
          let combo = s.combo, comboBest = s.comboBest, comboExpiresAt = s.comboExpiresAt;
          if (Date.now() >= comboExpiresAt) combo = 0;
          if (entry.sentiment === 'positive') {
            combo += 1;
            comboExpiresAt = Date.now() + COMBO_WINDOW_MS;
            comboBest = Math.max(comboBest, combo);
          } else if (entry.sentiment === 'negative') {
            combo = 0; comboExpiresAt = 0;
          }
          // consume buffs
          const buffs: ActiveBuffs = {
            focus: s.buffs.focus && !useFocus,
            crit:  s.buffs.crit  && !useCrit,
          };
          // deal boss damage on positives
          let boss = ensureBoss(s.boss);
          if (entry.sentiment === 'positive') {
            const dmg = damageFor(entry.intensity, mult);
            boss = { ...boss, hpLeft: Math.max(0, boss.hpLeft - dmg) };
            if (boss.hpLeft <= 0 && !boss.defeated) {
              boss = { ...boss, defeated: true, defeatedAt: Date.now() };
            }
          }
          // roll loot on positives
          if (entry.sentiment === 'positive') {
            droppedLoot = rollLoot(entry.intensity, combo);
          }
          // apply boss defeat reward + loot to xp / inventory
          let finalXp = xp;
          let inventory = s.inventory;
          let lastLoot = s.lastLoot;
          let bossesDefeated = s.profile.bossesDefeated;
          let trophy = s.trophy;
          if (boss.defeated && (!s.boss || !s.boss.defeated)) {
            finalXp += boss.xpReward;
            bossesDefeated += 1;
            // Grant a 24h Boss Trophy buff (+10% positive XP)
            trophy = { expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
          }
          if (droppedLoot) {
            lastLoot = { item: droppedLoot, at: Date.now() };
            switch (droppedLoot.kind) {
              case 'xp_boost_small': finalXp += 10; break;
              case 'xp_boost_big':   finalXp += 25; break;
              case 'focus_token':    inventory = { ...inventory, focus: inventory.focus + 1 }; break;
              case 'crit_strike':    inventory = { ...inventory, crit: inventory.crit + 1 }; break;
              case 'streak_freeze':  inventory = { ...inventory, freeze: inventory.freeze + 1 }; break;
            }
          }
          const prevBadgeIds = new Set(BADGES.filter(b => b.earned(badgeCtxFor(s))).map(b => b.id));
          return rederive(
            {
              ...s,
              entries,
              profile: { ...s.profile, xp: finalXp, bossesDefeated },
              combo, comboBest, comboExpiresAt,
              buffs, boss, inventory, lastLoot, trophy,
            },
            { delta: entry.xpDelta, sentiment: entry.sentiment, combo },
            prevBadgeIds,
          );
        });

        // Always try to upgrade via best-available AI, with memory-derived context.
        {
          const memoryContext = memoryAsPrompt(deriveMemory(get().entries));
          analyzeEntry(trimmed, { apiKey: get().apiKey, memoryContext }).then((ai: EntryAnalysis) => {
            if (ai.source === 'rules') return; // no upgrade available
            set(s => {
              const old = s.entries.find(e => e.id === id);
              if (!old) return s;
              const mult2 = ai.sentiment === 'positive' ? old.multiplierAtTime : 1;
              const newApplied = Math.round(ai.xpDelta * mult2);
              const xpAdjustment = newApplied - old.xpDelta;
              // sentiment flipped? adjust combo too
              let combo = s.combo, comboBest = s.comboBest, comboExpiresAt = s.comboExpiresAt;
              if (old.sentiment !== ai.sentiment) {
                if (ai.sentiment === 'negative') { combo = 0; comboExpiresAt = 0; }
                else if (ai.sentiment === 'positive' && old.sentiment !== 'positive') {
                  combo += 1;
                  comboExpiresAt = Date.now() + COMBO_WINDOW_MS;
                  comboBest = Math.max(comboBest, combo);
                }
              }
              const updated: Entry = {
                ...old,
                parentId: ai.parentId, subId: ai.subId,
                sentiment: ai.sentiment, intensity: ai.intensity,
                baseDelta: ai.xpDelta, xpDelta: newApplied,
                reasoning: ai.reasoning, quip: ai.quip || old.quip, tone: ai.tone,
                title: ai.title || old.title, source: ai.source, analyzing: false,
              };
              const entries = s.entries.map(e => e.id === id ? updated : e);
              const xp = Math.max(0, s.profile.xp + xpAdjustment);
              return rederive({ ...s, entries, profile: { ...s.profile, xp }, combo, comboBest, comboExpiresAt });
            });
          }).catch(() => {
            set(s => ({ entries: s.entries.map(e => e.id === id ? { ...e, analyzing: false } : e) }));
          });
        }

        return entry;
      },

      deleteEntry(id) {
        set(s => {
          const e = s.entries.find(x => x.id === id);
          if (!e) return s;
          const xp = Math.max(0, s.profile.xp - e.xpDelta);
          return rederive({
            ...s,
            entries: s.entries.filter(x => x.id !== id),
            profile: { ...s.profile, xp },
          });
        });
      },

      refreshQuests() {
        const today = dayKey();
        const s = get();
        if (s.questsDay === today && s.quests.length > 0) {
          set({ quests: s.quests.map(q => recomputeQuestProgress(q, s.entries, today, s.comboBest)) });
          return;
        }
        const fresh = generateDailyQuests(today, 3).map(q => recomputeQuestProgress(q, s.entries, today, s.comboBest));
        set({ quests: fresh, questsDay: today });
      },

      claimQuest(id) {
        const s = get();
        const q = s.quests.find(q => q.id === id);
        if (!q || !q.completed || q.claimed) return;
        const goldReward = Math.round(q.xpReward * 0.7);
        set({
          profile: { ...s.profile, xp: s.profile.xp + q.xpReward, gold: s.profile.gold + goldReward },
          quests: s.quests.map(x => x.id === id ? { ...x, claimed: true } : x),
          questsCompletedTotal: s.questsCompletedTotal + 1,
          lastChange: { delta: q.xpReward, at: Date.now(), sentiment: 'positive', combo: s.combo },
        });
        // Rolling stream: immediately spawn a fresh AI quest based on recent entries.
        const recent = get().entries.slice(0, 6).map(e => ({ title: e.title, sentiment: e.sentiment, parentId: e.parentId }));
        suggestQuestFromRecent(recent, dayKey()).then(nq => {
          if (!nq) return;
          set(st => {
            // Replace the claimed quest with the new one (keep panel size stable).
            const next = st.quests.map(x => x.id === id ? nq : x);
            return { quests: next };
          });
        }).catch(() => {});
      },

      useItem(kind) {
        const s = get();
        if (kind === 'focus' && s.inventory.focus > 0) {
          set({ inventory: { ...s.inventory, focus: s.inventory.focus - 1 }, buffs: { ...s.buffs, focus: true } });
        } else if (kind === 'crit' && s.inventory.crit > 0) {
          set({ inventory: { ...s.inventory, crit: s.inventory.crit - 1 }, buffs: { ...s.buffs, crit: true } });
        }
      },

      todaysBoss() {
        const b = ensureBoss(get().boss);
        return {
          id: `boss-${b.day}-${b.bossIndex}`,
          name: b.name, emoji: b.emoji, flavor: b.flavor,
          maxHp: b.maxHp, xpReward: b.xpReward,
          hpLeft: b.hpLeft, defeated: b.defeated,
          bossIndex: b.bossIndex,
        };
      },

      memory() { return deriveMemory(get().entries); },

      allShopItems() { return [...SHOP_ITEMS, ...get().customItems]; },

      async addCustomItem(text) {
        const trimmed = text.trim();
        if (!trimmed) return { ok: false, reason: 'empty' };
        try {
          const p = await priceCustomItem(trimmed);
          const item: ShopItem = {
            id: 'custom-' + crypto.randomUUID().slice(0, 8),
            kind: 'pass',
            name: p.name, emoji: p.emoji, description: p.description,
            cost: p.cost,
            passTitle: `${p.name} (paid pass)`,
            passParent: p.passParent, passSub: p.passSub,
          };
          set(s => ({ customItems: [...s.customItems, item] }));
          return { ok: true, item };
        } catch (err: any) {
          return { ok: false, reason: err?.message || 'failed' };
        }
      },

      removeCustomItem(id) {
        set(s => ({ customItems: s.customItems.filter(i => i.id !== id) }));
      },

      async ensureDailyChallenge() {
        const today = dayKey();
        const s = get();
        if (s.aiChallenge && s.aiChallenge.day === today) return;
        const mem = memoryAsPrompt(deriveMemory(s.entries));
        const chal = await generateDailyChallenge(mem);
        set({ aiChallenge: { ...chal, day: today, claimed: false } });
      },

      completeChallenge() {
        const s = get();
        const c = s.aiChallenge;
        if (!c || c.claimed) return;
        const today = dayKey();
        if (c.day !== today) return;
        let xpAdd = c.xpReward;
        let goldAdd = Math.round(c.xpReward * 0.7);
        let wager = s.wager;
        if (wager && wager.day === today && wager.resolved === null) {
          // Wager pays out 2x stake in gold (stake was already deducted).
          goldAdd += wager.amount * 2;
          wager = { ...wager, resolved: 'win' };
        }
        set({
          aiChallenge: { ...c, claimed: true, completedAt: Date.now() },
          profile: { ...s.profile, xp: s.profile.xp + xpAdd, gold: s.profile.gold + goldAdd },
          lastChange: { delta: xpAdd, sentiment: 'positive', combo: s.combo, at: Date.now() },
          wager,
        });
      },

      placeWager(amount) {
        const s = get();
        if (!s.aiChallenge || s.aiChallenge.claimed) return { ok: false, reason: 'no active challenge' };
        if (s.wager && s.wager.day === s.aiChallenge.day) return { ok: false, reason: 'already wagered today' };
        const amt = Math.max(10, Math.min(200, Math.round(amount)));
        if (s.profile.gold < amt) return { ok: false, reason: 'not enough gold' };
        set({
          profile: { ...s.profile, gold: s.profile.gold - amt },
          wager: { day: s.aiChallenge.day, amount: amt, resolved: null },
        });
        return { ok: true };
      },

      resolveWagerIfDue() {
        const s = get();
        const today = dayKey();
        if (!s.wager || s.wager.resolved !== null) return;
        // If the wager's day is in the past and challenge wasn't claimed, lose stake (already deducted).
        if (s.wager.day !== today) {
          set({ wager: { ...s.wager, resolved: 'lose' } });
        }
      },

      async refreshWisdom() {
        const s = get();
        const mem = memoryAsPrompt(deriveMemory(s.entries));
        const lines = await generateWisdom(mem);
        set({ wisdom: { lines, at: Date.now() } });
      },

      trophyActive() {
        const t = get().trophy;
        return !!t && Date.now() < t.expiresAt;
      },

      clearLastAchievement() { set({ lastAchievement: null }); },
      clearLastCustomBadge() { set({ lastCustomBadge: null }); },
      removeCustomBadge(id) {
        set(s => ({ customBadges: s.customBadges.filter(b => b.id !== id) }));
      },

      setTone(tone) { set({ tone }); },

      clearChat() { set({ chatHistory: [] }); },

      buyGear(id) {
        const s = get();
        const item = GEAR_BY_ID[id];
        if (!item) return { ok: false, reason: 'unknown' };
        if (s.gearOwned.includes(id)) return { ok: false, reason: 'already owned' };
        const lvl = levelFromXp(s.profile.xp).level;
        if (item.unlockLevel && lvl < item.unlockLevel) {
          return { ok: false, reason: `Requires level ${item.unlockLevel}` };
        }
        if (s.profile.gold < item.cost) {
          return { ok: false, reason: `Need ${item.cost - s.profile.gold} more gold` };
        }
        set({
          profile: { ...s.profile, gold: s.profile.gold - item.cost },
          gearOwned: [...s.gearOwned, id],
          // auto-equip if slot is empty
          gearEquipped: s.gearEquipped[item.slot] ? s.gearEquipped : { ...s.gearEquipped, [item.slot]: id },
          lastGear: { id, action: 'bought', at: Date.now() },
        });
        return { ok: true };
      },

      equipGear(id) {
        const s = get();
        const item = GEAR_BY_ID[id];
        if (!item || !s.gearOwned.includes(id)) return;
        set({
          gearEquipped: { ...s.gearEquipped, [item.slot]: id },
          lastGear: { id, action: 'equipped', at: Date.now() },
        });
      },

      unequipGear(slot) {
        const s = get();
        const next = { ...s.gearEquipped };
        delete next[slot];
        set({ gearEquipped: next });
      },

      gearBonuses() {
        return aggregateBonuses(get().gearEquipped);
      },

      async sendChat(msg) {
        const trimmed = msg.trim();
        if (!trimmed) return;
        const userMsg = { role: 'user' as const, content: trimmed, at: Date.now() };
        set(s => ({ chatHistory: [...s.chatHistory, userMsg] }));

        const s = get();
        const memCtx = memoryAsPrompt(deriveMemory(s.entries));
        const recent = s.entries.slice(0, 8).map(e =>
          `- "${e.title}" [${e.sentiment}, ${e.parentId}, ${e.xpDelta >= 0 ? '+' : ''}${e.xpDelta}xp, ${new Date(e.createdAt).toLocaleString()}]`
        ).join('\n');
        const reply = await sendChatMessage(
          s.chatHistory.map(m => ({ role: m.role, content: m.content })),
          memCtx, recent, s.tone,
        );
        set(st => ({ chatHistory: [...st.chatHistory, { role: 'assistant', content: reply, at: Date.now() }] }));
      },

      setTts(enabled, voice) {
        set({ ttsEnabled: enabled, ...(voice !== undefined ? { ttsVoice: voice } : {}) });
      },

      completeAiQuest(questId) {
        const s = get();
        const q = s.quests.find(q => q.id === questId);
        if (!q || q.claimed) return;
        const goldReward = Math.round(q.xpReward * 0.7);
        set({
          profile: { ...s.profile, xp: s.profile.xp + q.xpReward, gold: s.profile.gold + goldReward },
          quests: s.quests.map(x => x.id === questId ? { ...x, completed: true, progress: x.target, claimed: true } : x),
          questsCompletedTotal: s.questsCompletedTotal + 1,
          lastChange: { delta: q.xpReward, sentiment: 'positive', combo: s.combo, at: Date.now() },
        });
        // Rolling stream: spawn next AI quest grounded in the latest entries.
        const recent = get().entries.slice(0, 6).map(e => ({ title: e.title, sentiment: e.sentiment, parentId: e.parentId }));
        suggestQuestFromRecent(recent, dayKey()).then(nq => {
          if (!nq) return;
          set(st => ({ quests: st.quests.map(x => x.id === questId ? nq : x) }));
        }).catch(() => {});
      },

      // Multi-entry add — waits for AI, applies once. Heuristic only as fallback if AI returns nothing.
      async addEntries(text) {
        const trimmed = text.trim();
        if (!trimmed) return [];
        const batchId = crypto.randomUUID();
        const mem = memoryAsPrompt(deriveMemory(get().entries));

        // Wait for AI (which itself falls back to heuristic on failure).
        let analyses = await analyzeMultiEntries(trimmed, { memoryContext: mem });
        // Absolute safety net
        if (!analyses.length) {
          const parts = splitForHeuristic(trimmed);
          analyses = parts.map(p => heuristicAnalyze(p));
        }
        if (!analyses.length) analyses = [heuristicAnalyze(trimmed)];

        const finalEntries: Entry[] = [];
        for (const a of analyses) {
          const e = applyOneEntry(a, batchId, get, set);
          finalEntries.push(e);
        }
        const resultEntries = finalEntries;

        // Narration + TTS
        const narr = buildNarration(resultEntries);
        if (get().ttsEnabled && narr) ttsSpeak(narr, { voiceName: get().ttsVoice || undefined });

        // Background: try to mint a custom badge based on the new memory snapshot.
        (async () => {
          const sNow = get();
          // Throttle: every 3 entries, or if user has 5+ entries and zero custom badges yet.
          const shouldTry = sNow.entries.length >= 5 &&
            (sNow.entries.length % 3 === 0 || sNow.customBadges.length === 0);
          if (!shouldTry) return;
          const ctx = memoryAsPrompt(deriveMemory(sNow.entries));
          const minted = await mintCustomBadge(ctx, sNow.customBadges);
          if (!minted) return;
          set(s => ({
            customBadges: [minted, ...s.customBadges].slice(0, 30),
            lastCustomBadge: { badge: minted, at: Date.now() },
          }));
        })().catch(() => {});

        // Background: spawn an AI-driven quest based on recent entries
        const recent = get().entries.slice(0, 6).map(e => ({ title: e.title, sentiment: e.sentiment, parentId: e.parentId }));
        suggestQuestFromRecent(recent, dayKey()).then(q => {
          if (!q) return;
          set(s => {
            // Replace the last quest with the AI one (keep 3 visible) but only if no current AI quest is unclaimed
            const hasAi = s.quests.some(x => x.id.includes('-ai-') && !x.claimed);
            if (hasAi) return s;
            const next = [...s.quests];
            // remove an unclaimed pool quest if length >= 3
            if (next.length >= 3) {
              const idx = next.findIndex(x => !x.claimed && !x.completed && !x.id.includes('-ai-'));
              if (idx >= 0) next.splice(idx, 1);
            }
            return { quests: [...next, q] };
          });
        }).catch(() => {});

        return resultEntries;
      },

      buyItem(itemId) {
        const s = get();
        const item = ITEM_BY_ID[itemId] || s.customItems.find(i => i.id === itemId);
        if (!item) return { ok: false, reason: 'unknown item' };
        if (s.profile.gold < item.cost) return { ok: false, reason: 'need ' + (item.cost - s.profile.gold) + ' more gold' };
        const gold = s.profile.gold - item.cost;
        if (item.kind === 'pass') {
          set({
            profile: { ...s.profile, gold },
            passes: { ...s.passes, [item.id]: (s.passes[item.id] || 0) + 1 },
            lastPurchase: { itemId, at: Date.now() },
          });
        } else if (item.kind === 'powerup' && item.powerup) {
          set({
            profile: { ...s.profile, gold },
            inventory: { ...s.inventory, [item.powerup]: (s.inventory[item.powerup] as number) + 1 },
            lastPurchase: { itemId, at: Date.now() },
          });
        }
        return { ok: true };
      },

      async usePass(passId) {
        const s = get();
        const count = s.passes[passId] || 0;
        if (count <= 0) return null;
        const item: ShopItem | undefined = ITEM_BY_ID[passId] || s.customItems.find(i => i.id === passId);
        if (!item || item.kind !== 'pass') return null;

        const id = crypto.randomUUID();
        const now = new Date();
        const entry: Entry = {
          id, text: item.passTitle!, title: item.passTitle!,
          createdAt: now.toISOString(), dayKey: dayKey(now),
          parentId: item.passParent || 'breaking', subId: item.passSub || 'screen',
          sentiment: 'neutral', intensity: 1,
          baseDelta: 0, xpDelta: 0,
          comboAtTime: s.combo, multiplierAtTime: 1,
          reasoning: 'Paid pass — no XP penalty, no combo break.',
          quip: `${item.emoji} You earned this. Enjoy without guilt.`,
          tone: 'gentle', source: 'rules', analyzing: false,
        };

        set(st => {
          const entries = [entry, ...st.entries];
          // consume the pass; combo and comboExpiresAt unchanged
          const newPasses = { ...st.passes, [passId]: (st.passes[passId] || 0) - 1 };
          if (newPasses[passId] <= 0) delete newPasses[passId];
          return rederive(
            { ...st, entries, passes: newPasses },
            { delta: 0, sentiment: 'neutral', combo: st.combo },
          );
        });
        return entry;
      },

      performCheckin() {
        const today = dayKey();
        const s = get();
        if (s.lastCheckinDay === today) return 0;
        const bonus = 25;
        const goldBonus = 15;
        set({
          profile: { ...s.profile, xp: s.profile.xp + bonus, gold: s.profile.gold + goldBonus },
          lastCheckinDay: today,
          lastChange: { delta: bonus, sentiment: 'positive', combo: s.combo, at: Date.now() },
        });
        return bonus;
      },

      todayEntries() {
        const t = dayKey();
        return get().entries.filter(e => e.dayKey === t);
      },
      todayNetXp() {
        return get().todayEntries().reduce((a, e) => a + e.xpDelta, 0);
      },
      currentStreak() { return computeStreak(get().entries); },
      unlockedBadges() {
        return BADGES.filter(b => b.earned(badgeCtxFor(get()))).map(b => b.id);
      },
    }),
    {
      name: 'habitquest-v13',
      onRehydrateStorage: () => (s) => {
        if (s && s.profile) {
          // Backfill new profile fields safely on first load after schema bump.
          if (typeof s.profile.hourlyStreak !== 'number') s.profile.hourlyStreak = 0;
          if (typeof s.profile.hourlyBest   !== 'number') s.profile.hourlyBest = 0;
          if (typeof s.profile.lastHourlyTick !== 'number') s.profile.lastHourlyTick = 0;
        }
        if (s && s.profile && typeof s.profile.gold !== 'number') {
          // v11 -> v12 migration: seed gold from positive XP earned so users don't start broke.
          const positiveXp = s.entries
            ? s.entries.filter(e => e.sentiment === 'positive').reduce((a, e) => a + Math.max(0, e.xpDelta), 0)
            : Math.max(0, s.profile.xp);
          s.profile.gold = positiveXp;
        }
        if (s && !s.apiKey) {
          const fromLs =
            localStorage.getItem('hq-openrouter-key') ||
            localStorage.getItem('hq-deepseek-key') || '';
          const fromEnv =
            (import.meta as any).env?.VITE_OPENROUTER_KEY ||
            (import.meta as any).env?.VITE_DEEPSEEK_KEY || '';
          s.apiKey = fromLs || fromEnv || '';
        }
      },
    }
  )
);
