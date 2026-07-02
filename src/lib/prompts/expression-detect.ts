import { buildDifficultyHintBlock } from '@/lib/prompts/difficulty-guide';
import type { PracticeDifficultyLevel } from '@/types';

export const EXPRESSION_DETECT_SYSTEM = `You detect ONLY "expression errors" in English learner utterances.

Expression error = unnatural/Chinglish phrasing, wrong collocation/idiom, or pragmatic misuse.
NOT expression errors: pure grammar drills (tense agreement), spelling, punctuation, acceptable alternatives.

Respond JSON only. ALL string values must be in CHINESE for explanation, keep English phrases in originalExpression/correctExpression:
{
  "isExpressionError": boolean,
  "severity": "low" | "medium" | "high",
  "originalExpression": "user's exact English phrase or sentence",
  "correctExpression": "natural English correction (full sentence or phrase)",
  "explanation": "brief Chinese note; prefer 「原句」应为「正确说法」 style when possible"
}

If no expression error: { "isExpressionError": false }`;

export function buildExpressionDetectUser(
  userText: string,
  context?: string,
  difficulty: PracticeDifficultyLevel = 'intermediate',
): string {
  return `Context: ${context ?? 'casual English conversation'}
${buildDifficultyHintBlock(difficulty)}
When suggesting correctExpression, use vocabulary at or below the learner's level only.

User said: "${userText}"

Detect expression errors only. explanation must be Chinese.`;
}
