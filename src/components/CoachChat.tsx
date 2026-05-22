import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, ArrowUp, Loader2, X, Sparkles } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';

const STARTERS = [
  "What should I do next?",
  "Why am I slipping?",
  "Roast my day.",
  "Best habit to add?",
];

export default function CoachChat() {
  const history = useHabitStore(s => s.chatHistory);
  const send = useHabitStore(s => s.sendChat);
  const clear = useHabitStore(s => s.clearChat);
  const apiKey = useHabitStore(s => s.apiKey);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history]);

  async function submit() {
    const t = text.trim();
    if (!t || sending) return;
    setText('');
    setSending(true);
    try { await send(t); } finally { setSending(false); }
  }

  function pick(s: string) { setText(s); }

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5 text-[var(--accent)]" />
          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Talk to Sage</h3>
        </div>
        {history.length > 0 && (
          <button onClick={clear} className="text-[10px] mono text-[var(--muted-2)] hover:text-[var(--fg)] flex items-center gap-1">
            <X className="w-2.5 h-2.5" /> clear
          </button>
        )}
      </div>

      {!apiKey && (
        <div className="text-[11px] text-[var(--muted-2)] py-2">
          Add a free OpenRouter key in Settings to chat with Sage.
        </div>
      )}

      {/* Messages */}
      {history.length > 0 && (
        <div
          ref={scrollRef}
          className="max-h-56 overflow-y-auto pr-1 space-y-2 mb-2 text-[12.5px] leading-relaxed"
        >
          <AnimatePresence initial={false}>
            {history.map(m => (
              <motion.div
                key={m.at}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div className={`max-w-[85%] px-2.5 py-1.5 rounded-lg ${
                  m.role === 'user'
                    ? 'bg-[var(--accent)] text-[#0a0a0b]'
                    : 'bg-[var(--line)] text-[var(--fg)] border hairline-2'
                }`}>
                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-1 mb-0.5 text-[9px] uppercase tracking-wider mono text-[var(--accent)]">
                      <Sparkles className="w-2 h-2" /> sage
                    </div>
                  )}
                  {m.content}
                </div>
              </motion.div>
            ))}
            {sending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="px-2.5 py-1.5 rounded-lg bg-[var(--line)] border hairline-2 flex items-center gap-1.5 text-[var(--muted)]">
                  <Loader2 className="w-3 h-3 animate-spin" /> Sage is thinking…
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Quick starters */}
      {history.length === 0 && apiKey && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {STARTERS.map(s => (
            <button
              key={s}
              onClick={() => pick(s)}
              className="text-[11px] px-2 py-0.5 rounded-full border hairline-2 text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--accent)]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Ask Sage anything about your habits…"
          rows={1}
          disabled={!apiKey || sending}
          className="flex-1 text-[12.5px] bg-[var(--panel-2)] border hairline-2 rounded-md px-2 py-1.5 resize-none focus:border-[var(--accent)] disabled:opacity-50"
        />
        <button
          onClick={submit}
          disabled={!text.trim() || !apiKey || sending}
          className="p-1.5 rounded-md bg-[var(--accent)] text-[#0a0a0b] disabled:opacity-30"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
