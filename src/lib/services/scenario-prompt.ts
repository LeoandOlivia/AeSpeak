import { SCENARIO_SEEDS } from '@/lib/db/scenario-definitions';
import {
  appendScenarioReminderIfNeeded,
  buildPracticeSystemPrompt,
} from '@/lib/prompts/practice-guide';
import type { PracticeDifficultyLevel, Scenario } from '@/types';

/** Always use the latest prompt template (not stale IndexedDB copy). */
export function resolveScenarioSystemPrompt(
  scenario: Scenario,
  difficulty: PracticeDifficultyLevel = 'intermediate',
): string {
  const seed = SCENARIO_SEEDS.find((s) => s.id === scenario.id);
  if (!seed) {
    return buildPracticeSystemPrompt(
      scenario.characterRole,
      scenario.description,
      scenario.title,
      scenario.category,
      scenario.suggestedVocab,
      difficulty,
    );
  }
  return buildPracticeSystemPrompt(
    seed.characterRole,
    seed.scene,
    seed.title,
    seed.category,
    seed.suggestedVocab,
    difficulty,
  );
}

export function resolveScenarioSeed(scenario: Scenario) {
  return SCENARIO_SEEDS.find((s) => s.id === scenario.id);
}

export function isRoleplayScenario(scenario: Scenario): boolean {
  return scenario.category !== 'free_chat';
}

export function applyScenarioReminder(
  systemPrompt: string,
  scenario: Scenario,
  userTurnCount: number,
): string {
  if (!isRoleplayScenario(scenario)) return systemPrompt;
  const seed = resolveScenarioSeed(scenario);
  if (!seed) return systemPrompt;
  return appendScenarioReminderIfNeeded(
    systemPrompt,
    seed.characterRole,
    seed.scene,
    userTurnCount,
  );
}
