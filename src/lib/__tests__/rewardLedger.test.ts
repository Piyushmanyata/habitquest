import { describe, expect, it } from 'vitest';
import { dayKey } from '../gamification';
import { useHabitStore } from '../../store/useHabitStore';
import { computeStreak, rebuildFreezeLedger } from '../../store/useHabitStore';
import { reverseRewardDelta } from '../rewardLedger';

function makeDay(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return dayKey(d);
}

describe('reward reversal', () => {
  it('reverses xp, gold, bosses, and inventory deltas', () => {
    const result = reverseRewardDelta(
      {
        xp: 100,
        gold: 80,
        bossesDefeated: 4,
        inventory: { focus: 2, crit: 1, freeze: 3 },
      },
      {
        xpDelta: 30,
        goldDelta: 20,
        bossesDefeatedDelta: 1,
        inventoryDelta: { focus: 1, freeze: 2 },
      },
    );

    expect(result).toEqual({
      xp: 70,
      gold: 60,
      bossesDefeated: 3,
      inventory: { focus: 1, crit: 1, freeze: 1 },
    });
  });
});

describe('streak freeze', () => {
  it('consumes the nearest missed day first and preserves the streak', () => {
    const today = makeDay(0);
    const twoDaysAgo = makeDay(-2);

    const entries = [
      {
        id: 'a',
        dayKey: today,
        sentiment: 'positive' as const,
        xpDelta: 12,
      },
      {
        id: 'b',
        dayKey: twoDaysAgo,
        sentiment: 'positive' as const,
        xpDelta: 12,
      },
    ] as any[];

    const frozen = rebuildFreezeLedger(entries, [], 1);
    expect(frozen.remaining).toBe(0);
    expect(frozen.days).toContain(makeDay(-1));
    expect(computeStreak(entries, frozen.days)).toBe(3);
  });
});

describe('deleteEntry reversal', () => {
  it('rolls back the seeded reward ledger entry from profile and inventory', () => {
    const entry = {
      id: 'entry-1',
      text: 'Walked 30 min',
      title: 'Walked 30 min',
      createdAt: new Date().toISOString(),
      dayKey: dayKey(),
      parentId: 'health',
      subId: 'cardio',
      sentiment: 'positive' as const,
      intensity: 2,
      baseDelta: 26,
      xpDelta: 30,
      comboAtTime: 1,
      multiplierAtTime: 1.15,
      reasoning: 'test',
      quip: '',
      tone: 'gentle' as const,
      source: 'rules' as const,
      analyzing: false,
    };

    const original = useHabitStore.getState();

    useHabitStore.setState({
      entries: [entry],
      profile: {
        ...original.profile,
        xp: 100,
        gold: 80,
        bossesDefeated: 4,
        perfectDays: 0,
        longestStreak: 2,
      },
      inventory: { focus: 1, crit: 0, freeze: 0 },
      rewardLedger: {
        [entry.id]: {
          at: Date.now(),
          xpDelta: 30,
          goldDelta: 20,
          bossDamage: 14,
          bossDefeated: true,
          bossDefeatedAt: Date.now(),
          inventoryDelta: { focus: 1 },
          freezeUsedDays: [],
        },
      },
      boss: {
        day: entry.dayKey,
        bossIndex: 0,
        hpLeft: 0,
        defeated: true,
        defeatedAt: Date.now(),
      },
      lastLoot: null,
      trophy: null,
      streakFreezeDays: [],
      combo: 0,
      comboBest: 0,
      comboExpiresAt: 0,
      quests: [],
      questsDay: '',
      questsCompletedTotal: 0,
      lastChange: null,
    });

    try {
      useHabitStore.getState().deleteEntry(entry.id);
      const next = useHabitStore.getState();

      expect(next.entries).toHaveLength(0);
      expect(next.profile.xp).toBe(70);
      expect(next.profile.gold).toBe(60);
      expect(next.profile.bossesDefeated).toBe(3);
      expect(next.inventory.focus).toBe(0);
      expect(next.rewardLedger[entry.id]).toBeUndefined();
      expect(next.boss).toBeNull();
    } finally {
      useHabitStore.setState(original, true);
    }
  });
});
