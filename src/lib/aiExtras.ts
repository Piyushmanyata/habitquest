// Extra AI features: custom item pricing, daily challenge generator, wisdom observations.
// Mirrors the dual-provider routing of ai.ts but lives separately to keep that file focused.

import { CATEGORIES, CAT_BY_ID } from './categories';
import { callJsonCompletion, getStoredApiKey } from './aiClient';

async function chat(system: string, user: string, opts: { temperature?: number; max_tokens?: number } = {}): Promise<any | null> {
  const apiKey = getStoredApiKey();
  if (!apiKey) return null;
  return callJsonCompletion({
    apiKey,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: opts.temperature ?? 0.6,
    maxTokens: opts.max_tokens ?? 220,
    responseFormat: true,
  });
}

// ─── Custom item pricing ───────────────────────────────────────────────
export type CustomItemPrice = {
  name: string;
  emoji: string;
  description: string;
  cost: number;
  passParent: string;
  passSub: string;
  reasoning: string;
};

function defaultPrice(text: string): CustomItemPrice {
  const wc = text.trim().split(/\s+/).length;
  const cost = Math.min(150, Math.max(15, 25 + wc * 4));
  return {
    name: text.length > 35 ? text.slice(0, 32) + '…' : text,
    emoji: '🎁',
    description: 'Custom indulgence — paid in XP.',
    cost,
    passParent: 'breaking', passSub: 'screen',
    reasoning: 'Estimated by length (no AI available).',
  };
}

export async function priceCustomItem(text: string): Promise<CustomItemPrice> {
  const taxonomy = CATEGORIES.map(p => `- ${p.id}: ${p.subs.map(s => s.id).join(', ')}`).join('\n');
  const system = `You are SAGE, HabitQuest's shopkeeper. The user is inventing a custom "indulgence pass":
something they want to do guilt-free. They pay XP up-front to buy it; using it later logs as
neutral (no penalty, no combo break). Price it like a fair tax on the indulgence.

CATEGORIES (parent -> subs):
${taxonomy}

PRICING (rough scale, lean toward the LOWER end if unsure):
  15..35   — mild: snack, short scroll, 30-min break, light treat
  35..70   — moderate: movie night, takeout, 1h gaming, sleep-in, dessert
  70..120  — heavy: full cheat day, no-workout week, 4h+ binge, vacation laziness
  120..200 — extreme: multi-day skip, week-long cheat

RULES:
- Pick parent/sub where this would normally hurt progress (often "breaking", "health", or "creative" for hobbies).
- One emoji that fits the indulgence specifically (not generic 🎁).
- Name is short, witty, past/present-tense ("Big Mac Run", "Couch Marathon" not "I want to watch TV").
- Description: 1 punchy sentence, max 14 words.
- Reasoning: 1 short clause explaining the price scale.

OUTPUT — strict JSON, no markdown:
{"name":"2-4 words","emoji":"single emoji","description":"1 short sentence","cost": integer, "parent_id":"...","sub_id":"...","reasoning":"<=12 words"}

FEW-SHOT:
Input: "Order McDonald's for dinner tonight"
Output: {"name":"Big Mac Run","emoji":"🍟","description":"One fast-food dinner, fully expensed.","cost":45,"parent_id":"health","sub_id":"nutrition","reasoning":"Moderate indulgence, single meal"}

Input: "Watch a 3 hour movie tonight"
Output: {"name":"Couch Cinema","emoji":"🎬","description":"Three hours of guilt-free screen time.","cost":55,"parent_id":"creative","sub_id":"music","reasoning":"Long but enjoyable, no harm done"}

Input: "Skip my workout for the whole week"
Output: {"name":"Rest Week","emoji":"🛌","description":"Seven days off training, no streak guilt.","cost":140,"parent_id":"health","sub_id":"fitness","reasoning":"Heavy — costs real momentum"}`;

  const parsed = await chat(system, text, { temperature: 0.5, max_tokens: 200 });
  if (!parsed) return defaultPrice(text);

  const parent = CAT_BY_ID[parsed.parent_id];
  const sub = parent?.subs.find(s => s.id === parsed.sub_id);
  const cost = Math.max(10, Math.min(200, Math.round(Number(parsed.cost) || 30)));
  return {
    name: String(parsed.name || text).slice(0, 40) || 'Custom Pass',
    emoji: String(parsed.emoji || '🎁').slice(0, 4),
    description: String(parsed.description || 'Custom indulgence — paid in XP.').slice(0, 140),
    cost,
    passParent: parent?.id || 'breaking',
    passSub: sub?.id || 'screen',
    reasoning: String(parsed.reasoning || '').slice(0, 160),
  };
}

