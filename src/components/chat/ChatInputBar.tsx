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

const BOTTOM_OFFSET = 'calc(4.5rem + env(safe-area-inset-bottom, 0px))';

/** iMessage-style input bar: mic when empty, blue send when text is present */
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
    <div
      className="fixed left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-3 py-2"
      style={{ bottom: BOTTOM_OFFSET }}
    >
      {isRecording && (
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF3B30]" />
          <span className="text-[13px] font-medium text-[#FF3B30]">Recording — tap to stop</span>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex min-h-[36px] flex-1 items-end rounded-[20px] border border-[var(--color-separator)] bg-[var(--color-bg-elevated)] px-3 py-1.5 shadow-sm backdrop-blur-xl">
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

export const CHAT_INPUT_HEIGHT = '5rem';
