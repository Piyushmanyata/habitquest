// Quick "what should I log next?" suggestions driven by memory + time of day.

import { callJsonCompletion, getStoredApiKey } from './aiClient';

const HOUR_BUCKET = (h: number) =>
  h < 5 ? 'late-night' :
  h < 10 ? 'morning' :
  h < 13 ? 'late morning' :
  h < 17 ? 'afternoon' :
  h < 21 ? 'evening' :
           'night';

function localFallback(memoryContext: string): string[] {
  // very simple: pull a few categories the user frequently does positively
  const m = memoryContext.match(/Frequent wins: ([^\n]+)/i);
  const wins = m ? m[1].split(',').map(s => s.trim().replace(/\s*\([^)]+\)$/, '')) : [];
  const seeds = wins.length
    ? wins.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1))
    : ['Drank water', '10-minute walk', '15-min focused work'];
  return seeds;
}

/** Returns 3 short, ready-to-log suggestion strings tailored to the user. */
export async function suggestEntries(memoryContext: string): Promise<string[]> {
  const apiKey = getStoredApiKey();
  if (!apiKey) return localFallback(memoryContext);

  const hour = new Date().getHours();
  const bucket = HOUR_BUCKET(hour);

  const system = `You are SAGE, HabitQuest's nudge AI. Suggest 3 SHORT entries the user could log RIGHT NOW.

RULES:
- Each suggestion = exactly what they'd type to journal it (past-tense or imperative, 3-7 words).
- Strongly biased by the user's pattern below.
- Time-of-day aware (it is ${bucket}, ${hour}:00).
- Mix: 2 build-the-streak ideas + 1 fresh/recovery idea.
- Specific to known habits; do not invent new ones the user hasn't done.
- NO emojis, NO punctuation at the end.

OUTPUT — strict JSON only:
{"suggestions": ["...","...","..."]}

FEW-SHOT:
User profile: "Frequent wins: meditation (5x), reading (3x), fitness (2x). Slips: screen (2x). Peak hour: 8:00."
Time: morning, 8:00
Output: {"suggestions":["Meditated 10 minutes","Read 15 pages","Phone in another room for 1 hour"]}`;

  const parsed = await callJsonCompletion({
    apiKey,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: memoryContext || 'New user, no pattern data yet.' },
    ],
    temperature: 0.7,
    maxTokens: 160,
    responseFormat: true,
  });
  if (Array.isArray(parsed?.suggestions) && parsed.suggestions.length) {
    return parsed.suggestions.slice(0, 3).map((x: any) => String(x).slice(0, 80));
  }
  return localFallback(memoryContext);
}
