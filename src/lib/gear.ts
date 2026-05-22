// RPG gear catalog. 7 slots × 4 rarities. Each piece gives passive stat bonuses
// that fold into the live XP / combo / loot / boss-damage math.

export type GearSlot = 'head' | 'body' | 'hands' | 'legs' | 'feet' | 'weapon' | 'trinket';
export type GearRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type GearStats = {
  /** Percent multiplier on positive XP (e.g. 0.1 = +10%). */
  xpBoost?: number;
  /** Percent multiplier on boss damage. */
  bossDamage?: number;
  /** Extra minutes added to combo window. */
  comboExtendMin?: number;
  /** Bonus loot drop rate (added to base chance). */
  lootBoost?: number;
  /** Number of free streak skips this piece grants per week. */
  streakShield?: number;
  /** Bonus per category (e.g. {mastery: 0.1} = +10% XP on mastery entries). */
  categoryBoost?: Record<string, number>;
};

export type GearItem = {
  id: string;
  slot: GearSlot;
  name: string;
  emoji: string;
  rarity: GearRarity;
  /** XP cost to purchase. */
  cost: number;
  /** Min user level required to unlock the item (purchase locked otherwise). */
  unlockLevel?: number;
  description: string;
  stats: GearStats;
};

export const RARITY_COLOR: Record<GearRarity, string> = {
  common:    '#9ca3af',
  rare:      '#7dd3fc',
  epic:      '#a855f7',
  legendary: '#fbbf24',
};

export const RARITY_GLOW: Record<GearRarity, string> = {
  common:    '0 0 0 0 transparent',
  rare:      '0 0 22px -6px rgba(125,211,252,0.45)',
  epic:      '0 0 26px -6px rgba(168,85,247,0.55)',
  legendary: '0 0 32px -6px rgba(251,191,36,0.65)',
};

export const SLOT_LABEL: Record<GearSlot, string> = {
  head: 'Head', body: 'Body', hands: 'Hands', legs: 'Legs',
  feet: 'Feet', weapon: 'Weapon', trinket: 'Trinket',
};

export const SLOT_EMOJI: Record<GearSlot, string> = {
  head: '🪖', body: '🎽', hands: '🧤', legs: '👖',
  feet: '👟', weapon: '⚔️', trinket: '💍',
};

// ── Catalog ──────────────────────────────────────────────────────────────
// Each piece keeps numbers small so even fully-geared the player only sees
// ~30-50% XP boost. Keeps progression long-lived.

