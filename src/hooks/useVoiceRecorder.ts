import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  MIN_AUDIO_BYTES,
  MIN_RECORDING_MS,
  pickWebRecorderMimeType,
} from '@/lib/audio/recording';
import { formatSttErrorMessage } from '@/lib/providers/stt/whisper';
import { transcribeAudio } from '@/lib/providers/chain';
import {
  ensureMicPermission,
  isNativePlatform,
  nativeStartRecording,
  nativeStopRecording,
} from '@/plugins/voice-recorder/adapter';
import type { UserSettings } from '@/types';

export type RecorderState = 'idle' | 'recording' | 'transcribing';

const MAX_DURATION_MS = 60_000;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Native Android always available; browser only in pnpm dev (production WebView uses native). */
export function isVoiceInputAvailable(): boolean {
  return isNativePlatform() || import.meta.env.DEV;
}

export function useVoiceRecorder(settings: UserSettings) {
  const [state, setState] = useState<RecorderState>('idle');
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const stateRef = useRef<RecorderState>('idle');
  const startedAtRef = useRef(0);
  const isAvailable = isVoiceInputAvailable();
  const useNativeCapture = isNativePlatform();

  const setRecorderState = (s: RecorderState) => {
    stateRef.current = s;
    setState(s);
  };

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    mediaRef.current = null;
    clearTimer();
  }, [clearTimer]);

  const validateCapture = useCallback((byteLength: number, startedAt: number): boolean => {
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_RECORDING_MS) {
      toast.error('Recording too short', { description: 'Speak at least 1 second of English before stopping' });
      return false;
    }
    if (byteLength < MIN_AUDIO_BYTES) {
      toast.error('No valid audio captured', { description: 'Check mic permissions or move closer to the microphone' });
      return false;
    }
    return true;
  }, []);

  const finishText = useCallback((text: string | null, silent = false): string | null => {
    if (!text) {
      toast.error('No speech detected', { description: 'Speak clearly in English and reduce background noise' });
      return null;
    }
    if (!silent) {
      toast.success('Transcription complete', { description: text.length > 80 ? `${text.slice(0, 80)}…` : text });
    }
    return text;
  }, []);

  const transcribe = useCallback(
    async (base64: string, mimeType: string, byteLength: number, startedAt: number): Promise<string | null> => {
      if (settings.mockVoice) {
        setRecorderState('transcribing');
        try {
          const text = await transcribeAudio({ settings, audioBase64: base64, mimeType });
          return finishText(text);
        } finally {
          setRecorderState('idle');
        }
      }

      if (!validateCapture(byteLength, startedAt)) {
        return null;
      }

      setRecorderState('transcribing');
      try {
        if (!navigator.onLine) {
          toast.error('Network unavailable — cannot transcribe');
          return null;
        }
        const text = await transcribeAudio({ settings, audioBase64: base64, mimeType });
        return finishText(text);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Speech recognition failed';
        toast.error(formatSttErrorMessage(msg));
        return null;
      } finally {
        setRecorderState('idle');
      }
    },
    [settings, validateCapture, finishText],
  );

  const stopNativeRecording = useCallback(async (): Promise<string | null> => {
    if (stateRef.current !== 'recording') return null;
    const startedAt = startedAtRef.current;
    clearTimer();
    try {
      const { base64, mimeType } = await nativeStopRecording();
      const byteLength = Math.floor((base64.length * 3) / 4);
      return transcribe(base64, mimeType, byteLength, startedAt);
    } catch (e) {
      setRecorderState('idle');
      const msg = e instanceof Error ? e.message : 'Native recording failed';
      if (msg.toLowerCase().includes('empty') || msg.toLowerCase().includes('short')) {
        toast.error('Recording too short', { description: 'Speak at least 1 second of English before stopping' });
      } else {
        toast.error(msg);
      }
      return null;
    }
  }, [clearTimer, transcribe]);

  const stopWebRecording = useCallback(async (): Promise<string | null> => {
    if (stateRef.current !== 'recording' || !mediaRef.current) return null;

    const recorder = mediaRef.current;
    const mimeType = recorder.mimeType || pickWebRecorderMimeType();
    const startedAt = startedAtRef.current;

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        stopTracks();
        resolve(new Blob(chunksRef.current, { type: mimeType }));
      };
      try {
        if (recorder.state === 'recording') recorder.requestData();
      } catch {
        // ignore
      }
      recorder.stop();
    });

    const base64 = await blobToBase64(blob);
    return transcribe(base64, mimeType, blob.size, startedAt);
  }, [stopTracks, transcribe]);

  const startNativeRecording = useCallback(async () => {
    const ok = await ensureMicPermission();
    if (!ok) {
      toast.error('Microphone permission denied');
      return;
    }
    await nativeStartRecording();
    startedAtRef.current = Date.now();
    setRecorderState('recording');
    toast.message('Recording…', { description: 'Tap the mic again when done — message sends automatically' });
    timerRef.current = window.setTimeout(() => {
      toast.message('60-second limit reached — stopping automatically');
      void stopNativeRecording();
    }, MAX_DURATION_MS);
  }, [stopNativeRecording]);

  const startWebRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    const mimeType = pickWebRecorderMimeType();
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(250);
    mediaRef.current = recorder;
    startedAtRef.current = Date.now();
    setRecorderState('recording');
    toast.message('Recording…', { description: 'Tap the mic again when done — message sends automatically' });
    timerRef.current = window.setTimeout(() => {
      toast.message('60-second limit reached — stopping automatically');
      void stopWebRecording();
    }, MAX_DURATION_MS);
  }, [stopWebRecording]);

  const startRecording = useCallback(async () => {
    if (useNativeCapture) {
      await startNativeRecording();
    } else {
      await startWebRecording();
    }
  }, [useNativeCapture, startNativeRecording, startWebRecording]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (useNativeCapture) return stopNativeRecording();
    return stopWebRecording();
  }, [useNativeCapture, stopNativeRecording, stopWebRecording]);

  const toggle = useCallback(
    async (onResult: (text: string) => void) => {
      if (!isAvailable) {
        toast.message('Voice input unavailable');
        return;
      }

      if (stateRef.current === 'idle') {
        try {
          await startRecording();
        } catch {
          toast.error('Cannot access microphone — check permissions');
        }
      } else if (stateRef.current === 'recording') {
        const text = await stopRecording();
        if (text) onResult(text);
      }
    },
    [isAvailable, startRecording, stopRecording],
  );

  return { state, toggle, isBusy: state !== 'idle', isAvailable, useNativeCapture };
}