// ─── AI Daily Challenge ────────────────────────────────────────────────
export type AiChallenge = {
  title: string;
  description: string;
  emoji: string;
  xpReward: number;
};

export async function generateDailyChallenge(memoryContext: string): Promise<AiChallenge> {
  const fallback: AiChallenge = {
    title: 'Daily Spark',
    description: 'Log any positive action that pushes you forward today.',
    emoji: '✨', xpReward: 35,
  };
  if (!memoryContext) return fallback;

  const system = `You are SAGE, HabitQuest's quest designer. Read the user's pattern profile and invent ONE
short, doable, encouraging challenge for TODAY.

RULES:
- Achievable in under 60 minutes today.
- Either build on a frequent win (stack the streak) OR target a recurring slip (recovery rep).
- Playful and specific — reference the user's actual pattern, not generic advice.
- xpReward: 30 (gentle), 50 (meaty), 80 (push). Match difficulty to challenge size.
- Title: 2-4 words, action-oriented ("Quiet Mind Rep", not "Meditate today").
- Description: 1 short sentence, exactly what to do.
- Emoji: one that matches the action.

OUTPUT — strict JSON, no markdown:
{"title":"2-4 words","description":"1 sentence what to do","emoji":"single emoji","xpReward": integer}

FEW-SHOT:
User profile: "Frequent wins: meditation (5x), reading (3x). Slips: doomscroll (2x). Peak hour: 7:00."
Output: {"title":"Quiet Mind Streak","description":"Add a 4th meditation rep this week — 10 minutes is enough.","emoji":"🧘","xpReward":50}

User profile: "Frequent wins: fitness (8x). Slips: junk food (3x), screen (2x)."
Output: {"title":"Snack Swap","description":"Replace tonight's junk craving with fruit or nuts and log it.","emoji":"🥗","xpReward":50}

User profile: "New user, no data yet."
Output: {"title":"Daily Spark","description":"Log any one positive action — reading, walking, or a chore done.","emoji":"✨","xpReward":35}`;

  const parsed = await chat(system, memoryContext, { temperature: 0.85, max_tokens: 160 });
  if (!parsed?.title) return fallback;
  return {
    title: String(parsed.title).slice(0, 40),
    description: String(parsed.description || '').slice(0, 160),
    emoji: String(parsed.emoji || '✨').slice(0, 4),
    xpReward: Math.max(15, Math.min(120, Math.round(Number(parsed.xpReward) || 40))),
  };
}

// ─── Wisdom observations ───────────────────────────────────────────────
export async function generateWisdom(memoryContext: string): Promise<string[]> {
  const fallback = ['Log a few more entries — I need data to find your patterns.'];
  if (!memoryContext) return fallback;

  const system = `You are SAGE, HabitQuest's pattern oracle. Read the user's profile and write 3 short observations.

RULES per observation:
- 1 sentence, MAX 16 words.
- Specific — cite a real habit name, hour, or count from the profile (NOT generic).
- Useful — point at one small lever the user could pull next.
- No moralizing, no "you should". Voice is wry and observant.

OUTPUT — strict JSON: {"observations": ["...","...","..."]}

FEW-SHOT:
User profile: "Frequent wins: fitness (8x), reading (5x). Slips: screen (3x). Peak: 7:00."
Output: {"observations":[
"Your 7am window is gold — protect it before notifications hit.",
"Fitness is locked in at 8x; reading is the weaker link, +1 today closes it.",
"Three screen slips this week — try parking the phone in another room."
]}`;

  const parsed = await chat(system, memoryContext, { temperature: 0.7, max_tokens: 220 });
  if (Array.isArray(parsed?.observations) && parsed.observations.length) {
    return parsed.observations.slice(0, 3).map((x: any) => String(x).slice(0, 160));
  }
  return fallback;
}
