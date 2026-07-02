import type { TtsOptions, TtsProvider } from '../types';
import { getOpenAiBaseUrl, ProviderError } from '../types';
import type { UserSettings } from '@/types';

const MAX_INPUT = 4096;

function splitText(text: string): string[] {
  if (text.length <= MAX_INPUT) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > MAX_INPUT) {
    const slice = rest.slice(0, MAX_INPUT);
    const lastSpace = slice.lastIndexOf(' ');
    const cut = lastSpace > MAX_INPUT * 0.5 ? lastSpace : MAX_INPUT;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function synthesizeChunk(
  settings: UserSettings,
  text: string,
  voice: string,
): Promise<ArrayBuffer> {
  const baseUrl = getOpenAiBaseUrl(settings);
  const model = settings.ttsModel || 'tts-1';

  const response = await fetch(`${baseUrl}/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.openaiKey}`,
    },
    body: JSON.stringify({
      model,
      input: text,
      voice,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const msg = await response.text();
    throw new ProviderError(msg || `OpenAI TTS 失败 (${response.status})`, 'openai-tts');
  }

  return response.arrayBuffer();
}

export const openaiTts: TtsProvider = {
  name: 'openai',

  async validate(settings: UserSettings) {
    if (!settings.openaiKey) {
      throw new ProviderError('OpenAI Key 未配置', 'openai-tts');
    }
    await synthesizeChunk(settings, 'Hello', settings.ttsVoice || 'nova');
  },

  async synthesize(options: TtsOptions) {
    const { settings, text } = options;
    if (!settings.openaiKey) {
      throw new ProviderError('OpenAI Key 未配置', 'openai-tts');
    }

    const voice = options.voice ?? settings.ttsVoice ?? 'nova';
    const chunks = splitText(text);
    const buffers: ArrayBuffer[] = [];

    for (const chunk of chunks) {
      buffers.push(await synthesizeChunk(settings, chunk, voice));
    }

    if (buffers.length === 1) return buffers[0];
    const total = buffers.reduce((n, b) => n + b.byteLength, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const b of buffers) {
      merged.set(new Uint8Array(b), offset);
      offset += b.byteLength;
    }
    return merged.buffer;
  },
};
