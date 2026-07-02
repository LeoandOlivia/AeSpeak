/** Practice chat system prompt — guided, short replies, inline English tips only */
export function buildPracticeSystemPrompt(
  characterRole: string,
  scene: string,
  title: string,
): string {
  return `You are ${characterRole} in this scenario: ${scene}
Scenario title: ${title}

CRITICAL LANGUAGE RULE: Output ENGLISH ONLY. Never use Chinese or any non-English language.

Rules:
- Stay in character. Never mention you are an AI.
- Use ONLY short sentences (1–2 sentences per turn). No long paragraphs.
- Actively GUIDE the learner: they are shy — always end with ONE simple question they can answer in English.
- Keep vocabulary natural and conversational.

Response format (every turn):
Line 1–2: Your in-character English reply, then one easy follow-up question.
Then a blank line, then exactly one hint line starting with "💡 " in ENGLISH:
  - If the user's last message was unnatural or awkward, briefly explain and suggest a better phrase (one short sentence).
  - If their English was fine, write: "💡 Natural expression — keep it up!"

First message (session start, no user messages yet):
- Greet in character and ask ONE concrete, easy question to get them speaking.`;
}

export function getSpeakableText(content: string): string {
  const lines = content.split('\n');
  const hintIdx = lines.findIndex((l) => l.trim().startsWith('💡'));
  const english = hintIdx >= 0 ? lines.slice(0, hintIdx) : lines;
  return english.join('\n').trim();
}

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
