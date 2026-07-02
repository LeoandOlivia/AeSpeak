import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { SceneGrid, SceneTile } from '@/components/ui/SceneGrid';
import { getSubSceneTile } from '@/lib/category-art';
import { db } from '@/lib/db';
import {
  createPracticeConversation,
  getActiveConversationForScenario,
} from '@/lib/services/conversation';

const VALID_CATEGORIES = [
  'daily_life',
  'social',
  'academic',
  'travel',
  'business',
] as const;

type SubCategory = (typeof VALID_CATEGORIES)[number];

function isSubCategory(c: string): c is SubCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(c);
}

export function CategoryPage() {
  const { category = '' } = useParams();
  const navigate = useNavigate();

  const scenarios = useLiveQuery(
    async () => {
      if (!isSubCategory(category)) return [];
      const list = await db.scenarios.where('category').equals(category).toArray();
      return list.sort((a, b) => a.id.localeCompare(b.id));
    },
    [category],
  );

  const activeConversations = useLiveQuery(
    () =>
      db.conversations
        .where('status')
        .equals('active')
        .and((c) => c.type === 'practice')
        .toArray(),
    [],
  );

  const activeIds = useMemo(() => {
    const set = new Set<string>();
    activeConversations?.forEach((c) => {
      if (c.scenarioId) set.add(c.scenarioId);
    });
    return set;
  }, [activeConversations]);

  if (!isSubCategory(category)) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--color-label-secondary)]">
        场景不存在
      </div>
    );
  }

  const handleStart = async (scenarioId: string) => {
    const existing = await getActiveConversationForScenario(scenarioId);
    const convId = existing?.id ?? (await createPracticeConversation(scenarioId));
    navigate(`/chat/${convId}`, { state: { from: `/scene/${category}` } });
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <SceneGrid>
        {!scenarios?.length
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-3">
                <div className="h-[60px] w-[60px] animate-pulse rounded-[14px] bg-[var(--color-fill-secondary)]" />
                <div className="h-3 w-14 animate-pulse rounded bg-[var(--color-fill-secondary)]" />
              </div>
            ))
          : scenarios.map((s, i) => {
              const tile = getSubSceneTile(category, i);
              const isActive = activeIds.has(s.id);
              return (
                <SceneTile
                  key={s.id}
                  emoji={tile.emoji}
                  label={s.title}
                  iconBg={tile.iconBg}
                  onClick={() => void handleStart(s.id)}
                  badge={
                    isActive ? (
                      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[var(--color-bg)] bg-[#34C759]" />
                    ) : undefined
                  }
                />
              );
            })}
      </SceneGrid>
    </div>
  );
}
