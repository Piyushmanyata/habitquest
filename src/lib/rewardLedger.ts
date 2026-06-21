export type RewardInventory = {
  focus: number;
  crit: number;
  freeze: number;
};

export type RewardDelta = {
  xpDelta?: number;
  goldDelta?: number;
  inventoryDelta?: Partial<RewardInventory>;
  bossesDefeatedDelta?: number;
};

export function reverseRewardDelta(
  current: { xp: number; gold: number; bossesDefeated: number; inventory: RewardInventory },
  reward: RewardDelta,
) {
  return {
    xp: Math.max(0, current.xp - (reward.xpDelta ?? 0)),
    gold: Math.max(0, current.gold - (reward.goldDelta ?? 0)),
    bossesDefeated: Math.max(0, current.bossesDefeated - (reward.bossesDefeatedDelta ?? 0)),
    inventory: {
      focus: Math.max(0, current.inventory.focus - (reward.inventoryDelta?.focus ?? 0)),
      crit: Math.max(0, current.inventory.crit - (reward.inventoryDelta?.crit ?? 0)),
      freeze: Math.max(0, current.inventory.freeze - (reward.inventoryDelta?.freeze ?? 0)),
    },
  };
}
