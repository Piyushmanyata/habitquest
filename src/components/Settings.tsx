import { AnimatePresence, motion } from 'framer-motion';
import { X, ExternalLink, Check, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { FREE_MODELS, getSelectedModelId, setSelectedModel } from '../lib/ai';
import { loadVoices, speak, ttsAvailable } from '../lib/tts';

export default function Settings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const apiKey = useHabitStore(s => s.apiKey);
  const setApiKey = useHabitStore(s => s.setApiKey);
  const ttsEnabled = useHabitStore(s => s.ttsEnabled);
  const ttsVoice = useHabitStore(s => s.ttsVoice);
  const setTts = useHabitStore(s => s.setTts);
  const tone = useHabitStore(s => s.tone);
  const setTone = useHabitStore(s => s.setTone);
  const [local, setLocal] = useState(apiKey);
  const [model, setModel] = useState(getSelectedModelId());
  const [saved, setSaved] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!open) return;
    if (ttsAvailable()) loadVoices().then(setVoices);
  }, [open]);

  const isOpenRouter = local.startsWith('sk-or-') || apiKey.startsWith('sk-or-');

  function save() {
    setApiKey(local);
    setSelectedModel(model);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function preview() {
    speak("Hey, this is Sage. I'll narrate your wins and slips like this.", { voiceName: ttsVoice });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="surface w-full max-w-md p-6"
            initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-medium">Settings</h2>
              <button onClick={onClose} className="p-1 rounded-md hover:bg-white/5 text-[var(--muted)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-[var(--muted)]">OpenRouter / DeepSeek API Key</label>
              <input
                value={local}
                onChange={e => setLocal(e.target.value)}
                placeholder="sk-or-... (OpenRouter) or sk-... (DeepSeek)"
                className="mt-1.5 w-full px-3 py-2 rounded-md border hairline-2 mono text-[12px] focus:border-[var(--accent)]"
                type="password"
              />
              <p className="text-[11px] text-[var(--muted-2)] mt-2 leading-relaxed">
                Auto-detects provider from key prefix. OpenRouter <span className="mono">:free</span> models are <strong>totally free</strong> (no card). Without a key the app uses an in-browser AI (Transformers.js, ~67MB one-time download) and falls back to a local heuristic.
              </p>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-[var(--accent)] mt-2 hover:underline"
              >
                Get a free OpenRouter key <ExternalLink className="w-3 h-3" />
              </a>

              {isOpenRouter && (
                <div className="mt-4">
                  <label className="text-xs text-[var(--muted)]">Free model</label>
                  <select
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    className="mt-1.5 w-full px-3 py-2 rounded-md border hairline-2 mono text-[12px] focus:border-[var(--accent)] bg-[var(--panel)]"
                  >
                    {FREE_MODELS.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.label} — {m.note}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[var(--muted-2)] mt-1.5 mono">
                    All listed models end in <span className="text-[var(--accent)]">:free</span>. No usage charges.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 mt-5">
                <button onClick={save} className="btn btn-primary">
                  {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : 'Save'}
                </button>
                {apiKey && (
                  <button onClick={() => { setLocal(''); setApiKey(''); }} className="btn">Clear key</button>
                )}
                <span className="ml-auto text-[11px] text-[var(--muted-2)]">
                  Status: <span className={apiKey ? 'text-[var(--accent)] mono' : 'text-[var(--muted)] mono'}>
                    {apiKey ? (isOpenRouter ? 'openrouter' : 'deepseek') : 'browser-ai'}
                  </span>
                </span>
              </div>

              <div className="mt-6 pt-5 border-t hairline">
                <label className="text-xs text-[var(--muted)]">Sage's Tone</label>
                <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                  {(['savage', 'balanced', 'encouraging'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-2 py-1.5 rounded-md text-[11px] font-medium uppercase tracking-wider transition border
                        ${tone === t
                          ? 'bg-[var(--accent)] text-[#0a0a0b] border-[var(--accent)]'
                          : 'border-[var(--line-2)] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-white/[0.03]'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--muted-2)] mt-1.5">
                  {tone === 'savage' && 'Brutally honest. Roasts the slips. Punch lines only.'}
                  {tone === 'balanced' && 'Half coach, half cheeky dungeon master. Default.'}
                  {tone === 'encouraging' && 'Warm and supportive. Finds the silver lining.'}
                </p>
              </div>

              <div className="mt-6 pt-5 border-t hairline">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-[var(--muted)] flex items-center gap-2">
                    {ttsEnabled ? <Volume2 className="w-3.5 h-3.5 text-[var(--accent)]" /> : <VolumeX className="w-3.5 h-3.5" />}
                    Voice Narration (TTS)
                  </label>
                  <button
                    onClick={() => setTts(!ttsEnabled, ttsVoice)}
                    className={`w-10 h-5 rounded-full relative transition ${ttsEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--line-2)]'}`}
                    aria-label="Toggle TTS"
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-[#0a0a0b] transition-all ${ttsEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
                {ttsAvailable() ? (
                  <>
                    <select
                      value={ttsVoice}
                      onChange={e => setTts(ttsEnabled, e.target.value)}
                      disabled={!ttsEnabled}
                      className="mt-1.5 w-full px-3 py-2 rounded-md border hairline-2 mono text-[12px] focus:border-[var(--accent)] bg-[var(--panel)] disabled:opacity-50"
                    >
                      <option value="">Auto (best English)</option>
                      {voices.filter(v => /en/i.test(v.lang)).map(v => (
                        <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={preview} disabled={!ttsEnabled} className="btn !py-1 !px-2.5 text-[11px]">
                        <Volume2 className="w-3 h-3" /> Preview
                      </button>
                      <span className="text-[10px] text-[var(--muted-2)]">
                        Sage will narrate each log out loud.
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] text-[var(--muted-2)]">Voice not available in this browser.</div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
