import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getMainSceneArt } from '@/lib/category-art';
import { db } from '@/lib/db';
import { deleteConversation } from '@/lib/services/conversation';
import { CATEGORY_LABELS } from '@/types';

export function HistoryPage() {
  const navigate = useNavigate();

  const conversations = useLiveQuery(async () => {
    const list = await db.conversations.where('type').equals('practice').toArray();
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  }, []);
  const scenarios = useLiveQuery(() => db.scenarios.toArray(), []);

  const scenarioMap = useMemo(() => {
    const m = new Map<string, NonNullable<typeof scenarios>[number]>();
    scenarios?.forEach((s) => m.set(s.id, s));
    return m;
  }, [scenarios]);

  return (
    <div className="flex flex-col px-4 pb-4">
      {!conversations?.length ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-3 text-5xl">💬</div>
          <p className="text-[17px] font-semibold text-[var(--color-label)]">No conversation history</p>
          <p className="mt-1 text-[15px] text-[var(--color-label-secondary)]">
            Records appear here after you finish a practice session
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 font-serif text-[17px] font-medium text-[var(--color-ink)] underline decoration-[var(--color-accent)] decoration-1 underline-offset-2"
          >
            Start practicing
          </button>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl bg-[var(--color-bg-elevated)] shadow-sm">
          {conversations.map((c, i) => {
            const scenario = c.scenarioId ? scenarioMap.get(c.scenarioId) : undefined;
            const art = scenario ? getMainSceneArt(scenario.category) : null;
            return (
              <li
                key={c.id}
                className={i > 0 ? 'border-t border-[var(--color-separator)]' : ''}
              >
                <div className="flex items-center gap-3 px-4 py-3.5">
                  {art && (
                    <img
                      src={art.imageUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-[10px] object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/chat/${c.id}`, { state: { from: '/history' } })
                    }
                    className="min-w-0 flex-1 text-left active:opacity-70"
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[17px] font-medium text-[var(--color-label)]">
                        {scenario?.title ?? 'Unknown scenario'}
                      </span>
                      {c.status === 'active' && (
                        <span className="shrink-0 rounded-full bg-[#34C759]/15 px-2 py-0.5 text-[11px] font-semibold text-[#34C759]">
                          In progress
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[15px] text-[var(--color-label-secondary)]">
                      {c.lastMessagePreview ?? '(No messages)'}
                    </p>
                    <p className="mt-0.5 text-[13px] text-[var(--color-label-tertiary)]">
                      {scenario ? CATEGORY_LABELS[scenario.category] : ''} ·{' '}
                      {new Date(c.updatedAt).toLocaleString('en-US')}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteConversation(c.id).then(() => toast.message('Deleted'))}
                    className="shrink-0 text-[15px] text-[#FF3B30]"
                  >
                    Delete
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
