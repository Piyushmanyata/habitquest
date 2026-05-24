// AI-generated quest suggestions based on recent journal entries.
// Designed to give the user fresh, contextual goals as they log.

import { FREE_MODELS } from './ai';
import type { Quest } from './gamification';

const DEEPSEEK_URL   = 'https://api.deepseek.com/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function getKey() {
  if (typeof localStorage === 'undefined') return '';
  return (
    localStorage.getItem('hq-openrouter-key') ||
    localStorage.getItem('hq-deepseek-key') ||
    (import.meta as any).env?.VITE_OPENROUTER_KEY ||
    (import.meta as any).env?.VITE_DEEPSEEK_KEY ||
    ''
  );
}
function getSelectedModel() {
  if (typeof localStorage === 'undefined') return FREE_MODELS[0].id;
  return localStorage.getItem('hq-model') || FREE_MODELS[0].id;
}
function pickProvider(key: string) {
  if (key.startsWith('sk-or-')) {
    return {
      url: OPENROUTER_URL, model: getSelectedModel(),
      extraHeaders: { 'HTTP-Referer': location.origin, 'X-Title': 'HabitQuest' } as Record<string,string>,
      providerName: 'openrouter' as const,
    };
  }
  return { url: DEEPSEEK_URL, model: 'deepseek-chat', extraHeaders: {} as Record<string,string>, providerName: 'deepseek' as const };
}
function extractJson(text: string): any | null {
  try { return JSON.parse(text); } catch {}
  const f = text.match(/```(?:json)?\s*([\s\S]+?)```/i); if (f) { try { return JSON.parse(f[1]); } catch {} }
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch {} }
  return null;
}

export type RecentEntry = { title: string; sentiment: string; parentId: string };