export const GEAR: GearItem[] = [
  // ─── HEAD ───
  { id: 'h-cloth',    slot: 'head', name: 'Cloth Hood',       emoji: '🧢', rarity: 'common', cost: 30,
    description: 'Basic cover. Better than going in bareheaded.', stats: { xpBoost: 0.02 } },
  { id: 'h-scholar',  slot: 'head', name: 'Scholar Cap',      emoji: '🎓', rarity: 'rare', cost: 120, unlockLevel: 3,
    description: '+5% XP on Learning & Mastery entries.', stats: { categoryBoost: { mastery: 0.10 } } },
  { id: 'h-iron',     slot: 'head', name: 'Iron Helm',        emoji: '⛑️', rarity: 'rare', cost: 140, unlockLevel: 3,
    description: '+15% boss damage. Heavy but it works.', stats: { bossDamage: 0.15 } },
  { id: 'h-circlet',  slot: 'head', name: 'Crown of Focus',   emoji: '👑', rarity: 'epic', cost: 320, unlockLevel: 6,
    description: '+8% XP and combo window holds 7 minutes longer.', stats: { xpBoost: 0.08, comboExtendMin: 7 } },
  { id: 'h-sage',     slot: 'head', name: "Sage's Circlet",   emoji: '✨', rarity: 'legendary', cost: 700, unlockLevel: 10,
    description: '+15% XP, +10 min combo. Legendary.', stats: { xpBoost: 0.15, comboExtendMin: 10 } },

  // ─── BODY ───
  { id: 'b-linen',    slot: 'body', name: 'Linen Tunic',      emoji: '👕', rarity: 'common', cost: 0,
    description: 'Starter armor. Free. No bonus.', stats: {} },
  { id: 'b-leather',  slot: 'body', name: 'Leather Vest',     emoji: '🦺', rarity: 'common', cost: 50,
    description: '+4% XP. Honest work clothes.', stats: { xpBoost: 0.04 } },
  { id: 'b-mage',     slot: 'body', name: 'Mage Robes',       emoji: '🧙', rarity: 'rare', cost: 160, unlockLevel: 3,
    description: '+10% XP on Mind & Wellbeing.', stats: { categoryBoost: { mind: 0.10 } } },
  { id: 'b-chain',    slot: 'body', name: 'Chainmail',        emoji: '🛡️', rarity: 'rare', cost: 180, unlockLevel: 4,
    description: '+15% boss damage. Clinks pleasingly.', stats: { bossDamage: 0.15 } },
  { id: 'b-plate',    slot: 'body', name: 'Discipline Plate', emoji: '🦾', rarity: 'epic', cost: 380, unlockLevel: 7,
    description: '+10% XP and +20% boss damage.', stats: { xpBoost: 0.10, bossDamage: 0.20 } },
  { id: 'b-forge',    slot: 'body', name: 'Habit-Forged Cuirass', emoji: '🪖', rarity: 'legendary', cost: 780, unlockLevel: 12,
    description: '+18% XP. The armor of someone who shows up.', stats: { xpBoost: 0.18 } },

  // ─── HANDS ───
  { id: 'g-cloth',    slot: 'hands', name: 'Cloth Gloves',    emoji: '🧤', rarity: 'common', cost: 20,
    description: 'Bare-knuckle bonus barely.', stats: { xpBoost: 0.02 } },
  { id: 'g-iron',     slot: 'hands', name: 'Iron Gauntlets',  emoji: '🤜', rarity: 'rare', cost: 130, unlockLevel: 3,
    description: '+12% boss damage. Heavy strike.', stats: { bossDamage: 0.12 } },
  { id: 'g-focus',    slot: 'hands', name: 'Focus Wraps',     emoji: '🥋', rarity: 'rare', cost: 150, unlockLevel: 4,
    description: 'Combo window holds 6 min longer.', stats: { comboExtendMin: 6 } },
  { id: 'g-sage',     slot: 'hands', name: "Sage's Touch",    emoji: '✋', rarity: 'epic', cost: 340, unlockLevel: 7,
    description: '+12% loot drop rate.', stats: { lootBoost: 0.12 } },

  // ─── LEGS ───
  { id: 'l-linen',    slot: 'legs', name: 'Linen Trousers',   emoji: '👖', rarity: 'common', cost: 0,
    description: 'Free starter pants.', stats: {} },
  { id: 'l-runner',   slot: 'legs', name: "Runner's Greaves", emoji: '🦵', rarity: 'rare', cost: 140, unlockLevel: 3,
    description: '+10% XP on Health & Body.', stats: { categoryBoost: { health: 0.10 } } },
  { id: 'l-discipline', slot: 'legs', name: 'Discipline Pants', emoji: '🩳', rarity: 'epic', cost: 320, unlockLevel: 7,
    description: '+8% XP on every entry.', stats: { xpBoost: 0.08 } },

  // ─── FEET ───
  { id: 'f-sandal',   slot: 'feet', name: 'Cloth Sandals',    emoji: '🩴', rarity: 'common', cost: 25,
    description: 'Soft start.', stats: { xpBoost: 0.02 } },
  { id: 'f-boots',    slot: 'feet', name: 'Quick Boots',      emoji: '🥾', rarity: 'rare', cost: 150, unlockLevel: 3,
    description: 'Combo window holds 5 min longer.', stats: { comboExtendMin: 5 } },
  { id: 'f-bootstrap',slot: 'feet', name: 'Bootstraps of Will', emoji: '👢', rarity: 'epic', cost: 340, unlockLevel: 7,
    description: '+9% XP. Pull yourself up.', stats: { xpBoost: 0.09 } },

  // ─── WEAPON ───
  { id: 'w-stick',    slot: 'weapon', name: 'Wooden Stick',   emoji: '🪵', rarity: 'common', cost: 40,
    description: 'Better than nothing. +6% boss damage.', stats: { bossDamage: 0.06 } },
  { id: 'w-iron',     slot: 'weapon', name: 'Iron Sword',     emoji: '🗡️', rarity: 'rare', cost: 170, unlockLevel: 4,
    description: '+18% boss damage.', stats: { bossDamage: 0.18 } },
  { id: 'w-slayer',   slot: 'weapon', name: 'Habit-Slayer',   emoji: '⚔️', rarity: 'epic', cost: 380, unlockLevel: 8,
    description: '+28% boss damage. Slays the inner demons.', stats: { bossDamage: 0.28 } },
  { id: 'w-excalibur',slot: 'weapon', name: 'Excaliburn of Discipline', emoji: '🔥', rarity: 'legendary', cost: 850, unlockLevel: 14,
    description: '+45% boss damage and +10% XP.', stats: { bossDamage: 0.45, xpBoost: 0.10 } },

  // ─── TRINKET ───
  { id: 't-penny',    slot: 'trinket', name: 'Lucky Penny',   emoji: '🪙', rarity: 'common', cost: 35,
    description: '+5% loot drop rate.', stats: { lootBoost: 0.05 } },
  { id: 't-streak',   slot: 'trinket', name: 'Streak Charm',  emoji: '🔥', rarity: 'rare', cost: 200, unlockLevel: 5,
    description: '1 free streak save per week.', stats: { streakShield: 1 } },
  { id: 't-memory',   slot: 'trinket', name: 'Memory Stone',  emoji: '💠', rarity: 'rare', cost: 180, unlockLevel: 4,
    description: '+7% XP on all entries.', stats: { xpBoost: 0.07 } },
  { id: 't-phoenix',  slot: 'trinket', name: 'Phoenix Feather', emoji: '🪶', rarity: 'epic', cost: 420, unlockLevel: 9,
    description: '+10% XP, +10% loot, +1 streak save.', stats: { xpBoost: 0.10, lootBoost: 0.10, streakShield: 1 } },
];

