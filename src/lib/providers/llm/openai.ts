import type { LlmProvider, LlmStreamOptions } from '../types';
import {
  getApiKey,
  getLlmBaseUrl,
  getLlmModel,
  getOpenAiBaseUrl,
  parseSseStream,
  ProviderError,
} from '../types';
import type { UserSettings } from '@/types';

export const openaiLlm: LlmProvider = {
  name: 'openai',

  async validate(settings: UserSettings) {
    if (!settings.openaiKey) {
      throw new ProviderError('OpenAI Key 未配置', 'openai');
    }
    const baseUrl = getOpenAiBaseUrl(settings);
    const response = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${settings.openaiKey}` },
    });
    if (!response.ok) {
      throw new ProviderError(
        `OpenAI Key 验证失败（${response.status}），请检查 Key 或中转 Base URL`,
        'openai',
      );
    }
  },

  async streamChat(options: LlmStreamOptions) {
    const { settings, messages, onToken, signal } = options;
    const apiKey = getApiKey(settings);
    const response = await fetch(`${getLlmBaseUrl(settings)}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getLlmModel(settings),
        messages,
        stream: true,
        temperature: 0.7,
      }),
      signal,
    });
    await parseSseStream(response, onToken);
  },
};
