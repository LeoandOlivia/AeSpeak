import { Capacitor } from '@capacitor/core';
import { VoiceRecorder } from '@/plugins/voice-recorder';

export async function ensureMicPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  const { granted } = await VoiceRecorder.checkPermission();
  if (granted) return true;
  const result = await VoiceRecorder.requestPermission();
  return result.granted;
}

export async function nativeStartRecording(): Promise<void> {
  await VoiceRecorder.startRecording();
}

export async function nativeStopRecording(): Promise<{ base64: string; mimeType: string }> {
  return VoiceRecorder.stopRecording();
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}
