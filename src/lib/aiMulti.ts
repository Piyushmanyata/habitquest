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

// Phrases we explicitly forbid in AI quips. If the model echoes one, we
// regenerate locally so the user sees something contextual instead.
const FORBIDDEN_QUIP_RE = /(boss[- ]?tier behavior|past you is jealous|body said thanks|compound interest,?\s*alive|algorithm thanks you for your service|inner gremlin:?\s*fed|rough rep[- ]?next set|logged\.?\s*next\.?|on the board\.?|quiet mind,?\s*loud results)/i;

function contextualFallbackQuip(title: string, sentiment: string): string {
  const t = title.toLowerCase();
  const grab = (re: RegExp) => { const m = title.match(re); return m ? m[0] : null; };
  const num = grab(/\d+\s*(?:min|mins|minute|minutes|hour|hours|hr|hrs|km|miles|mi|pages|reps|sets)?/i);

  if (sentiment === 'positive') {
    if (num)              return `${num[0].toUpperCase()}${num.slice(1)} done — that counts.`;
    if (/run|ran|jog/.test(t))      return 'Every step compounded. Filed.';
    if (/read|book|pages?/.test(t)) return 'Pages turned, brain fed. Stack it.';
    if (/gym|lift|workout/.test(t)) return 'Iron moved. Tomorrow notices.';
    if (/meditat/.test(t))           return 'A quiet rep is still a rep.';
    if (/call|text|message/.test(t))return 'Connection > content. Banked.';
    if (/cook|meal|ate/.test(t))    return 'Real food, real fuel.';
    return `"${title}" — banked into the long version of you.`;
  }
  if (sentiment === 'negative') {
    if (/tiktok|scroll|reels|shorts/.test(t)) return 'The feed wins this round. Reroll soon.';
    if (/junk|chips|sugar|soda|pizza/.test(t)) return 'A sweet hit now, a quiet regret later.';
    if (/smoke|vape|drink|alcohol/.test(t)) return 'Borrowing from tomorrow at terrible rates.';
    if (/skip|missed|didn't|didnt/.test(t)) return 'A skipped rep is a story you can still rewrite.';
    if (/lazy|nap|slept in/.test(t)) return 'Couch claimed the round. Get up next one.';
    return `Slip logged: "${title}" — no shame, just data.`;
  }
  return `"${title}" — counted, quietly.`;
}

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
  const emotion = typeof raw.emotion === 'string' && raw.emotion.length < 20 ? raw.emotion : undefined;
  const emotionIntensity = Number.isFinite(Number(raw.emotion_intensity))
    ? clamp(Math.round(Number(raw.emotion_intensity)), 1, 3)
    : undefined;
  const reflection = typeof raw.reflection === 'string' && raw.reflection.trim().length > 0
    ? String(raw.reflection).slice(0, 240)
    : undefined;

  const title = String(raw.title || '').slice(0, 80) || originalText.slice(0, 60);
  let quip = String(raw.quip || '').slice(0, 140);
  // If the model emitted a banned cliche, swap it for a contextual line.
  if (!quip || FORBIDDEN_QUIP_RE.test(quip)) quip = contextualFallbackQuip(title, sentiment);

  return {
    parentId: parent.id, subId: sub.id, sentiment, intensity, xpDelta,
    title,
    reasoning: String(raw.reasoning || '').slice(0, 200),
    quip,
    tone, source: 'ai' as const,
    emotion, emotionIntensity, reflection,
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
  positive (grew the user)       xp = +(5 + intensity*7)  -> +12..+40
  negative (cheap dopamine slip) xp = -(3 + intensity*4)  -> -7..-23  ← intentionally soft so users still log honestly
  neutral                        xp in -3..+3

EMOTION (REQUIRED — pick one from this exact list, never invent new ones):
  pleasant-high: joy, pride, energized, focused
  pleasant-low:  calm, gratitude
  unpleasant-high: anxious, frustrated
  unpleasant-low:  shame, lonely, tired
  neutral:       bored, neutral
emotion_intensity: 1..3 (faint / clear / strong)

REFLECTION (OPTIONAL):
  If the user wrote a thought, feeling, or self-observation alongside the action, EXTRACT it as a short reflection.
  - Past-tense, ≤22 words.
  - Use their own words/voice where possible.
  - If they didn't reflect, OMIT the field entirely (don't invent).

QUIP — STRICTLY PERSONAL (≤90 chars). MUST reference something specific from THIS user's entry: the activity, the duration, the object, the time of day, or a feeling they wrote. Re-use of stock phrases is failure.

FORBIDDEN — these phrases are banned everywhere in your output:
  "Boss-tier behavior", "Past you is jealous", "Body said thanks", "Compound interest, alive",
  "The algorithm thanks you for your service", "Inner gremlin: fed", "Rough rep — next set?",
  "Logged. Next.", "On the board.", "Quiet mind, loud results."
Don't paraphrase them either. Write a NEW line that names what they actually did.

GOOD positive quips (note how each names the actual action):
  Entry: "ran 5km in park"        -> "Five clean kilometres before most people opened their eyes."
  Entry: "studied calculus 1h"    -> "An hour staring down derivatives — chapter pays interest."
  Entry: "cooked dinner with kids"-> "Kitchen chaos beats takeout every time."
  Entry: "called dad after weeks" -> "Three weeks of silence broken in one phone call."

GOOD negative quips (light roast, references the slip):
  Entry: "scrolled tiktok 2h"   -> "Two hours of vertical video; the FYP wins this round."
  Entry: "skipped gym again"    -> "Third gym skip this week — the dumbbells are forming opinions."
  Entry: "ate whole pizza"      -> "A whole pizza solo is a confession, not a meal."
  Entry: "stayed up till 3am"   -> "3am bedtime — tomorrow you is filing a complaint."

GOOD neutral quips:
  Entry: "had a sandwich"   -> "Sandwich logged. Calories accounted for."
  Entry: "took a shower"    -> "Shower done. Reset button pressed."

TITLE: past-tense, 2-5 words, no filler.
TONE: cheer | hype | roast | wry | gentle | sass

OUTPUT — strict JSON, single object with field "entries" (array). No markdown.
{"entries":[
  {
    "parent_id": "...",
    "sub_id": "...",
    "sentiment": "positive|negative|neutral",
    "intensity": 1-5,
    "xp_delta": signed int,
    "title": "Past-tense 2-5 words",
    "reasoning": "≤14 words",
    "quip": "in-character reaction",
    "tone": "cheer|hype|roast|wry|gentle|sass",
    "emotion": "one of the allowed ids",
    "emotion_intensity": 1-3,
    "reflection": "optional, only if the user wrote a thought"
  }
]}

FULL FEW-SHOT (note the quips name specific words from each entry):

Input: "ran 5km in the park this morning, felt amazing afterward, my head finally cleared"
Output: {"entries":[{
  "parent_id":"health","sub_id":"fitness","sentiment":"positive","intensity":4,"xp_delta":33,
  "title":"Ran 5km","reasoning":"Solid morning cardio","quip":"Five clean kilometres while the city was still yawning.","tone":"hype",
  "emotion":"energized","emotion_intensity":3,
  "reflection":"Head finally cleared after the run."
}]}

Input: "went to gym 45 min and read 30 pages and then doom-scrolled tiktok 1h. felt ashamed at the end"
Output: {"entries":[
{"parent_id":"health","sub_id":"fitness","sentiment":"positive","intensity":3,"xp_delta":26,
 "title":"Gym 45 min","reasoning":"Full-effort lifting block","quip":"Forty-five minutes under iron — that's tomorrow's strength compounding.","tone":"cheer",
 "emotion":"pride","emotion_intensity":2},
{"parent_id":"mastery","sub_id":"reading","sentiment":"positive","intensity":3,"xp_delta":26,
 "title":"Read 30 pages","reasoning":"Meaningful reading block","quip":"Thirty pages closer to the version of you who finishes the book.","tone":"cheer",
 "emotion":"focused","emotion_intensity":2},
{"parent_id":"breaking","sub_id":"screen","sentiment":"negative","intensity":3,"xp_delta":-15,
 "title":"Scrolled TikTok 1h","reasoning":"Long passive screen block","quip":"One hour of TikTok — the FYP got fed, your project starved.","tone":"roast",
 "emotion":"shame","emotion_intensity":2,
 "reflection":"Felt ashamed at the end."}
]}

Input: "meditated 10 min. felt calm and present for the first time today."
Output: {"entries":[{
  "parent_id":"mind","sub_id":"meditation","sentiment":"positive","intensity":1,"xp_delta":12,
  "title":"Meditated 10 min","reasoning":"Short, daily-quality rep","quip":"Ten minutes still — the first sliver of presence in the day.","tone":"cheer",
  "emotion":"calm","emotion_intensity":3,
  "reflection":"First moment of presence all day."
}]}

Input: "ate a whole pizza alone"
Output: {"entries":[{
  "parent_id":"health","sub_id":"nutrition","sentiment":"negative","intensity":2,"xp_delta":-11,
  "title":"Whole pizza solo","reasoning":"Indulgence without a pass","quip":"A whole pie, solo — that's a confession, not a meal.","tone":"sass",
  "emotion":"shame","emotion_intensity":2
}]}

Input: "called grandma after weeks of silence"
Output: {"entries":[{
  "parent_id":"social","sub_id":"family","sentiment":"positive","intensity":2,"xp_delta":19,
  "title":"Called grandma","reasoning":"Long-overdue reconnection","quip":"Weeks of silence — broken by the bravest button on your phone.","tone":"gentle",
  "emotion":"gratitude","emotion_intensity":3
}]}`;
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
          temperature: 0.9, max_tokens: 800,
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
