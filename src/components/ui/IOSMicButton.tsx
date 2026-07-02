interface IOSMicButtonProps {
  voiceState: 'idle' | 'recording' | 'transcribing';
  disabled?: boolean;
  onClick: () => void;
}

/** iOS-style mic button: idle gray, recording red pulse, transcribing spinner */
export function IOSMicButton({ voiceState, disabled, onClick }: IOSMicButtonProps) {
  const isRecording = voiceState === 'recording';
  const isTranscribing = voiceState === 'transcribing';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isTranscribing}
      aria-label={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing' : 'Voice input'}
      className="relative flex h-[34px] w-[34px] shrink-0 items-center justify-center disabled:opacity-40"
    >
      {isRecording && (
        <>
          <span className="absolute inset-0 animate-ping rounded-full bg-[#FF3B30]/25" />
          <span className="absolute -inset-1 rounded-full bg-[#FF3B30]/10" />
        </>
      )}
      <span
        className={`relative flex h-[34px] w-[34px] items-center justify-center rounded-full transition-all ${
          isRecording
            ? 'bg-[#FF3B30] shadow-lg shadow-red-500/30'
            : isTranscribing
              ? 'bg-[var(--color-fill-secondary)]'
              : 'bg-[var(--color-fill-secondary)] hover:bg-[var(--color-separator)]'
        }`}
      >
        {isTranscribing ? (
          <svg className="h-[18px] w-[18px] animate-spin text-[var(--color-label-secondary)]" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
            <path d="M12 3a9 9 0 019 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : isRecording ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
            <rect x="1" y="1" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="12" rx="3" fill="#8E8E93" />
            <path
              d="M5 10a7 7 0 0014 0M12 17v3"
              stroke="#8E8E93"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}

/** iOS blue send button (shown when text is present) */
export function IOSSendButton({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Send"
      className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#007AFF] transition active:scale-95 disabled:opacity-40"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 19V5M12 5l-6 6M12 5l6 6"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
