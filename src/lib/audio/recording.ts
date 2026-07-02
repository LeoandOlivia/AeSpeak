/** 浏览器 dev 优先 webm/opus；Android 原生走 audio/mp4 (m4a) */
export function pickWebRecorderMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? 'audio/webm';
}

export function mimeToWhisperFilename(mimeType: string): string {
  const lower = mimeType.toLowerCase();
  if (lower.includes('mp4') || lower.includes('m4a')) return 'audio.m4a';
  if (lower.includes('ogg')) return 'audio.ogg';
  if (lower.includes('wav')) return 'audio.wav';
  if (lower.includes('mpeg') || lower.includes('mp3')) return 'audio.mp3';
  return 'audio.webm';
}

export const MIN_RECORDING_MS = 800;
export const MIN_AUDIO_BYTES = 1024;
