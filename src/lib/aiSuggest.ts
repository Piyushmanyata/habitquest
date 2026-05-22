// Quick "what should I log next?" suggestions driven by memory + time of day.

import { FREE_MODELS } from './ai';

const DEEPSEEK_URL  = 'https://api.deepseek.com/chat/completions';
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
      url: OPENROUTER_URL,
      model: getSelectedModel(),
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
  const apiKey = getKey();
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
            { role: 'user', content: memoryContext || 'New user, no pattern data yet.' },
          ],
          temperature: 0.7,
          max_tokens: 160,
          response_format: { type: 'json_object' },
        }),
      });
      if (!res.ok) { if (res.status === 429 || res.status === 404) continue; throw new Error('AI ' + res.status); }
      const data = await res.json();
      const parsed = extractJson(data?.choices?.[0]?.message?.content || '');
      if (Array.isArray(parsed?.suggestions) && parsed.suggestions.length) {
        return parsed.suggestions.slice(0, 3).map((x: any) => String(x).slice(0, 80));
      }
    } catch (err) {
      console.warn('[aiSuggest] try failed:', model, err);
      continue;
    }
  }
  return localFallback(memoryContext);
}
