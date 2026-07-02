import type { ReviewRating } from '@/types';

export interface AnkiCardState {
  due: number;
  interval: number;
  easeFactor: number;
  reps: number;
  lapses: number;
  lastReviewAt?: number;
  lastRating?: ReviewRating;
}

const MS_DAY = 86_400_000;
const MS_MIN = 60_000;

export function createInitialReviewCard(): AnkiCardState {
  return {
    due: Date.now(),
    interval: 0,
    easeFactor: 2.5,
    reps: 0,
    lapses: 0,
  };
}

export function scheduleReview(
  card: AnkiCardState,
  rating: ReviewRating,
  now = Date.now(),
): AnkiCardState {
  let { interval, easeFactor, reps, lapses } = card;

  if (rating === 'again') {
    lapses += 1;
    reps = 0;
    interval = 0;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
    return {
      ...card,
      due: now + 10 * MS_MIN,
      interval,
      easeFactor,
      reps,
      lapses,
      lastReviewAt: now,
      lastRating: rating,
    };
  }

  if (rating === 'hard') {
    easeFactor = Math.max(1.3, easeFactor - 0.15);
    interval = interval === 0 ? 1 : Math.max(1, interval * 1.2);
  } else if (rating === 'good') {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 3;
    else interval = Math.round(interval * easeFactor);
    reps += 1;
  } else if (rating === 'easy') {
    easeFactor += 0.15;
    if (reps === 0) interval = 4;
    else interval = Math.round(interval * easeFactor * 1.3);
    reps += 1;
  }

  return {
    ...card,
    due: now + interval * MS_DAY,
    interval,
    easeFactor,
    reps,
    lapses,
    lastReviewAt: now,
    lastRating: rating,
  };
}

export function isDue(card: AnkiCardState, now = Date.now()): boolean {
  return card.due <= now;
}
