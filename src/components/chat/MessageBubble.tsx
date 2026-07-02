import { parseAssistantContent } from '@/lib/prompts/practice-guide';
import { HintTip } from '@/components/chat/HintTip';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  fallbackHint?: string | null;
  showSpeak?: boolean;
  onSpeak?: () => void;
  isSpeaking?: boolean;
  isLoadingSpeak?: boolean;
}

export function MessageBubble({
  message,
  fallbackHint = null,
  showSpeak = false,
  onSpeak,
  isSpeaking,
  isLoadingSpeak,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const streaming = message.status === 'streaming';

  if (!isUser && message.status === 'failed') {
    return null;
  }

  if (!isUser && !message.content.trim() && !streaming) {
    return null;
  }

  const parsed = !isUser && message.content ? parseAssistantContent(message.content) : null;
  const displayText = parsed ? parsed.dialogue : message.content;
  const hintText = parsed?.hint ?? fallbackHint ?? null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className="max-w-[92%]">
        <div
          className={`px-3.5 py-2 text-[17px] leading-snug ${
            isUser
              ? 'rounded-[18px] rounded-br-[4px] bg-[#007AFF] text-white'
              : 'rounded-[18px] rounded-bl-[4px] bg-[var(--color-fill-secondary)] text-[var(--color-label)]'
          }`}
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
        </div>
        {hintText && <HintTip text={hintText} />}
      </div>
    </div>
  );
}