export const GEAR_BY_ID: Record<string, GearItem> = Object.fromEntries(GEAR.map(g => [g.id, g]));

export type AggregateBonuses = {
  xpMultiplier: number;       // multiply positive XP by this (1.0 = no bonus)
  bossDamageMultiplier: number;
  comboExtendSec: number;     // additional seconds added to combo expiry
  lootRateBonus: number;      // additive (e.g. 0.10 added to base 0.07..0.35)
  streakShields: number;
  categoryBoost: Record<string, number>;
};

/** Returns the combined buff from all equipped items. */
export function aggregateBonuses(equipped: Partial<Record<GearSlot, string>>): AggregateBonuses {
  let xp = 1;
  let boss = 1;
  let comboSec = 0;
  let loot = 0;
  let shields = 0;
  const catBoost: Record<string, number> = {};

  for (const slot of Object.keys(equipped) as GearSlot[]) {
    const id = equipped[slot];
    if (!id) continue;
    const item = GEAR_BY_ID[id];
    if (!item) continue;
    const s = item.stats;
    if (s.xpBoost) xp += s.xpBoost;
    if (s.bossDamage) boss += s.bossDamage;
    if (s.comboExtendMin) comboSec += s.comboExtendMin * 60;
    if (s.lootBoost) loot += s.lootBoost;
    if (s.streakShield) shields += s.streakShield;
    if (s.categoryBoost) {
      for (const [k, v] of Object.entries(s.categoryBoost)) catBoost[k] = (catBoost[k] || 0) + v;
    }
  }
  return {
    xpMultiplier: xp,
    bossDamageMultiplier: boss,
    comboExtendSec: comboSec,
    lootRateBonus: loot,
    streakShields: shields,
    categoryBoost: catBoost,
  };
}

/** Friendly bullet list for hover/tooltip. */
export function describeStats(stats: GearStats): string[] {
  const out: string[] = [];
  if (stats.xpBoost)       out.push(`+${Math.round(stats.xpBoost * 100)}% XP`);
  if (stats.bossDamage)    out.push(`+${Math.round(stats.bossDamage * 100)}% boss damage`);
  if (stats.comboExtendMin)out.push(`+${stats.comboExtendMin} min combo window`);
  if (stats.lootBoost)     out.push(`+${Math.round(stats.lootBoost * 100)}% loot rate`);
  if (stats.streakShield)  out.push(`${stats.streakShield} streak shield/week`);
  if (stats.categoryBoost) {
    for (const [k, v] of Object.entries(stats.categoryBoost)) {
      out.push(`+${Math.round(v * 100)}% XP in ${k}`);
    }
  }
  return out;
}
