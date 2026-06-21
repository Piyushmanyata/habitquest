export type AiProviderName = 'openrouter' | 'deepseek';

export const FREE_MODELS: { id: string; label: string; note: string }[] = [
  { id: 'mistralai/mistral-small-3.2-24b-instruct:free', label: 'Mistral Small 3.2', note: 'Best JSON + reasoning (default)' },
  { id: 'deepseek/deepseek-chat-v3.1:free', label: 'DeepSeek V3.1', note: 'Fast + smart, great categories' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', note: 'Reliable fallback, strong reasoning' },
  { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B', note: 'Google, fast + accurate' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free', label: 'Mistral Small 3.1', note: 'Older but rock-solid JSON' },
  { id: 'qwen/qwen-2.5-72b-instruct:free', label: 'Qwen 2.5 72B', note: 'Strong instruction following' },
  { id: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B', note: 'OpenAI flagship open' },
  { id: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B', note: 'OpenAI mid-tier, fast' },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B', note: 'Tiny + very fast fallback' },
];

const DEFAULT_FREE_MODEL = FREE_MODELS[0].id;
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function getSelectedModelId() {
  if (typeof localStorage === 'undefined') return DEFAULT_FREE_MODEL;
  return localStorage.getItem('hq-model') || DEFAULT_FREE_MODEL;
}

export function setSelectedModel(id: string) {
  if (typeof localStorage !== 'undefined') localStorage.setItem('hq-model', id);
}

export function getStoredApiKey() {
  if (typeof localStorage === 'undefined') return '';
  return (
    localStorage.getItem('hq-openrouter-key') ||
    localStorage.getItem('hq-deepseek-key') ||
    (import.meta as any).env?.VITE_OPENROUTER_KEY ||
    (import.meta as any).env?.VITE_DEEPSEEK_KEY ||
    ''
  );
}

export function getProviderConfig(key: string): { url: string; model: string; extraHeaders: Record<string, string>; providerName: AiProviderName } {
  if (key.startsWith('sk-or-')) {
    return {
      url: OPENROUTER_URL,
      model: getSelectedModelId(),
      extraHeaders: {
        'HTTP-Referer': typeof location !== 'undefined' ? location.origin : 'https://habitquest.app',
        'X-Title': 'HabitQuest',
      },
      providerName: 'openrouter',
    };
  }
  return { url: DEEPSEEK_URL, model: 'deepseek-chat', extraHeaders: {}, providerName: 'deepseek' };
}

export function extractJson(text: string): any | null {
  try { return JSON.parse(text); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]+?)```/i);
  if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)); } catch {}
  }
  return null;
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type CompletionOpts = {
  apiKey?: string;
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: boolean;
};

async function callCompletion(opts: CompletionOpts, parse: (content: string) => unknown | null): Promise<unknown | null> {
  const apiKey = opts.apiKey || getStoredApiKey();
  if (!apiKey) return null;

  const prov = getProviderConfig(apiKey);
  const baseModel = opts.model || prov.model;
  const tryOrder = prov.providerName === 'openrouter'
    ? [baseModel, ...FREE_MODELS.map(m => m.id).filter(id => id !== baseModel)]
    : [baseModel];

  for (const model of tryOrder) {
    try {
      const res = await fetch(prov.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...prov.extraHeaders },
        body: JSON.stringify({
          model,
          messages: opts.messages,
          temperature: opts.temperature ?? 0.7,
          ...(typeof opts.maxTokens === 'number' ? { max_tokens: opts.maxTokens } : {}),
          ...(opts.responseFormat ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      if (!res.ok) {
        if (res.status === 429 || res.status === 404) continue;
        throw new Error(`AI ${res.status}`);
      }
      const data = await res.json();
      const content = String(data?.choices?.[0]?.message?.content || '').trim();
      const parsed = parse(content);
      if (parsed !== null) return parsed;
    } catch (err) {
      console.warn('[aiClient] try failed:', model, err);
      continue;
    }
  }

  return null;
}

export async function callJsonCompletion(opts: CompletionOpts): Promise<any | null> {
  return callCompletion(opts, content => extractJson(content));
}

export async function callTextCompletion(opts: CompletionOpts): Promise<string | null> {
  return callCompletion(opts, content => (content ? content : null)) as Promise<string | null>;
}
