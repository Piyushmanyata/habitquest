// Local fallback analyzer. Designed to be smart enough that the app feels useful without an API key.
import { CATEGORIES, ParentCategory, SubCategory } from './categories';
import type { EntryAnalysis, Sentiment } from './ai';
// (lib/quips.ts no longer used — see contextualQuip below)

const NEGATIVE_CUES = [
  'doom scroll','doomscroll','tiktok','instagram','reddit','twitter','x.com','youtube shorts','shorts','reels',
  'binge','junk','soda','candy','chocolate','ice cream','fast food','mcdonalds','pizza','chips',
  'smoke','smoked','smoking','vape','vaped','vaping','weed','joint','drink','drank','beer','wine','alcohol','hungover',
  'porn','jerked','fapped','nofap broke',
  'skipped','overslept','slept in','procrastinated','wasted','scrolled','ghosted','snoozed','late to bed','stayed up',
  'argued','yelled','fight','fought','lost temper','lazy','gave up',
];

const NEGATION_PATTERNS = [
  /\bdidn'?t\b/i, /\bdid not\b/i, /\bskipped\b/i, /\bmissed\b/i, /\bfailed to\b/i,
  /\bcouldn'?t\b/i, /\binstead of\b/i, /\bavoid(ed)?\b/i, /\bno (?:gym|workout|run|exercise)\b/i,
];

const POSITIVE_CUES = [
  'completed','finished','done','crushed','smashed','nailed','focused','deep work','shipped','built','wrote',
  'studied','read','meditated','worked out','exercised','ran','jogged','walked','stretched','yoga',
  'cooked','journaled','reflected','called','helped','cleaned','organized','saved','invested',
];

const DURATION_RE = /(\d+(?:\.\d+)?)\s*(min|mins|minutes|hour|hours|hr|hrs|km|miles|mi|pages|pgs|reps|sets)/i;

function tokenize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
}

function scoreSub(text: string, sub: SubCategory) {
  let score = 0;
  for (const kw of sub.keywords) {
    const k = kw.toLowerCase();
    if (text.includes(k)) score += k.includes(' ') ? 3 : 2;
  }
  if (text.includes(sub.name.toLowerCase())) score += 1;
  return score;
}

function bestCategory(text: string): { parent: ParentCategory; sub: SubCategory; score: number } {
  let best: { parent: ParentCategory; sub: SubCategory; score: number } | null = null;
  for (const p of CATEGORIES) {
    for (const s of p.subs) {
      const sc = scoreSub(text, s);
      if (!best || sc > best.score) best = { parent: p, sub: s, score: sc };
    }
  }
  return best!;
}

function inferSentiment(text: string, parentId: string): { sentiment: Sentiment; intensity: number } {
  let neg = 0, pos = 0;
  for (const cue of NEGATIVE_CUES) if (text.includes(cue)) neg += 2;
  for (const cue of POSITIVE_CUES) if (text.includes(cue)) pos += 2;
  for (const re of NEGATION_PATTERNS) if (re.test(text)) neg += 2;

  // The "breaking" parent on its own (e.g. "no phone today") flips to positive — user is succeeding at breaking a bad habit.
  // But if combined with negative cues like "doomscrolled", that's a slip.
  if (parentId === 'breaking' && neg === 0) pos += 3;
  if (parentId === 'breaking' && neg > 0) neg += 2;

  // Duration boost
  const m = text.match(DURATION_RE);
  let intensity = 1;
  if (m) {
    const n = parseFloat(m[1]);
    const unit = m[2].toLowerCase();
    if (/hour|hr/.test(unit)) intensity = Math.min(5, Math.ceil(n * 2));
    else if (/min/.test(unit))  intensity = Math.min(5, Math.ceil(n / 15));
    else if (/km|mi/.test(unit))intensity = Math.min(5, Math.ceil(n / 1.5));
    else if (/page|pg/.test(unit))intensity = Math.min(5, Math.ceil(n / 10));
    else intensity = Math.min(5, Math.ceil(n / 5));
  } else if (text.split(' ').length > 12) intensity = 2;

  let sentiment: Sentiment;
  if (neg > pos) sentiment = 'negative';
  else if (pos > neg) sentiment = 'positive';
  else sentiment = pos === 0 && neg === 0 ? 'neutral' : 'neutral';

  // Bump intensity for strong cues
  const cueIntensity = Math.min(5, Math.ceil((pos + neg) / 4));
  intensity = Math.max(intensity, cueIntensity, 1);

  return { sentiment, intensity };
}

function computeDelta(sentiment: Sentiment, intensity: number): number {
  if (sentiment === 'positive') return 6 + intensity * 5;     // +11..+31
  if (sentiment === 'negative') return -(3 + intensity * 4);  // -7..-23  (soft, honest-log friendly)
  return 3;
}

