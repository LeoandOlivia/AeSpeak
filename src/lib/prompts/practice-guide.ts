import type { ErrorRecord, PracticeDifficultyLevel, ScenarioCategory } from '@/types';
import { buildDifficultyLanguageBlock } from '@/lib/prompts/difficulty-guide';

const HINT_START = '[[HINT]]';
const HINT_END = '[[/HINT]]';

/** Inject a scene reminder every N completed user turns (not shown in UI). */
export const SCENARIO_REMINDER_INTERVAL = 6;

export function buildScenarioReminder(characterRole: string, scene: string): string {
  return `[Reminder: You are still ${characterRole}. Stay in this scene: ${scene}. Keep the conversation on-topic; redirect off-topic replies in character.]`;
}

export function appendScenarioReminderIfNeeded(
  systemPrompt: string,
  characterRole: string,
  scene: string,
  userTurnCount: number,
): string {
  if (userTurnCount < SCENARIO_REMINDER_INTERVAL) return systemPrompt;
  if (userTurnCount % SCENARIO_REMINDER_INTERVAL !== 0) return systemPrompt;
  return `${systemPrompt}\n\n${buildScenarioReminder(characterRole, scene)}`;
}

/** Practice chat system prompt — guided, short replies, Chinese inline tips */
export function buildPracticeSystemPrompt(
  characterRole: string,
  scene: string,
  title: string,
  category: ScenarioCategory = 'daily_life',
  suggestedVocab: string[] = [],
  difficulty: PracticeDifficultyLevel = 'intermediate',
): string {
  const isFreeChat = category === 'free_chat';

  const vocabLine =
    !isFreeChat && suggestedVocab.length > 0
      ? `- Weave in scenario vocabulary when natural: ${suggestedVocab.join(', ')}.`
      : '';

  const roleplayBlock = isFreeChat
    ? ''
    : `
ROLE-PLAY NOTE: You are acting as ${characterRole}. Stay in character for the English reply ONLY.
The ${HINT_START} block is OUT OF CHARACTER learner feedback — never skip it after the user speaks.

SCENE BOUNDARIES:
- Stay in scene: discuss ONLY topics relevant to this scenario — ${scene}
- Redirect: if the learner goes off-topic, gently steer back in character (e.g. "Let's focus on your order — what would you like to drink?")
${vocabLine}
- Forbidden: do NOT switch roles, leave the scene, act as a general chatbot, or discuss unrelated topics (politics, coding, homework help, etc.)`;

  return `You are ${characterRole} in this scenario: ${scene}
Scenario title: ${title}
${roleplayBlock}

${buildDifficultyLanguageBlock(difficulty)}

Rules:
- Stay in character for the English reply. Never mention you are an AI.
- English reply: 1–2 short sentences + one easy follow-up question.
- Actively GUIDE the learner: they are shy — always end with ONE simple question they can answer in English.
- Keep vocabulary natural and conversational — within the LANGUAGE LEVEL above only.

Response format after the user has spoken (MANDATORY):
[Your English in-character reply + one follow-up question]

${HINT_START}
💡 Chinese correction for the user's last message. Use: "原句" 应为 "正确说法"。Multiple fixes in one hint are OK.
If their English was fine: 💡 表达很自然，继续保持！
${HINT_END}

First message (session start, no user messages yet):
- Plain English only — greet in character and ask ONE easy question. No ${HINT_START} block yet.`;
}

function stripHintPrefix(text: string): string {
  return text
    .trim()
    .replace(/^[\s\-*•]+/, '')
    .replace(/^💡\s*/, '')
    .replace(/^(?:Hint|提示)\s*[:：]\s*/i, '')
    .trim();
}

function lineLooksLikeHint(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (t.includes('💡')) return true;
  if (/^(?:Hint|提示)\s*[:：]/i.test(t)) return true;
  if (/应为/.test(t)) return true;
  return false;
}

function parseBlockHint(content: string): { dialogue: string; hint: string | null } | null {
  const start = content.indexOf(HINT_START);
  if (start < 0) return null;

  const afterStart = start + HINT_START.length;
  const end = content.indexOf(HINT_END, afterStart);
  const dialogue = content.slice(0, start).trim();
  const hintRaw = end >= 0 ? content.slice(afterStart, end) : content.slice(afterStart);
  const hint = stripHintPrefix(hintRaw);
  return { dialogue, hint: hint || null };
}

function parseTaggedContent(content: string): { dialogue: string; hint: string | null } | null {
  const hintMatch = content.match(/<hint>\s*([\s\S]*?)(?:\s*<\/hint>|$)/i);
  if (!hintMatch) return null;

  let dialogue = content.replace(/<hint>\s*[\s\S]*?(?:\s*<\/hint>|$)/i, '');
  dialogue = dialogue
    .replace(/<\/?dialogue>/gi, '')
    .replace(/<\/?reply>/gi, '')
    .trim();

  const hint = stripHintPrefix(hintMatch[1]);
  return { dialogue, hint: hint || null };
}

export function parseAssistantContent(content: string): {
  dialogue: string;
  hint: string | null;
} {
  const trimmed = content.trim();
  if (!trimmed) return { dialogue: '', hint: null };

  const block = parseBlockHint(trimmed);
  if (block) return block;

  const tagged = parseTaggedContent(trimmed);
  if (tagged) return tagged;

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const inlineIdx = lines[i].indexOf('💡');
    if (inlineIdx > 0) {
      const dialogueLines = [...lines.slice(0, i), lines[i].slice(0, inlineIdx).trim()].filter(
        (l) => l.length > 0,
      );
      const hintLines = [lines[i].slice(inlineIdx), ...lines.slice(i + 1)];
      const hint = stripHintPrefix(hintLines.join('\n'));
      return {
        dialogue: dialogueLines.join('\n').trim(),
        hint: hint || null,
      };
    }
  }

  const hintLineIdx = lines.findIndex((l) => lineLooksLikeHint(l));
  if (hintLineIdx < 0) {
    return { dialogue: trimmed, hint: null };
  }

  const dialogue = lines.slice(0, hintLineIdx).join('\n').trim();
  const hint = stripHintPrefix(lines.slice(hintLineIdx).join('\n'));
  return { dialogue, hint: hint || null };
}

export function getSpeakableText(content: string): string {
  return parseAssistantContent(content).dialogue;
}

export function formatExpressionHint(
  error: Pick<ErrorRecord, 'originalExpression' | 'correctExpression' | 'explanation'>,
): string {
  const original = error.originalExpression.trim();
  const correct = error.correctExpression.trim();
  let text = `"${original}" 应为 "${correct}"`;
  const note = error.explanation.trim();
  if (note) text += `。${note}`;
  return text;
}

export const NATURAL_EXPRESSION_HINT = '表达很自然，继续保持！';

export const OPENING_USER_TRIGGER =
  '[Session start — give your opening line now to guide the learner to speak.]';
