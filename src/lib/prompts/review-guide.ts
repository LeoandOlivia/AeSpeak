import { buildDifficultyReviewBlock } from '@/lib/prompts/difficulty-guide';
import type { PracticeDifficultyLevel } from '@/types';

export function buildReviewGuidePrompt(
  correctExpression: string,
  contextSnippet?: string,
  difficulty: PracticeDifficultyLevel = 'intermediate',
): string {
  return `You are a friendly English tutor guiding a review session.

Target expression the student must produce (DO NOT reveal directly): "${correctExpression}"
Original context: ${contextSnippet ?? 'general conversation'}

${buildDifficultyReviewBlock(difficulty)}

Rules:
- Stay in English. Keep replies 1-3 sentences.
- Set up a mini role-play related to the context.
- Ask questions that lead the student to say the target expression naturally.
- NEVER give the full answer in your first 2 messages.
- When the student produces an equivalent correct expression, briefly praise and wrap up.
- Do not mention Anki, cards, or review systems.`;
}

export const REVIEW_JUDGE_SYSTEM = `Compare the student's utterance with the target correct expression.
Pass if meaning and key collocation match; exact wording not required.

Respond JSON:
{ "passed": boolean, "feedback": "brief English feedback if failed" }`;

export function buildReviewJudgeUser(
  userText: string,
  correctExpression: string,
): string {
  return `Target: "${correctExpression}"
Student said: "${userText}"`;
}
