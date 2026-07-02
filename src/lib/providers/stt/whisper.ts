import type { SttProvider, SttOptions } from '../types';
import {
  getOpenAiBaseUrl,
  getOpenRouterHeaders,
  isOpenRouterApiKey,
  isOpenRouterBaseUrl,
  parseApiErrorMessage,
  ProviderError,
} from '../types';
import type { UserSettings } from '@/types';
import { mimeToWhisperFilename } from '@/lib/audio/recording';

export function isWhisperChannelError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('no available channel') && lower.includes('whisper');
}

export function isOpenRouterAudioBalanceError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('$0.50') || lower.includes('balance for audio');
}

export function formatSttErrorMessage(message: string, baseUrl?: string): string {
  if (
    isOpenRouterApiKey(message) ||
    (message.includes('platform.openai.com') && message.includes('sk-or-v1'))
  ) {
    return 'OpenRouter key detected but request went to OpenAI. Set Base URL to https://openrouter.ai/api/v1 (or leave Base URL empty — we auto-detect sk-or-v1 keys).';
  }
  if (isOpenRouterAudioBalanceError(message)) {
    return 'OpenRouter voice features require account balance ≥ $0.50 — top up at openrouter.ai';
  }
  if (isWhisperChannelError(message)) {
    return 'Relay has not enabled Whisper — verify model name and account permissions';
  }
  if (baseUrl && isOpenRouterBaseUrl(baseUrl)) {
    return `${message} (OpenRouter · ${baseUrl})`;
  }
  return message;
}

function formatSttValidationError(message: string, settings: UserSettings, baseUrl: string): string {
  if (
    isOpenRouterApiKey(settings.openaiKey) &&
    !isOpenRouterBaseUrl(baseUrl)
  ) {
    return 'This is an OpenRouter key (sk-or-v1…). Set Base URL to https://openrouter.ai/api/v1';
  }
  if (message.includes('platform.openai.com') && isOpenRouterApiKey(settings.openaiKey)) {
    return 'OpenRouter key was sent to OpenAI by mistake. Set Base URL to https://openrouter.ai/api/v1 and try again.';
  }
  return formatSttErrorMessage(message, baseUrl);
}

export const mockStt: SttProvider = {
  name: 'mock',

  async validate() {},

  async transcribe() {
    return "I'd like to order a coffee, please.";
  },
};

function mimeToAudioFormat(mimeType: string): string {
  const lower = mimeType.toLowerCase();
  if (lower.includes('webm')) return 'webm';
  if (lower.includes('mp4') || lower.includes('m4a')) return 'm4a';
  if (lower.includes('mp3') || lower.includes('mpeg')) return 'mp3';
  if (lower.includes('wav')) return 'wav';
  if (lower.includes('ogg')) return 'ogg';
  if (lower.includes('flac')) return 'flac';
  if (lower.includes('aac')) return 'aac';
  return 'webm';
}

function getWhisperModel(settings: UserSettings, baseUrl: string): string {
  const custom = settings.whisperModel?.trim();
  if (custom) return custom;
  return isOpenRouterBaseUrl(baseUrl) ? 'openai/whisper-1' : 'whisper-1';
}

async function postOpenRouterTranscription(
  settings: UserSettings,
  audioBase64: string,
  mimeType: string,
): Promise<string> {
  const baseUrl = getOpenAiBaseUrl(settings);
  const payload = {
    model: getWhisperModel(settings, baseUrl),
    language: 'en',
    temperature: 0,
    input_audio: {
      data: audioBase64,
      format: mimeToAudioFormat(mimeType),
    },
  };

  const headers = {
    'Content-Type': 'application/json',
    ...getOpenRouterHeaders(settings.openaiKey),
  };

  const useDevProxy = import.meta.env.DEV && typeof window !== 'undefined';
  const response = useDevProxy
    ? await fetch('/api/whisper-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl,
          apiKey: settings.openaiKey,
          payload,
        }),
      })
    : await fetch(`${baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

  if (!response.ok) {
    const text = await response.text();
    throw new ProviderError(
      formatSttErrorMessage(parseApiErrorMessage(text) || 'Whisper transcription failed', baseUrl),
      'whisper',
    );
  }

  const json = (await response.json()) as { text?: string };
  return json.text?.trim() ?? '';
}

async function postOpenAiMultipartTranscription(
  settings: UserSettings,
  audioBase64: string,
  mimeType: string,
): Promise<string> {
  const baseUrl = getOpenAiBaseUrl(settings);
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const filename = mimeToWhisperFilename(mimeType);
  const blob = new Blob([bytes], { type: mimeType });
  const form = new FormData();
  form.append('file', blob, filename);
  form.append('model', getWhisperModel(settings, baseUrl));
  form.append('language', 'en');
  form.append('temperature', '0');
  form.append('prompt', 'English conversation practice. Transcribe spoken English accurately.');

  const response = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${settings.openaiKey}` },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ProviderError(
      formatSttErrorMessage(parseApiErrorMessage(text) || 'Whisper transcription failed', baseUrl),
      'whisper',
    );
  }

  const json = (await response.json()) as { text?: string };
  return json.text?.trim() ?? '';
}

async function postWhisperTranscription(
  settings: UserSettings,
  audioBase64: string,
  mimeType: string,
): Promise<string> {
  const baseUrl = getOpenAiBaseUrl(settings);
  if (isOpenRouterBaseUrl(baseUrl)) {
    return postOpenRouterTranscription(settings, audioBase64, mimeType);
  }
  return postOpenAiMultipartTranscription(settings, audioBase64, mimeType);
}

export const whisperStt: SttProvider = {
  name: 'whisper',

  async validate(settings: UserSettings) {
    if (!settings.openaiKey) {
      throw new ProviderError('OpenAI Key not configured (required for Whisper)', 'whisper');
    }
    const baseUrl = getOpenAiBaseUrl(settings);
    const headers = isOpenRouterBaseUrl(baseUrl)
      ? getOpenRouterHeaders(settings.openaiKey)
      : { Authorization: `Bearer ${settings.openaiKey}` };

    const response = await fetch(`${baseUrl}/models`, { headers });
    if (!response.ok) {
      const text = await response.text();
      throw new ProviderError(
        formatSttValidationError(
          parseApiErrorMessage(text) ||
            `Key validation failed (${response.status}) — check Key or Base URL`,
          settings,
          baseUrl,
        ),
        'whisper',
      );
    }
  },

  async transcribe(options: SttOptions) {
    const { settings, audioBase64, mimeType } = options;
    if (!settings.openaiKey) {
      throw new ProviderError('OpenAI Key not configured', 'whisper');
    }
    return postWhisperTranscription(settings, audioBase64, mimeType);
  },
};
