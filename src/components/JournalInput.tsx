import { useRef, useState } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { ArrowUp, Sparkles, Loader2 } from 'lucide-react';
import SuggestionChips from './SuggestionChips';
import { EMOTIONS } from '../lib/emotions';

const QUICK_MOODS = ['joy', 'pride', 'focused', 'calm', 'anxious', 'frustrated', 'tired', 'shame'] as const;

export default function JournalInput() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [moodHint, setMoodHint] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  const addEntries = useHabitStore(s => s.addEntries);
  const apiKey = useHabitStore(s => s.apiKey);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      // If the user tapped a mood chip, prepend a feeling hint so the AI keys on it.
      const finalText = moodHint ? `${text.trim()} — felt ${moodHint}` : text.trim();
      await addEntries(finalText);
      setText('');
      setMoodHint(null);
      ref.current?.focus();
    } finally { setBusy(false); }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  return (
    <div className="surface p-4 relative overflow-hidden">
      <div className="absolute -top-16 -left-16 w-40 h-40 rounded-full bg-[radial-gradient(circle,rgba(194,245,74,0.10),transparent_70%)] pointer-events-none" />

      <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-3 relative">
        <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span>What did you just do?</span>
        <span className="ml-auto mono text-[10px] text-[var(--muted-2)]">
          {apiKey ? 'sage · cloud' : 'browser ai'}
        </span>
      </div>
      <textarea
        ref={ref}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={onKey}
        rows={3}
        autoFocus
        placeholder="What happened + how you felt + any thought. Sage splits, scores, tags mood. e.g. 'ran 5km, head finally cleared, felt proud'"
        className="w-full text-[15px] leading-relaxed text-[var(--fg)] placeholder:text-[var(--muted-2)] resize-none relative"
      />

      {/* Mood quick-pick */}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] mr-0.5">mood</span>
        {QUICK_MOODS.map(m => {
          const em = EMOTIONS.find(e => e.id === m)!;
          const active = moodHint === m;
          return (
            <button
              key={m}
              onClick={() => setMoodHint(prev => prev === m ? null : m)}
              className={`text-[11px] px-2 py-0.5 rounded-full border transition flex items-center gap-1
                ${active
                  ? 'border-[var(--accent)] bg-[rgba(194,245,74,0.10)] text-[var(--fg)]'
                  : 'border-[var(--line-2)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[#3a3a42]'}`}
            >
              <span>{em.emoji}</span>{em.label}
            </button>
          );
        })}
        {moodHint && (
          <span className="text-[10px] text-[var(--accent)] mono">+3 XP bonus</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="text-[11px] text-[var(--muted-2)] flex-1">
          ⌘+Enter to log · Bonuses: +5 reflection · +3 mood · +3 honest slip
        </div>
        <button onClick={submit} disabled={!text.trim() || busy} className="btn btn-primary">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUp className="w-3.5 h-3.5" />}
          Log
        </button>
      </div>
      <SuggestionChips onPick={t => { setText(t); ref.current?.focus(); }} />
    </div>
  );
}
