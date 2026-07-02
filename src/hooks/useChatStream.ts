import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import { OPENING_USER_TRIGGER } from '@/lib/prompts/practice-guide';
import {
  addMessage,
  detectExpressionError,
  updateMessage,
} from '@/lib/services/conversation';
import { streamChat } from '@/lib/providers/chain';
import type { LlmMessage } from '@/lib/providers/types';
import { parseApiErrorMessage } from '@/lib/providers/types';
import type { Scenario, UserSettings } from '@/types';

interface UseChatStreamOptions {
  conversationId: string;
  scenario?: Scenario;
  settings: UserSettings;
  onStreamEnd?: () => void;
  onAssistantComplete?: (messageId: string, content: string) => void;
}

export function useChatStream({
  conversationId,
  scenario,
  settings,
  onStreamEnd,
  onAssistantComplete,
}: UseChatStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const onCompleteRef = useRef(onAssistantComplete);
  onCompleteRef.current = onAssistantComplete;

  const streamAssistantReply = useCallback(
    async (llmMessages: LlmMessage[]) => {
      const assistant = await addMessage(conversationId, 'assistant', '', 'streaming');
      setIsStreaming(true);
      abortRef.current = new AbortController();

      let content = '';
      try {
        await streamChat({
          settings,
          messages: llmMessages,
          signal: abortRef.current.signal,
          onToken: (token) => {
            content += token;
            void updateMessage(assistant.id, { content, status: 'streaming' });
          },
        });
        await updateMessage(assistant.id, { content, status: 'complete' });
        onCompleteRef.current?.(assistant.id, content);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        const msg = e instanceof Error ? e.message : '发送失败';
        toast.error(msg.includes('Key') ? msg : `对话失败：${parseApiErrorMessage(msg)}`);
        await updateMessage(assistant.id, { status: 'failed' });
        throw e;
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        onStreamEnd?.();
      }
    },
    [conversationId, settings, onStreamEnd],
  );

  const buildHistoryMessages = useCallback(async (): Promise<LlmMessage[]> => {
    const history = await db.messages
      .where('conversationId')
      .equals(conversationId)
      .sortBy('createdAt');

    const llmMessages: LlmMessage[] = [];
    if (scenario) {
      llmMessages.push({ role: 'system', content: scenario.systemPrompt });
    }
    for (const m of history) {
      if (m.role === 'user' || m.role === 'assistant') {
        llmMessages.push({ role: m.role, content: m.content });
      }
    }
    return llmMessages;
  }, [conversationId, scenario]);

  const sendOpening = useCallback(async () => {
    if (!scenario || isStreaming) return;

    const count = await db.messages
      .where('conversationId')
      .equals(conversationId)
      .count();
    if (count > 0) return;

    if (!navigator.onLine) {
      toast.error('网络不可用，请检查连接');
      return;
    }

    const llmMessages: LlmMessage[] = [
      { role: 'system', content: scenario.systemPrompt },
      { role: 'user', content: OPENING_USER_TRIGGER },
    ];

    try {
      await streamAssistantReply(llmMessages);
    } catch {
      // error toast already shown
    }
  }, [scenario, isStreaming, conversationId, streamAssistantReply]);

  const sendUserMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      if (!navigator.onLine) {
        toast.error('网络不可用，请检查连接');
        return;
      }

      try {
        const userMsg = await addMessage(conversationId, 'user', trimmed);

        if (scenario) {
          void detectExpressionError(
            settings,
            trimmed,
            conversationId,
            userMsg.id,
            scenario.id,
            scenario.description,
          ).catch(() => {});
        }

        const llmMessages = await buildHistoryMessages();
        await streamAssistantReply(llmMessages);
      } catch {
        const msgs = await db.messages
          .where('conversationId')
          .equals(conversationId)
          .sortBy('createdAt');
        const failed = [...msgs]
          .reverse()
          .find((m) => m.role === 'assistant' && m.status === 'failed');
        if (failed) await updateMessage(failed.id, { status: 'failed' });
      }
    },
    [conversationId, scenario, settings, isStreaming, buildHistoryMessages, streamAssistantReply],
  );

  const retryLast = useCallback(async () => {
    const msgs = await db.messages
      .where('conversationId')
      .equals(conversationId)
      .sortBy('createdAt');
    const failed = [...msgs].reverse().find((m) => m.status === 'failed');
    if (failed) await db.messages.delete(failed.id);
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
    if (lastUser && lastUser.content !== OPENING_USER_TRIGGER) {
      await sendUserMessage(lastUser.content);
    }
  }, [conversationId, sendUserMessage]);

  return { sendUserMessage, sendOpening, retryLast, isStreaming };
}

export function useReviewChatStream({
  conversationId,
  systemPrompt,
  settings,
}: {
  conversationId: string;
  systemPrompt: string;
  settings: UserSettings;
}) {
  const [isStreaming, setIsStreaming] = useState(false);

  const sendUserMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      await addMessage(conversationId, 'user', trimmed);
      const history = await db.messages
        .where('conversationId')
        .equals(conversationId)
        .sortBy('createdAt');

      const llmMessages: LlmMessage[] = [{ role: 'system', content: systemPrompt }];
      for (const m of history) {
        if (m.role === 'user' || m.role === 'assistant') {
          llmMessages.push({ role: m.role, content: m.content });
        }
      }

      const assistant = await addMessage(conversationId, 'assistant', '', 'streaming');
      setIsStreaming(true);
      let content = '';
      try {
        await streamChat({
          settings,
          messages: llmMessages,
          onToken: (token) => {
            content += token;
            void updateMessage(assistant.id, { content, status: 'streaming' });
          },
        });
        await updateMessage(assistant.id, { content, status: 'complete' });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '复习对话失败');
        await updateMessage(assistant.id, { status: 'failed' });
      } finally {
        setIsStreaming(false);
      }
    },
    [conversationId, systemPrompt, settings, isStreaming],
  );

  return { sendUserMessage, isStreaming };
}
