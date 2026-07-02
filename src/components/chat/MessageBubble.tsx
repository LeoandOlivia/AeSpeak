import { parseAssistantContent } from '@/lib/prompts/practice-guide';
import { HintTip } from '@/components/chat/HintTip';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  fallbackHint?: string | null;
}

export function MessageBubble({ message, fallbackHint = null }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const streaming = message.status === 'streaming';

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
        </div>
        {hintText && <HintTip text={hintText} />}
      </div>
    </div>
  );
}
