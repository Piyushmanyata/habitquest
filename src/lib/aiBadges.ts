// Sage mints personalized badges from the user's memory profile.
// Returns AT MOST one new badge per call, with a stable id derived from its content
// so we don't double-mint.

import { callJsonCompletion, getStoredApiKey } from './aiClient';

export type CustomBadge = {
  id: string;          // slug derived from name
  name: string;
  emoji: string;
  description: string; // why earned, ~12 words
  recurring: boolean;  // can be re-earned (e.g. weekly)
  earnedAt: number;
};

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export async function mintCustomBadge(memoryContext: string, existing: CustomBadge[]): Promise<CustomBadge | null> {
  const apiKey = getStoredApiKey();
  if (!apiKey || !memoryContext) return null;

  const existingList = existing.slice(0, 12).map(b => `- ${b.name}: ${b.description}`).join('\n') || '(none yet)';

  const system = `You are SAGE, HabitQuest's badge designer. Look at the user's profile and DECIDE whether they have hit a personal milestone worth a custom badge RIGHT NOW.

RULES:
- Only mint a badge if there's a clear, specific pattern in the profile that the existing badges don't cover.
- If nothing notable, return {"mint": false} and STOP.
- A badge is a personal achievement, not a chore. Name it with personality (e.g., "Crack-of-Dawn Cleric" beats "Early Riser").
- Description: 1 short sentence explaining what they did to earn it (max 14 words). Past or perfect tense.
- One emoji that fits.
- "recurring": true if the badge can be re-earned periodically (e.g., weekly streak); false for one-time achievements.
- DO NOT repeat an existing custom badge.

EXISTING CUSTOM BADGES (do not duplicate):
${existingList}

OUTPUT — strict JSON only:
- If minting: {"mint": true, "name": "Snappy 2-4 words", "emoji": "single emoji", "description": "≤14 words, past tense", "recurring": true|false}
- If not: {"mint": false}

FEW-SHOT:
Profile: "Frequent wins: meditation (12×), reading (8×), fitness (3×). Slips: none recent. Peak: 6:00. Positive ratio: 95%. Active: 11/14 days."
Output: {"mint": true, "name": "Crack-of-Dawn Cleric", "emoji": "🌅", "description": "Logged 12 meditations, mostly before 7am — discipline at sunrise.", "recurring": false}

Profile: "Frequent wins: fitness (4×). Slips: screen (5×). Peak: 22:00. Positive ratio: 44%. Active: 6/14 days."
Output: {"mint": false}`;

  const parsed = await callJsonCompletion({
    apiKey,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: memoryContext },
    ],
    temperature: 0.85,
    maxTokens: 220,
    responseFormat: true,
  });
  if (!parsed || parsed.mint === false || !parsed.name) return null;
  const id = slugify(String(parsed.name));
  if (!id || existing.some(b => b.id === id)) return null;
  return {
    id,
    name: String(parsed.name).slice(0, 50),
    emoji: String(parsed.emoji || '🏅').slice(0, 4),
    description: String(parsed.description || '').slice(0, 160),
    recurring: !!parsed.recurring,
    earnedAt: Date.now(),
  };
}
