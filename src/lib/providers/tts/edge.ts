import type { TtsOptions, TtsProvider } from '../types';
import { Capacitor } from '@capacitor/core';
import {
  isBrowserSpeechAvailable,
  synthesizeViaBrowserSpeech,
  synthesizeViaEdge,
} from './edge-ws';

/** Browser/dev chunk size; native uses one request to avoid repeated WebSocket handshakes */
const WEB_MAX_CHUNK = 480;
const NATIVE_MAX_CHUNK = 4000;

function splitText(text: string, maxChunk: number): string[] {
  const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+/g) ?? [text];
  const chunks: string[] = [];
  let current = '';
  for (const part of parts) {
    if ((current + part).length > maxChunk) {
      if (current.trim()) chunks.push(current.trim());
      current = part;
    } else {
      current += part;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text.slice(0, maxChunk)];
}

async function synthesizeChunkEdge(text: string, voice: string): Promise<ArrayBuffer> {
  return synthesizeViaEdge(text, voice);
}

export const edgeTts: TtsProvider = {
  name: 'edge',

  async validate() {
    try {
      await synthesizeChunkEdge('Hello', 'en-US-JennyNeural');
    } catch {
      if (isBrowserSpeechAvailable()) {
        await synthesizeViaBrowserSpeech('Hello', 'en-US-JennyNeural');
        return;
      }
      throw new Error('Edge TTS and system speech are both unavailable');
    }
  },

  async synthesize(options: TtsOptions) {
    const voice = options.voice ?? options.settings.ttsVoice;
    const maxChunk = Capacitor.isNativePlatform() ? NATIVE_MAX_CHUNK : WEB_MAX_CHUNK;
    const chunks = splitText(options.text, maxChunk);
    const buffers: ArrayBuffer[] = [];
    let usedBrowser = false;

    for (const chunk of chunks) {
      try {
        buffers.push(await synthesizeChunkEdge(chunk, voice));
      } catch {
        if (!isBrowserSpeechAvailable()) {
          throw new Error('Edge TTS unavailable and system speech is not supported in this environment');
        }
        if (!usedBrowser) {
          await synthesizeViaBrowserSpeech(options.text, voice);
          usedBrowser = true;
        }
        return new ArrayBuffer(0);
      }
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
