import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  large?: boolean;
}

export function PageHeader({ title, subtitle, showBack, onBack, right, large }: PageHeaderProps) {
  if (large) {
    return (
      <header
        className="sticky top-0 z-40 shrink-0 bg-[var(--color-bg)]"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between px-4 pb-1">
          {showBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-0.5 text-[17px] text-[#007AFF] active:opacity-60"
              aria-label="返回"
            >
              <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
                <path
                  d="M10 2L2 10l8 8"
                  stroke="#007AFF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              返回
            </button>
          ) : (
            <div className="w-16" />
          )}
          <div className="w-16 text-right">{right}</div>
        </div>
        <div className="px-5 pb-2">
          <h1 className="text-[34px] font-bold leading-tight tracking-tight text-[var(--color-label)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-[15px] text-[var(--color-label-secondary)]">{subtitle}</p>
          )}
        </div>
      </header>
    );
  }

  return (
    <header
      className="sticky top-0 z-40 shrink-0 border-b border-[var(--color-separator)] bg-[var(--color-bg-elevated)] backdrop-blur-xl"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <div className="relative flex h-11 items-center px-4">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            className="absolute left-2 flex items-center gap-0.5 px-2 text-[17px] text-[#007AFF] active:opacity-60"
            aria-label="返回"
          >
            <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
              <path
                d="M10 2L2 10l8 8"
                stroke="#007AFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            返回
          </button>
        ) : null}

        <div className="mx-auto max-w-[60%] text-center">
          <h1 className="truncate text-[17px] font-semibold text-[var(--color-label)]">{title}</h1>
          {subtitle && (
            <p className="truncate text-[11px] text-[var(--color-label-secondary)]">{subtitle}</p>
          )}
        </div>

        <div className="absolute right-4">{right}</div>
      </div>
    </header>
  );
}
