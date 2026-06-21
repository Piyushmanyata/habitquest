// Multi-entry analyzer: takes free-form journal text that may contain multiple
// actions and returns an array of independently-scored analyses, in order.

import type { EntryAnalysis, ReactionTone } from './ai';
import { CATEGORIES, CAT_BY_ID } from './categories';
import { callJsonCompletion, getStoredApiKey } from './aiClient';
import { heuristicAnalyze } from './heuristic';

const ALLOWED_TONES: ReactionTone[] = ['cheer','hype','roast','wry','gentle','sass'];
function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

// Phrases we explicitly forbid in AI quips. If the model echoes one, we
// regenerate locally so the user sees something contextual instead.
const FORBIDDEN_QUIP_RE = /(boss[- ]?tier behavior|past you is jealous|body said thanks|compound interest,?\s*alive|algorithm thanks you for your service|inner gremlin:?\s*fed|rough rep[- ]?next set|logged\.?\s*next\.?|on the board\.?|quiet mind,?\s*loud results|that was rep one|where'?s rep two)/i;

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

CATEGORIES (parent_id → sub_ids):
${taxonomy}
${memBlock}
═══════════════════════════════════════════════════════════════════════════════
CATEGORY DECISION TREE — read this BEFORE picking a category. It's the #1 source of mis-classification.
═══════════════════════════════════════════════════════════════════════════════

The "breaking" category is for vice-adjacent activity (screens, substances, junk food). It catches BOTH the slip AND the resistance. Use sentiment, not category, to mark which.

  • SCROLLED / WATCHED REELS / TIKTOK / YOUTUBE SHORTS / instagram binge / doom-scroll
        → parent=breaking, sub=screen, sentiment=NEGATIVE
  • "phone-free dinner" / "no phone all morning" / put phone away
        → parent=breaking, sub=screen, sentiment=POSITIVE
  • SMOKED / VAPED / DRANK alcohol / had beers / weed / porn / fapped
        → parent=breaking, sub=substance, sentiment=NEGATIVE
  • "no drinks today" / "1 month sober" / nofap day N / quit-smoking day N
        → parent=breaking, sub=substance, sentiment=POSITIVE
  • ATE junk / pizza / fast food / candy / chocolate bar / chips / sugary soda / energy drink (as treat)
        → parent=breaking, sub=junk, sentiment=NEGATIVE   ← NOT health/nutrition
  • "no sugar today" / skipped dessert / passed on the cake
        → parent=breaking, sub=junk, sentiment=POSITIVE

Use health/nutrition ONLY for genuine eating decisions (cooked a real meal, ate vegetables, hit protein, ate breakfast). A pizza binge is NOT "nutrition", it's breaking/junk.

Other common confusions:
  • "drank water / hydrated"               → health/hydration (positive)
  • "slept 8h / went to bed early"         → health/sleep (positive)
  • "stayed up till 3am / overslept"       → health/sleep (negative)
  • "walked 30min / 5km run"               → health/fitness (positive)
  • "meditated / breathwork / mindfulness" → mind/meditation
  • "wrote in journal / morning pages"     → mind/journaling
  • "therapy session / talked to therapist"→ mind/therapy
  • "read book / 30 pages"                 → mastery/reading
  • "studied / homework / class / language → mastery/study
  • "practiced guitar/piano/chess/code"    → mastery/practice
  • "deep work / focused block / no-phone work" → work/deepwork
  • "inbox zero / email / scheduled day"   → work/admin
  • "saved / budgeted / invested"          → work/finance
  • "called mom/dad/sibling/spouse"        → social/family
  • "met up with friend / coffee with…"    → social/friends
  • "helped a neighbour / gave a tip / volunteered" → social/kindness
  • "shipped a feature / built / made"     → creative/create
  • "listened to album / played guitar for fun" → creative/music
  • "went outside / walk in park / garden" → creative/outdoor (counts for both health/fitness if it was exercise — pick the dominant frame)

═══════════════════════════════════════════════════════════════════════════════
SPLITTING RULES:
═══════════════════════════════════════════════════════════════════════════════
- A "distinct action" is one self-contained activity with its own outcome (a workout, a meal, a scroll session, a study block, a phone call).
- Separators that often start a new action: "and then", "after that", ".", ";", "1.", "2.", bullets, " also ", " plus ".
- DON'T over-split adverbial details — "ran 5km in the park" is ONE action, not "ran 5km" + "in the park".
- DON'T split feelings from actions — "went to gym, felt great" is ONE action with a reflection, not two.
- Order the array by the order events happened.
- Single action → single-element array.
- Hard cap: 6 entries per message.

═══════════════════════════════════════════════════════════════════════════════
INTENSITY 1..5 — calibrated to EFFORT × DURATION × IMPACT:
═══════════════════════════════════════════════════════════════════════════════
  1 token    — 5-10 min OR trivial scope: glass of water, single pushup, 1-min stretch, drove past gym
  2 small    — 10-25 min OR modest scope: short walk, 1 chapter read, 10-min meditation, light tidy, one quick call
  3 moderate — 25-60 min OR meaningful scope: real workout, cooked actual meal, study block, journaling page, 1 short slip (15-30 min scroll)
  4 heavy    — 60-120 min OR high effort: long run, deep work block, big creative session, 1-2h doomscroll/binge
  5 epic     — 2h+ OR a milestone: marathon project, 10km+ run, multi-chapter day, breaking a multi-month bad streak, OR a major relapse (full day lost to screens, big binge, etc.)

═══════════════════════════════════════════════════════════════════════════════
SENTIMENT + XP MATH (be precise — wrong XP is a real bug):
═══════════════════════════════════════════════════════════════════════════════
  POSITIVE  xp_delta = +(5 + intensity × 7)      →  +12, +19, +26, +33, +40
  NEGATIVE  xp_delta = -(3 + intensity × 4)      →   -7, -11, -15, -19, -23   (intentionally soft)
  NEUTRAL   xp_delta in [-3, +3]                 (status updates, ambiguous)

NEVER swap the sign. POSITIVE entries MUST have xp_delta > 0. NEGATIVE entries MUST have xp_delta < 0.

═══════════════════════════════════════════════════════════════════════════════
EMOTION (REQUIRED — pick one id, never invent new ones):
═══════════════════════════════════════════════════════════════════════════════
DEEPLY READ the words. Mood signals can be explicit ("felt proud", "anxious") or
implicit (verb choice, sentence rhythm, regret words like "instead", celebration
words like "finally"). Don't default to "neutral" unless the entry is genuinely flat.

  pleasant-high:   joy, pride, energized, focused
  pleasant-low:    calm, gratitude
  unpleasant-high: anxious, frustrated
  unpleasant-low:  shame, lonely, tired
  neutral:         bored, neutral

emotion_intensity: 1 (faint hint) / 2 (clear) / 3 (strong, the whole entry centres on it).

Heuristics when explicit feeling words are absent:
  • "finally", "actually did it"            → pride
  • "couldn't help myself", "again",
    "instead of", "ended up"                → shame
  • "rushed", "stressed", "panicked"        → anxious
  • "calm", "quiet", "in flow", "present"   → calm
  • "tired", "exhausted", "drained"         → tired
  • "alone", "missed", "haven't seen"       → lonely
  • "hyped", "stoked", "killed it"          → energized
  • "deep work", "locked in", "in the zone" → focused

═══════════════════════════════════════════════════════════════════════════════
REFLECTION (OPTIONAL): If the user wrote a thought/feeling alongside the action,
extract a ≤22-word past-tense reflection IN THEIR VOICE. If they didn't reflect,
OMIT the field entirely — never invent.
═══════════════════════════════════════════════════════════════════════════════

QUIP — STRICTLY PERSONAL (≤90 chars). MUST name a SPECIFIC NOUN, VERB, NUMBER, or PERSON the user wrote in this entry. If the entry says "friend", "mom", "gym", "1h", "yoga" — the quip must literally include or play off that word.

A quip that could appear on someone else's entry is wrong. A quip that doesn't quote their actual words is wrong.

FORBIDDEN PHRASES (banned literal AND paraphrased):
  "Boss-tier behavior", "Past you is jealous", "Body said thanks", "Compound interest alive",
  "The algorithm thanks you for your service", "Inner gremlin: fed", "Rough rep — next set?",
  "Logged. Next.", "On the board.", "Quiet mind, loud results.", "That was rep one", "Where's rep two"

TITLE: past-tense, 2-5 words, no filler ("Ran 5km" not "I ran 5km today").
TONE: cheer | hype | roast | wry | gentle | sass

═══════════════════════════════════════════════════════════════════════════════
OUTPUT — strict JSON, single object with field "entries" (array). No markdown, no preamble.
═══════════════════════════════════════════════════════════════════════════════
{"entries":[
  {
    "parent_id": "...",
    "sub_id": "...",
    "sentiment": "positive|negative|neutral",
    "intensity": 1-5,
    "xp_delta": signed int (match the formula above),
    "title": "Past-tense 2-5 words",
    "reasoning": "≤14 words, why this category + intensity",
    "quip": "in-character reaction using specific words from the entry",
    "tone": "cheer|hype|roast|wry|gentle|sass",
    "emotion": "one of the allowed ids",
    "emotion_intensity": 1-3,
    "reflection": "optional, only if the user wrote a thought"
  }
]}

═══════════════════════════════════════════════════════════════════════════════
FEW-SHOT (study these — quip uses entry words, category matches the decision tree, XP matches the formula):
═══════════════════════════════════════════════════════════════════════════════

Input: "ran 5km in the park this morning, felt amazing afterward, my head finally cleared"
Output: {"entries":[{
  "parent_id":"health","sub_id":"fitness","sentiment":"positive","intensity":4,"xp_delta":33,
  "title":"Ran 5km","reasoning":"5km is 60-90min cardio = heavy","quip":"Five clean kilometres while the city was still yawning.","tone":"hype",
  "emotion":"energized","emotion_intensity":3,
  "reflection":"Head finally cleared after the run."
}]}

Input: "went to gym 45 min and read 30 pages and then doom-scrolled tiktok 1h. felt ashamed at the end"
Output: {"entries":[
{"parent_id":"health","sub_id":"fitness","sentiment":"positive","intensity":3,"xp_delta":26,
 "title":"Gym 45 min","reasoning":"45min strength = moderate effort","quip":"Forty-five minutes under iron — tomorrow's strength compounding.","tone":"cheer",
 "emotion":"pride","emotion_intensity":2},
{"parent_id":"mastery","sub_id":"reading","sentiment":"positive","intensity":3,"xp_delta":26,
 "title":"Read 30 pages","reasoning":"30 pages = solid reading block","quip":"Thirty pages closer to the version of you who finishes the book.","tone":"cheer",
 "emotion":"focused","emotion_intensity":2},
{"parent_id":"breaking","sub_id":"screen","sentiment":"negative","intensity":4,"xp_delta":-19,
 "title":"Scrolled TikTok 1h","reasoning":"Full hour of passive screen","quip":"One hour of TikTok — the FYP got fed, your project starved.","tone":"roast",
 "emotion":"shame","emotion_intensity":3,
 "reflection":"Felt ashamed at the end."}
]}

Input: "ate a whole pizza alone"
Output: {"entries":[{
  "parent_id":"breaking","sub_id":"junk","sentiment":"negative","intensity":3,"xp_delta":-15,
  "title":"Whole pizza solo","reasoning":"Pizza binge = junk-food slip","quip":"A whole pie, solo — that's a confession, not a meal.","tone":"sass",
  "emotion":"shame","emotion_intensity":2
}]}

Input: "cooked a real dinner — chicken, rice, broccoli — instead of ordering"
Output: {"entries":[{
  "parent_id":"health","sub_id":"nutrition","sentiment":"positive","intensity":3,"xp_delta":26,
  "title":"Cooked real dinner","reasoning":"Home-cooked vs takeout","quip":"Chicken, rice, broccoli — the unsexy combo that builds the body.","tone":"cheer",
  "emotion":"pride","emotion_intensity":2
}]}

Input: "meditated 10 min. felt calm and present for the first time today."
Output: {"entries":[{
  "parent_id":"mind","sub_id":"meditation","sentiment":"positive","intensity":1,"xp_delta":12,
  "title":"Meditated 10 min","reasoning":"Short daily rep","quip":"Ten minutes still — the first sliver of presence in the day.","tone":"cheer",
  "emotion":"calm","emotion_intensity":3,
  "reflection":"First moment of presence all day."
}]}

Input: "drank 2 beers after work, not great"
Output: {"entries":[{
  "parent_id":"breaking","sub_id":"substance","sentiment":"negative","intensity":2,"xp_delta":-11,
  "title":"Two beers post-work","reasoning":"Mild alcohol slip","quip":"Two beers after the clock — borrowing calm from tomorrow.","tone":"wry",
  "emotion":"shame","emotion_intensity":2,
  "reflection":"Not great about it."
}]}

Input: "no phone all morning, deep work block till lunch"
Output: {"entries":[
{"parent_id":"breaking","sub_id":"screen","sentiment":"positive","intensity":4,"xp_delta":33,
 "title":"Phone-free morning","reasoning":"Whole morning off device","quip":"A whole morning without the phone — the urge lost.","tone":"hype",
 "emotion":"focused","emotion_intensity":3},
{"parent_id":"work","sub_id":"deepwork","sentiment":"positive","intensity":4,"xp_delta":33,
 "title":"Deep work till lunch","reasoning":"Multi-hour focused block","quip":"Until-lunch focus — the rare flavour of actual progress.","tone":"cheer",
 "emotion":"focused","emotion_intensity":3}
]}

Input: "called grandma after weeks of silence"
Output: {"entries":[{
  "parent_id":"social","sub_id":"family","sentiment":"positive","intensity":2,"xp_delta":19,
  "title":"Called grandma","reasoning":"Overdue family reconnection","quip":"Weeks of silence — broken by the bravest button on your phone.","tone":"gentle",
  "emotion":"gratitude","emotion_intensity":3
}]}

Input: "drank a glass of water"
Output: {"entries":[{
  "parent_id":"health","sub_id":"hydration","sentiment":"positive","intensity":1,"xp_delta":12,
  "title":"Drank water","reasoning":"Token hydration win","quip":"One glass in — brain noises down a notch.","tone":"cheer",
  "emotion":"neutral","emotion_intensity":1
}]}

Input: "stayed up till 3am scrolling reels"
Output: {"entries":[
{"parent_id":"breaking","sub_id":"screen","sentiment":"negative","intensity":4,"xp_delta":-19,
 "title":"Reels till 3am","reasoning":"Multi-hour late-night scroll","quip":"3am reels — the FYP ate the night and the morning.","tone":"roast",
 "emotion":"shame","emotion_intensity":3},
{"parent_id":"health","sub_id":"sleep","sentiment":"negative","intensity":3,"xp_delta":-15,
 "title":"Slept past 3am","reasoning":"Late bedtime hits sleep","quip":"3am bedtime — tomorrow-you is already filing complaints.","tone":"sass",
 "emotion":"tired","emotion_intensity":2}
]}`;
}

async function callWithFallback(system: string, user: string): Promise<any | null> {
  const apiKey = getStoredApiKey();
  if (!apiKey) return null;
  const parsed = await callJsonCompletion({
    apiKey,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.55,
    maxTokens: 900,
    responseFormat: true,
  });
  if (parsed) return parsed;
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
