import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';
import { isDue } from '@/lib/anki-scheduler';
import { createReviewConversation } from '@/lib/services/conversation';

export function ReviewPage() {
  const navigate = useNavigate();
  const reviewCards = useLiveQuery(() => db.reviewCards.toArray(), []);
  const errorRecords = useLiveQuery(() => db.errorRecords.toArray(), []);

  const errorMap = useMemo(() => {
    const m = new Map<string, NonNullable<typeof errorRecords>[number]>();
    errorRecords?.forEach((e) => m.set(e.id, e));
    return m;
  }, [errorRecords]);

  const dueCards = useMemo(() => {
    if (!reviewCards) return [];
    return reviewCards.filter((c) => isDue(c)).sort((a, b) => a.due - b.due);
  }, [reviewCards]);

  const handleStart = async (reviewCardId: string) => {
    const convId = await createReviewConversation(reviewCardId);
    navigate(`/review/session/${reviewCardId}?conv=${convId}`);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 pb-4">
      <div className="mb-4 overflow-hidden rounded-2xl bg-[var(--color-bg-elevated)] p-5 shadow-sm">
        <p className="text-[48px] font-bold leading-none text-[#007AFF]">{dueCards.length}</p>
        <p className="mt-1 text-[17px] font-semibold text-[var(--color-label)]">今日待复习</p>
        <p className="mt-0.5 text-[15px] text-[var(--color-label-secondary)]">
          把练习中的表达错误变成长期记忆
        </p>
      </div>

      {dueCards.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="mb-3 text-5xl">✅</div>
          <p className="text-[17px] font-semibold text-[var(--color-label)]">全部复习完成</p>
          <p className="mt-1 text-[15px] text-[var(--color-label-secondary)]">
            练习中说错表达后会自动加入复习
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {dueCards.map((card, i) => {
            const err = errorMap.get(card.errorRecordId);
            if (!err) return null;
            return (
              <li key={card.id}>
                <button
                  type="button"
                  onClick={() => void handleStart(card.id)}
                  className="w-full rounded-2xl bg-[var(--color-bg-elevated)] p-4 text-left shadow-sm active:opacity-80"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-fill-secondary)] text-[13px] font-bold text-[var(--color-label-secondary)]">
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-[var(--color-label-tertiary)]">
                      {new Date(card.due).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-[15px] text-[#FF3B30] line-through">{err.originalExpression}</p>
                  <p className="mt-1 text-[15px] font-semibold text-[#34C759]">→ {err.correctExpression}</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
