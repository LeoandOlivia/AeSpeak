interface ChatErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ChatErrorBanner({ message, onRetry, onDismiss }: ChatErrorBannerProps) {
  return (
    <div
      role="alert"
      className="mx-3 mb-2 flex shrink-0 items-start gap-2 rounded-xl border border-[#FF3B30]/25 bg-[#FF3B30]/10 px-3 py-2.5"
    >
      <span className="mt-0.5 shrink-0 text-[15px]" aria-hidden>
        ⚠
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#FF3B30]">Could not get a reply</p>
        <p className="mt-0.5 text-[13px] leading-snug text-[var(--color-label-secondary)]">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1.5 text-[13px] font-semibold text-[#007AFF]"
          >
            Tap to retry
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="shrink-0 px-1 text-[18px] leading-none text-[var(--color-label-tertiary)]"
        >
          ×
        </button>
      )}
    </div>
  );
}
