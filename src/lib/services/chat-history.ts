import { db } from '@/lib/db';
import { getSpeakableText } from '@/lib/prompts/practice-guide';
import {
  applyScenarioReminder,
  resolveScenarioSystemPrompt,
} from '@/lib/services/scenario-prompt';
import type { LlmMessage } from '@/lib/providers/types';
import type { Message, PracticeDifficultyLevel, Scenario } from '@/types';

function messagesToLlmHistory(history: Message[], systemPrompt?: string): LlmMessage[] {
  const llmMessages: LlmMessage[] = [];
  if (systemPrompt) {
    llmMessages.push({ role: 'system', content: systemPrompt });
  }
  for (const m of history) {
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    if (m.status !== 'complete' || !m.content.trim()) continue;
    const content = m.role === 'assistant' ? getSpeakableText(m.content) : m.content;
    llmMessages.push({ role: m.role, content });
  }
  return llmMessages;
}

export async function buildLlmHistory(
  conversationId: string,
  systemPrompt?: string,
): Promise<LlmMessage[]> {
  const history = await db.messages
    .where('conversationId')
    .equals(conversationId)
    .sortBy('createdAt');
  return messagesToLlmHistory(history, systemPrompt);
}

export async function buildPracticeLlmHistory(
  conversationId: string,
  scenario: Scenario,
  difficulty: PracticeDifficultyLevel = 'intermediate',
): Promise<LlmMessage[]> {
  const history = await db.messages
    .where('conversationId')
    .equals(conversationId)
    .sortBy('createdAt');

  const userTurnCount = history.filter((m) => m.role === 'user' && m.status === 'complete').length;
  let systemPrompt = resolveScenarioSystemPrompt(scenario, difficulty);
  systemPrompt = applyScenarioReminder(systemPrompt, scenario, userTurnCount);

  return messagesToLlmHistory(history, systemPrompt);
}