export async function suggestQuestFromRecent(recent: RecentEntry[], dayKey: string): Promise<Quest | null> {
  const apiKey = getKey();
  if (!apiKey || recent.length === 0) return null;

  const list = recent.slice(0, 8).map(e =>
    `- "${e.title}" [${e.sentiment}, ${e.parentId}]`
  ).join('\n');

  const system = `You are SAGE, HabitQuest's quest designer. Look at the user's LAST FEW journal entries and invent ONE bonus quest they could realistically do TODAY, grounded in what just happened.

═══════════════════════════════════════════════════════════════════════
QUEST ARCHETYPES — pick the BEST fit for the recent pattern:
═══════════════════════════════════════════════════════════════════════
1. STACK   — extend a fresh positive ("just ran 5km" → "Walk 15 min to cool down")
2. COUNTER — answer a fresh slip ("scrolled 1h tiktok" → "Phone-free 60 min")
3. CHAIN   — combine two adjacent wins ("read + meditated" → "Journal one paragraph about what you read")
4. WINDOW  — do something specific within the next 1-3 hours ("Hydrate + walk before 4pm")
5. CONTRAST — break out of a pattern Sage notices ("3 sedentary entries in a row" → "20-min walk now")
6. RITUAL  — anchor a new habit cue ("first thing tomorrow: 5 pushups before coffee")
7. RECOVERY — restorative response to fatigue/stress ("tired" → "10-min lie-down with no screen")
8. CONNECT — a 5-min relationship action when social has been silent
9. CRAFT   — single rep of skill practice when creative/mastery is dormant

═══════════════════════════════════════════════════════════════════════
RULES:
═══════════════════════════════════════════════════════════════════════
- Achievable in under 60 minutes.
- Title 2-4 words, ACTION verb first ("Cool-Down Rep" not "Cool-down").
- Description: 1 short sentence (12 words max), EXACTLY what to do — concrete, measurable.
- Emoji matches the action.
- xpReward: 25 (easy refresh), 45 (meaty), 65 (push), 85 (real challenge).
- Do NOT repeat a recent entry verbatim — extend, counter, or pivot off it.
- AVOID generic clichés like "Be mindful" or "Stay focused" — quests must be specific actions.

═══════════════════════════════════════════════════════════════════════
OUTPUT — strict JSON, no markdown:
═══════════════════════════════════════════════════════════════════════
{"title":"2-4 words","description":"1 short sentence ≤12 words","emoji":"single emoji","xpReward": integer}

═══════════════════════════════════════════════════════════════════════
FEW-SHOT (study how the quest grounds in the entry):
═══════════════════════════════════════════════════════════════════════

Recent:
- "Crushed weightlifting session" [positive, health]
Output: {"title":"Cool-Down Rep","description":"Stretch hamstrings + quads for 8 minutes right now.","emoji":"🧘","xpReward":35}

Recent:
- "Doom-scrolled TikTok 1h" [negative, breaking]
Output: {"title":"Phone Exile","description":"Lock phone in another room for 60 minutes.","emoji":"📵","xpReward":50}

Recent:
- "Read 30 pages" [positive, mastery]
- "Felt focused" [positive, mind]
Output: {"title":"Mark The Page","description":"Write 2 sentences about what stood out from those pages.","emoji":"✏️","xpReward":40}

Recent:
- "Ate pizza alone" [negative, breaking]
- "Skipped gym" [negative, health]
Output: {"title":"Counter-Move","description":"Drink water + do 15 squats — undo two slips with one win.","emoji":"💧","xpReward":45}

Recent:
- "Tired all morning" [negative, health]
- "Stayed up till 2am" [negative, health]
Output: {"title":"Twenty-Min Reset","description":"Lie down screens-off for 20 minutes — recover the day.","emoji":"😴","xpReward":35}

Recent:
- "Called grandma" [positive, social]
Output: {"title":"Chain Connect","description":"Text one other family member with a real check-in question.","emoji":"💬","xpReward":40}

Recent:
- "Deep work 90 min" [positive, work]
- "Meditated 10 min" [positive, mind]
Output: {"title":"Body Rep","description":"Walk outside for 15 minutes — give the brain oxygen.","emoji":"🚶","xpReward":45}

Recent:
- "Played guitar 30 min" [positive, creative]
Output: {"title":"One More Riff","description":"Practice the part that broke down — slow, 5 reps.","emoji":"🎸","xpReward":40}

Recent:
- "Hit snooze 4 times" [negative, health]
Output: {"title":"Tonight's Anchor","description":"Set phone to charge outside the bedroom by 10:30 pm.","emoji":"🌙","xpReward":50}`;

  const prov = pickProvider(apiKey);
  const tryOrder = prov.providerName === 'openrouter'
    ? [prov.model, ...FREE_MODELS.map(m => m.id).filter(id => id !== prov.model)]
    : [prov.model];

  for (const model of tryOrder) {
    try {
      const res = await fetch(prov.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...prov.extraHeaders },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: list },
          ],
          // Mid temperature — variety on archetype + emoji, locked on JSON shape.
          temperature: 0.7,
          max_tokens: 240,
          response_format: { type: 'json_object' },
        }),
      });
      if (!res.ok) { if (res.status === 429 || res.status === 404) continue; throw new Error('AI ' + res.status); }
      const data = await res.json();
      const parsed = extractJson(data?.choices?.[0]?.message?.content || '');
      if (!parsed?.title) continue;
      const quest: Quest = {
        id: `${dayKey}-ai-${Date.now()}`,
        kind: 'complete_n_habits', // we evaluate it manually via "Did it" button (no auto-progress)
        title: String(parsed.title).slice(0, 40),
        description: String(parsed.description || '').slice(0, 160),
        emoji: String(parsed.emoji || '✨').slice(0, 4),
        target: 1,
        progress: 0,
        xpReward: Math.max(15, Math.min(120, Math.round(Number(parsed.xpReward) || 35))),
        completed: false,
        claimed: false,
        dayKey,
      };
      return quest;
    } catch (err) {
      console.warn('[aiQuests] try failed:', model, err);
      continue;
    }
  }
  return null;
}
