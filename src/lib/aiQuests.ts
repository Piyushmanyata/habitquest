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

  const system = `You are SAGE, HabitQuest's quest designer. Look at the user's LAST FEW journal entries and invent ONE bonus quest they could realistically do TODAY based on what they're already engaged with.

RULES:
- Build on a momentum the user just showed (just did the gym? quest = "stack 15 more minutes of stretching") OR address a fresh slip you just saw.
- Achievable in under 60 minutes.
- Title 2-4 words, ACTION-oriented.
- Description: 1 short sentence, exactly what to do (12 words max).
- Emoji: matches the action.
- xpReward 30 (easy bonus), 50 (meaty), 80 (push).
- Do NOT repeat one of the entries verbatim — extend or counter them.

OUTPUT — strict JSON, no markdown:
{"title":"2-4 words","description":"1 short sentence","emoji":"single emoji","xpReward": integer}

FEW-SHOT:
Recent: - "Crushed weightlifting session" [positive, health]
Output: {"title":"Cool-Down Rep","description":"Add a 10-minute stretch session to lock in today's gains.","emoji":"🧘","xpReward":35}

Recent: - "Doom-scrolled TikTok" [negative, breaking]
Output: {"title":"Phone Exile","description":"Park your phone in another room for the next 90 minutes.","emoji":"📵","xpReward":50}`;

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
          temperature: 0.85,
          max_tokens: 200,
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
