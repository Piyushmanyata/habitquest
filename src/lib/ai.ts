// AI-powered journal entry parser — calls DeepSeek's chat API directly.
// https://api.deepseek.com — OpenAI-compatible. Uses the cheapest "deepseek-chat" model.
// Falls back to local heuristic if no key or call fails.

import { CATEGORIES, CAT_BY_ID } from './categories';
import { heuristicAnalyze } from './heuristic';

export type Sentiment = 'positive' | 'negative' | 'neutral';
export type ReactionTone = 'cheer' | 'hype' | 'roast' | 'wry' | 'gentle' | 'sass';

export type EntryAnalysis = {
  parentId: string;
  subId: string;
  sentiment: Sentiment;
  intensity: number;
  xpDelta: number;
  title: string;
  reasoning: string;
  quip: string;            // short witty in-character reaction
  tone: ReactionTone;
  source: 'ai' | 'rules';
};

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

// Curated list of *totally free* OpenRouter models (all end with :free).
// Live IDs verified via /api/v1/models — update if upstream renames.
export const FREE_MODELS: { id: string; label: string; note: string }[] = [
  { id: 'deepseek/deepseek-v4-flash:free',              label: 'DeepSeek V4 Flash',   note: 'Snappy + smart (default)' },
  { id: 'openai/gpt-oss-120b:free',                     label: 'GPT-OSS 120B',        note: 'OpenAI open-source flagship' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free',       label: 'Llama 3.3 70B',       note: 'Solid Meta open-source' },
  { id: 'qwen/qwen3-next-80b-a3b-instruct:free',        label: 'Qwen 3 Next 80B',     note: 'Great at structured output' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free',       label: 'Nemotron 3 120B',     note: 'NVIDIA reasoning' },
  { id: 'google/gemma-4-31b-it:free',                   label: 'Gemma 4 31B',         note: 'Google open-source' },
  { id: 'z-ai/glm-4.5-air:free',                        label: 'GLM 4.5 Air',         note: 'Lightweight' },
];
const DEFAULT_FREE_MODEL = FREE_MODELS[0].id;

function getSelectedModel(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_FREE_MODEL;
  return localStorage.getItem('hq-model') || DEFAULT_FREE_MODEL;
}
export function setSelectedModel(id: string) {
  if (typeof localStorage !== 'undefined') localStorage.setItem('hq-model', id);
}
export function getSelectedModelId() { return getSelectedModel(); }

// OpenRouter keys start with "sk-or-", DeepSeek with "sk-" (no -or-).
function pickProvider(key: string): { url: string; model: string; extraHeaders: Record<string,string>; providerName: string } {
  if (key.startsWith('sk-or-')) {
    return {
      url: OPENROUTER_URL,
      model: getSelectedModel(),
      extraHeaders: { 'HTTP-Referer': typeof location !== 'undefined' ? location.origin : 'https://habitquest.app', 'X-Title': 'HabitQuest' },
      providerName: 'openrouter',
    };
  }
  return { url: DEEPSEEK_URL, model: DEEPSEEK_MODEL, extraHeaders: {}, providerName: 'deepseek' };
}
export function getProviderName(): 'openrouter' | 'deepseek' | 'browser' | 'rules' {
  const key = getKey();
  if (!key) return 'browser';
  return key.startsWith('sk-or-') ? 'openrouter' : 'deepseek';
}

function buildPrompt(memoryContext?: string) {
  const taxonomy = CATEGORIES.map(p =>
    `- ${p.id} (${p.name}): ${p.subs.map(s => `${s.id} (${s.name})`).join(', ')}`
  ).join('\n');

  const memBlock = memoryContext ? `\n${memoryContext}\n` : '';

  return `You are SAGE, HabitQuest's AI mind. Half kind coach, half cheeky dungeon master.
The user just journaled one thing they did. You classify, score, and react — in character, always.

CATEGORIES (parent_id -> sub_ids):
${taxonomy}
${memBlock ? memBlock + '(Use this context silently; never mention it back to the user.)\n' : ''}
INTENSITY RUBRIC (1..5):
  1 token    — 5min walk, glass of water, quick check
  2 small    — 15min reading, short call, light tidy
  3 moderate — 30-45min work, full meal cooked, normal workout
  4 heavy    — 1h+ deep work, long run, real meaningful conversation
  5 epic     — multi-hour project shipped, major milestone, breaking a long-running bad habit

SENTIMENT + XP:
  positive — grew the user (workout, study, meditate, healthy eat, sleep on time, ship work, social bond, breaking a bad habit). xp_delta = +(5 + intensity * 7)  -> +12..+40
  negative — cheap-dopamine-over-real-good (doomscroll, junk binge, smoke/drink, skip training/sleep, procrastinate). xp_delta = -(5 + intensity * 7)  -> -12..-40
  neutral  — ambiguous, minor status updates. xp_delta in -3..+3.

QUIP (<=90 chars, Sage's voice — never generic, never sycophantic):
  positive examples: "Past you is jealous." | "Compound interest, alive." | "Body said thanks." | "Boss-tier behavior."
  negative examples: "The algorithm thanks you for your service." | "Inner gremlin: fed. Refund?" | "Rough rep — next set?"
  neutral examples:  "Logged. Next." | "On the board."

TITLE: past-tense, 2-5 words, no filler ("Ran 5km" not "I went for a run today").
TONE: cheer | hype | roast | wry | gentle | sass

OUTPUT — strict JSON only, no markdown, exact shape:
{"parent_id":"...","sub_id":"...","sentiment":"positive|negative|neutral","intensity":1-5,"xp_delta": signed int, "title":"...","reasoning":"<=14 words","quip":"...","tone":"cheer|hype|roast|wry|gentle|sass"}

FEW-SHOT:
Input: "crushed 45 min weightlift this morning, felt unreal"
Output: {"parent_id":"health","sub_id":"fitness","sentiment":"positive","intensity":4,"xp_delta":33,"title":"Crushed weightlifting session","reasoning":"45m strength block, high effort","quip":"Past you is jealous.","tone":"hype"}

Input: "doom-scrolled tiktok for 2 hours instead of working on my project"
Output: {"parent_id":"breaking","sub_id":"screen","sentiment":"negative","intensity":4,"xp_delta":-33,"title":"Doom-scrolled TikTok","reasoning":"Two hours of avoidance, real focus cost","quip":"The algorithm thanks you for your service.","tone":"roast"}

Input: "drank a glass of water"
Output: {"parent_id":"health","sub_id":"hydration","sentiment":"positive","intensity":1,"xp_delta":12,"title":"Drank water","reasoning":"Small win, still counts","quip":"Drop by drop. Stack it.","tone":"cheer"}`;
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

const ALLOWED_TONES: ReactionTone[] = ['cheer','hype','roast','wry','gentle','sass'];

function validateAndNormalize(raw: any): EntryAnalysis | null {
  if (!raw || typeof raw !== 'object') return null;
  const parent = CAT_BY_ID[raw.parent_id];
  if (!parent) return null;
  const sub = parent.subs.find(s => s.id === raw.sub_id);
  if (!sub) return null;
  const sentiment: Sentiment =
    raw.sentiment === 'positive' || raw.sentiment === 'negative' ? raw.sentiment : 'neutral';
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
    parentId: parent.id,
    subId: sub.id,
    sentiment,
    intensity,
    xpDelta,
    title: String(raw.title || '').slice(0, 80) || 'Logged activity',
    reasoning: String(raw.reasoning || '').slice(0, 200),
    quip: String(raw.quip || '').slice(0, 140),
    tone,
    source: 'ai',
  };
}

function extractJson(text: string): any | null {
  try { return JSON.parse(text); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]+?)```/i);
  if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)); } catch {}
  }
  return null;
}

function getKey(opts?: { apiKey?: string }) {
  return (
    opts?.apiKey ||
    (typeof localStorage !== 'undefined' ? (
      localStorage.getItem('hq-openrouter-key') ||
      localStorage.getItem('hq-deepseek-key') ||
      ''
    ) : '') ||
    ((import.meta as any).env?.VITE_OPENROUTER_KEY as string | undefined) ||
    ((import.meta as any).env?.VITE_DEEPSEEK_KEY as string | undefined) ||
    ''
  );
}

export async function analyzeEntry(text: string, opts?: { apiKey?: string; model?: string; memoryContext?: string }): Promise<EntryAnalysis> {
  const apiKey = getKey(opts);
  // If no key, try the in-browser local AI first; fall back to heuristic.
  if (!apiKey) {
    try {
      const { analyzeLocally, getLocalAIStatus } = await import('./localAI');
      if (getLocalAIStatus().status === 'ready' || getLocalAIStatus().status === 'loading') {
        return await analyzeLocally(text);
      }
      // Fire-and-forget warm-up + heuristic now
      const { warmupLocalAI } = await import('./localAI');
      warmupLocalAI();
    } catch { /* ignore, fall through */ }
    return heuristicAnalyze(text);
  }

  const prov = pickProvider(apiKey);
  // Try selected model, then fall back through the free list on rate-limit/404 errors.
  const tryOrder = prov.providerName === 'openrouter'
    ? [opts?.model || prov.model, ...FREE_MODELS.map(m => m.id).filter(id => id !== (opts?.model || prov.model))]
    : [opts?.model || prov.model];
  for (const model of tryOrder) {
    try {
      const res = await fetch(prov.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...prov.extraHeaders },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: buildPrompt(opts?.memoryContext) },
            { role: 'user', content: text },
          ],
          temperature: 0.7,
          max_tokens: 260,
          response_format: { type: 'json_object' },
        }),
      });
      if (!res.ok) {
        // 429 (rate) / 404 (model gone) → try next; other errors → bail out
        if (res.status === 429 || res.status === 404) continue;
        throw new Error(`AI ${res.status}`);
      }
      const data = await res.json();
      const content: string = data?.choices?.[0]?.message?.content ?? '';
      const parsed = extractJson(content);
      const norm = validateAndNormalize(parsed);
      if (norm) return norm;
      // bad shape — try next
      continue;
    } catch (err) {
      console.warn('[ai] try failed:', model, err);
      continue;
    }
  }
  console.warn('[ai] all free models exhausted — using heuristic');
  return heuristicAnalyze(text);
}

export type BossReport = {
  headline: string;        // one-sentence shape of the day
  trend: string;           // how today compares to recent past
  biggestWin: string;      // named, specific
  biggestSlip: string;     // named, specific, no lecturing
  patternCallout: string;  // a behavioural pattern Sage noticed
  tomorrowMove: string;    // ONE concrete actionable move
};

export async function generateDailyRecap(
  entries: { title: string; sentiment: Sentiment; xpDelta: number; parentId?: string; intensity?: number }[],
  opts?: { apiKey?: string; comparisons?: string; memoryContext?: string }
): Promise<BossReport> {
  const pos = entries.filter(e => e.sentiment === 'positive').length;
  const neg = entries.filter(e => e.sentiment === 'negative').length;
  const net = entries.reduce((a, e) => a + e.xpDelta, 0);

  const fallback = (): BossReport => ({
    headline: entries.length === 0
      ? 'A quiet day. Nothing logged.'
      : `${pos} wins, ${neg} slips, net ${net >= 0 ? '+' : ''}${net} XP.`,
    trend: 'No historical comparison available.',
    biggestWin: entries.find(e => e.sentiment === 'positive')?.title || '—',
    biggestSlip: entries.find(e => e.sentiment === 'negative')?.title || 'None today.',
    patternCallout: 'Log a few more days to spot trends.',
    tomorrowMove: net >= 0 ? 'Keep the streak alive — one positive before noon.' : 'Lead with one strong win first thing.',
  });

  const apiKey = getKey(opts);
  if (!apiKey || entries.length === 0) return fallback();

  const list = entries.map(e =>
    `- "${e.title}" (${e.sentiment}, ${e.xpDelta >= 0 ? '+' : ''}${e.xpDelta} XP${e.parentId ? `, ${e.parentId}` : ''}${e.intensity ? `, i=${e.intensity}` : ''})`
  ).join('\n');

  const system = `You are SAGE, HabitQuest's end-of-day narrator: cheeky, brutally honest, never cruel. Same voice as the in-app quips.
Write a DEEP "Boss Report" that compares today to the user's recent past.

You receive: TODAY's entries, COMPARISON STATS (yesterday/7d/30d averages, shifts), and the user's PROFILE (recurring patterns).

OUTPUT — strict JSON, EXACT shape, no markdown, no preamble:
{
  "headline":         "1 sentence — the shape of today (≤14 words)",
  "trend":            "1 sentence — today vs recent past, cite specific numbers from the stats (≤22 words)",
  "biggestWin":       "1 sentence — name the standout win specifically (≤18 words)",
  "biggestSlip":      "1 sentence — name the standout slip; show you saw it, no lecturing (≤18 words). If no slips: praise the clean day briefly.",
  "patternCallout":   "1 sentence — a BEHAVIOURAL PATTERN you noticed across today + recent days (≤22 words). Examples: 'You're shifting workouts earlier — peak hour moved from 18:00 to 8:00.' / 'Three weeks of meditation, never two days in a row.' / 'Slips cluster after 21:00.'",
  "tomorrowMove":     "1 sentence — ONE concrete, specific action for tomorrow tied to the pattern above (≤16 words)"
}

RULES:
- Cite SPECIFIC numbers from the comparison stats in "trend" (e.g., "+12 XP vs yesterday", "double your 7-day average").
- "patternCallout" must reference data, not generalities.
- No emojis. No bullet lists. No quotes around field values in your output.
- Speak directly to the user ("you", "your") — never third person.

EXAMPLE INPUT:
TODAY entries: 4 positives (gym, reading, meditation, called family), 1 slip (1h tiktok)
COMPARISON: net +84 today vs +30 yesterday; yesterday had 2 wins / 1 slip; 7-day avg net = +28/day; biggest cat shift: health ↑ 1.4/day
PROFILE: usually meditates (5×) and reads (4×); recurring slip: screen.

EXAMPLE OUTPUT:
{"headline":"Stacked day. Four wins, one slip, comfortably positive.","trend":"+84 XP today vs +30 yesterday — nearly triple your 7-day average.","biggestWin":"The gym session anchored everything; intensity-4 effort early sets the day.","biggestSlip":"The 1h TikTok block — same trap, same hour as usual.","patternCallout":"Wins arrive in the morning, slips after 9pm. The day breaks where attention does.","tomorrowMove":"Park the phone at 8:30pm and start the wind-down a beat earlier."}`;

  const userBody = [
    `=== TODAY'S ENTRIES ===\n${list}`,
    opts?.comparisons ? `\n=== COMPARISON STATS ===\n${opts.comparisons}` : '',
    opts?.memoryContext ? `\n=== USER PROFILE ===\n${opts.memoryContext}` : '',
  ].join('\n');

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
            { role: 'user', content: userBody },
          ],
          temperature: 0.7,
          max_tokens: 520,
          response_format: { type: 'json_object' },
        }),
      });
      if (!res.ok) { if (res.status === 429 || res.status === 404) continue; throw new Error(`AI ${res.status}`); }
      const data = await res.json();
      const parsed = extractJson(data?.choices?.[0]?.message?.content || '');
      if (parsed && typeof parsed.headline === 'string') {
        return {
          headline:       String(parsed.headline).slice(0, 220),
          trend:          String(parsed.trend || '').slice(0, 220),
          biggestWin:     String(parsed.biggestWin || parsed.biggest_win || '—').slice(0, 220),
          biggestSlip:    String(parsed.biggestSlip || parsed.biggest_slip || 'None today.').slice(0, 220),
          patternCallout: String(parsed.patternCallout || parsed.pattern_callout || '').slice(0, 240),
          tomorrowMove:   String(parsed.tomorrowMove || parsed.tomorrow_move || '').slice(0, 220),
        };
      }
    } catch (err) {
      console.warn('[ai] recap try failed:', model, err);
      continue;
    }
  }
  return fallback();
}

// Kept for any callers that still expect plain text — legacy stub.
export async function generateDailyRecapText(
  entries: { title: string; sentiment: Sentiment; xpDelta: number }[],
  opts?: { apiKey?: string }
): Promise<string> {
  const r = await generateDailyRecap(entries, opts);
  return `${r.headline}\n${r.trend}\n${r.biggestWin}\n${r.biggestSlip}\n${r.patternCallout}\n${r.tomorrowMove}`;
}

