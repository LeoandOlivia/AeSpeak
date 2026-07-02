import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  large?: boolean;
}

const backClass =
  'flex items-center gap-0.5 font-serif text-[15px] text-[var(--color-ink)] active:opacity-60';

function BackChevron() {
  return (
    <svg width="12" height="20" viewBox="0 0 12 20" fill="none" aria-hidden>
      <path
        d="M10 2L2 10l8 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PageHeader({ title, subtitle, showBack, onBack, right, large }: PageHeaderProps) {
  if (large) {
    return (
      <header
        className="newspaper-header sticky top-0 z-40 shrink-0"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between px-4 pb-1 pt-1">
          {showBack ? (
            <button type="button" onClick={onBack} className={backClass} aria-label="Back">
              <BackChevron />
              Back
            </button>
          ) : (
            <div className="w-16" />
          )}
          <div className="w-16 text-right">{right}</div>
        </div>
        <div className="px-5 pb-3 pt-1 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--color-label-secondary)]">
            eSpeak Daily
          </p>
          <h1 className="font-serif text-[30px] font-black leading-tight tracking-tight text-[var(--color-label)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-[13px] text-[var(--color-label-secondary)]">{subtitle}</p>
          )}
        </div>
      </header>
    );
  }

  return (
    <header
      className="newspaper-header-compact sticky top-0 z-40 shrink-0"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <div className="relative flex h-11 items-center px-4">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            className={`absolute left-2 px-2 ${backClass}`}
            aria-label="Back"
          >
            <BackChevron />
            Back
          </button>
        ) : null}

        <div className="mx-auto max-w-[60%] text-center">
          <h1 className="truncate font-serif text-[17px] font-bold text-[var(--color-label)]">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-[11px] text-[var(--color-label-secondary)]">{subtitle}</p>
          )}
        </div>

        <div className="absolute right-4">{right}</div>
      </div>
    </header>
  );
}
