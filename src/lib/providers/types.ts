import type { UserSettings } from '@/types';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmStreamOptions {
  settings: UserSettings;
  messages: LlmMessage[];
  onToken: (token: string) => void;
  signal?: AbortSignal;
}

export interface SttOptions {
  settings: UserSettings;
  audioBase64: string;
  mimeType: string;
}

export interface TtsOptions {
  settings: UserSettings;
  text: string;
  voice?: string;
}

export interface LlmProvider {
  name: string;
  validate(settings: UserSettings): Promise<void>;
  streamChat(options: LlmStreamOptions): Promise<void>;
}

export interface SttProvider {
  name: string;
  validate(settings: UserSettings): Promise<void>;
  transcribe(options: SttOptions): Promise<string>;
}

export interface TtsProvider {
  name: string;
  validate(settings: UserSettings): Promise<void>;
  synthesize(options: TtsOptions): Promise<ArrayBuffer>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export function getApiKey(settings: UserSettings): string {
  if (settings.llmProvider === 'openai') {
    if (!settings.openaiKey) throw new ProviderError('Please configure OpenAI Key first', 'openai');
    return settings.openaiKey;
  }
  if (!settings.deepseekKey) throw new ProviderError('Please configure DeepSeek Key first', 'deepseek');
  return settings.deepseekKey;
}

export function normalizeBaseUrl(custom: string | undefined, official: string): string {
  const trimmed = (custom ?? '').trim().replace(/\/+$/, '');
  if (!trimmed) return official;
  if (trimmed.endsWith('/v1')) return trimmed;
  return `${trimmed}/v1`;
}

export function getDeepseekBaseUrl(settings: UserSettings): string {
  return normalizeBaseUrl(settings.deepseekBaseUrl, 'https://api.deepseek.com/v1');
}

export function isOpenRouterBaseUrl(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return host === 'openrouter.ai' || host.endsWith('.openrouter.ai');
  } catch {
    return baseUrl.toLowerCase().includes('openrouter.ai');
  }
}

/** OpenRouter keys always start with sk-or-v1 */
export function isOpenRouterApiKey(apiKey: string): boolean {
  return apiKey.trim().startsWith('sk-or-v1');
}

export function getOpenAiBaseUrl(settings: UserSettings): string {
  const custom = (settings.openaiBaseUrl ?? '').trim();
  if (custom) {
    return normalizeBaseUrl(custom, 'https://api.openai.com/v1');
  }
  if (isOpenRouterApiKey(settings.openaiKey)) {
    return 'https://openrouter.ai/api/v1';
  }
  return 'https://api.openai.com/v1';
}

/** Recommended OpenRouter headers (also helps routing/analytics) */
export function getOpenRouterHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey.trim()}`,
    'HTTP-Referer': 'https://espeak.app',
    'X-Title': 'eSpeak',
  };
}

export function getLlmBaseUrl(settings: UserSettings): string {
  return settings.llmProvider === 'openai'
    ? getOpenAiBaseUrl(settings)
    : getDeepseekBaseUrl(settings);
}

export function getLlmModel(settings: UserSettings): string {
  const raw = settings.llmModel?.trim();
  if (!raw) return settings.llmProvider === 'openai' ? 'gpt-4o-mini' : 'deepseek-chat';
  // DeepSeek and most relays require lowercase model ids (e.g. deepseek-v4-flash)
  if (settings.llmProvider === 'deepseek') return raw.toLowerCase();
  return raw;
}

export function parseApiErrorMessage(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return 'Request failed';
  try {
    const json = JSON.parse(trimmed) as { error?: { message?: string }; message?: string };
    return json.error?.message ?? json.message ?? trimmed;
  } catch {
    return trimmed;
  }
}

export async function parseSseStream(
  response: Response,
  onToken: (token: string) => void,
): Promise<void> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseApiErrorMessage(text) || `HTTP ${response.status}`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Unable to read streaming response');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const token = json.choices?.[0]?.delta?.content;
        if (token) onToken(token);
      } catch {
        // skip malformed chunks
      }
    }
  }
}

export async function llmJsonCompletion<T>(
  settings: UserSettings,
  system: string,
  user: string,
): Promise<T> {
  const apiKey = getApiKey(settings);
  const baseUrl = getLlmBaseUrl(settings);
  const model = getLlmModel(settings);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `LLM request failed (${response.status})`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('LLM returned empty response');
  return JSON.parse(content) as T;
}
