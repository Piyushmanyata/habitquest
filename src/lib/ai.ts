// AI-powered journal entry parser — routes through the shared AI client.
// Falls back to local heuristic if no key or call fails.

import { CATEGORIES, CAT_BY_ID } from './categories';
import { heuristicAnalyze } from './heuristic';
import {
  FREE_MODELS,
  callJsonCompletion,
  getProviderConfig,
  getSelectedModelId,
  getStoredApiKey,
  setSelectedModel,
} from './aiClient';

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
  /** Detected from text or supplied via UI quick-pick. */
  emotion?: string;
  /** 1..3, optional. */
  emotionIntensity?: number;
  /** Reflection / thought / how it felt — extracted by AI from longer entries. */
  reflection?: string;
};

export { FREE_MODELS, getSelectedModelId, setSelectedModel };

export function getProviderName(): 'openrouter' | 'deepseek' | 'browser' | 'rules' {
  const key = getStoredApiKey();
  if (!key) return 'browser';
  return getProviderConfig(key).providerName;
}

function buildPrompt(memoryContext?: string) {
  const taxonomy = CATEGORIES.map(p =>
    `- ${p.id} (${p.name}): ${p.subs.map(s => `${s.id} (${s.name})`).join(', ')}`
  ).join('\n');

  const memBlock = memoryContext ? `\n${memoryContext}\n` : '';

  return `You are SAGE, HabitQuest's AI mind. The user journaled ONE thing. Classify, score, react — in character.

CATEGORIES (parent_id → sub_ids):
${taxonomy}
${memBlock ? memBlock + '(Use this context silently; never echo it back.)\n' : ''}
CATEGORY DECISION TREE (read first — #1 source of errors):
  • Scroll/TikTok/Reels/YouTube Shorts/IG binge → breaking/screen (NEGATIVE)
  • "Phone-free morning" / no scroll today      → breaking/screen (POSITIVE)
  • Smoked / vaped / drank alcohol / weed       → breaking/substance (NEGATIVE)
  • "Sober day N" / passed on drinks            → breaking/substance (POSITIVE)
  • Ate pizza / chips / candy / fast food       → breaking/junk (NEGATIVE)  ← NOT health/nutrition
  • "Cooked real meal" / hit protein / veggies  → health/nutrition (POSITIVE)
  • Slept 8h / early bed                        → health/sleep (POSITIVE)
  • Stayed up till 3am / overslept              → health/sleep (NEGATIVE)
  • Workout / run / walk / yoga / stretching    → health/fitness
  • Water / hydration                            → health/hydration
  • Meditation / breathwork / mindfulness       → mind/meditation
  • Journaling / morning pages                  → mind/journaling
  • Therapy / therapist                          → mind/therapy
  • Reading / book / pages                       → mastery/reading
  • Studying / class / homework / language       → mastery/study
  • Practicing instrument / coding / chess       → mastery/practice
  • Deep work / focus block / pomodoro           → work/deepwork
  • Inbox / planning / admin                     → work/admin
  • Save / invest / budget                       → work/finance
  • Called family member / spouse / kids         → social/family
  • Met / texted / hung out with friend          → social/friends
  • Helped someone / volunteered / kindness      → social/kindness
  • Built / shipped / made art / project work    → creative/create
  • Music listening / playing for fun            → creative/music
  • Outside / nature / park / sunshine           → creative/outdoor

INTENSITY 1..5 — effort × duration × impact:
  1 token    — 5-10 min OR trivial: glass of water, single pushup, 1-min stretch
  2 small    — 10-25 min OR modest: short walk, 1 chapter, 10-min meditation, brief slip
  3 moderate — 25-60 min OR meaningful: full workout, cooked meal, study block, 15-30min slip
  4 heavy    — 60-120 min OR high effort: long run, deep work, 1-2h doomscroll
  5 epic     — 2h+ OR a milestone (positive) / a major relapse (negative)

SENTIMENT + XP MATH (strict — wrong XP is a real bug):
  POSITIVE  xp_delta = +(5 + intensity × 7)   →  +12, +19, +26, +33, +40
  NEGATIVE  xp_delta = -(3 + intensity × 4)   →   -7, -11, -15, -19, -23   (soft, honest-log friendly)
  NEUTRAL   xp_delta ∈ [-3, +3]

NEVER swap signs. Positive entries → xp > 0. Negative entries → xp < 0.

QUIP (≤90 chars): MUST quote a SPECIFIC NOUN, VERB, NUMBER, or PERSON from the entry.
Forbidden literals (also banned paraphrased): "Boss-tier behavior", "Past you is jealous",
"Body said thanks", "Compound interest alive", "The algorithm thanks you for your service",
"Inner gremlin: fed", "Rough rep — next set?", "Logged. Next.", "On the board.".

TITLE: past-tense, 2-5 words ("Ran 5km" not "I ran 5km this morning").
TONE: cheer | hype | roast | wry | gentle | sass

OUTPUT — strict JSON only, no markdown, exact shape:
{"parent_id":"...","sub_id":"...","sentiment":"positive|negative|neutral","intensity":1-5,"xp_delta":signed int (use formula),"title":"...","reasoning":"≤14 words why this cat + intensity","quip":"specific-words reaction","tone":"cheer|hype|roast|wry|gentle|sass"}

FEW-SHOT:
Input: "crushed 45 min weightlift this morning, felt unreal"
Output: {"parent_id":"health","sub_id":"fitness","sentiment":"positive","intensity":3,"xp_delta":26,"title":"Crushed 45min lift","reasoning":"45min strength block","quip":"Forty-five minutes of iron — the morning rewarded the alarm.","tone":"hype"}

Input: "doom-scrolled tiktok for 2 hours instead of working on my project"
Output: {"parent_id":"breaking","sub_id":"screen","sentiment":"negative","intensity":4,"xp_delta":-19,"title":"TikTok 2h","reasoning":"Two hours of FYP avoidance","quip":"Two hours of TikTok — the project sat there refreshing nothing.","tone":"roast"}

Input: "ate a whole pizza alone"
Output: {"parent_id":"breaking","sub_id":"junk","sentiment":"negative","intensity":3,"xp_delta":-15,"title":"Whole pizza solo","reasoning":"Junk-food binge, not nutrition","quip":"A whole pie, solo — confession dressed as dinner.","tone":"sass"}

Input: "cooked chicken and rice instead of ordering"
Output: {"parent_id":"health","sub_id":"nutrition","sentiment":"positive","intensity":3,"xp_delta":26,"title":"Cooked chicken & rice","reasoning":"Home-cooked over takeout","quip":"Chicken and rice — the unsexy combo that builds the body.","tone":"cheer"}

Input: "drank a glass of water"
Output: {"parent_id":"health","sub_id":"hydration","sentiment":"positive","intensity":1,"xp_delta":12,"title":"Drank water","reasoning":"Token hydration win","quip":"One glass in — brain noises down a notch.","tone":"cheer"}`;
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

export async function analyzeEntry(text: string, opts?: { apiKey?: string; model?: string; memoryContext?: string }): Promise<EntryAnalysis> {
  const apiKey = opts?.apiKey || getStoredApiKey();
  if (!apiKey) return heuristicAnalyze(text);
  const parsed = await callJsonCompletion({
    apiKey,
    model: opts?.model,
    messages: [
      { role: 'system', content: buildPrompt(opts?.memoryContext) },
      { role: 'user', content: text },
    ],
    temperature: 0.5,
    maxTokens: 320,
    responseFormat: true,
  });
  const norm = validateAndNormalize(parsed);
  if (norm) return norm;
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

  const apiKey = opts?.apiKey || getStoredApiKey();
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

  const parsed = await callJsonCompletion({
    apiKey,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userBody },
    ],
    temperature: 0.7,
    maxTokens: 380,
    responseFormat: true,
  });
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
  return fallback();
}
