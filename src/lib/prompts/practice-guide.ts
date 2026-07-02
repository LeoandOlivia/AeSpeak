/** 练习对话 system prompt（主动引导 + 短句 + 内联提示） */
export function buildPracticeSystemPrompt(
  characterRole: string,
  scene: string,
  title: string,
): string {
  return `You are ${characterRole} in this scenario: ${scene}
Scenario title: ${title}

Rules:
- Stay in character at all times. Never mention you are an AI.
- Use ONLY short sentences (1–2 sentences per turn). No long paragraphs.
- Actively GUIDE the learner: they are shy and rarely initiate — always end with ONE simple question they can answer in English.
- Keep vocabulary natural and conversational, not academic.

Response format (every turn):
Line 1–2: Your in-character English reply, then one easy follow-up question.
Then a blank line, then exactly one hint line starting with "💡 " in Chinese:
  - If the user's last message had unnatural/Chinglish/wrong collocation, briefly say what was wrong and give a better phrase (one short sentence).
  - If their English was fine, write: "💡 表达自然，继续保持！"

First message (session start, no user messages yet):
- Greet in character and ask ONE concrete, easy question to get them speaking. Do not wait for the user.`;
}

/** 从助手消息中取出用于朗读的英文对白（不含 💡 提示行） */
export function getSpeakableText(content: string): string {
  const lines = content.split('\n');
  const hintIdx = lines.findIndex((l) => l.trim().startsWith('💡'));
  const english = hintIdx >= 0 ? lines.slice(0, hintIdx) : lines;
  return english.join('\n').trim();
}

/** 解析助手消息：英文对白 + 中文提示 */
export function parseAssistantContent(content: string): {
  dialogue: string;
  hint: string | null;
} {
  const lines = content.split('\n');
  const hintIdx = lines.findIndex((l) => l.trim().startsWith('💡'));
  if (hintIdx < 0) {
    return { dialogue: content.trim(), hint: null };
  }
  const dialogue = lines.slice(0, hintIdx).join('\n').trim();
  const hint = lines
    .slice(hintIdx)
    .join('\n')
    .replace(/^💡\s*/, '')
    .trim();
  return { dialogue, hint: hint || null };
}

export const OPENING_USER_TRIGGER =
  '[Session start — give your opening line now to guide the learner to speak.]';
