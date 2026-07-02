import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from '@/app/router';
import { initDatabase } from '@/lib/db/seed-scenarios';
import { warmUpSpeechVoices } from '@/lib/providers/tts/edge-ssml';
import { warmUpNativeEdgeTts } from '@/plugins/edge-tts-native';
import './index.css';

function AppBootstrap() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(async () => {
        try {
          warmUpSpeechVoices();
        } catch {
          // non-fatal on platforms without speechSynthesis
        }
        try {
          await warmUpNativeEdgeTts();
        } catch {
          // non-fatal
        }
        setReady(true);
      })
      .catch((e) => {
        console.error('initDatabase failed:', e);
        setError(e instanceof Error ? e.message : 'Initialization failed');
      });
  }, []);

  if (error) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-[var(--color-bg)] px-6 text-center">
        <p className="text-[17px] font-semibold text-[#FF3B30]">Failed to load</p>
        <p className="text-[15px] text-[var(--color-label-secondary)]">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 rounded-xl bg-[#007AFF] px-6 py-2.5 text-[17px] font-semibold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-[var(--color-bg)] text-[var(--color-label-secondary)]">
        <p className="text-[17px] font-medium">Loading…</p>
      </div>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        richColors
        closeButton
        visibleToasts={3}
        duration={6000}
        toastOptions={{
          className: 'text-[15px] font-medium',
          style: {
            background: 'rgba(255,255,255,0.98)',
            color: '#000',
            border: '1px solid rgba(60,60,67,0.12)',
            borderRadius: '14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          },
        }}
      />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppBootstrap />
  </StrictMode>,
);
