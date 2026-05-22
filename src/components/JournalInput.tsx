import { useEffect, useRef, useState } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { ArrowUp, Sparkles, Loader2, Mic, MicOff } from 'lucide-react';
import SuggestionChips from './SuggestionChips';
import { voiceAvailable, createRecognizer } from '../lib/voice';

export default function JournalInput() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const baseTextRef = useRef('');

  const addEntries = useHabitStore(s => s.addEntries);
  const apiKey = useHabitStore(s => s.apiKey);

  async function submit() {
    if (!text.trim() || busy) return;
    if (listening) toggleVoice();
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

  function toggleVoice() {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    if (!voiceAvailable()) return;
    baseTextRef.current = text ? text.trim() + ' ' : '';
    const rec = createRecognizer(
      (heard, isFinal) => {
        const next = baseTextRef.current + heard;
        setText(next);
        if (isFinal) baseTextRef.current = next + ' ';
      },
      () => setListening(false),
    );
    if (!rec) return;
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  useEffect(() => () => recRef.current?.stop(), []);

  const voiceOn = voiceAvailable();

  return (
    <div className="surface p-4 relative overflow-hidden">
      {/* subtle accent halo top-left */}
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
        placeholder="One or many — Sage splits & scores each. e.g. ran 5km, read 30 pages, then doom-scrolled 1h"
        className="w-full text-[15px] leading-relaxed text-[var(--fg)] placeholder:text-[var(--muted-2)] resize-none relative"
      />
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="text-[11px] text-[var(--muted-2)] flex-1">
          ⌘+Enter to log · Sage categorizes & scores
        </div>
        {voiceOn && (
          <button
            onClick={toggleVoice}
            disabled={busy}
            className={`btn !py-1.5 !px-2.5 transition ${listening ? 'border-rose-400 text-rose-300 bg-rose-500/10' : ''}`}
            title={listening ? 'Stop listening' : 'Voice input'}
          >
            {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            {listening ? 'listening…' : 'voice'}
          </button>
        )}
        <button onClick={submit} disabled={!text.trim() || busy} className="btn btn-primary">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUp className="w-3.5 h-3.5" />}
          Log
        </button>
      </div>
      <SuggestionChips onPick={t => { setText(t); ref.current?.focus(); }} />
    </div>
  );
}
