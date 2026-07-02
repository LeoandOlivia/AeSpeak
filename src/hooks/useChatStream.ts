import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '@/lib/db';
import {
  getSpeakableText,
  OPENING_USER_TRIGGER,
  parseAssistantContent,
} from '@/lib/prompts/practice-guide';
import {
  addMessage,
  buildExpressionHintForUserMessage,
  updateMessage,
} from '@/lib/services/conversation';
import {
  isRoleplayScenario,
  resolveScenarioSystemPrompt,
} from '@/lib/services/scenario-prompt';
import { streamChat } from '@/lib/providers/chain';
import type { LlmMessage } from '@/lib/providers/types';
import { parseApiErrorMessage } from '@/lib/providers/types';
import { showError } from '@/lib/toast';
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
  const [lastError, setLastError] = useState<string | null>(null);
  const [assistantHints, setAssistantHints] = useState<Record<string, string>>({});
  const abortRef = useRef<AbortController | null>(null);
  const onCompleteRef = useRef(onAssistantComplete);
  onCompleteRef.current = onAssistantComplete;

  useEffect(() => {
    setAssistantHints({});
  }, [conversationId]);

  const streamAssistantReply = useCallback(
    async (llmMessages: LlmMessage[]): Promise<{ id: string; content: string }> => {
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
        setLastError(null);
        onCompleteRef.current?.(assistant.id, content);
        return { id: assistant.id, content };
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          return { id: assistant.id, content };
        }
        const raw = e instanceof Error ? e.message : 'Send failed';
        const friendly = raw.includes('Key') ? raw : parseApiErrorMessage(raw);
        setLastError(friendly);
        showError('Could not get a reply', friendly);
        await db.messages.delete(assistant.id);
        throw e;
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        onStreamEnd?.();
      }
    },
    [conversationId, settings, onStreamEnd],
  );

  const attachFallbackHint = useCallback((assistantId: string, content: string, hint: string) => {
    const parsed = parseAssistantContent(content);
    if (!parsed.hint) {
      setAssistantHints((prev) => ({ ...prev, [assistantId]: hint }));
    }
  }, []);

  const buildHistoryMessages = useCallback(async (): Promise<LlmMessage[]> => {
    const history = await db.messages
      .where('conversationId')
      .equals(conversationId)
      .sortBy('createdAt');

    const llmMessages: LlmMessage[] = [];
    if (scenario) {
      llmMessages.push({ role: 'system', content: resolveScenarioSystemPrompt(scenario) });
    }
    for (const m of history) {
      if (m.role === 'user' || m.role === 'assistant') {
        if (m.status === 'complete' && m.content.trim()) {
          const content =
            m.role === 'assistant' ? getSpeakableText(m.content) : m.content;
          llmMessages.push({ role: m.role, content });
        }
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
      showError('Network unavailable', 'Check your connection and try again');
      return;
    }

    const llmMessages: LlmMessage[] = [
      { role: 'system', content: resolveScenarioSystemPrompt(scenario) },
      { role: 'user', content: OPENING_USER_TRIGGER },
    ];

    try {
      await streamAssistantReply(llmMessages);
    } catch {
      // toast + lastError already set
    }
  }, [scenario, isStreaming, conversationId, streamAssistantReply]);

  const sendUserMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      if (!navigator.onLine) {
        showError('Network unavailable', 'Check your connection and try again');
        return;
      }

      setLastError(null);

      try {
        const userMsg = await addMessage(conversationId, 'user', trimmed);

        let pendingHint: string | null = null;
        if (scenario && isRoleplayScenario(scenario)) {
          pendingHint = await buildExpressionHintForUserMessage(
            settings,
            trimmed,
            conversationId,
            userMsg.id,
            scenario.id,
            scenario.description,
          );
        }

        const llmMessages = await buildHistoryMessages();
        const { id: assistantId, content } = await streamAssistantReply(llmMessages);

        if (pendingHint) {
          attachFallbackHint(assistantId, content, pendingHint);
        }
      } catch {
        // toast + lastError already set
      }
    },
    [
      conversationId,
      scenario,
      settings,
      isStreaming,
      buildHistoryMessages,
      streamAssistantReply,
      attachFallbackHint,
    ],
  );

  const retryLast = useCallback(async () => {
    setLastError(null);
    const msgs = await db.messages
      .where('conversationId')
      .equals(conversationId)
      .sortBy('createdAt');
    const failed = [...msgs].reverse().find((m) => m.status === 'failed');
    if (failed) await db.messages.delete(failed.id);
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
    if (lastUser && lastUser.content !== OPENING_USER_TRIGGER) {
      await sendUserMessage(lastUser.content);
    } else if (scenario) {
      await sendOpening();
    }
  }, [conversationId, sendUserMessage, sendOpening, scenario]);

  const clearError = useCallback(() => setLastError(null), []);

  return {
    sendUserMessage,
    sendOpening,
    retryLast,
    isStreaming,
    lastError,
    clearError,
    assistantHints,
  };
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
          if (m.status === 'complete' && m.content.trim()) {
            const content =
              m.role === 'assistant' ? getSpeakableText(m.content) : m.content;
            llmMessages.push({ role: m.role, content });
          }
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
        const friendly = e instanceof Error ? parseApiErrorMessage(e.message) : 'Review chat failed';
        showError('Review chat failed', friendly);
        await db.messages.delete(assistant.id);
      } finally {
        setIsStreaming(false);
      }
    },
    [conversationId, systemPrompt, settings, isStreaming],
  );

  return { sendUserMessage, isStreaming };
}
