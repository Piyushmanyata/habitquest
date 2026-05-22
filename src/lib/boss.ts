// Daily Boss: one themed boss per day. Positive entries deal damage.
// Deterministic per day so the boss is consistent across reloads.

export type Boss = {
  id: string;
  name: string;
  emoji: string;
  flavor: string;
  maxHp: number;
  xpReward: number;
};

const ROSTER: Omit<Boss, 'id'>[] = [
  { name: 'Procrastination Demon', emoji: '👹', flavor: 'whispers “tomorrow…”', maxHp: 80,  xpReward: 100 },
  { name: 'Doom-Scroll Hydra',    emoji: '🐍', flavor: 'feeds on infinite feeds', maxHp: 90,  xpReward: 110 },
  { name: 'Couch Goblin',         emoji: '🛋️', flavor: 'guards the remote', maxHp: 70,  xpReward: 90 },
  { name: 'Sugar Witch',          emoji: '🍩', flavor: 'casts cravings at midnight', maxHp: 75, xpReward: 95 },
  { name: 'Anxiety Wraith',       emoji: '🌀', flavor: 'spins thought-loops', maxHp: 85,  xpReward: 105 },
  { name: 'Snooze Kraken',        emoji: '😴', flavor: 'drags you back under', maxHp: 80, xpReward: 100 },
  { name: 'Notification Imp',     emoji: '🔔', flavor: 'pings you to death', maxHp: 65, xpReward: 85 },
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function bossForDay(dayKey: string): Boss {
  const idx = hash(dayKey) % ROSTER.length;
  const b = ROSTER[idx];
  return { id: `boss-${dayKey}`, ...b };
}

/** Damage a positive entry deals = base 12 × intensity factor × multiplier. */
export function damageFor(intensity: number, multiplier: number): number {
  return Math.round((6 + intensity * 4) * multiplier);
}
