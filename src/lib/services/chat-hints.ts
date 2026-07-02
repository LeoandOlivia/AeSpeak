import {
  formatExpressionHint,
  parseAssistantContent,
} from '@/lib/prompts/practice-guide';
import type { ErrorRecord, Message } from '@/types';

/** Resolve practice hints when the assistant reply has no embedded [[HINT]] block. */
export function buildHintsByAssistantId(
  messages: Message[],
  errorRecords: ErrorRecord[],
  naturalHints: Record<string, string> = {},
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  if (!messages.length) return map;

  const errorsByUserMessageId = new Map(errorRecords.map((e) => [e.messageId, e]));

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role !== 'assistant' || msg.status === 'streaming') continue;

    if (parseAssistantContent(msg.content).hint) continue;

    if (naturalHints[msg.id]) {
      map.set(msg.id, naturalHints[msg.id]);
      continue;
    }

    for (let j = i - 1; j >= 0; j--) {
      if (messages[j].role === 'user') {
        const err = errorsByUserMessageId.get(messages[j].id);
        if (err) map.set(msg.id, formatExpressionHint(err));
        break;
      }
    }
  }

  return map;
}
