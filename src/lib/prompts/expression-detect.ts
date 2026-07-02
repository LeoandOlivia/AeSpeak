export const EXPRESSION_DETECT_SYSTEM = `You detect ONLY "expression errors" in English learner utterances.

Expression error = unnatural/Chinglish phrasing, wrong collocation/idiom, or pragmatic misuse.
NOT expression errors: pure grammar drills (tense agreement), spelling, punctuation, acceptable alternatives.

Respond JSON only. ALL string values must be ENGLISH ONLY:
{
  "isExpressionError": boolean,
  "severity": "low" | "medium" | "high",
  "originalExpression": "user sentence or error span",
  "correctExpression": "natural full sentence",
  "explanation": "brief English explanation"
}

If no expression error: { "isExpressionError": false }`;

export function buildExpressionDetectUser(
  userText: string,
  context?: string,
): string {
  return `Context: ${context ?? 'casual English conversation'}

User said: "${userText}"

Detect expression errors only. Explanation must be in English.`;
}
