import { getOpenAiBaseUrl } from './types';
import type { UserSettings } from '@/types';

const OPENAI_VOICE_IDS = new Set(['nova', 'shimmer', 'alloy', 'echo', 'fable', 'onyx']);

export function hasOpenAiRelay(settings: UserSettings): boolean {
  return Boolean(settings.openaiKey.trim());
}

export function getOpenAiKey(settings: UserSettings): string {
  const key = settings.openaiKey.trim();
  if (!key) throw new Error('Please configure your OpenAI API Key first');
  return key;
}

/** Unified OpenAI relay: LLM + Whisper + TTS share Key and Base URL */
export function applyOpenAiRelayPreset(settings: UserSettings): UserSettings {
  return {
    ...settings,
    llmProvider: 'openai',
    sttProvider: 'whisper',
    ttsProvider: 'openai',
    ttsVoice: OPENAI_VOICE_IDS.has(settings.ttsVoice) ? settings.ttsVoice : 'nova',
    ttsModel: settings.ttsModel?.trim() || 'tts-1',
  };
}

export const RELAY_MODEL_HINTS = [
  'gpt-4o-mini',
  'gpt-4o',
  'deepseek-chat',
  'deepseek-reasoner',
] as const;

export type OpenAiRelayCheckStatus = 'ok' | 'fail';

export interface OpenAiRelayCheckItem {
  id: 'connect' | 'chat' | 'whisper' | 'tts';
  label: string;
  status: OpenAiRelayCheckStatus;
  message: string;
  hint?: string;
}

export interface OpenAiRelayCheckResult {
  ok: boolean;
  /** Key + chat API available (minimum usable bar) */
  coreOk: boolean;
  baseUrl: string;
  items: OpenAiRelayCheckItem[];
}

function authHeaders(key: string): HeadersInit {
  return { Authorization: `Bearer ${key}` };
}

async function readError(response: Response): Promise<string> {
  const text = (await response.text()).trim();
  if (!text) return `HTTP ${response.status}`;

  try {
    const json = JSON.parse(text) as { error?: { message?: string }; message?: string };
    return json.error?.message ?? json.message ?? text.slice(0, 200);
  } catch {
    return text.slice(0, 200);
  }
}

function suggestHint(
  id: OpenAiRelayCheckItem['id'],
  message: string,
  status?: number,
): string | undefined {
  const lower = message.toLowerCase();

  if (id === 'connect') {
    if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
      return 'Usually a network or CORS issue — check Base URL or try on an Android device';
    }
    if (
      status === 401 ||
      status === 403 ||
      lower.includes('api key') ||
      lower.includes('unauthorized') ||
      lower.includes('invalid key')
    ) {
      return 'Invalid, expired, or insufficient balance — verify with your relay provider';
    }
    if (status === 404 || lower.includes('not found')) {
      return 'Base URL may be wrong — usually ends at /v1, e.g. https://xxx.com/v1';
    }
  }

  if (id === 'chat') {
    if (
      lower.includes('model') &&
      (lower.includes('not') ||
        lower.includes('exist') ||
        lower.includes('found') ||
        lower.includes('invalid') ||
        lower.includes('unsupported'))
    ) {
      return 'Model name issue — set Chat model to a name from your relay docs (e.g. deepseek-chat, gpt-4o-mini)';
    }
    if (status === 401 || status === 403) {
      return 'Key lacks chat permission, or this model is not enabled for your account';
    }
  }

  if (id === 'whisper') {
    if (
      lower.includes('no available channel') ||
      lower.includes('distributor')
    ) {
      return 'Relay has not enabled Whisper — verify model name and account permissions';
    }
    if (status === 404 || lower.includes('not found') || lower.includes('not supported')) {
      return 'This relay may not support Whisper — ignore if you only need text chat, or switch to a voice-capable relay';
    }
  }

  if (id === 'tts') {
    if (
      lower.includes('no available channel') ||
      lower.includes('distributor')
    ) {
      return 'Relay has not enabled TTS — set Speech engine below to Edge TTS (free)';
    }
    if (status === 404 || lower.includes('not found') || lower.includes('not supported')) {
      return 'This relay may not support OpenAI TTS — switch to Edge TTS (free) in settings';
    }
    if (lower.includes('model') && lower.includes('tts')) {
      return 'TTS model unavailable — try tts-1 or confirm your relay supports speech';
    }
  }

  return undefined;
}

function withHint(
  item: Omit<OpenAiRelayCheckItem, 'hint'>,
  status?: number,
): OpenAiRelayCheckItem {
  return { ...item, hint: suggestHint(item.id, item.message, status) };
}

async function fetchAvailableModels(baseUrl: string, key: string): Promise<string[] | null> {
  try {
    const response = await fetch(`${baseUrl}/models`, { headers: authHeaders(key) });
    if (!response.ok) return null;
    const json = (await response.json()) as { data?: Array<{ id?: string }> };
    return json.data?.map((m) => m.id).filter((id): id is string => Boolean(id)) ?? null;
  } catch {
    return null;
  }
}

