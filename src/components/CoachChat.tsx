import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, ArrowUp, Loader2, X, Sparkles, Wand2 } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';

const STARTERS = [
  "What should I do next?",
  "Why am I slipping?",
  "Roast my day.",
  "Best habit to add?",
  "How am I really doing?",
  "Spot a pattern.",
];

function relTime(at: number) {
  const s = Math.floor((Date.now() - at) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m`;
  return `${Math.floor(s/3600)}h`;
}

export default function CoachChat() {
  const history = useHabitStore(s => s.chatHistory);
  const send = useHabitStore(s => s.sendChat);
  const clear = useHabitStore(s => s.clearChat);
  const apiKey = useHabitStore(s => s.apiKey);
  const tone = useHabitStore(s => s.tone);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, sending]);

  // Accepts an optional explicit message so suggestion-clicks can bypass React state
  // (setText is async — relying on `text` here would send the previous value).
  async function submit(explicit?: string) {
    const t = (explicit ?? text).trim();
    if (!t || sending) return;
    setText('');
    setSending(true);
    try { await send(t); } finally { setSending(false); taRef.current?.focus(); }
  }

  // Clicking a starter chip auto-fires the question.
  function pick(s: string) {
    if (sending) return;
    submit(s);
  }

  return (
    <div className="surface p-5 relative overflow-hidden">
      {/* ambient accent */}
      <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-[radial-gradient(circle,rgba(194,245,74,0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.06),transparent_70%)] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#c2f54a] to-[#7dd3fc] grid place-items-center text-[#0a0a0b]">
            <MessageCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-[var(--fg)] leading-tight">Talk to Sage</h3>
            <div className="text-[10px] mono uppercase tracking-wider text-[var(--muted-2)]">
              tone · <span className="text-[var(--accent)]">{tone}</span>
            </div>
          </div>
        </div>
        {history.length > 0 && (
          <button onClick={clear} className="text-[10px] mono text-[var(--muted-2)] hover:text-[var(--fg)] flex items-center gap-1">
            <X className="w-3 h-3" /> clear
          </button>
        )}
      </div>

      {!apiKey && (
        <div className="text-[12px] text-[var(--muted)] py-2 relative">
          Add a free OpenRouter key in <span className="mono">Settings</span> to chat with Sage.
        </div>
      )}

      {/* Empty state */}
      {history.length === 0 && apiKey && (
        <div className="relative">
          <div className="text-[12.5px] text-[var(--muted)] leading-relaxed mb-3">
            Ask anything about your habits. Sage sees your memory, recent entries, and patterns.
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STARTERS.map(s => (
              <button
                key={s}
                onClick={() => pick(s)}
                className="text-[12px] px-3 py-1.5 rounded-full border hairline-2 text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--accent)] hover:bg-white/[0.03] transition"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {history.length > 0 && (
        <div
          ref={scrollRef}
          className="overflow-y-auto pr-1 space-y-3 mb-3 text-[13.5px] leading-relaxed relative"
          style={{ maxHeight: 'min(60vh, 520px)', minHeight: 180 }}
        >
          <AnimatePresence initial={false}>
            {history.map(m => (
              <motion.div
                key={m.at}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div className={`max-w-[88%] px-3 py-2 rounded-xl ${
                  m.role === 'user'
                    ? 'bg-[var(--accent)] text-[#0a0a0b] rounded-br-sm'
                    : 'bg-[var(--panel-2)] text-[var(--fg)] border hairline-2 rounded-bl-sm'
                }`}>
                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-1 mb-1 text-[9.5px] uppercase tracking-wider mono">
                      <Sparkles className="w-2.5 h-2.5 text-[var(--accent)]" />
                      <span className="text-[var(--accent)]">sage</span>
                      <span className="text-[var(--muted-2)] ml-auto">{relTime(m.at)}</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                </div>
              </motion.div>
            ))}
            {sending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="px-3 py-2 rounded-xl bg-[var(--panel-2)] border hairline-2 flex items-center gap-2 text-[var(--muted)]">
                  <span className="text-[11px] mono uppercase tracking-wider text-[var(--accent)]">sage</span>
                  <span className="flex items-center">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 relative">
        <div className="flex-1 relative">
          <textarea
            ref={taRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder={apiKey ? "Ask Sage anything…" : "Add an OpenRouter key in Settings first"}
            rows={1}
            disabled={!apiKey || sending}
            className="w-full text-[13.5px] bg-[var(--panel-2)] border hairline-2 rounded-lg pl-3 pr-9 py-2.5 resize-none focus:border-[var(--accent)] disabled:opacity-50 leading-relaxed"
            style={{ minHeight: 44, maxHeight: 140 }}
          />
          {history.length > 0 && !sending && apiKey && (
            <Wand2 className="absolute right-2.5 top-3 w-3.5 h-3.5 text-[var(--muted-2)] pointer-events-none" />
          )}
        </div>
        <button
          onClick={() => submit()}
          disabled={!text.trim() || !apiKey || sending}
          className="p-2.5 rounded-lg bg-[var(--accent)] text-[#0a0a0b] disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition shrink-0"
          title="Send (Enter)"
        >
          <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
      {apiKey && (
        <div className="mt-1.5 text-[10px] mono text-[var(--muted-2)]">
          Enter to send · Shift+Enter for newline
        </div>
      )}
    </div>
  );
}
