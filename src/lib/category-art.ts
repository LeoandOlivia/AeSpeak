import type { ScenarioCategory } from '@/types';

export interface SceneTileArt {
  label: string;
  emoji: string;
  /** iOS-style app icon gradient */
  iconBg: string;
  iconColor: string;
}

export const MAIN_SCENE_ART: Record<ScenarioCategory, SceneTileArt> = {
  daily_life: {
    label: '日常生活',
    emoji: '🏠',
    iconBg: 'linear-gradient(145deg, #FF9500 0%, #FFCC00 100%)',
    iconColor: '#FFFFFF',
  },
  social: {
    label: '社交人际',
    emoji: '💬',
    iconBg: 'linear-gradient(145deg, #FF2D55 0%, #FF6482 100%)',
    iconColor: '#FFFFFF',
  },
  academic: {
    label: '学术校园',
    emoji: '🎓',
    iconBg: 'linear-gradient(145deg, #5856D6 0%, #AF52DE 100%)',
    iconColor: '#FFFFFF',
  },
  travel: {
    label: '旅游出行',
    emoji: '✈️',
    iconBg: 'linear-gradient(145deg, #32ADE6 0%, #5AC8FA 100%)',
    iconColor: '#FFFFFF',
  },
  business: {
    label: '商务职场',
    emoji: '💼',
    iconBg: 'linear-gradient(145deg, #007AFF 0%, #5AC8FA 100%)',
    iconColor: '#FFFFFF',
  },
  free_chat: {
    label: '自由对话',
    emoji: '🌟',
    iconBg: 'linear-gradient(145deg, #34C759 0%, #30D158 100%)',
    iconColor: '#FFFFFF',
  },
};

/** 各场景下 6 个小情景（2×3） */
export const SUB_SCENE_TILES: Record<
  Exclude<ScenarioCategory, 'free_chat'>,
  { emoji: string; iconBg: string }[]
> = {
  daily_life: [
    { emoji: '🍽️', iconBg: 'linear-gradient(145deg, #FF9500, #FFCC00)' },
    { emoji: '🛒', iconBg: 'linear-gradient(145deg, #FF6482, #FF2D55)' },
    { emoji: '🏥', iconBg: 'linear-gradient(145deg, #34C759, #30D158)' },
    { emoji: '🗺️', iconBg: 'linear-gradient(145deg, #32ADE6, #007AFF)' },
    { emoji: '🏦', iconBg: 'linear-gradient(145deg, #5856D6, #AF52DE)' },
    { emoji: '🏡', iconBg: 'linear-gradient(145deg, #FF9500, #FF6482)' },
  ],
  social: [
    { emoji: '👋', iconBg: 'linear-gradient(145deg, #FF2D55, #FF6482)' },
    { emoji: '🎉', iconBg: 'linear-gradient(145deg, #AF52DE, #5856D6)' },
    { emoji: '🙏', iconBg: 'linear-gradient(145deg, #FF9500, #FFCC00)' },
    { emoji: '📨', iconBg: 'linear-gradient(145deg, #007AFF, #5AC8FA)' },
    { emoji: '📞', iconBg: 'linear-gradient(145deg, #34C759, #30D158)' },
    { emoji: '💝', iconBg: 'linear-gradient(145deg, #FF6482, #FF2D55)' },
  ],
  academic: [
    { emoji: '✋', iconBg: 'linear-gradient(145deg, #5856D6, #AF52DE)' },
    { emoji: '📖', iconBg: 'linear-gradient(145deg, #007AFF, #5AC8FA)' },
    { emoji: '👥', iconBg: 'linear-gradient(145deg, #34C759, #30D158)' },
    { emoji: '📝', iconBg: 'linear-gradient(145deg, #FF9500, #FFCC00)' },
    { emoji: '🧑‍🏫', iconBg: 'linear-gradient(145deg, #32ADE6, #007AFF)' },
    { emoji: '🎭', iconBg: 'linear-gradient(145deg, #FF6482, #AF52DE)' },
  ],
  travel: [
    { emoji: '🛫', iconBg: 'linear-gradient(145deg, #32ADE6, #007AFF)' },
    { emoji: '🏨', iconBg: 'linear-gradient(145deg, #5856D6, #AF52DE)' },
    { emoji: '🧭', iconBg: 'linear-gradient(145deg, #34C759, #30D158)' },
    { emoji: '🚗', iconBg: 'linear-gradient(145deg, #FF9500, #FFCC00)' },
    { emoji: '🎫', iconBg: 'linear-gradient(145deg, #FF6482, #FF2D55)' },
    { emoji: '🔍', iconBg: 'linear-gradient(145deg, #007AFF, #5AC8FA)' },
  ],
  business: [
    { emoji: '🤝', iconBg: 'linear-gradient(145deg, #007AFF, #5AC8FA)' },
    { emoji: '📊', iconBg: 'linear-gradient(145deg, #5856D6, #AF52DE)' },
    { emoji: '📧', iconBg: 'linear-gradient(145deg, #32ADE6, #007AFF)' },
    { emoji: '📽️', iconBg: 'linear-gradient(145deg, #FF9500, #FFCC00)' },
    { emoji: '⚠️', iconBg: 'linear-gradient(145deg, #FF6482, #FF2D55)' },
    { emoji: '🌐', iconBg: 'linear-gradient(145deg, #34C759, #30D158)' },
  ],
};

export function getMainSceneArt(category: ScenarioCategory): SceneTileArt {
  return MAIN_SCENE_ART[category];
}

export function getSubSceneTile(
  category: Exclude<ScenarioCategory, 'free_chat'>,
  index: number,
) {
  return SUB_SCENE_TILES[category][index] ?? SUB_SCENE_TILES[category][0];
}

/** @deprecated use getMainSceneArt */
export function getCategoryArt(category: ScenarioCategory) {
  const art = MAIN_SCENE_ART[category];
  return {
    label: art.label,
    emoji: art.emoji,
    gradient: '',
    accent: '',
    image: '',
  };
}
