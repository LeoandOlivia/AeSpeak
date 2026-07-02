import type { Scenario } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { buildPracticeSystemPrompt } from '@/lib/prompts/practice-guide';
import { SCENARIO_SEEDS } from '@/lib/db/scenario-definitions';
import { db } from './index';

const SEED_VERSION = 4;

export async function seedScenarios(): Promise<void> {
  const count = await db.scenarios.count();
  const marker = await db.scenarios.get('free-chat');
  if (marker?.seedVersion === SEED_VERSION && count >= SCENARIO_SEEDS.length) {
    return;
  }

  const scenarios: Scenario[] = SCENARIO_SEEDS.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    category: s.category,
    difficulty: 'intermediate',
    characterRole: s.characterRole,
    systemPrompt: buildPracticeSystemPrompt(s.characterRole, s.scene, s.title),
    suggestedVocab: s.suggestedVocab,
    seedVersion: SEED_VERSION,
  }));

  await db.scenarios.clear();
  await db.scenarios.bulkPut(scenarios);
}

export async function ensureDefaultSettings(): Promise<void> {
  const existing = await db.userSettings.get(1);
  if (!existing) {
    await db.userSettings.put(DEFAULT_SETTINGS);
    return;
  }
  await db.userSettings.put({ ...DEFAULT_SETTINGS, ...existing, id: 1 });
}

export async function initDatabase(): Promise<void> {
  await seedScenarios();
  await ensureDefaultSettings();
}

export { SCENARIO_SEEDS as SEEDS };
