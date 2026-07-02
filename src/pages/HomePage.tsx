import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { StoryCard } from '@/components/ui/StoryCard';
import { getMainSceneArt, REVIEW_SECTION_IMAGE, REVIEW_SECTION_TAGLINE } from '@/lib/category-art';
import { unsplashCredit } from '@/lib/scenario-images';
import { isDue } from '@/lib/anki-scheduler';
import { db } from '@/lib/db';
import {
  createPracticeConversation,
  getActiveConversationForScenario,
} from '@/lib/services/conversation';
import { MAIN_SCENE_ORDER } from '@/types';

function todayHeadline() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function HomePage() {
  const navigate = useNavigate();

  const activeConversations = useLiveQuery(
    () =>
      db.conversations
        .where('status')
        .equals('active')
        .and((c) => c.type === 'practice')
        .toArray(),
    [],
  );

  const scenarios = useLiveQuery(() => db.scenarios.toArray(), []);

  const dueReviewCount = useLiveQuery(async () => {
    const cards = await db.reviewCards.toArray();
    return cards.filter((c) => isDue(c)).length;
  }, []);

  const activeByCategory = useMemo(() => {
    const map = new Map<string, number>();
    if (!activeConversations || !scenarios) return map;
    const scenarioMap = new Map(scenarios.map((s) => [s.id, s]));
    activeConversations.forEach((c) => {
      if (!c.scenarioId) return;
      const s = scenarioMap.get(c.scenarioId);
      if (s) map.set(s.category, (map.get(s.category) ?? 0) + 1);
    });
    return map;
  }, [activeConversations, scenarios]);

  const handleSceneClick = async (category: (typeof MAIN_SCENE_ORDER)[number]) => {
    if (category === 'free_chat') {
      const existing = await getActiveConversationForScenario('free-chat');
      const convId = existing?.id ?? (await createPracticeConversation('free-chat'));
      navigate(`/chat/${convId}`, { state: { from: '/' } });
      return;
    }
    navigate(`/scene/${category}`);
  };

  const [featured, ...rest] = MAIN_SCENE_ORDER;
  const featuredArt = getMainSceneArt(featured);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Newspaper masthead */}
      <header className="border-b-2 border-[var(--color-label)] px-4 pb-3 pt-2 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--color-label-secondary)]">
          {todayHeadline()}
        </p>
        <h1 className="mt-1 font-serif text-[32px] font-black leading-none tracking-tight text-[var(--color-label)]">
          eSpeak Daily
        </h1>
        <p className="mt-1 text-[11px] text-[var(--color-label-secondary)]">
          Your English practice edition · {unsplashCredit()}
        </p>
      </header>

      <div className="px-4 py-4">
        {/* Lead story */}
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)]">
          Today&apos;s Pick
        </p>
        <StoryCard
          variant="hero"
          imageUrl={featuredArt.imageUrl}
          title={featuredArt.label}
          subtitle={featuredArt.tagline}
          onClick={() => void handleSceneClick(featured)}
          badge={
            (activeByCategory.get(featured) ?? 0) > 0 ? (
              <span className="absolute right-3 top-3 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-bold text-white">
                {activeByCategory.get(featured)} in progress
              </span>
            ) : undefined
          }
        />

        {/* Section divider */}
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--color-separator)]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-label-secondary)]">
            Sections
          </span>
          <div className="h-px flex-1 bg-[var(--color-separator)]" />
        </div>

        {/* Two-column story grid */}
        <div className="grid grid-cols-2 gap-3">
          {rest.map((cat) => {
            const art = getMainSceneArt(cat);
            const activeCount = activeByCategory.get(cat) ?? 0;
            return (
              <StoryCard
                key={cat}
                variant="compact"
                imageUrl={art.imageUrl}
                title={art.label}
                subtitle={art.tagline}
                onClick={() => void handleSceneClick(cat)}
                badge={
                  activeCount > 0 ? (
                    <span className="absolute right-2 top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-bold text-white">
                      {activeCount}
                    </span>
                  ) : undefined
                }
              />
            );
          })}
          <StoryCard
            variant="compact"
            imageUrl={REVIEW_SECTION_IMAGE}
            title="Review Queue"
            subtitle={REVIEW_SECTION_TAGLINE}
            onClick={() => navigate('/review')}
            badge={
              (dueReviewCount ?? 0) > 0 ? (
                <span className="absolute right-2 top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-ink)] px-1 text-[10px] font-bold text-white">
                  {dueReviewCount}
                </span>
              ) : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
