import type { ScenarioCategory } from '@/types';
import {
  MAIN_CATEGORY_IMAGES,
  MAIN_CATEGORY_TAGLINES,
  REVIEW_SECTION_IMAGE,
  REVIEW_SECTION_TAGLINE,
  getScenarioImage,
} from '@/lib/scenario-images';

export interface SceneTileArt {
  label: string;
  tagline: string;
  imageUrl: string;
}

export const MAIN_SCENE_ART: Record<ScenarioCategory, SceneTileArt> = {
  daily_life: {
    label: 'Daily Life',
    tagline: MAIN_CATEGORY_TAGLINES.daily_life,
    imageUrl: MAIN_CATEGORY_IMAGES.daily_life,
  },
  social: {
    label: 'Social',
    tagline: MAIN_CATEGORY_TAGLINES.social,
    imageUrl: MAIN_CATEGORY_IMAGES.social,
  },
  academic: {
    label: 'Academic',
    tagline: MAIN_CATEGORY_TAGLINES.academic,
    imageUrl: MAIN_CATEGORY_IMAGES.academic,
  },
  travel: {
    label: 'Travel',
    tagline: MAIN_CATEGORY_TAGLINES.travel,
    imageUrl: MAIN_CATEGORY_IMAGES.travel,
  },
  business: {
    label: 'Business',
    tagline: MAIN_CATEGORY_TAGLINES.business,
    imageUrl: MAIN_CATEGORY_IMAGES.business,
  },
  free_chat: {
    label: 'Free Chat',
    tagline: MAIN_CATEGORY_TAGLINES.free_chat,
    imageUrl: MAIN_CATEGORY_IMAGES.free_chat,
  },
};

export function getMainSceneArt(category: ScenarioCategory): SceneTileArt {
  return MAIN_SCENE_ART[category];
}

export function getSubSceneImage(scenarioId: string): string {
  return getScenarioImage(scenarioId);
}

export { getScenarioImage, REVIEW_SECTION_IMAGE, REVIEW_SECTION_TAGLINE };
