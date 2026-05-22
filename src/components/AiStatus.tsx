import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Loader2, Check, Cloud } from 'lucide-react';
import { getLocalAIStatus, onLocalAIChange, warmupLocalAI } from '../lib/localAI';
import { getProviderName, getSelectedModelId, FREE_MODELS } from '../lib/ai';
import { useHabitStore } from '../store/useHabitStore';

export default function AiStatus() {
  const [s, setS] = useState(getLocalAIStatus());
  const apiKey = useHabitStore(st => st.apiKey);
  useEffect(() => onLocalAIChange(() => setS(getLocalAIStatus())), []);

  const provider = getProviderName(); // 'openrouter' | 'deepseek' | 'browser' | 'rules'

  // If a cloud key is configured, show that as the active AI.
  if (apiKey && (provider === 'openrouter' || provider === 'deepseek')) {
    const modelId = getSelectedModelId();
    const modelLabel = FREE_MODELS.find(m => m.id === modelId)?.label || modelId.split('/').pop();
    return (
      <div className="flex items-center gap-1.5 text-[11px]">
        <Cloud className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span className="mono text-[var(--accent)]">
          {provider}{provider === 'openrouter' ? ` · ${modelLabel}` : ''}
        </span>
      </div>
    );
  }

  // Otherwise the browser AI
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <Brain className="w-3.5 h-3.5 text-[var(--muted)]" />
      <AnimatePresence mode="wait">
        {s.status === 'idle' && (
          <motion.button
            key="idle"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => warmupLocalAI()}
            className="text-[var(--muted)] hover:text-[var(--accent)] underline decoration-dotted underline-offset-2 mono"
            title="Load in-browser AI (one-time ~67MB)"
          >
            load brain
          </motion.button>
        )}
        {s.status === 'loading' && (
          <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 mono text-[var(--muted)]">
            <Loader2 className="w-3 h-3 animate-spin" />
            loading brain {s.progress > 0 ? `${Math.round(s.progress * 100)}%` : ''}
          </motion.span>
        )}
        {s.status === 'ready' && (
          <motion.span key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 mono text-[var(--accent)]">
            <Check className="w-3 h-3" /> browser ai
          </motion.span>
        )}
        {s.status === 'failed' && (
          <motion.span key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mono text-[var(--neg)]">brain failed — using rules</motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
