import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from '@/app/router';
import { initDatabase } from '@/lib/db/seed-scenarios';
import { warmUpSpeechVoices } from '@/lib/providers/tts/edge-ssml';
import './index.css';

function AppBootstrap() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => {
        try {
          warmUpSpeechVoices();
        } catch {
          // non-fatal on platforms without speechSynthesis
        }
        setReady(true);
      })
      .catch((e) => {
        console.error('initDatabase failed:', e);
        setError(e instanceof Error ? e.message : '初始化失败');
      });
  }, []);

  if (error) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-[var(--color-bg)] px-6 text-center">
        <p className="text-[17px] font-semibold text-[#FF3B30]">加载失败</p>
        <p className="text-[15px] text-[var(--color-label-secondary)]">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 rounded-xl bg-[#007AFF] px-6 py-2.5 text-[17px] font-semibold text-white"
        >
          重试
        </button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-[var(--color-bg)] text-[var(--color-label-secondary)]">
        <p className="text-[17px] font-medium">加载中…</p>
      </div>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'text-[15px] font-medium',
          style: {
            background: 'rgba(255,255,255,0.95)',
            color: '#000',
            border: '1px solid rgba(60,60,67,0.12)',
            borderRadius: '14px',
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
