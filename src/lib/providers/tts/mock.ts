import type { TtsOptions, TtsProvider } from '../types';

export const mockTts: TtsProvider = {
  name: 'mock',

  async validate() {},

  async synthesize(_options: TtsOptions) {
    // minimal silent mp3 header-ish bytes — browser may not play; UI still tests flow
    return new ArrayBuffer(0);
  },
};
