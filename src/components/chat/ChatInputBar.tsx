import { IOSSendButton, IOSMicButton } from '@/components/ui/IOSMicButton';

interface ChatInputBarProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onVoiceToggle: () => void;
  disabled?: boolean;
  voiceState?: 'idle' | 'recording' | 'transcribing';
  showVoice?: boolean;
  placeholder?: string;
}

/** iMessage-style input bar — sits above bottom nav in flex layout */
export function ChatInputBar({
  value,
  onChange,
  onSend,
  onVoiceToggle,
  disabled,
  voiceState = 'idle',
  showVoice = true,
  placeholder = 'iMessage',
}: ChatInputBarProps) {
  const hasText = value.trim().length > 0;
  const isRecording = voiceState === 'recording';

  return (
    <div className="shrink-0 border-t border-[var(--color-paper-rule)] bg-[var(--color-bg-nav)] px-3 py-2 backdrop-blur-xl">
      {isRecording && (
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-accent)]" />
          <span className="text-[13px] font-medium text-[var(--color-accent)]">
            Recording — tap to stop
          </span>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex min-h-[36px] flex-1 items-end rounded-[20px] border border-[var(--color-separator)] bg-[var(--color-bg-elevated)] px-3 py-1.5 shadow-sm">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={1}
            disabled={disabled || isRecording}
            className="max-h-28 min-h-[24px] flex-1 resize-none bg-transparent py-0.5 text-[17px] leading-snug text-[var(--color-label)] placeholder:text-[var(--color-label-tertiary)] focus:outline-none disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (hasText) onSend();
              }
            }}
          />
          <div className="ml-1 flex shrink-0 items-center pb-0.5">
            {showVoice && !hasText ? (
              <IOSMicButton
                voiceState={voiceState}
                disabled={disabled}
                onClick={onVoiceToggle}
              />
            ) : (
              <IOSSendButton disabled={disabled || !hasText} onClick={onSend} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
