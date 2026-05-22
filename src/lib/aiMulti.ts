// Multi-entry analyzer: takes free-form journal text that may contain multiple
// actions and returns an array of independently-scored analyses, in order.

import { FREE_MODELS } from './ai';
import type { EntryAnalysis, ReactionTone } from './ai';
import { CATEGORIES, CAT_BY_ID } from './categories';
import { heuristicAnalyze } from './heuristic';

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

const ALLOWED_TONES: ReactionTone[] = ['cheer','hype','roast','wry','gentle','sass'];
function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

function validateOne(raw: any, originalText: string): EntryAnalysis | null {
  if (!raw || typeof raw !== 'object') return null;
  const parent = CAT_BY_ID[raw.parent_id];
  if (!parent) return null;
  const sub = parent.subs.find(s => s.id === raw.sub_id);
  if (!sub) return null;
  const sentiment = raw.sentiment === 'positive' || raw.sentiment === 'negative' ? raw.sentiment : 'neutral';
  const intensity = clamp(Math.round(Number(raw.intensity) || 1), 1, 5);
  let xpDelta = Math.round(Number(raw.xp_delta));
  if (!Number.isFinite(xpDelta)) {
    xpDelta = sentiment === 'positive' ? intensity * 8 : sentiment === 'negative' ? -intensity * 8 : 2;
  }
  xpDelta = clamp(xpDelta, -60, 60);
  if (sentiment === 'positive' && xpDelta < 0) xpDelta = Math.abs(xpDelta);
  if (sentiment === 'negative' && xpDelta > 0) xpDelta = -Math.abs(xpDelta);
  const tone: ReactionTone = ALLOWED_TONES.includes(raw.tone) ? raw.tone
    : sentiment === 'positive' ? 'cheer' : sentiment === 'negative' ? 'roast' : 'wry';
  return {
    parentId: parent.id, subId: sub.id, sentiment, intensity, xpDelta,
    title: String(raw.title || '').slice(0, 80) || originalText.slice(0, 60),
    reasoning: String(raw.reasoning || '').slice(0, 200),
    quip: String(raw.quip || '').slice(0, 140),
    tone, source: 'ai' as const,
  };
}

function buildMultiPrompt(memoryContext?: string) {
  const taxonomy = CATEGORIES.map(p =>
    `- ${p.id} (${p.name}): ${p.subs.map(s => `${s.id} (${s.name})`).join(', ')}`
  ).join('\n');

  const memBlock = memoryContext
    ? '\n' + memoryContext + '\n(Use this context silently; never echo it back.)\n'
    : '';

  return `You are SAGE, HabitQuest's AI mind. The user is journaling. They may log ONE thing or MULTIPLE distinct actions in a single message.

YOUR JOB: Split the message into separate actions, classify and score EACH one independently, return an array.

CATEGORIES (parent_id -> sub_ids):
${taxonomy}
${memBlock}
SPLITTING RULES:
- A "distinct action" is one self-contained activity with its own outcome (a workout, a meal, a scroll session, a study block, a phone call).
- Separators that usually start a new action: "and then", "after that", ",", ".", ";", numbered lists ("1.", "2."), bullet points, " also ", " plus ".
- DON'T over-split adverbial details ("ran 5km in the park" is ONE action, not "ran 5km" + "in the park").
- Order the array by the order the actions happened in the message.
- If there's truly only one action, return a single-element array.
- Max 6 entries per message.

PER-ENTRY SCORING:
INTENSITY 1..5: 1=token (5min walk), 2=small (15min), 3=moderate (30-45min), 4=heavy (1h+), 5=epic (multi-hour milestone)
SENTIMENT + XP:
  positive (grew the user)      xp = +(5 + intensity*7)  -> +12..+40
  negative (cheap dopamine slip) xp = -(5 + intensity*7)  -> -12..-40
  neutral                        xp in -3..+3

QUIP STYLE (<=90 chars, Sage's voice — never generic, never sycophantic):
  positive: "Past you is jealous." | "Compound interest, alive." | "Body said thanks." | "Boss-tier behavior."
  negative: "The algorithm thanks you for your service." | "Inner gremlin: fed. Refund?" | "Rough rep — next set?"
  neutral:  "Logged. Next." | "On the board."

TITLE: past-tense, 2-5 words, no filler.
TONE: cheer | hype | roast | wry | gentle | sass

OUTPUT — strict JSON, single object whose ONLY field is "entries" (array). No markdown.
{"entries":[
  {"parent_id":"...","sub_id":"...","sentiment":"positive|negative|neutral","intensity":1-5,"xp_delta": signed int, "title":"...","reasoning":"<=14 words","quip":"...","tone":"cheer|hype|roast|wry|gentle|sass"}
]}

FEW-SHOT:

Input: "ran 5km in the park this morning"
Output: {"entries":[{"parent_id":"health","sub_id":"fitness","sentiment":"positive","intensity":4,"xp_delta":33,"title":"Ran 5km","reasoning":"Solid morning cardio","quip":"Past you is jealous.","tone":"hype"}]}

Input: "went to gym and read 30 pages and then doom-scrolled for 1 hour"
Output: {"entries":[
{"parent_id":"health","sub_id":"fitness","sentiment":"positive","intensity":3,"xp_delta":26,"title":"Gym session","reasoning":"Strength training, full effort","quip":"Body said thanks.","tone":"cheer"},
{"parent_id":"mastery","sub_id":"reading","sentiment":"positive","intensity":3,"xp_delta":26,"title":"Read 30 pages","reasoning":"Meaningful reading block","quip":"Compound interest, alive.","tone":"cheer"},
{"parent_id":"breaking","sub_id":"screen","sentiment":"negative","intensity":3,"xp_delta":-26,"title":"Scrolled 1 hour","reasoning":"Whole hour to the algorithm","quip":"The algorithm thanks you for your service.","tone":"roast"}
]}

Input: "meditated 10 minutes. ate a cheat meal. called mom."
Output: {"entries":[
{"parent_id":"mind","sub_id":"meditation","sentiment":"positive","intensity":1,"xp_delta":12,"title":"Meditated 10 min","reasoning":"Short, daily-quality rep","quip":"Quiet mind, loud results.","tone":"cheer"},
{"parent_id":"health","sub_id":"nutrition","sentiment":"negative","intensity":3,"xp_delta":-26,"title":"Ate cheat meal","reasoning":"Indulgent meal, no pass used","quip":"Tomorrow's salad is plotting revenge.","tone":"sass"},
{"parent_id":"social","sub_id":"family","sentiment":"positive","intensity":2,"xp_delta":19,"title":"Called mom","reasoning":"Real connection, no scrolling","quip":"Bonds are XP too.","tone":"gentle"}
]}`;
}