function guessEmotion(text: string, sentiment: 'positive' | 'negative' | 'neutral'): string {
  const t = text.toLowerCase();
  // Pull a hint from explicit feeling words.
  if (/\b(amazing|great|awesome|happy|loved|excited|stoked|joy)\b/.test(t)) return 'joy';
  if (/\b(proud|nailed|crushed|killed)\b/.test(t))                          return 'pride';
  if (/\b(calm|peace|quiet|relaxed|presence|present)\b/.test(t))             return 'calm';
  if (/\b(energ|alive|fired|charged|hyped)\b/.test(t))                      return 'energized';
  if (/\b(focus|deep|locked in|in the zone)\b/.test(t))                     return 'focused';
  if (/\b(grateful|thankful|blessed)\b/.test(t))                            return 'gratitude';
  if (/\b(anx|worried|stressed|panic|on edge)\b/.test(t))                   return 'anxious';
  if (/\b(angry|frustrated|mad|annoyed|fed up)\b/.test(t))                  return 'frustrated';
  if (/\b(ashamed|guilty|disappoint|regret)\b/.test(t))                     return 'shame';
  if (/\b(tired|exhausted|drained|sleepy|knackered)\b/.test(t))             return 'tired';
  if (/\b(lonely|alone|isolated)\b/.test(t))                                return 'lonely';
  if (/\b(bored|meh|dull)\b/.test(t))                                       return 'bored';
  // Fallback by sentiment.
  return sentiment === 'positive' ? 'focused' : sentiment === 'negative' ? 'frustrated' : 'neutral';
}

function titleize(s: string) {
  const t = s.trim().replace(/\s+/g, ' ');
  if (t.length <= 60) return t.charAt(0).toUpperCase() + t.slice(1);
  return t.slice(0, 57) + '…';
}

// Build a quip that pulls real words from the user's entry so we don't show stock phrases.
function contextualQuip(rawText: string, sentiment: 'positive' | 'negative' | 'neutral'): string {
  const text = rawText.toLowerCase();
  const m = rawText.match(/(\d+(?:\.\d+)?\s*(?:min|mins|minute|minutes|hour|hours|hr|hrs|km|miles|mi|pages|pgs|reps|sets))/i);
  const duration = m ? m[0] : null;

  if (sentiment === 'positive') {
    if (/run|ran|jog/.test(text))            return duration ? `${cap(duration)} of moving — past you is watching.` : 'Movement banked. The body remembers.';
    if (/gym|lift|workout|squat/.test(text)) return duration ? `${cap(duration)} under iron — that's tomorrow's strength.` : 'Iron moved. Pay raise pending.';
    if (/read|book|page/.test(text))         return duration ? `${cap(duration)} closer to the version that finishes the book.` : 'Pages turned, brain fed.';
    if (/meditat|breathwork|breathe/.test(text)) return 'Still mind, loud impact.';
    if (/study|learn|course|practice/.test(text)) return 'Skill tree just got a tiny watering.';
    if (/cook|meal|salad|vegetable/.test(text)) return 'Real food, real fuel. No takeout regret.';
    if (/call|text|catch up|family|mom|dad|friend/.test(text)) return 'Connection > content. Banked.';
    if (/water|hydrat/.test(text))           return 'Drop by drop. Brain thanks you.';
    if (/journal|reflect|gratitude/.test(text)) return 'Honest paper beats noisy head.';
    if (/clean|tidy|organize/.test(text))    return 'Order outside, order inside.';
    if (/save|invest|budget/.test(text))     return 'Future you is quietly impressed.';
    return duration ? `${cap(duration)} done — that counts.` : 'Quiet rep, real progress.';
  }
  if (sentiment === 'negative') {
    if (/tiktok|reels|shorts|scroll/.test(text)) return duration ? `${cap(duration)} of scroll — the FYP got fed.` : 'The feed wins this round.';
    if (/junk|sugar|soda|candy|chips|pizza|takeout|fast food/.test(text)) return 'A sweet hit now, a quiet regret later.';
    if (/smoke|vape|cig/.test(text))         return 'Lungs are quietly filing a complaint.';
    if (/drink|drank|alcohol|beer|wine/.test(text)) return 'Tomorrow you is already negotiating.';
    if (/skip|missed|didn'?t|didnt/.test(text)) return 'Skipped rep — story is still rewritable.';
    if (/lazy|nap|slept in|overslept/.test(text)) return 'Couch claimed the round.';
    if (/argued|yelled|fight/.test(text))    return 'Volume up, signal down. Reset later.';
    return 'Logged honestly — that\'s the actual move.';
  }
  return 'Counted. Quietly.';
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

export function heuristicAnalyze(rawText: string): EntryAnalysis {
  const text = tokenize(rawText);
  const cat = bestCategory(text);
  const fallbackParent = cat.score === 0 ? CATEGORIES.find(c => c.id === 'mastery')! : cat.parent;
  const fallbackSub = cat.score === 0 ? fallbackParent.subs[fallbackParent.subs.length - 1] : cat.sub;
  const { sentiment, intensity } = inferSentiment(text, fallbackParent.id);
  const xpDelta = computeDelta(sentiment, intensity);
  return {
    parentId: fallbackParent.id,
    subId: fallbackSub.id,
    sentiment,
    intensity,
    xpDelta,
    title: titleize(rawText),
    reasoning:
      sentiment === 'positive' ? 'Positive action with measurable effort.' :
      sentiment === 'negative' ? 'Language suggests a setback or unhealthy choice.' :
      'No strong positive or negative cues.',
    quip: contextualQuip(rawText, sentiment),
    tone: sentiment === 'positive' ? 'cheer' : sentiment === 'negative' ? 'roast' : 'wry',
    source: 'rules',
    emotion: guessEmotion(text, sentiment),
    emotionIntensity: Math.max(1, Math.min(3, Math.ceil(intensity / 2))),
  };
}
