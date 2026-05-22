// Local fallback analyzer. Designed to be smart enough that the app feels useful without an API key.
import { CATEGORIES, ParentCategory, SubCategory } from './categories';
import type { EntryAnalysis, Sentiment } from './ai';
import { pickQuip } from './quips';

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
  if (sentiment === 'negative') return -(6 + intensity * 5);  // -11..-31
  return 3;
}

function titleize(s: string) {
  const t = s.trim().replace(/\s+/g, ' ');
  if (t.length <= 60) return t.charAt(0).toUpperCase() + t.slice(1);
  return t.slice(0, 57) + '…';
}

export function heuristicAnalyze(rawText: string): EntryAnalysis {
  const text = tokenize(rawText);
  const cat = bestCategory(text);
  const fallbackParent = cat.score === 0 ? CATEGORIES.find(c => c.id === 'mastery')! : cat.parent;
  const fallbackSub = cat.score === 0 ? fallbackParent.subs[fallbackParent.subs.length - 1] : cat.sub;
  const { sentiment, intensity } = inferSentiment(text, fallbackParent.id);
  const xpDelta = computeDelta(sentiment, intensity);
  // delegate to shared rich quip library
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
    quip: pickQuip({ parentId: fallbackParent.id, sentiment, intensity, tone: sentiment === 'positive' ? 'cheer' : sentiment === 'negative' ? 'roast' : 'wry' }),
    tone: sentiment === 'positive' ? 'cheer' : sentiment === 'negative' ? 'roast' : 'wry',
    source: 'rules',
  };
}
