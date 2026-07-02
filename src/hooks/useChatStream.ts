import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '@/lib/db';
import {
  NATURAL_EXPRESSION_HINT,
  OPENING_USER_TRIGGER,
  parseAssistantContent,
} from '@/lib/prompts/practice-guide';
import { buildPracticeLlmHistory, buildLlmHistory } from '@/lib/services/chat-history';
import {
  addMessage,
  buildExpressionHintForUserMessage,
  updateMessage,
} from '@/lib/services/conversation';
import { isRoleplayScenario, resolveScenarioSystemPrompt } from '@/lib/services/scenario-prompt';
import { streamChat } from '@/lib/providers/chain';
import type { LlmMessage } from '@/lib/providers/types';
import { parseApiErrorMessage } from '@/lib/providers/types';
import { ensureOnlineOrToast, showError } from '@/lib/toast';
import type { Scenario, UserSettings } from '@/types';

interface UseChatStreamOptions {
  conversationId: string;
  scenario?: Scenario;
  settings: UserSettings;
  onAssistantComplete?: (messageId: string, content: string) => void;
}

export function useChatStream({
  conversationId,
  scenario,
  settings,
  onAssistantComplete,
}: UseChatStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [naturalHints, setNaturalHints] = useState<Record<string, string>>({});
  const abortRef = useRef<AbortController | null>(null);
  const onCompleteRef = useRef(onAssistantComplete);
  onCompleteRef.current = onAssistantComplete;

  useEffect(() => {
    setNaturalHints({});
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
      }
    },
    [conversationId, settings],
  );

  const maybeAttachNaturalHint = useCallback(
    (assistantId: string, content: string, hint: string) => {
      if (hint !== NATURAL_EXPRESSION_HINT) return;
      if (!parseAssistantContent(content).hint) {
        setNaturalHints((prev) => ({ ...prev, [assistantId]: hint }));
      }
    },
    [],
  );

  const sendOpening = useCallback(async () => {
    if (!scenario || isStreaming) return;

    const count = await db.messages.where('conversationId').equals(conversationId).count();
    if (count > 0) return;
    if (!ensureOnlineOrToast()) return;

    const llmMessages: LlmMessage[] = [
      { role: 'system', content: resolveScenarioSystemPrompt(scenario, settings.practiceDifficulty) },
      { role: 'user', content: OPENING_USER_TRIGGER },
    ];

    try {
      await streamAssistantReply(llmMessages);
    } catch {
      // toast + lastError already set
    }
  }, [scenario, isStreaming, conversationId, streamAssistantReply, settings.practiceDifficulty]);

  const sendUserMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;
      if (!ensureOnlineOrToast()) return;

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

        const llmMessages = scenario
          ? await buildPracticeLlmHistory(conversationId, scenario, settings.practiceDifficulty)
          : await buildLlmHistory(conversationId);

        const { id: assistantId, content } = await streamAssistantReply(llmMessages);

        if (pendingHint) {
          maybeAttachNaturalHint(assistantId, content, pendingHint);
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
      streamAssistantReply,
      maybeAttachNaturalHint,
    ],
  );

  const retryLast = useCallback(async () => {
    setLastError(null);
    const msgs = await db.messages
      .where('conversationId')
      .equals(conversationId)
      .sortBy('createdAt');
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
    naturalHints,
  };
}

export function useReviewChatStream({
  conversationId,
  systemPrompt,
  settings,
  onAssistantComplete,
}: {
  conversationId: string;
  systemPrompt: string;
  settings: UserSettings;
  onAssistantComplete?: (messageId: string, content: string) => void;
}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const onCompleteRef = useRef(onAssistantComplete);
  onCompleteRef.current = onAssistantComplete;

  const sendUserMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      await addMessage(conversationId, 'user', trimmed);
      const llmMessages = await buildLlmHistory(conversationId, systemPrompt);

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
        onCompleteRef.current?.(assistant.id, content);
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
