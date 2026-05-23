import { useRef, useState } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { ArrowUp, Sparkles, Loader2 } from 'lucide-react';
import SuggestionChips from './SuggestionChips';

export default function JournalInput() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const addEntries = useHabitStore(s => s.addEntries);
  const apiKey = useHabitStore(s => s.apiKey);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await addEntries(text);
      setText('');
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
        <span>What did you just do? Tell Sage what happened, how you felt, what you thought.</span>
        <span className="ml-auto mono text-[10px] text-[var(--muted-2)]">
          {apiKey ? 'sage · cloud' : 'heuristic'}
        </span>
      </div>
      <textarea
        ref={ref}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={onKey}
        rows={3}
        autoFocus
        placeholder="e.g. ran 5km, head finally cleared, felt proud — Sage reads the words and tags the mood for you"
        className="w-full text-[15px] leading-relaxed text-[var(--fg)] placeholder:text-[var(--muted-2)] resize-none relative"
      />

      <div className="flex items-center justify-between mt-3 gap-2">
        <div className="text-[11px] text-[var(--muted-2)] flex-1">
          ⌘+Enter to log · Bonuses: +5 reflection · +3 honest slip
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
