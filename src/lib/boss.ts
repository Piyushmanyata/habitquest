// Daily Boss chain: defeat one and the next one spawns immediately. Bigger HP,
// bigger reward each time. The chain is deterministic per (day, index) so a
// reload won't shuffle the queue.

export type Boss = {
  id: string;
  name: string;
  emoji: string;
  flavor: string;
  maxHp: number;
  xpReward: number;
};

const ROSTER: Omit<Boss, 'id' | 'maxHp' | 'xpReward'>[] = [
  { name: 'Procrastination Demon', emoji: '👹', flavor: 'whispers "tomorrow…"' },
  { name: 'Doom-Scroll Hydra',     emoji: '🐍', flavor: 'feeds on infinite feeds' },
  { name: 'Couch Goblin',          emoji: '🛋️', flavor: 'guards the remote' },
  { name: 'Sugar Witch',           emoji: '🍩', flavor: 'casts cravings at midnight' },
  { name: 'Anxiety Wraith',        emoji: '🌀', flavor: 'spins thought-loops' },
  { name: 'Snooze Kraken',         emoji: '😴', flavor: 'drags you back under' },
  { name: 'Notification Imp',      emoji: '🔔', flavor: 'pings you to death' },
  { name: 'Comparison Specter',    emoji: '👻', flavor: 'shows you everyone else first' },
  { name: 'Excuse Goblin',         emoji: '🧌', flavor: 'has a reason for everything' },
  { name: 'Numbness Vortex',       emoji: '🕳️', flavor: 'eats the urge to start' },
  { name: 'Phone Phantom',         emoji: '📱', flavor: 'glows in the dark' },
  { name: 'Tomorrow Troll',        emoji: '🌙', flavor: 'promises a fresh start, forever' },
];

const BASE_HP = 80;
const BASE_REWARD = 100;
// Each boss after the first is +30% HP, +30% reward.
const ESCALATION = 1.30;

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function bossForDay(dayKey: string, bossIndex: number = 0): Boss {
  // Rotate through the roster deterministically per (day, index).
  const seed = hash(dayKey + ':' + bossIndex);
  const idx = seed % ROSTER.length;
  const b = ROSTER[idx];

  const tier = Math.pow(ESCALATION, bossIndex);
  const maxHp     = Math.round(BASE_HP * tier);
  const xpReward  = Math.round(BASE_REWARD * tier);

  return { id: `boss-${dayKey}-${bossIndex}`, ...b, maxHp, xpReward };
}

/** Damage a positive entry deals = base 12 × intensity factor × multiplier. */
export function damageFor(intensity: number, multiplier: number): number {
  return Math.round((6 + intensity * 4) * multiplier);
}
