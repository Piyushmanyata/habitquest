import { Cloud, Brain } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';
import { getProviderName, getSelectedModelId, FREE_MODELS } from '../lib/ai';

export default function AiStatus() {
  const apiKey = useHabitStore(s => s.apiKey);
  const provider = getProviderName();

  if (!apiKey) {
    return (
      <div className="flex items-center gap-1.5 text-[11px]">
        <Brain className="w-3.5 h-3.5 text-[var(--muted-2)]" />
        <span className="mono text-[var(--muted)]">rules fallback — add key in settings</span>
      </div>
    );
  }

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
