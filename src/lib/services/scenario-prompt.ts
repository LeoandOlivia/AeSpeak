import { SCENARIO_SEEDS } from '@/lib/db/scenario-definitions';
import { buildPracticeSystemPrompt } from '@/lib/prompts/practice-guide';
import type { Scenario } from '@/types';

/** Always use the latest prompt template (not stale IndexedDB copy). */
export function resolveScenarioSystemPrompt(scenario: Scenario): string {
  const seed = SCENARIO_SEEDS.find((s) => s.id === scenario.id);
  if (!seed) return scenario.systemPrompt;
  return buildPracticeSystemPrompt(seed.characterRole, seed.scene, seed.title, seed.category);
}

export function isRoleplayScenario(scenario: Scenario): boolean {
  return scenario.category !== 'free_chat';
}
