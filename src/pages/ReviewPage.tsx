import { useEffect, useMemo, type MouseEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import { isDue } from '@/lib/anki-scheduler';
import {
  cleanupOrphanReviewCards,
  createReviewConversation,
  deleteReviewCard,
} from '@/lib/services/conversation';

export function ReviewPage() {
  const navigate = useNavigate();
  const reviewCards = useLiveQuery(() => db.reviewCards.toArray(), []);
  const errorRecords = useLiveQuery(() => db.errorRecords.toArray(), []);

  useEffect(() => {
    void cleanupOrphanReviewCards().then((removed) => {
      if (removed > 0) {
        toast.message(`Removed ${removed} broken review card${removed > 1 ? 's' : ''}`);
      }
    });
  }, []);

  const errorMap = useMemo(() => {
    const m = new Map<string, NonNullable<typeof errorRecords>[number]>();
    errorRecords?.forEach((e) => m.set(e.id, e));
    return m;
  }, [errorRecords]);

  const sortedCards = useMemo(() => {
    if (!reviewCards) return [];
    return [...reviewCards].sort((a, b) => a.due - b.due);
  }, [reviewCards]);

  const dueCount = useMemo(
    () =>
      sortedCards.filter((c) => isDue(c) && errorMap.has(c.errorRecordId)).length,
    [sortedCards, errorMap],
  );

  const handleStart = async (reviewCardId: string) => {
    const convId = await createReviewConversation(reviewCardId);
    navigate(`/review/session/${reviewCardId}?conv=${convId}`);
  };

  const handleDelete = async (reviewCardId: string, event: MouseEvent) => {
    event.stopPropagation();
    await deleteReviewCard(reviewCardId);
    toast.message('Review card removed');
  };

  return (
    <div className="flex flex-col px-4 pb-4">
      <div className="mb-4 overflow-hidden rounded-2xl bg-[var(--color-bg-elevated)] p-5 shadow-sm">
        <p className="text-[48px] font-bold leading-none text-[var(--color-accent)]">{dueCount}</p>
        <p className="mt-1 text-[17px] font-semibold text-[var(--color-label)]">Due for review today</p>
        <p className="mt-0.5 text-[15px] text-[var(--color-label-secondary)]">
          Turn practice mistakes into long-term memory
        </p>
      </div>

      {sortedCards.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="mb-3 text-5xl">✅</div>
          <p className="text-[17px] font-semibold text-[var(--color-label)]">All caught up</p>
          <p className="mt-1 text-[15px] text-[var(--color-label-secondary)]">
            Incorrect expressions from practice are added here automatically
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sortedCards.map((card, i) => {
            const err = errorMap.get(card.errorRecordId);
            const orphaned = !err;
            const due = !orphaned && isDue(card);
            return (
              <li key={card.id}>
                <div className="flex items-stretch gap-2">
                  <button
                    type="button"
                    disabled={orphaned}
                    onClick={() => void handleStart(card.id)}
                    className="min-w-0 flex-1 rounded-2xl bg-[var(--color-bg-elevated)] p-4 text-left shadow-sm active:opacity-80 disabled:opacity-60"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-fill-secondary)] text-[13px] font-bold text-[var(--color-label-secondary)]">
                        {i + 1}
                      </span>
                      {orphaned ? (
                        <span className="rounded-full bg-[#FF3B30]/10 px-2 py-0.5 text-[11px] font-semibold text-[#FF3B30]">
                          Unavailable
                        </span>
                      ) : due ? (
                        <span className="rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-accent)]">
                          Due
                        </span>
                      ) : (
                        <span className="text-[13px] text-[var(--color-label-tertiary)]">
                          {new Date(card.due).toLocaleDateString('en-US')}
                        </span>
                      )}
                    </div>
                    {orphaned ? (
                      <p className="text-[15px] text-[var(--color-label-secondary)]">
                        Missing error data — remove this card
                      </p>
                    ) : (
                      <>
                        <p className="text-[15px] text-[#FF3B30] line-through">
                          {err.originalExpression}
                        </p>
                        <p className="mt-1 text-[15px] font-semibold text-[#34C759]">
                          → {err.correctExpression}
                        </p>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => void handleDelete(card.id, e)}
                    aria-label="Delete review card"
                    className="flex w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-bg-elevated)] text-[#FF3B30] shadow-sm active:opacity-80"
                  >
                    🗑
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
