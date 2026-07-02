import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { synthesizeSpeech } from '@/lib/providers/chain';
import type { UserSettings } from '@/types';

export function useAudioPlayer(settings: UserSettings) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingId(null);
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
        const buffer = await synthesizeSpeech({ settings, text, voice: settings.ttsVoice });
        if (settings.mockVoice || buffer.byteLength === 0) {
          if (buffer.byteLength === 0) {
            // Edge/system fallback: try browser speech synthesis
            if ('speechSynthesis' in window) {
              const u = new SpeechSynthesisUtterance(text);
              u.lang = 'en-US';
              window.speechSynthesis.speak(u);
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
          toast.error('Playback failed');
          setPlayingId(null);
        };
        await audio.play();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Speech playback failed');
      } finally {
        setLoadingId(null);
      }
    },
    [settings, playingId, loadingId, stop],
  );

  return { play, stop, playingId, loadingId };
}
