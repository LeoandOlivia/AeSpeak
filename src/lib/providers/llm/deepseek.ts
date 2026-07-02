import type { LlmProvider, LlmStreamOptions } from '../types';
import {
  getApiKey,
  getDeepseekBaseUrl,
  getLlmBaseUrl,
  getLlmModel,
  parseSseStream,
  ProviderError,
} from '../types';
import type { UserSettings } from '@/types';

export const deepseekLlm: LlmProvider = {
  name: 'deepseek',

  async validate(settings: UserSettings) {
    if (!settings.deepseekKey) {
      throw new ProviderError('DeepSeek Key 未配置', 'deepseek');
    }
    const baseUrl = getDeepseekBaseUrl(settings);
    const response = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${settings.deepseekKey}` },
    });
    if (!response.ok) {
      throw new ProviderError(
        `DeepSeek Key 验证失败（${response.status}），请检查 Key 或中转 Base URL`,
        'deepseek',
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
