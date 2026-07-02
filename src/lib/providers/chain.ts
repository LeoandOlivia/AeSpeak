import type { UserSettings } from '@/types';
import { deepseekLlm } from './llm/deepseek';
import { openaiLlm } from './llm/openai';
import { mockStt, whisperStt } from './stt/whisper';
import { edgeTts } from './tts/edge';
import { mockTts } from './tts/mock';
import { openaiTts } from './tts/openai-tts';
import type {
  LlmProvider,
  LlmStreamOptions,
  SttOptions,
  SttProvider,
  TtsOptions,
  TtsProvider,
} from './types';

function getLlm(settings: UserSettings): LlmProvider {
  return settings.llmProvider === 'openai' ? openaiLlm : deepseekLlm;
}

function getSttList(settings: UserSettings): SttProvider[] {
  if (settings.mockVoice) return [mockStt];
  return [whisperStt];
}

function getTtsList(settings: UserSettings): TtsProvider[] {
  if (settings.mockVoice) return [mockTts];

  const list: TtsProvider[] = [];
  if (settings.ttsProvider === 'openai') list.push(openaiTts);
  else if (settings.ttsProvider === 'edge') list.push(edgeTts);
  else list.push(mockTts);

  if (!list.includes(edgeTts) && settings.ttsProvider !== 'openai') list.push(edgeTts);

  return list;
}

export async function validateLlm(settings: UserSettings): Promise<void> {
  await getLlm(settings).validate(settings);
}

export async function streamChat(options: LlmStreamOptions): Promise<void> {
  await getLlm(options.settings).streamChat(options);
}

export async function transcribeAudio(options: SttOptions): Promise<string> {
  const providers = getSttList(options.settings);
  let lastError: Error | undefined;
  for (const p of providers) {
    try {
      return await p.transcribe(options);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastError ?? new Error('语音识别失败');
}

export async function synthesizeSpeech(options: TtsOptions): Promise<ArrayBuffer> {
  if (options.settings.mockVoice) {
    return mockTts.synthesize(options);
  }

  const providers = getTtsList(options.settings);
  let lastError: Error | undefined;

  for (const p of providers) {
    try {
      const buf = await p.synthesize(options);
      if (buf.byteLength > 0) return buf;
      if (p.name === 'edge') return buf;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError ?? new Error('朗读失败');
}

export async function validateStt(settings: UserSettings): Promise<void> {
  const p = getSttList(settings)[0];
  await p.validate(settings);
}

export async function validateTts(settings: UserSettings): Promise<void> {
  const p = getTtsList(settings)[0];
  await p.validate(settings);
}

export { getLlm, getSttList, getTtsList };
