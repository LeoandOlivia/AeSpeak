import { parseAssistantContent } from '@/lib/prompts/practice-guide';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  showSpeak?: boolean;
  onSpeak?: () => void;
  isSpeaking?: boolean;
  isLoadingSpeak?: boolean;
}

export function MessageBubble({
  message,
  showSpeak = false,
  onSpeak,
  isSpeaking,
  isLoadingSpeak,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const failed = message.status === 'failed';
  const streaming = message.status === 'streaming';

  const parsed =
    !isUser && message.content && !streaming
      ? parseAssistantContent(message.content)
      : null;

  const displayText = parsed ? parsed.dialogue : message.content;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[85%] ${isUser ? '' : ''}`}>
        <div
          className={`px-3.5 py-2 text-[17px] leading-snug ${
            isUser
              ? 'rounded-[18px] rounded-br-[4px] bg-[#007AFF] text-white'
              : 'rounded-[18px] rounded-bl-[4px] bg-[var(--color-fill-secondary)] text-[var(--color-label)]'
          } ${failed ? 'opacity-60' : ''}`}
        >
          <p className="whitespace-pre-wrap break-words">
            {displayText || (streaming ? '…' : '')}
          </p>
          {showSpeak && !isUser && message.content && onSpeak && (
            <button
              type="button"
              onClick={onSpeak}
              disabled={isLoadingSpeak}
              className="mt-1.5 flex items-center gap-1 text-[13px] font-medium text-[#007AFF] disabled:opacity-50"
            >
              {isLoadingSpeak ? 'Synthesizing…' : isSpeaking ? 'Stop' : '🔊 Listen'}
            </button>
          )}
          {failed && <p className="mt-1 text-[13px] text-[#FF3B30]">Send failed</p>}
        </div>
        {parsed?.hint && (
          <p className="mt-1 px-1 text-[13px] leading-snug text-[var(--color-label-secondary)]">
            💡 {parsed.hint}
          </p>
        )}
      </div>
    </div>
  );
}
