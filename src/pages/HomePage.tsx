import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { SceneGrid, SceneTile } from '@/components/ui/SceneGrid';
import { getMainSceneArt } from '@/lib/category-art';
import { db } from '@/lib/db';
import {
  createPracticeConversation,
  getActiveConversationForScenario,
} from '@/lib/services/conversation';
import { MAIN_SCENE_ORDER } from '@/types';

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

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="px-5 pt-1 pb-2">
        <h2 className="text-[28px] font-bold tracking-tight text-[var(--color-label)]">
          练习
        </h2>
        <p className="mt-0.5 text-[15px] text-[var(--color-label-secondary)]">
          选择场景，开始英语对话
        </p>
      </div>

      <SceneGrid>
        {MAIN_SCENE_ORDER.map((cat) => {
          const art = getMainSceneArt(cat);
          const activeCount = activeByCategory.get(cat) ?? 0;
          return (
            <SceneTile
              key={cat}
              emoji={art.emoji}
              label={art.label}
              iconBg={art.iconBg}
              onClick={() => void handleSceneClick(cat)}
              badge={
                activeCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[var(--color-bg)] bg-[#FF3B30] px-1 text-[10px] font-bold text-white">
                    {activeCount}
                  </span>
                ) : undefined
              }
            />
          );
        })}
      </SceneGrid>
    </div>
  );
}
