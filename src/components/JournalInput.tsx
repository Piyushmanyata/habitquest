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
    <div className="surface p-4">
      <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-3">
        <Sparkles className="w-3.5 h-3.5" />
        <span>What did you just do?</span>
        <span className="ml-auto mono text-[10px] text-[var(--muted-2)]">
          {apiKey ? 'deepseek-v3' : 'local heuristic'}
        </span>
      </div>
      <textarea
        ref={ref}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={onKey}
        rows={3}
        autoFocus
        placeholder="One or many — Sage splits & scores each. e.g. ran 5km, read 30 pages, then doom-scrolled 1h"
        className="w-full text-[15px] leading-relaxed text-[var(--fg)] placeholder:text-[var(--muted-2)] resize-none"
      />
      <div className="flex items-center justify-between mt-2">
        <div className="text-[11px] text-[var(--muted-2)]">⌘+Enter to log · Sage auto-categorizes & scores</div>
        <button onClick={submit} disabled={!text.trim() || busy} className="btn btn-primary">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUp className="w-3.5 h-3.5" />}
          Log
        </button>
      </div>
      <SuggestionChips onPick={t => { setText(t); ref.current?.focus(); }} />
    </div>
  );
}
