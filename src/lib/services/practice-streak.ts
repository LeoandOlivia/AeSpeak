import { db } from '@/lib/db';

/** Local calendar day as YYYY-MM-DD (follows device timezone) */
export function localDayKey(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-CA');
}

/** Days with at least one user message in a practice conversation */
export async function getPracticeDayKeys(): Promise<Set<string>> {
  const practiceConversations = await db.conversations
    .where('type')
    .equals('practice')
    .toArray();

  const days = new Set<string>();
  for (const conversation of practiceConversations) {
    const messages = await db.messages
      .where('conversationId')
      .equals(conversation.id)
      .toArray();
    for (const message of messages) {
      if (message.role === 'user') {
        days.add(localDayKey(message.createdAt));
      }
    }
  }
  return days;
}

/**
 * Consecutive practice days ending today, or yesterday if today has no session yet
 * (standard streak grace until the day ends).
 */
export function computePracticeStreak(
  practiceDays: Set<string>,
  now = Date.now(),
): number {
  if (practiceDays.size === 0) return 0;

  const todayKey = localDayKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDayKey(yesterday.getTime());

  const anchor = practiceDays.has(todayKey)
    ? new Date(now)
    : practiceDays.has(yesterdayKey)
      ? yesterday
      : null;

  if (!anchor) return 0;

  anchor.setHours(0, 0, 0, 0);
  let streak = 0;
  const cursor = new Date(anchor);

  while (practiceDays.has(localDayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export interface StreakMasthead {
  /** Uppercase dateline, e.g. "1-Day Streak" */
  headline: string;
  /** Optional italic byline below the rule */
  byline?: string;
}

export function getStreakMasthead(streak: number): StreakMasthead {
  if (streak <= 0) {
    return {
      headline: "Today's Edition",
      byline: 'Pick a story below and start speaking',
    };
  }
  if (streak === 1) {
    return {
      headline: '1-Day Streak',
      byline: 'Day one on the board — return tomorrow',
    };
  }
  return {
    headline: `${streak}-Day Streak`,
    byline: 'Consistency builds fluency',
  };
}
