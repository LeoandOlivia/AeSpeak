import { useRouteError } from 'react-router-dom';

export function RouteErrorPage() {
  const error = useRouteError();
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Something went wrong';

  return (
    <div className="app-paper-bg flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <p className="font-serif text-2xl font-black text-[var(--color-label)]">eSpeak Daily</p>
      <p className="mt-4 text-[17px] font-semibold text-[var(--color-accent)]">
        Something went wrong
      </p>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-[var(--color-label-secondary)]">
        {message}
      </p>
      <button
        type="button"
        onClick={() => window.location.assign('/')}
        className="mt-6 rounded-xl border border-[var(--color-ink)] bg-[var(--color-ink)] px-6 py-2.5 font-serif text-[15px] font-semibold text-white active:opacity-80"
      >
        Back to Home
      </button>
    </div>
  );
}