async function checkModelsEndpoint(baseUrl: string, key: string): Promise<OpenAiRelayCheckItem> {
  try {
    const response = await fetch(`${baseUrl}/models`, { headers: authHeaders(key) });
    if (response.ok) {
      return {
        id: 'connect',
        label: 'Key & Base URL',
        status: 'ok',
        message: 'Connected (/models)',
      };
    }

    if (response.status === 401 || response.status === 403) {
      return withHint(
        {
          id: 'connect',
          label: 'Key & Base URL',
          status: 'fail',
          message: `Invalid Key or no permission (${response.status})`,
        },
        response.status,
      );
    }

    const message = await readError(response);
    return withHint(
      {
        id: 'connect',
        label: 'Key & Base URL',
        status: 'fail',
        message,
      },
      response.status,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network request failed';
    return withHint({
      id: 'connect',
      label: 'Key & Base URL',
      status: 'fail',
      message,
    });
  }
}

async function checkChatEndpoint(
  baseUrl: string,
  key: string,
  model: string,
): Promise<OpenAiRelayCheckItem> {
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        ...authHeaders(key),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        temperature: 0,
      }),
    });

    if (response.ok) {
      return {
        id: 'chat',
        label: 'Chat API',
        status: 'ok',
        message: `Model ${model} is available`,
      };
    }

    const message = await readError(response);
    return withHint(
      {
        id: 'chat',
        label: 'Chat API',
        status: 'fail',
        message,
      },
      response.status,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network request failed';
    return withHint({
      id: 'chat',
      label: 'Chat API',
      status: 'fail',
      message,
    });
  }
}

async function checkWhisperEndpoint(baseUrl: string, key: string): Promise<OpenAiRelayCheckItem> {
  try {
    const form = new FormData();
    form.append('file', new Blob(['x'], { type: 'audio/webm' }), 'ping.webm');
    form.append('model', 'whisper-1');

    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: authHeaders(key),
      body: form,
    });

    if (response.ok) {
      return {
        id: 'whisper',
        label: 'Speech recognition API',
        status: 'ok',
        message: 'Whisper is available',
      };
    }

    if (response.status === 400 || response.status === 422) {
      return {
        id: 'whisper',
        label: 'Speech recognition API',
        status: 'ok',
        message: 'Whisper endpoint reachable (invalid test audio is expected)',
      };
    }

    if (response.status === 401 || response.status === 403) {
      return withHint(
        {
          id: 'whisper',
          label: 'Speech recognition API',
          status: 'fail',
          message: `Key lacks Whisper permission (${response.status})`,
        },
        response.status,
      );
    }

    const message = await readError(response);
    return withHint(
      {
        id: 'whisper',
        label: 'Speech recognition API',
        status: 'fail',
        message,
      },
      response.status,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network request failed';
    return withHint({
      id: 'whisper',
      label: 'Speech recognition API',
      status: 'fail',
      message,
    });
  }
}

async function checkTtsEndpoint(
  baseUrl: string,
  key: string,
  model: string,
  voice: string,
): Promise<OpenAiRelayCheckItem> {
  try {
    const response = await fetch(`${baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        ...authHeaders(key),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: 'Hi',
        voice,
        response_format: 'mp3',
      }),
    });

    if (response.ok) {
      return {
        id: 'tts',
        label: 'Speech API',
        status: 'ok',
        message: `${model} · ${voice} is available`,
      };
    }

    const message = await readError(response);
    return withHint(
      {
        id: 'tts',
        label: 'Speech API',
        status: 'fail',
        message,
      },
      response.status,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network request failed';
    return withHint({
      id: 'tts',
      label: 'Speech API',
      status: 'fail',
      message,
    });
  }
}

/** Validate OpenAI relay Key and each API endpoint */
export async function validateOpenAiRelayConnection(
  settings: UserSettings,
): Promise<OpenAiRelayCheckResult> {
  const preset = applyOpenAiRelayPreset(settings);
  const key = getOpenAiKey(preset);
  const baseUrl = getOpenAiBaseUrl(preset);
  const model = preset.llmModel.trim() || 'gpt-4o-mini';
  const ttsModel = preset.ttsModel || 'tts-1';
  const voice = preset.ttsVoice || 'nova';

  let connect = await checkModelsEndpoint(baseUrl, key);
  let chat: OpenAiRelayCheckItem | undefined;

  if (connect.status === 'fail') {
    chat = await checkChatEndpoint(baseUrl, key, model);
    if (chat.status === 'ok') {
      connect = {
        id: 'connect',
        label: 'Key & Base URL',
        status: 'ok',
        message: 'Connected (/models unavailable, chat API OK)',
      };
    }
  }

  const items: OpenAiRelayCheckItem[] = [connect];

  if (connect.status === 'fail') {
    return { ok: false, coreOk: false, baseUrl, items };
  }

  if (!chat) {
    chat = await checkChatEndpoint(baseUrl, key, model);
  }

  const availableModels = connect.message.includes('/models')
    ? await fetchAvailableModels(baseUrl, key)
    : null;
  if (
    availableModels &&
    availableModels.length > 0 &&
    !availableModels.includes(model) &&
    chat.status === 'fail'
  ) {
    const samples = availableModels.slice(0, 4).join(', ');
    chat = {
      ...chat,
      message: `${chat.message} (model "${model}" is not in /models list)`,
      hint: chat.hint ?? `Try: ${samples}${availableModels.length > 4 ? ', etc.' : ''}`,
    };
  }

  items.push(chat);

  const whisper = await checkWhisperEndpoint(baseUrl, key);
  items.push(whisper);

  const tts =
    preset.ttsProvider === 'openai'
      ? await checkTtsEndpoint(baseUrl, key, ttsModel, voice)
      : {
          id: 'tts' as const,
          label: 'Speech API',
          status: 'ok' as const,
          message: 'Skipped (using Edge TTS)',
        };
  items.push(tts);

  const ok = items.every((item) => item.status === 'ok');
  const coreOk =
    connect.status === 'ok' && items.some((item) => item.id === 'chat' && item.status === 'ok');
  return { ok, coreOk, baseUrl, items };
}
