import { buildEdgeSsml } from './edge-ssml';
import {
  buildEdgeConfigMessage,
  buildEdgeSsmlMessage,
  buildEdgeWssUrl,
  generateSecMsGec,
} from './edge-constants';
import { speakWithBrowserVoice } from './edge-ssml';
import { isNativeEdgeTtsAvailable, synthesizeViaNativeEdge } from '@/plugins/edge-tts-native';

const AUDIO_MARKER = 'Path:audio\r\n';

function extractAudioChunk(data: ArrayBuffer): Uint8Array | null {
  const bytes = new Uint8Array(data);
  const marker = new TextEncoder().encode(AUDIO_MARKER);
  outer: for (let i = 0; i <= bytes.length - marker.length; i++) {
    for (let j = 0; j < marker.length; j++) {
      if (bytes[i + j] !== marker[j]) continue outer;
    }
    return bytes.slice(i + marker.length);
  }
  return null;
}

function includesTurnEnd(data: ArrayBuffer): boolean {
  return new TextDecoder().decode(data).includes('Path:turn.end');
}

/** Browser WebSocket cannot set User-Agent — often 403. Prefer dev proxy or native plugin. */
export async function synthesizeViaWebSocket(text: string, voice: string): Promise<ArrayBuffer> {
  const requestId = crypto.randomUUID();
  const secMsGec = await generateSecMsGec();
  const url = buildEdgeWssUrl(requestId, secMsGec);
  const ssml = buildEdgeSsml(text, voice);

  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        ws.close();
        reject(new Error('Edge TTS 连接超时'));
      }
    }, 25_000);

    const ws = new WebSocket(url);

    ws.onopen = () => {
      ws.send(buildEdgeConfigMessage());
      ws.send(buildEdgeSsmlMessage(requestId, ssml));
    };

    ws.onmessage = (event) => {
      const processBuffer = (buf: ArrayBuffer) => {
        const audio = extractAudioChunk(buf);
        if (audio?.length) chunks.push(audio);
        if (includesTurnEnd(buf)) ws.close();
      };

      if (event.data instanceof ArrayBuffer) {
        processBuffer(event.data);
      } else if (event.data instanceof Blob) {
        void event.data.arrayBuffer().then(processBuffer);
      } else if (typeof event.data === 'string' && event.data.includes('Path:turn.end')) {
        ws.close();
      }
    };

    ws.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      reject(
        new Error(
          'Edge TTS WebSocket 403/失败（浏览器无法设置 User-Agent，请用 dev 代理或 Android 原生）',
        ),
      );
    };

    ws.onclose = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (!chunks.length) {
        reject(new Error('Edge TTS 未返回音频'));
        return;
      }
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      resolve(merged.buffer);
    };
  });
}

export async function synthesizeViaDevProxy(text: string, voice: string): Promise<ArrayBuffer> {
  const response = await fetch('/api/edge-tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  });
  if (!response.ok) {
    const msg = await response.text();
    throw new Error(msg || `Edge TTS 代理失败 (${response.status})`);
  }
  return response.arrayBuffer();
}

export async function synthesizeViaEdge(text: string, voice: string): Promise<ArrayBuffer> {
  if (import.meta.env.DEV) {
    return synthesizeViaDevProxy(text, voice);
  }
  if (isNativeEdgeTtsAvailable()) {
    return synthesizeViaNativeEdge(text, voice);
  }
  return synthesizeViaWebSocket(text, voice);
}

export async function synthesizeViaBrowserSpeech(text: string, voice: string): Promise<void> {
  await speakWithBrowserVoice(text, voice);
}

export function isBrowserSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export { voiceLocale, voicePersona, isMaleEdgeVoice } from './edge-ssml';
