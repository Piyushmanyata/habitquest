// RPG gear catalog. 7 slots × 4 rarities. Each piece gives passive stat bonuses
// that fold into the live XP / combo / loot / boss-damage math.

export type GearSlot = 'head' | 'body' | 'hands' | 'legs' | 'feet' | 'weapon' | 'trinket';
export type GearRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

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
  mythic:    '#ff4d6d',
};

export const RARITY_GLOW: Record<GearRarity, string> = {
  common:    '0 0 0 0 transparent',
  rare:      '0 0 22px -6px rgba(125,211,252,0.45)',
  epic:      '0 0 26px -6px rgba(168,85,247,0.55)',
  legendary: '0 0 32px -6px rgba(251,191,36,0.65)',
  mythic:    '0 0 40px -4px rgba(255,77,109,0.85), 0 0 80px -10px rgba(168,85,247,0.55)',
};

export const RARITY_ORDER: GearRarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

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
  { id: 'h-monkmask', slot: 'head', name: 'Monk Mask',        emoji: '🥷', rarity: 'rare', cost: 165, unlockLevel: 4,
    description: '+8% XP on Mind & Wellbeing entries.', stats: { categoryBoost: { mind: 0.08 } } },
  { id: 'h-warhelm',  slot: 'head', name: 'War Helm',         emoji: '🪖', rarity: 'epic', cost: 410, unlockLevel: 9,
    description: '+25% boss damage. Heavy hangs the head.', stats: { bossDamage: 0.25 } },
  { id: 'h-prophet',  slot: 'head', name: 'Prophet Hood',     emoji: '🔮', rarity: 'legendary', cost: 820, unlockLevel: 13,
    description: '+12% XP on Learning & Mastery and +5 min combo.', stats: { categoryBoost: { mastery: 0.12 }, comboExtendMin: 5 } },
  { id: 'h-mindcrown',slot: 'head', name: 'Mindforge Crown',  emoji: '🧠', rarity: 'mythic', cost: 1600, unlockLevel: 22,
    description: '+22% XP and +15 min combo. The mind that built itself.', stats: { xpBoost: 0.22, comboExtendMin: 15 } },

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
  { id: 'b-runner',   slot: 'body', name: 'Athlete Singlet',  emoji: '🏃', rarity: 'rare', cost: 150, unlockLevel: 3,
    description: '+12% XP on Health & Body workouts.', stats: { categoryBoost: { health: 0.12 } } },
  { id: 'b-monk',     slot: 'body', name: 'Monk Cassock',     emoji: '🧘', rarity: 'epic', cost: 360, unlockLevel: 8,
    description: '+15% XP on Mind & Wellbeing, calm energy.', stats: { categoryBoost: { mind: 0.15 } } },
  { id: 'b-creator',  slot: 'body', name: 'Maker Apron',      emoji: '🧑‍🎨', rarity: 'rare', cost: 200, unlockLevel: 5,
    description: '+12% XP on Creative & Hobby projects.', stats: { categoryBoost: { creative: 0.12 } } },
  { id: 'b-ascended', slot: 'body', name: 'Ascended Robes',   emoji: '🌌', rarity: 'mythic', cost: 1850, unlockLevel: 24,
    description: '+25% XP across all entries.', stats: { xpBoost: 0.25 } },
  { id: 'b-titan',    slot: 'body', name: 'Titan Carapace',   emoji: '🛡️', rarity: 'mythic', cost: 2000, unlockLevel: 27,
    description: '+40% boss damage and +12% XP.', stats: { bossDamage: 0.40, xpBoost: 0.12 } },

  // ─── HANDS ───
  { id: 'g-cloth',    slot: 'hands', name: 'Cloth Gloves',    emoji: '🧤', rarity: 'common', cost: 20,
    description: 'Bare-knuckle bonus barely.', stats: { xpBoost: 0.02 } },
  { id: 'g-iron',     slot: 'hands', name: 'Iron Gauntlets',  emoji: '🤜', rarity: 'rare', cost: 130, unlockLevel: 3,
    description: '+12% boss damage. Heavy strike.', stats: { bossDamage: 0.12 } },
  { id: 'g-focus',    slot: 'hands', name: 'Focus Wraps',     emoji: '🥋', rarity: 'rare', cost: 150, unlockLevel: 4,
    description: 'Combo window holds 6 min longer.', stats: { comboExtendMin: 6 } },
  { id: 'g-sage',     slot: 'hands', name: "Sage's Touch",    emoji: '✋', rarity: 'epic', cost: 340, unlockLevel: 7,
    description: '+12% loot drop rate.', stats: { lootBoost: 0.12 } },
  { id: 'g-gold',     slot: 'hands', name: 'Goldfinger Gloves', emoji: '🤲', rarity: 'rare', cost: 175, unlockLevel: 5,
    description: '+8% loot rate and +3% XP.', stats: { lootBoost: 0.08, xpBoost: 0.03 } },
  { id: 'g-titan',    slot: 'hands', name: 'Titan Knuckles',   emoji: '👊', rarity: 'legendary', cost: 720, unlockLevel: 14,
    description: '+30% boss damage. Punch through walls.', stats: { bossDamage: 0.30 } },
  { id: 'g-godhand',  slot: 'hands', name: 'God-Hand of Habit',emoji: '🤚', rarity: 'mythic', cost: 1500, unlockLevel: 20,
    description: '+18% loot, +10% XP, +8 min combo.', stats: { lootBoost: 0.18, xpBoost: 0.10, comboExtendMin: 8 } },

  // ─── LEGS ───
  { id: 'l-linen',    slot: 'legs', name: 'Linen Trousers',   emoji: '👖', rarity: 'common', cost: 0,
    description: 'Free starter pants.', stats: {} },
  { id: 'l-runner',   slot: 'legs', name: "Runner's Greaves", emoji: '🦵', rarity: 'rare', cost: 140, unlockLevel: 3,
    description: '+10% XP on Health & Body.', stats: { categoryBoost: { health: 0.10 } } },
  { id: 'l-discipline', slot: 'legs', name: 'Discipline Pants', emoji: '🩳', rarity: 'epic', cost: 320, unlockLevel: 7,
    description: '+8% XP on every entry.', stats: { xpBoost: 0.08 } },
  { id: 'l-monk',     slot: 'legs', name: 'Monk Trousers',    emoji: '🧎', rarity: 'rare', cost: 165, unlockLevel: 4,
    description: '+10% XP on Mind & Wellbeing.', stats: { categoryBoost: { mind: 0.10 } } },
  { id: 'l-titan',    slot: 'legs', name: 'Titan Greaves',    emoji: '🦿', rarity: 'legendary', cost: 760, unlockLevel: 13,
    description: '+12% XP and +20% boss damage.', stats: { xpBoost: 0.12, bossDamage: 0.20 } },
  { id: 'l-marathon', slot: 'legs', name: 'Marathon Leggings',emoji: '🦵', rarity: 'epic', cost: 380, unlockLevel: 10,
    description: '+18% XP on Health & Body. Built for the long run.', stats: { categoryBoost: { health: 0.18 } } },
  { id: 'l-stride',   slot: 'legs', name: 'Stride of Stars',  emoji: '⭐', rarity: 'mythic', cost: 1700, unlockLevel: 23,
    description: '+18% XP and +12 min combo window.', stats: { xpBoost: 0.18, comboExtendMin: 12 } },

  // ─── FEET ───
  { id: 'f-sandal',   slot: 'feet', name: 'Cloth Sandals',    emoji: '🩴', rarity: 'common', cost: 25,
    description: 'Soft start.', stats: { xpBoost: 0.02 } },
  { id: 'f-boots',    slot: 'feet', name: 'Quick Boots',      emoji: '🥾', rarity: 'rare', cost: 150, unlockLevel: 3,
    description: 'Combo window holds 5 min longer.', stats: { comboExtendMin: 5 } },
  { id: 'f-bootstrap',slot: 'feet', name: 'Bootstraps of Will', emoji: '👢', rarity: 'epic', cost: 340, unlockLevel: 7,
    description: '+9% XP. Pull yourself up.', stats: { xpBoost: 0.09 } },
  { id: 'f-runner',   slot: 'feet', name: 'Runners',          emoji: '👟', rarity: 'rare', cost: 160, unlockLevel: 4,
    description: '+10% XP on Health & Body.', stats: { categoryBoost: { health: 0.10 } } },
  { id: 'f-stealth',  slot: 'feet', name: 'Stealth Slippers', emoji: '🥿', rarity: 'epic', cost: 360, unlockLevel: 8,
    description: '+10 min combo and +5% loot.', stats: { comboExtendMin: 10, lootBoost: 0.05 } },
  { id: 'f-hermes',   slot: 'feet', name: 'Sandals of Hermes',emoji: '🪽', rarity: 'legendary', cost: 740, unlockLevel: 14,
    description: '+14% XP and +12 min combo.', stats: { xpBoost: 0.14, comboExtendMin: 12 } },
  { id: 'f-mythos',   slot: 'feet', name: 'Mythos Boots',     emoji: '👣', rarity: 'mythic', cost: 1650, unlockLevel: 25,
    description: '+20% XP across all categories.', stats: { xpBoost: 0.20 } },

  // ─── WEAPON ───
  { id: 'w-stick',    slot: 'weapon', name: 'Wooden Stick',   emoji: '🪵', rarity: 'common', cost: 40,
    description: 'Better than nothing. +6% boss damage.', stats: { bossDamage: 0.06 } },
  { id: 'w-iron',     slot: 'weapon', name: 'Iron Sword',     emoji: '🗡️', rarity: 'rare', cost: 170, unlockLevel: 4,
    description: '+18% boss damage.', stats: { bossDamage: 0.18 } },
  { id: 'w-slayer',   slot: 'weapon', name: 'Habit-Slayer',   emoji: '⚔️', rarity: 'epic', cost: 380, unlockLevel: 8,
    description: '+28% boss damage. Slays the inner demons.', stats: { bossDamage: 0.28 } },
  { id: 'w-excalibur',slot: 'weapon', name: 'Excaliburn of Discipline', emoji: '🔥', rarity: 'legendary', cost: 850, unlockLevel: 14,
    description: '+45% boss damage and +10% XP.', stats: { bossDamage: 0.45, xpBoost: 0.10 } },
  { id: 'w-axe',      slot: 'weapon', name: 'Battle Axe',     emoji: '🪓', rarity: 'rare', cost: 200, unlockLevel: 5,
    description: '+22% boss damage. Two-handed conviction.', stats: { bossDamage: 0.22 } },
  { id: 'w-bow',      slot: 'weapon', name: 'Recurve of Reps',emoji: '🏹', rarity: 'epic', cost: 410, unlockLevel: 10,
    description: '+35% boss damage. Quiet, accurate, lethal.', stats: { bossDamage: 0.35 } },
  { id: 'w-staff',    slot: 'weapon', name: 'Staff of Stillness', emoji: '🪄', rarity: 'epic', cost: 430, unlockLevel: 11,
    description: '+25% boss dmg and +6 min combo.', stats: { bossDamage: 0.25, comboExtendMin: 6 } },
  { id: 'w-godslayer',slot: 'weapon', name: 'God-Slayer Blade',emoji: '🗡️', rarity: 'mythic', cost: 2200, unlockLevel: 28,
    description: '+60% boss damage and +15% XP. End-game tier.', stats: { bossDamage: 0.60, xpBoost: 0.15 } },
  { id: 'w-tomeward', slot: 'weapon', name: 'Tome of Wards',  emoji: '📓', rarity: 'legendary', cost: 720, unlockLevel: 12,
    description: '+15% XP on Learning & Mastery and +15% boss dmg.', stats: { categoryBoost: { mastery: 0.15 }, bossDamage: 0.15 } },

  // ─── TRINKET ───
  { id: 't-penny',    slot: 'trinket', name: 'Lucky Penny',   emoji: '🪙', rarity: 'common', cost: 35,
    description: '+5% loot drop rate.', stats: { lootBoost: 0.05 } },
  { id: 't-streak',   slot: 'trinket', name: 'Streak Charm',  emoji: '🔥', rarity: 'rare', cost: 200, unlockLevel: 5,
    description: '1 free streak save per week.', stats: { streakShield: 1 } },
  { id: 't-memory',   slot: 'trinket', name: 'Memory Stone',  emoji: '💠', rarity: 'rare', cost: 180, unlockLevel: 4,
    description: '+7% XP on all entries.', stats: { xpBoost: 0.07 } },
  { id: 't-phoenix',  slot: 'trinket', name: 'Phoenix Feather', emoji: '🪶', rarity: 'epic', cost: 420, unlockLevel: 9,
    description: '+10% XP, +10% loot, +1 streak save.', stats: { xpBoost: 0.10, lootBoost: 0.10, streakShield: 1 } },
  { id: 't-amulet',   slot: 'trinket', name: 'Amulet of Vows',  emoji: '🧿', rarity: 'rare', cost: 195, unlockLevel: 5,
    description: '+9% XP on every entry.', stats: { xpBoost: 0.09 } },
  { id: 't-ring',     slot: 'trinket', name: 'Ring of Routine', emoji: '💍', rarity: 'epic', cost: 420, unlockLevel: 9,
    description: '+12 min combo and +5% loot.', stats: { comboExtendMin: 12, lootBoost: 0.05 } },
  { id: 't-eye',      slot: 'trinket', name: 'Eye of the Coach',emoji: '👁️', rarity: 'legendary', cost: 760, unlockLevel: 14,
    description: '+15% XP and +2 streak saves.', stats: { xpBoost: 0.15, streakShield: 2 } },
  { id: 't-crown',    slot: 'trinket', name: 'Crown of Compounding', emoji: '💎', rarity: 'mythic', cost: 2000, unlockLevel: 26,
    description: '+25% XP and +20 min combo. The ultimate compounder.', stats: { xpBoost: 0.25, comboExtendMin: 20 } },
  { id: 't-sigil',    slot: 'trinket', name: 'Sigil of the Self', emoji: '🌀', rarity: 'mythic', cost: 2400, unlockLevel: 30,
    description: '+30% XP, +30% loot, +3 streak saves. End-game trinket.', stats: { xpBoost: 0.30, lootBoost: 0.30, streakShield: 3 } },
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