async function callWithFallback(system: string, user: string): Promise<any | null> {
  const apiKey = getKey();
  if (!apiKey) return null;
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
            { role: 'user', content: user },
          ],
          temperature: 0.6, max_tokens: 700,
          response_format: { type: 'json_object' },
        }),
      });
      if (!res.ok) { if (res.status === 429 || res.status === 404) continue; throw new Error('AI ' + res.status); }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? '';
      const parsed = extractJson(content);
      if (parsed) return parsed;
    } catch (err) {
      console.warn('[aiMulti] try failed:', model, err);
      continue;
    }
  }
  return null;
}

// Heuristic splitter for fallback / instant pre-render
function splitTextHeuristic(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  if (t.length < 60 || !/[.;,\n]| then | and then | plus | also /i.test(t)) return [t];

  const parts = t
    .split(/\n+|(?:\.\s+(?=[A-Z]))|(?:;\s*)|(?:\s+then\s+)|(?:\s+and then\s+)|(?:\s+plus\s+)|(?:\s+also\s+)|(?:\s*,\s+)/i)
    .map(s => s.trim())
    // strip leading conjunctions
    .map(s => s.replace(/^(?:and|then|also|plus|but|so|or)\s+/i, '').trim())
    // drop empty / tiny / pure-conjunction fragments
    .filter(s => s.length >= 8 && !/^(and|then|also|plus|but|so|or)\s*$/i.test(s));

  return parts.slice(0, 6);
}

export function splitForHeuristic(text: string): string[] {
  return splitTextHeuristic(text);
}

function pickArrayFrom(parsed: any): any[] | null {
  if (!parsed) return null;
  if (Array.isArray(parsed)) return parsed;
  for (const k of ['entries', 'results', 'items', 'actions', 'data']) {
    if (Array.isArray(parsed[k])) return parsed[k];
  }
  // If parsed itself looks like a single entry, wrap it.
  if (typeof parsed.parent_id === 'string' && typeof parsed.sub_id === 'string') return [parsed];
  return null;
}

export async function analyzeMultiEntries(text: string, opts?: { memoryContext?: string }): Promise<EntryAnalysis[]> {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const parsed = await callWithFallback(buildMultiPrompt(opts?.memoryContext), trimmed);
  const arr = pickArrayFrom(parsed);
  if (arr) {
    const items = arr.map((r: any) => validateOne(r, trimmed)).filter(Boolean) as EntryAnalysis[];
    if (items.length) return items.slice(0, 6);
    console.warn('[aiMulti] AI returned array but no valid entries:', parsed);
  } else if (parsed) {
    console.warn('[aiMulti] AI response shape unexpected:', parsed);
  }
  // Heuristic fallback: split and run heuristic on each part.
  const parts = splitTextHeuristic(trimmed);
  return parts.map(p => heuristicAnalyze(p));
}
