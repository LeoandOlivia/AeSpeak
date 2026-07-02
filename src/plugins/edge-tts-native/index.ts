import { Capacitor, registerPlugin } from '@capacitor/core';

export interface EdgeTtsNativePlugin {
  synthesize(options: { text: string; voice: string }): Promise<{ base64: string; mimeType: string }>;
}

export const EdgeTtsNative = registerPlugin<EdgeTtsNativePlugin>('EdgeTtsNative');

export function isNativeEdgeTtsAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

let warmUpPromise: Promise<void> | null = null;

/** Pre-open Edge WebSocket on Android so first reply plays faster */
export function warmUpNativeEdgeTts(voice = 'en-US-JennyNeural'): Promise<void> {
  if (!isNativeEdgeTtsAvailable()) return Promise.resolve();
  if (!warmUpPromise) {
    warmUpPromise = synthesizeViaNativeEdge('Hi', voice)
      .then(() => undefined)
      .catch(() => undefined);
  }
  return warmUpPromise;
}

export async function synthesizeViaNativeEdge(text: string, voice: string): Promise<ArrayBuffer> {
  const { base64, mimeType } = await EdgeTtsNative.synthesize({ text, voice });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (bytes.byteLength === 0) throw new Error(`Native Edge TTS returned empty audio (${mimeType})`);
  return bytes.buffer;
}
