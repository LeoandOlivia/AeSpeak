import { registerPlugin } from '@capacitor/core';

export interface VoiceRecorderPlugin {
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  startRecording(): Promise<void>;
  stopRecording(): Promise<{ base64: string; mimeType: string }>;
}

export const VoiceRecorder = registerPlugin<VoiceRecorderPlugin>('VoiceRecorder');
