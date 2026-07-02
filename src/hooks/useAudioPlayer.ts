import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { synthesizeSpeech } from '@/lib/providers/chain';
import { synthesizeViaBrowserSpeech, isBrowserSpeechAvailable } from '@/lib/providers/tts/edge-ws';
import type { UserSettings } from '@/types';

const TTS_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('TTS timeout')), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

export function useAudioPlayer(settings: UserSettings) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingId(null);
  }, []);

  const playWithBrowserSpeech = useCallback(async (text: string, voice: string) => {
    if (!isBrowserSpeechAvailable()) return false;
    await synthesizeViaBrowserSpeech(text, voice);
    return true;
  }, []);

  const play = useCallback(
    async (messageId: string, text: string) => {
      if (loadingId) return;
      if (playingId === messageId) {
        stop();
        return;
      }
      stop();

      if (!navigator.onLine && !settings.mockVoice) {
        toast.error('Network unavailable — cannot play speech');
        return;
      }

      try {
        setLoadingId(messageId);
        let buffer: ArrayBuffer;
        try {
          buffer = await withTimeout(
            synthesizeSpeech({ settings, text, voice: settings.ttsVoice }),
            TTS_TIMEOUT_MS,
          );
        } catch {
          const usedBrowser = await playWithBrowserSpeech(text, settings.ttsVoice);
          if (usedBrowser) return;
          throw new Error('Speech synthesis timed out');
        }

        if (settings.mockVoice || buffer.byteLength === 0) {
          if (buffer.byteLength === 0) {
            const usedBrowser = await playWithBrowserSpeech(text, settings.ttsVoice);
            if (!usedBrowser) {
              toast.error('Speech playback unavailable');
            }
          }
          return;
        }

        const blob = new Blob([buffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        setPlayingId(messageId);
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setPlayingId(null);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          void playWithBrowserSpeech(text, settings.ttsVoice).then((ok) => {
            if (!ok) toast.error('Playback failed');
            setPlayingId(null);
          });
        };
        await audio.play();
      } catch (e) {
        const usedBrowser = await playWithBrowserSpeech(text, settings.ttsVoice);
        if (!usedBrowser) {
          toast.error(e instanceof Error ? e.message : 'Speech playback failed');
        }
      } finally {
        setLoadingId(null);
      }
    },
    [settings, playingId, loadingId, stop, playWithBrowserSpeech],
  );

  return { play, stop, playingId, loadingId };
}
