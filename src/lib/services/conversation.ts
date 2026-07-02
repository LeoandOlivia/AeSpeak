import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { createInitialReviewCard } from '@/lib/anki-scheduler';
import { llmJsonCompletion } from '@/lib/providers/types';
import {
  EXPRESSION_DETECT_SYSTEM,
  buildExpressionDetectUser,
} from '@/lib/prompts/expression-detect';
import {
  formatExpressionHint,
  NATURAL_EXPRESSION_HINT,
} from '@/lib/prompts/practice-guide';
import type {
  Conversation,
  ExpressionDetectResult,
  Message,
  UserSettings,
} from '@/types';

export async function createPracticeConversation(scenarioId: string): Promise<string> {
  const id = uuidv4();
  const now = Date.now();
  const conv: Conversation = {
    id,
    scenarioId,
    type: 'practice',
    status: 'active',
    startedAt: now,
    updatedAt: now,
  };
  await db.conversations.add(conv);
  return id;
}

export async function createReviewConversation(reviewCardId: string): Promise<string> {
  const id = uuidv4();
  const now = Date.now();
  const conv: Conversation = {
    id,
    reviewCardId,
    type: 'review',
    status: 'active',
    startedAt: now,
    updatedAt: now,
  };
  await db.conversations.add(conv);
  return id;
}

export async function addMessage(
  conversationId: string,
  role: Message['role'],
  content: string,
  status: Message['status'] = 'complete',
): Promise<Message> {
  const msg: Message = {
    id: uuidv4(),
    conversationId,
    role,
    content,
    status,
    createdAt: Date.now(),
  };
  await db.messages.add(msg);
  await db.conversations.update(conversationId, {
    updatedAt: Date.now(),
    lastMessagePreview: content.slice(0, 80),
  });
  return msg;
}

export async function updateMessage(
  id: string,
  patch: Partial<Pick<Message, 'content' | 'status'>>,
): Promise<void> {
  await db.messages.update(id, patch);
  if (patch.content) {
    const msg = await db.messages.get(id);
    if (msg) {
      await db.conversations.update(msg.conversationId, {
        updatedAt: Date.now(),
        lastMessagePreview: patch.content.slice(0, 80),
      });
    }
  }
}

export async function endConversation(conversationId: string): Promise<void> {
  await db.conversations.update(conversationId, {
    status: 'ended',
    endedAt: Date.now(),
    updatedAt: Date.now(),
  });
}

async function deleteReviewCardRecords(reviewCardId: string): Promise<void> {
  const conversations = await db.conversations.toArray();
  for (const conv of conversations) {
    if (conv.reviewCardId !== reviewCardId) continue;
    await db.messages.where('conversationId').equals(conv.id).delete();
    await db.conversations.delete(conv.id);
  }
  await db.reviewCards.delete(reviewCardId);
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await db.transaction('rw', [db.messages, db.conversations], async () => {
    await db.messages.where('conversationId').equals(conversationId).delete();
    await db.conversations.delete(conversationId);
  });
}

export async function deleteReviewCard(reviewCardId: string): Promise<void> {
  const card = await db.reviewCards.get(reviewCardId);
  if (!card) return;

  await db.transaction(
    'rw',
    [db.messages, db.conversations, db.reviewCards, db.errorRecords],
    async () => {
      await deleteReviewCardRecords(reviewCardId);
      const errorRecord = await db.errorRecords.get(card.errorRecordId);
      if (errorRecord) {
        await db.errorRecords.delete(card.errorRecordId);
      }
    },
  );
}

/** Remove review cards whose practice error record was already deleted. */
export async function cleanupOrphanReviewCards(): Promise<number> {
  const [cards, errors] = await Promise.all([
    db.reviewCards.toArray(),
    db.errorRecords.toArray(),
  ]);
  const validErrorIds = new Set(errors.map((e) => e.id));
  const orphans = cards.filter((c) => !validErrorIds.has(c.errorRecordId));
  for (const card of orphans) {
    await deleteReviewCard(card.id);
  }
  return orphans.length;
}

export async function buildExpressionHintForUserMessage(
  settings: UserSettings,
  userText: string,
  conversationId: string,
  messageId: string,
  scenarioId: string,
  contextSnippet?: string,
): Promise<string> {
  const existing = await db.errorRecords.where('messageId').equals(messageId).first();
  if (existing) return formatExpressionHint(existing);

  let result: ExpressionDetectResult;
  try {
    result = await llmJsonCompletion<ExpressionDetectResult>(
      settings,
      EXPRESSION_DETECT_SYSTEM,
      buildExpressionDetectUser(userText, contextSnippet, settings.practiceDifficulty),
    );
  } catch {
    return NATURAL_EXPRESSION_HINT;
  }

  if (
    result.isExpressionError &&
    result.severity !== 'low' &&
    result.originalExpression &&
    result.correctExpression &&
    result.explanation
  ) {
    const errorId = uuidv4();
    await db.errorRecords.add({
      id: errorId,
      conversationId,
      messageId,
      scenarioId,
      originalExpression: result.originalExpression,
      correctExpression: result.correctExpression,
      explanation: result.explanation,
      contextSnippet,
      createdAt: Date.now(),
    });

    const initial = createInitialReviewCard();
    await db.reviewCards.add({
      id: uuidv4(),
      errorRecordId: errorId,
      ...initial,
    });

    return formatExpressionHint({
      originalExpression: result.originalExpression,
      correctExpression: result.correctExpression,
      explanation: result.explanation,
    });
  }

  return NATURAL_EXPRESSION_HINT;
}

export async function getConversationErrors(conversationId: string) {
  return db.errorRecords.where('conversationId').equals(conversationId).toArray();
}

export async function getActiveConversationForScenario(scenarioId: string) {
  return db.conversations
    .where('[type+status]')
    .equals(['practice', 'active'])
    .filter((c) => c.scenarioId === scenarioId)
    .first();
}
