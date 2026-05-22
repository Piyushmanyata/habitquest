// Hand-curated quip pool. Picked by category × sentiment × intensity × tone, with anti-repeat.

type Sentiment = 'positive' | 'negative' | 'neutral';
type Tone = 'cheer' | 'hype' | 'roast' | 'wry' | 'gentle' | 'sass';

const recent: string[] = [];
const MAX_RECENT = 25;

// ── Positive: generic across categories ──
const POS_GENERIC = [
  'Big-brain energy.',
  'Past you is jealous.',
  'Stack it. Compound interest of effort.',
  'Forward motion. Loud and clear.',
  'Counted. Banked. Filed.',
  'Future you sends a thank-you note.',
  '+1 for the version you’re becoming.',
  'That was rep one. Where’s rep two?',
  'You out-leveled yesterday.',
  'Small move. Big direction.',
  'Discipline made cute.',
  'The vibe? Earned.',
  'Receipts logged.',
  'Boss tier behavior.',
];

const POS_HYPE = [
  'Absolute UNIT today.',
  'Built different. Logged different.',
  'Main-character arc unlocked.',
  'Olympic level effort.',
  'You DID that.',
  'Hall of fame moment.',
  'Touch grass? Touched.',
  'Final form approaching.',
];

// ── Negative ──
const NEG_GENERIC = [
  'The algorithm thanks you for your service.',
  'Inner gremlin: well fed.',
  'Noted. No shame, just data.',
  'Slip happens. Reset on next rep.',
  'We can rewrite the next hour.',
  'Tomorrow’s headline: comeback.',
  'You logged it — that’s 80% of fixing it.',
  'Score: dopamine 1, you 0. Reroll.',
  'Brain’s on cheat-day mode.',
  'A small L. Process it. Move.',
];

const NEG_ROAST = [
  'Bro the for-you page is not your friend.',
  'Your future self just sighed audibly.',
  'Self-sabotage, fully artisanal.',
  'Big "I’ll start tomorrow" energy.',
  'You played yourself, but elegantly.',
  'Couch villain origin story.',
];

const NEG_GENTLE = [
  'Be soft with yourself. Then try again.',
  'Off-day, not an off-life.',
  'Forgive the move. Keep the data.',
  'Even pros miss reps.',
];

// ── Neutral ──
const NEU = [
  'Logged. On the board.',
  'Quiet rep. Counts.',
  'Noted without drama.',
  'Filed under: small but real.',
];

// ── Category-specific positive flavors (sprinkled in) ──
const CAT_POS: Record<string, string[]> = {
  health: [
    'Body said thanks.',
    'Heart rate up, vibes up.',
    'Sweat is just future-fuel.',
    'Strong-body, strong-mind, etc.',
  ],
  mind: [
    'Brain noises: lowered.',
    'CEO of inner peace.',
    'Mind: defragged.',
  ],
  mastery: [
    'Compounding knowledge.',
    'Skill tree leveled.',
    '10,000 hours just got shorter.',
  ],
  work: [
    'Shipped > Shiny.',
    'Made the calendar proud.',
    'Deep work, light heart.',
  ],
  social: [
    'Connection > content.',
    'You loved on someone today.',
    'Bonds are XP too.',
  ],
  creative: [
    'You made a thing. Wild.',
    'Output > scroll.',
    'World gained 1 small object.',
  ],
  breaking: [
    'You said no. Loud.',
    'Habit boss took an L.',
    'Discipline tax: paid.',
  ],
};

const CAT_NEG: Record<string, string[]> = {
  health: [
    'Body’s sending a sticky note.',
    'Sleep debt: APR rising.',
  ],
  mind: [
    'Inner critic got airtime.',
    'Anxiety brunch — table for one.',
  ],
  mastery: [
    'Curiosity got snoozed.',
    'Skill tree: dusty.',
  ],
  work: [
    'The drawer of "later" is full.',
    'You picked the cheap dopamine combo.',
  ],
  social: [
    'You ghosted yourself today.',
  ],
  creative: [
    'The muse waited. Then left.',
  ],
  breaking: [
    'Loop fed itself again.',
    'The streak gods are watching.',
  ],
};

function pickFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickQuip(args: { parentId: string; sentiment: Sentiment; intensity: number; tone: Tone }): string {
  const { parentId, sentiment, intensity, tone } = args;
  let pool: string[] = [];

  if (sentiment === 'positive') {
    pool = [...POS_GENERIC, ...(CAT_POS[parentId] || [])];
    if (intensity >= 4 || tone === 'hype') pool = [...pool, ...POS_HYPE, ...POS_HYPE];
  } else if (sentiment === 'negative') {
    pool = [...NEG_GENERIC, ...(CAT_NEG[parentId] || [])];
    if (tone === 'roast' || intensity >= 4) pool = [...pool, ...NEG_ROAST, ...NEG_ROAST];
    if (tone === 'gentle') pool = [...pool, ...NEG_GENTLE, ...NEG_GENTLE];
  } else {
    pool = NEU;
  }

  // anti-repeat
  const fresh = pool.filter(q => !recent.includes(q));
  const chosen = (fresh.length ? pickFrom(fresh) : pickFrom(pool));
  recent.unshift(chosen);
  if (recent.length > MAX_RECENT) recent.pop();
  return chosen;
}
