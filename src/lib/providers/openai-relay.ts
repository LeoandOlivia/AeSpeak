import { getOpenAiBaseUrl } from './types';
import type { UserSettings } from '@/types';

const OPENAI_VOICE_IDS = new Set(['nova', 'shimmer', 'alloy', 'echo', 'fable', 'onyx']);

export function hasOpenAiRelay(settings: UserSettings): boolean {
  return Boolean(settings.openaiKey.trim());
}

export function getOpenAiKey(settings: UserSettings): string {
  const key = settings.openaiKey.trim();
  if (!key) throw new Error('请先配置 OpenAI API Key');
  return key;
}

/** 统一 OpenAI 中转：LLM + Whisper + TTS 共用 Key 与 Base URL */
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
  /** Key + 对话 API 可用（最低可用标准） */
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
      return '多为网络或浏览器跨域限制；请检查 Base URL，或在 Android 真机上再试';
    }
    if (
      status === 401 ||
      status === 403 ||
      lower.includes('api key') ||
      lower.includes('unauthorized') ||
      lower.includes('invalid key')
    ) {
      return 'Key 无效、过期或余额不足，请向中转站核对';
    }
    if (status === 404 || lower.includes('not found')) {
      return 'Base URL 可能填错，一般应填到 /v1，例如 https://xxx.com/v1';
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
      return '这是模型名问题：把「对话模型」改成中转站文档里的名称（如 deepseek-chat、gpt-4o-mini）';
    }
    if (status === 401 || status === 403) {
      return 'Key 无对话权限，或该模型未对你开放';
    }
  }

  if (id === 'whisper') {
    if (
      lower.includes('no available channel') ||
      lower.includes('distributor')
    ) {
      return '中转站未开通 Whisper，请确认模型名与账号权限';
    }
    if (status === 404 || lower.includes('not found') || lower.includes('not supported')) {
      return '该中转可能不支持 Whisper；若只需文字对话可忽略，或换支持语音的中转';
    }
  }

  if (id === 'tts') {
    if (
      lower.includes('no available channel') ||
      lower.includes('distributor')
    ) {
      return '中转站未开通 TTS 通道；请把下方「朗读引擎」改为 Edge TTS（免费）';
    }
    if (status === 404 || lower.includes('not found') || lower.includes('not supported')) {
      return '该中转可能不支持 OpenAI TTS；可在设置里改「Edge TTS（免费）」';
    }
    if (lower.includes('model') && lower.includes('tts')) {
      return 'TTS 模型不可用，可尝试 tts-1 或确认中转是否开通朗读';
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
        label: 'Key 与 Base URL',
        status: 'ok',
        message: '已连通（/models）',
      };
    }

    if (response.status === 401 || response.status === 403) {
      return withHint(
        {
          id: 'connect',
          label: 'Key 与 Base URL',
          status: 'fail',
          message: `Key 无效或无权限（${response.status}）`,
        },
        response.status,
      );
    }

    const message = await readError(response);
    return withHint(
      {
        id: 'connect',
        label: 'Key 与 Base URL',
        status: 'fail',
        message,
      },
      response.status,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : '网络请求失败';
    return withHint({
      id: 'connect',
      label: 'Key 与 Base URL',
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
        label: '对话 API',
        status: 'ok',
        message: `模型 ${model} 可用`,
      };
    }

    const message = await readError(response);
    return withHint(
      {
        id: 'chat',
        label: '对话 API',
        status: 'fail',
        message,
      },
      response.status,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : '网络请求失败';
    return withHint({
      id: 'chat',
      label: '对话 API',
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
        label: '语音识别 API',
        status: 'ok',
        message: 'Whisper 可用',
      };
    }

    if (response.status === 400 || response.status === 422) {
      return {
        id: 'whisper',
        label: '语音识别 API',
        status: 'ok',
        message: 'Whisper 端点可用（测试音频无效，属正常）',
      };
    }

    if (response.status === 401 || response.status === 403) {
      return withHint(
        {
          id: 'whisper',
          label: '语音识别 API',
          status: 'fail',
          message: `Key 无 Whisper 权限（${response.status}）`,
        },
        response.status,
      );
    }

    const message = await readError(response);
    return withHint(
      {
        id: 'whisper',
        label: '语音识别 API',
        status: 'fail',
        message,
      },
      response.status,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : '网络请求失败';
    return withHint({
      id: 'whisper',
      label: '语音识别 API',
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
        label: '朗读 API',
        status: 'ok',
        message: `${model} · ${voice} 可用`,
      };
    }

    const message = await readError(response);
    return withHint(
      {
        id: 'tts',
        label: '朗读 API',
        status: 'fail',
        message,
      },
      response.status,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : '网络请求失败';
    return withHint({
      id: 'tts',
      label: '朗读 API',
      status: 'fail',
      message,
    });
  }
}

/** 分项验证 OpenAI 中转 Key 与各 API 端点是否可用 */
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
        label: 'Key 与 Base URL',
        status: 'ok',
        message: '已连通（/models 不可用，对话 API 正常）',
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
    const samples = availableModels.slice(0, 4).join('、');
    chat = {
      ...chat,
      message: `${chat.message}（当前模型「${model}」不在 /models 列表中）`,
      hint: chat.hint ?? `可尝试：${samples}${availableModels.length > 4 ? ' 等' : ''}`,
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
          label: '朗读 API',
          status: 'ok' as const,
          message: '已跳过（当前使用 Edge TTS）',
        };
  items.push(tts);

  const ok = items.every((item) => item.status === 'ok');
  const coreOk =
    connect.status === 'ok' && items.some((item) => item.id === 'chat' && item.status === 'ok');
  return { ok, coreOk, baseUrl, items };
}
