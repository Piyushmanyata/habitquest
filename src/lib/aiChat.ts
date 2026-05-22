// Sage chat: a conversational AI grounded in the user's memory + recent entries.
// Always respects the user's tone preference.

import { FREE_MODELS } from './ai';

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
      url: OPENROUTER_URL,
      model: getSelectedModel(),
      extraHeaders: { 'HTTP-Referer': location.origin, 'X-Title': 'HabitQuest' } as Record<string,string>,
      providerName: 'openrouter' as const,
    };
  }
  return { url: DEEPSEEK_URL, model: 'deepseek-chat', extraHeaders: {} as Record<string,string>, providerName: 'deepseek' as const };
}

export type Tone = 'savage' | 'balanced' | 'encouraging';

export function toneDirective(tone: Tone): string {
  if (tone === 'savage') {
    return 'TONE: SAVAGE. Brutally honest, witty, mocks slips with sharp humor, never warm and fuzzy. Punch lines, not pep talks.';
  }
  if (tone === 'encouraging') {
    return 'TONE: ENCOURAGING. Warm, supportive, finds the silver lining, never sarcastic. Make the user feel like they have a coach in their corner.';
  }
  return 'TONE: BALANCED. Half coach, half cheeky dungeon master. Honest and warm in equal measure. Light roasts allowed but always end with belief.';
}

type ChatMsg = { role: 'user' | 'assistant'; content: string };

export async function sendChatMessage(
  messages: ChatMsg[],
  memoryContext: string,
  recentEntries: string,
  tone: Tone,
): Promise<string> {
  const apiKey = getKey();
  const fallback = 'Add a free OpenRouter key in Settings to chat with Sage.';
  if (!apiKey) return fallback;

  const system = `You are SAGE, the AI coach inside HabitQuest. You speak DIRECTLY to one user about their habits, patterns, and what to do next.

${toneDirective(tone)}

GROUND-TRUTH (silently use; never quote back verbatim):
${memoryContext || '(no profile yet)'}

RECENT ENTRIES (most recent first):
${recentEntries || '(no entries yet)'}

RULES:
- Reply in 1-3 short sentences max (under 60 words total).
- Reference SPECIFIC patterns or entries when relevant ("your 3 meditations this week", "you slip after 9pm").
- If asked "what should I do?", give ONE concrete next action — not a list.
- Never moralize. Never use markdown headers or bullet lists.
- If the user is venting, acknowledge first, then offer one small lever.
- You are not a therapist; for serious mental health, suggest professional help in one sentence.`;

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
            ...messages.slice(-8), // keep last 8 turns
          ],
          temperature: 0.8,
          max_tokens: 220,
        }),
      });
      if (!res.ok) { if (res.status === 429 || res.status === 404) continue; throw new Error('AI ' + res.status); }
      const data = await res.json();
      const out = String(data?.choices?.[0]?.message?.content || '').trim();
      if (out) return out;
    } catch (err) {
      console.warn('[aiChat] try failed:', model, err);
      continue;
    }
  }
  return "Sage is rate-limited right now. Try again in a minute.";
}
