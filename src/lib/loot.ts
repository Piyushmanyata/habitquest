// Loot drops on positive entries. Most positives drop nothing; occasionally rare items.

export type LootKind =
  | 'xp_boost_small'    // +10 instant XP
  | 'xp_boost_big'      // +25 instant XP
  | 'streak_freeze'     // skips a day without breaking streak (TODO: applied at streak compute)
  | 'focus_token'       // next positive entry XP is doubled
  | 'crit_strike';      // converts next positive to crit (×3 base intensity)

export type LootItem = {
  kind: LootKind;
  name: string;
  emoji: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic';
};

const TABLE: { item: LootItem; weight: number }[] = [
  { item: { kind: 'xp_boost_small', name: '+10 XP Charm',   emoji: '✨', rarity: 'common', description: 'Adds +10 XP right now.' }, weight: 60 },
  { item: { kind: 'xp_boost_big',   name: '+25 XP Relic',   emoji: '💎', rarity: 'rare',   description: 'Adds +25 XP right now.' }, weight: 22 },
  { item: { kind: 'focus_token',    name: 'Focus Token',    emoji: '🎯', rarity: 'rare',   description: 'Doubles XP of your next positive entry.' }, weight: 10 },
  { item: { kind: 'streak_freeze',  name: 'Streak Freeze',  emoji: '🧊', rarity: 'rare',   description: 'Saves your streak through one missed day.' }, weight: 5 },
  { item: { kind: 'crit_strike',    name: 'Crit Strike',    emoji: '⚡', rarity: 'epic',   description: 'Next positive entry crits (×3 base XP).' }, weight: 3 },
];

const TOTAL_WEIGHT = TABLE.reduce((a, b) => a + b.weight, 0);

/** Returns null most of the time. Higher intensity / combo → better drop chance. */
export function rollLoot(intensity: number, combo: number): LootItem | null {
  // Base 7% per positive, +1.5% per intensity, +2% per combo step (cap 35%)
  const chance = Math.min(0.35, 0.07 + intensity * 0.015 + combo * 0.02);
  if (Math.random() > chance) return null;
  const roll = Math.random() * TOTAL_WEIGHT;
  let acc = 0;
  for (const row of TABLE) {
    acc += row.weight;
    if (roll < acc) return row.item;
  }
  return TABLE[0].item;
}
