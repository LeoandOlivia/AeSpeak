import type { PracticeDifficultyLevel } from '@/types';

export interface PracticeDifficultySpec {
  id: PracticeDifficultyLevel;
  label: string;
  cefr: string;
  summary: string;
}

export const PRACTICE_DIFFICULTY_SPECS: PracticeDifficultySpec[] = [
  {
    id: 'starter',
    label: 'Starter · 入门',
    cefr: 'A1',
    summary: 'Very basic words, short phrases, present tense',
  },
  {
    id: 'elementary',
    label: 'Elementary · 基础',
    cefr: 'A2',
    summary: 'Common daily words, simple past and modals',
  },
  {
    id: 'intermediate',
    label: 'Intermediate · 中级',
    cefr: 'B1',
    summary: 'Everyday conversation, clear compound sentences',
  },
  {
    id: 'upper',
    label: 'Upper · 中高级',
    cefr: 'B2',
    summary: 'Natural colloquial English, varied structures',
  },
  {
    id: 'advanced',
    label: 'Advanced · 高级',
    cefr: 'C1',
    summary: 'Native-like nuance, idioms, complex ideas',
  },
];

const VALID_LEVELS = new Set(PRACTICE_DIFFICULTY_SPECS.map((s) => s.id));

export function normalizePracticeDifficulty(value: unknown): PracticeDifficultyLevel {
  if (typeof value === 'string' && VALID_LEVELS.has(value as PracticeDifficultyLevel)) {
    return value as PracticeDifficultyLevel;
  }
  return 'intermediate';
}

export function getPracticeDifficultySpec(
  level: PracticeDifficultyLevel = 'intermediate',
): PracticeDifficultySpec {
  return (
    PRACTICE_DIFFICULTY_SPECS.find((s) => s.id === level) ??
    PRACTICE_DIFFICULTY_SPECS.find((s) => s.id === 'intermediate')!
  );
}

const LEVEL_RULES: Record<PracticeDifficultyLevel, string> = {
  starter: `- Vocabulary: top ~800 high-frequency words only (hello, want, like, go, eat, drink, how much, etc.).
- Grammar: present simple / "be" / basic questions. No perfect tenses, no conditionals, no passive voice.
- Sentences: 3–8 words each; 1 short sentence + 1 very simple question per reply.
- Avoid: idioms, phrasal verbs (except go/want/like/have), slang, rare words, long clauses.
- Scenario vocab: if a suggested word is too hard, use a simpler synonym (e.g. "bill" → "money for food").`,
  elementary: `- Vocabulary: ~1500 common words; everyday objects, places, feelings.
- Grammar: past simple, "going to", can/could/should, comparatives; simple "because" clauses.
- Sentences: 8–12 words; 1–2 sentences + one clear question.
- Avoid: idioms, advanced collocations, academic jargon, C1-level synonyms.
- Scenario vocab: prefer the easiest words from the list; paraphrase hard items.`,
  intermediate: `- Vocabulary: ~3000-word everyday range; common phrasal verbs OK.
- Grammar: present perfect (simple uses), first conditional, relative clauses (who/that/which).
- Sentences: natural conversational length; still clear and guided.
- Avoid: rare literary words, heavy idioms, overly formal register unless the scene requires it.
- Scenario vocab: use suggested words when they fit this level; simplify only if clearly above B1.`,
  upper: `- Vocabulary: broad B2 range; natural collocations and common idioms allowed.
- Grammar: mixed tenses, second conditional, passive where natural.
- Sentences: fluent but not overly long; match how educated native speakers talk in the scene.
- Scenario vocab: use suggested vocabulary naturally; occasional stretch words are OK if context makes them clear.`,
  advanced: `- Vocabulary: full native range appropriate to the scene; idioms, humor, nuance welcome.
- Grammar: no artificial simplification — use whatever structures fit the role-play.
- Sentences: natural native length and rhythm.
- Scenario vocab: use rich, precise wording including suggested vocabulary.`,
};

export function buildDifficultyLanguageBlock(level: PracticeDifficultyLevel): string {
  const spec = getPracticeDifficultySpec(level);
  return `LANGUAGE LEVEL (GLOBAL — STRICT):
The learner's level is ${spec.label} (${spec.cefr}). ALL English you produce must stay within this level.
Do NOT use vocabulary, idioms, or grammar above ${spec.cefr}, even if the scenario suggests harder words.

${LEVEL_RULES[level]}

If the user's English exceeds this level, still reply at ${spec.cefr} — do not escalate difficulty to match them.`;
}

export function buildDifficultyHintBlock(level: PracticeDifficultyLevel): string {
  const spec = getPracticeDifficultySpec(level);
  return `The learner is at ${spec.label} (${spec.cefr}). Suggest corrections using words and structures at or below this level only.`;
}

export function buildDifficultyReviewBlock(level: PracticeDifficultyLevel): string {
  const spec = getPracticeDifficultySpec(level);
  return `The learner is at ${spec.label} (${spec.cefr}). Keep your English within this level — vocabulary, questions, and praise must match ${spec.cefr}.`;
}
