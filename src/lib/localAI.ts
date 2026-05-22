// Browser-side AI using @huggingface/transformers (ONNX in WASM/WebGPU).
// No API key, no server. Model downloads once (~67MB quantized DistilBERT-MNLI)
// then caches in IndexedDB. Lazy-loaded after first paint.

import { CATEGORIES, CAT_BY_ID } from './categories';
import { pickQuip } from './quips';
import { heuristicAnalyze } from './heuristic';
import type { EntryAnalysis, ReactionTone } from './ai';

type Status = 'idle' | 'loading' | 'ready' | 'failed';
let status: Status = 'idle';
let progress = 0;
let pipelinePromise: Promise<any> | null = null;
let listeners = new Set<() => void>();

export function getLocalAIStatus() { return { status, progress }; }
export function onLocalAIChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
function emit() { for (const cb of listeners) cb(); }

async function getPipeline() {
  if (pipelinePromise) return pipelinePromise;
  status = 'loading'; progress = 0; emit();
  pipelinePromise = (async () => {
    try {
      const mod = await import('@huggingface/transformers');
      const { pipeline, env } = mod as any;
      env.allowLocalModels = false;
      const clf = await pipeline('zero-shot-classification', 'Xenova/distilbert-base-uncased-mnli', {
        progress_callback: (info: any) => {
          if (info?.status === 'progress' && typeof info.progress === 'number') {
            progress = Math.min(1, info.progress / 100);
            emit();
          }
        },
      });
      status = 'ready'; progress = 1; emit();
      return clf;
    } catch (err) {
      console.warn('[localAI] failed to load:', err);
      status = 'failed'; emit();
      throw err;
    }
  })();
  return pipelinePromise;
}

/** Optional warm-up — call after first paint to start downloading the model. */
export function warmupLocalAI() {
  if (status === 'idle') void getPipeline().catch(() => {});
}

const CATEGORY_LABELS = CATEGORIES.flatMap(p => p.subs.map(s => `${p.name}: ${s.name}`));
const SENTIMENT_LABELS = [
  'a positive growth action (workout, study, meditate, eat well, sleep, help someone)',
  'a negative setback or unhealthy choice (doomscroll, junk food, skipped, smoke, drink, procrastinate)',
  'a neutral or minor activity',
];

function labelToCategory(label: string) {
  // "Parent Name: Sub Name"
  const [parentName, subName] = label.split(':').map(s => s.trim());
  for (const p of CATEGORIES) {
    if (p.name === parentName) {
      const sub = p.subs.find(s => s.name === subName);
      if (sub) return { parentId: p.id, subId: sub.id };
    }
  }
  return null;
}

const DURATION_RE = /(\d+(?:\.\d+)?)\s*(min|mins|minutes|hour|hours|hr|hrs|km|miles|mi|pages|pgs|reps|sets)/i;
function intensityFromText(text: string): number {
  const m = text.match(DURATION_RE);
  if (m) {
    const n = parseFloat(m[1]);
    const unit = m[2].toLowerCase();
    if (/hour|hr/.test(unit)) return Math.min(5, Math.max(1, Math.ceil(n * 2)));
    if (/min/.test(unit))     return Math.min(5, Math.max(1, Math.ceil(n / 15)));
    if (/km|mi/.test(unit))   return Math.min(5, Math.max(1, Math.ceil(n / 1.5)));
    if (/page|pg/.test(unit)) return Math.min(5, Math.max(1, Math.ceil(n / 10)));
    return Math.min(5, Math.max(1, Math.ceil(n / 5)));
  }
  const wc = text.trim().split(/\s+/).length;
  return wc > 14 ? 3 : wc > 7 ? 2 : 1;
}

function titleize(s: string) {
  const t = s.trim().replace(/\s+/g, ' ');
  if (t.length <= 60) return t.charAt(0).toUpperCase() + t.slice(1);
  return t.slice(0, 57) + '…';
}

export async function analyzeLocally(rawText: string): Promise<EntryAnalysis> {
  let clf: any;
  try {
    clf = await getPipeline();
  } catch {
    return heuristicAnalyze(rawText);
  }

  try {
    const [catRes, sentRes] = await Promise.all([
      clf(rawText, CATEGORY_LABELS, { multi_label: false }),
      clf(rawText, SENTIMENT_LABELS, { multi_label: false }),
    ]);

    const catLabel: string = catRes.labels?.[0] ?? '';
    const sentLabel: string = sentRes.labels?.[0] ?? '';
    const sentScore: number = sentRes.scores?.[0] ?? 0;

    const mapped = labelToCategory(catLabel);
    const parentId = mapped?.parentId || 'mastery';
    const subId = mapped?.subId || (CAT_BY_ID[parentId].subs[0]?.id ?? 'practice');

    let sentiment: 'positive' | 'negative' | 'neutral';
    if (sentLabel.startsWith('a positive')) sentiment = 'positive';
    else if (sentLabel.startsWith('a negative')) sentiment = 'negative';
    else sentiment = 'neutral';

    // Confidence gate: if sentiment classifier isn't sure, neutralize
    if (sentScore < 0.4) sentiment = 'neutral';

    const intensity = intensityFromText(rawText);
    let xpDelta: number;
    if (sentiment === 'positive') xpDelta = 6 + intensity * 6;          // +12..+36
    else if (sentiment === 'negative') xpDelta = -(6 + intensity * 6);   // -12..-36
    else xpDelta = 3;

    const tone: ReactionTone =
      sentiment === 'positive' ? (intensity >= 4 ? 'hype' : 'cheer') :
      sentiment === 'negative' ? (intensity >= 4 ? 'roast' : 'gentle') :
      'wry';
    const quip = pickQuip({ parentId, sentiment, intensity, tone });

    return {
      parentId, subId, sentiment, intensity, xpDelta,
      title: titleize(rawText),
      reasoning: `Classified ${(sentScore * 100) | 0}% ${sentiment}, category ${catRes.scores?.[0] ? `${(catRes.scores[0] * 100) | 0}%` : ''} confident.`,
      quip, tone,
      source: 'ai',
    };
  } catch (err) {
    console.warn('[localAI] inference failed:', err);
    return heuristicAnalyze(rawText);
  }
}
