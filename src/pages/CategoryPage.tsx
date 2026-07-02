import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { StoryListItem } from '@/components/ui/StoryCard';
import { getMainSceneArt, getSubSceneImage } from '@/lib/category-art';
import { db } from '@/lib/db';
import {
  createPracticeConversation,
  getActiveConversationForScenario,
} from '@/lib/services/conversation';
import { CATEGORY_LABELS } from '@/types';

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
        Section not found
      </div>
    );
  }

  const sectionArt = getMainSceneArt(category);

  const handleStart = async (scenarioId: string) => {
    const existing = await getActiveConversationForScenario(scenarioId);
    const convId = existing?.id ?? (await createPracticeConversation(scenarioId));
    navigate(`/chat/${convId}`, { state: { from: `/scene/${category}` } });
  };

  return (
    <div className="flex flex-col">
      <div className="relative mx-4 mt-3 overflow-hidden rounded-xl">
        <img
          src={sectionArt.imageUrl}
          alt=""
          className="h-36 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
            Section
          </p>
          <h2 className="font-serif text-2xl font-bold text-white">
            {CATEGORY_LABELS[category]}
          </h2>
          <p className="mt-0.5 text-xs text-white/80">{sectionArt.tagline}</p>
        </div>
      </div>

      <div className="mx-4 mt-4 rounded-xl bg-[var(--color-bg-elevated)] px-3 shadow-sm">
        <p className="border-b border-[var(--color-separator)] py-2 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--color-label-secondary)]">
          {scenarios?.length ?? 18} Stories · Tap to practice
        </p>
        {!scenarios?.length
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 py-3">
                <div className="h-20 w-20 animate-pulse rounded-lg bg-[var(--color-fill-secondary)]" />
                <div className="flex-1 space-y-2 py-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-fill-secondary)]" />
                  <div className="h-3 w-full animate-pulse rounded bg-[var(--color-fill-secondary)]" />
                </div>
              </div>
            ))
          : scenarios.map((s, i) => (
              <StoryListItem
                key={s.id}
                index={i + 1}
                imageUrl={getSubSceneImage(s.id)}
                title={s.title}
                description={s.description}
                isActive={activeIds.has(s.id)}
                onClick={() => void handleStart(s.id)}
              />
            ))}
      </div>
    </div>
  );
}
