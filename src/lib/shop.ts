// Shop catalog. Two kinds:
//  - 'pass': consumable that lets the user log a known "indulgence" with ZERO XP penalty
//            and no combo break. They paid the XP up-front.
//  - 'powerup': consumable buff (focus / crit / freeze).

export type ShopKind = 'pass' | 'powerup';

export type ShopItem = {
  id: string;
  kind: ShopKind;
  name: string;
  emoji: string;
  description: string;
  cost: number;             // XP cost to buy
  /** For passes: the journal title used when the pass is consumed. */
  passTitle?: string;
  /** For passes: parent/sub it logs under. */
  passParent?: string;
  passSub?: string;
  /** For powerups: which slot it fills. */
  powerup?: 'focus' | 'crit' | 'freeze';
};

export const SHOP_ITEMS: ShopItem[] = [
  // ── PASSES (real-life indulgences, no penalty when logged) ──
  {
    id: 'pass-tv',
    kind: 'pass', name: 'TV Pass', emoji: '📺',
    description: '45 min of TV — guilt-free. Logs as neutral, no combo break.',
    cost: 30,
    passTitle: 'Watched TV (paid pass)', passParent: 'creative', passSub: 'music',
  },
  {
    id: 'pass-doomscroll',
    kind: 'pass', name: 'Scroll Pass', emoji: '📱',
    description: '30 min of social scroll. Pre-paid, no shame.',
    cost: 25,
    passTitle: 'Phone scroll (paid pass)', passParent: 'breaking', passSub: 'screen',
  },
  {
    id: 'pass-cheat',
    kind: 'pass', name: 'Cheat Meal', emoji: '🍕',
    description: 'One indulgent meal — fully expensed.',
    cost: 50,
    passTitle: 'Cheat meal (paid pass)', passParent: 'health', passSub: 'nutrition',
  },
  {
    id: 'pass-sleep-in',
    kind: 'pass', name: 'Lazy Morning', emoji: '🛌',
    description: 'Sleep in tomorrow. Earned.',
    cost: 40,
    passTitle: 'Slept in (paid pass)', passParent: 'health', passSub: 'sleep',
  },
  {
    id: 'pass-gaming',
    kind: 'pass', name: 'Gaming Session', emoji: '🎮',
    description: '60 min of games. No timer guilt.',
    cost: 45,
    passTitle: 'Gaming session (paid pass)', passParent: 'creative', passSub: 'music',
  },
  {
    id: 'pass-snack',
    kind: 'pass', name: 'Snack Pass', emoji: '🍩',
    description: 'One snack, no math.',
    cost: 20,
    passTitle: 'Snack (paid pass)', passParent: 'breaking', passSub: 'junk',
  },
  {
    id: 'pass-skip-gym',
    kind: 'pass', name: 'Rest Day', emoji: '🧘‍♂️',
    description: 'Officially skip a workout. No streak penalty.',
    cost: 35,
    passTitle: 'Rest day (paid pass)', passParent: 'health', passSub: 'fitness',
  },

  // ── POWER-UPS ──
  {
    id: 'pu-focus',
    kind: 'powerup', name: 'Focus Token', emoji: '🎯',
    description: '×2 XP on your next positive entry.',
    cost: 60, powerup: 'focus',
  },
  {
    id: 'pu-crit',
    kind: 'powerup', name: 'Crit Strike', emoji: '⚡',
    description: '×3 XP on your next positive entry.',
    cost: 120, powerup: 'crit',
  },
  {
    id: 'pu-freeze',
    kind: 'powerup', name: 'Streak Freeze', emoji: '🧊',
    description: 'Saves your streak through one missed day.',
    cost: 80, powerup: 'freeze',
  },
];

export const ITEM_BY_ID: Record<string, ShopItem> = Object.fromEntries(SHOP_ITEMS.map(i => [i.id, i]));
