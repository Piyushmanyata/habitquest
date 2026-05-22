// Fixed emotion palette — used both by the quick-pick UI and as a constrained
// vocabulary the AI must choose from. Keeping a small set makes the analytics
// signal-rich rather than fragmented.

export type EmotionId =
  | 'joy' | 'pride' | 'calm' | 'energized' | 'focused' | 'gratitude'
  | 'anxious' | 'frustrated' | 'bored' | 'shame' | 'tired' | 'lonely'
  | 'neutral';

export type Emotion = {
  id: EmotionId;
  label: string;
  emoji: string;
  /** Coarse valence — used for visualizations only. */
  valence: 'positive' | 'negative' | 'neutral';
  /** Bucket for grouping in the radar / distribution chart. */
  bucket: 'pleasant-high' | 'pleasant-low' | 'unpleasant-high' | 'unpleasant-low' | 'neutral';
};

export const EMOTIONS: Emotion[] = [
  { id: 'joy',         label: 'Joy',         emoji: '😊', valence: 'positive', bucket: 'pleasant-high' },
  { id: 'pride',       label: 'Pride',       emoji: '🦁', valence: 'positive', bucket: 'pleasant-high' },
  { id: 'energized',   label: 'Energized',   emoji: '⚡', valence: 'positive', bucket: 'pleasant-high' },
  { id: 'focused',     label: 'Focused',     emoji: '🎯', valence: 'positive', bucket: 'pleasant-high' },
  { id: 'calm',        label: 'Calm',        emoji: '🧘', valence: 'positive', bucket: 'pleasant-low' },
  { id: 'gratitude',   label: 'Gratitude',   emoji: '🙏', valence: 'positive', bucket: 'pleasant-low' },
  { id: 'anxious',     label: 'Anxious',     emoji: '😰', valence: 'negative', bucket: 'unpleasant-high' },
  { id: 'frustrated',  label: 'Frustrated',  emoji: '😤', valence: 'negative', bucket: 'unpleasant-high' },
  { id: 'shame',       label: 'Shame',       emoji: '😞', valence: 'negative', bucket: 'unpleasant-low' },
  { id: 'lonely',      label: 'Lonely',      emoji: '🥀', valence: 'negative', bucket: 'unpleasant-low' },
  { id: 'tired',       label: 'Tired',       emoji: '😴', valence: 'negative', bucket: 'unpleasant-low' },
  { id: 'bored',       label: 'Bored',       emoji: '😐', valence: 'neutral',  bucket: 'neutral' },
  { id: 'neutral',     label: 'Neutral',     emoji: '🫥', valence: 'neutral',  bucket: 'neutral' },
];

export const EMOTION_BY_ID: Record<string, Emotion> = Object.fromEntries(
  EMOTIONS.map(e => [e.id, e])
);

export function isEmotionId(s: any): s is EmotionId {
  return typeof s === 'string' && !!EMOTION_BY_ID[s];
}

/** Mood valence color helper. */
export function emotionColor(id?: EmotionId | string): string {
  if (!id) return 'var(--muted-2)';
  const e = EMOTION_BY_ID[id];
  if (!e) return 'var(--muted-2)';
  if (e.valence === 'positive') return 'var(--pos)';
  if (e.valence === 'negative') return 'var(--neg)';
  return 'var(--muted)';
}
