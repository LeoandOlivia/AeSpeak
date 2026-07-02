import type { ScenarioCategory } from '@/types';

/** Unsplash (free license) — consistent crops */
function u(photoId: string, w = 600, h = 400) {
  return `https://images.unsplash.com/${photoId}?w=${w}&h=${h}&fit=crop&q=80&auto=format`;
}

/** Topic-matched Unsplash photo per scenario (keyed by stable scenario id) */
export const SCENARIO_IMAGE_IDS: Record<string, string> = {
  // Daily life
  'daily-restaurant': 'photo-1517248135467-4c7edcad34c4',
  'daily-supermarket': 'photo-1542838132-92c53300491e',
  'daily-doctor': 'photo-1576091160399-112ba8d25d1d',
  'daily-directions': 'photo-1469854523086-cc02fe5d8800',
  'daily-bank': 'photo-1563013544-824ae1b704d3',
  'daily-apartment': 'photo-1560448204-e02f11c3d0e2',
  'daily-hair-salon': 'photo-1522337360788-8b13dee7a37e',
  'daily-post-office': 'photo-1434030216411-0b793f4b4173',
  'daily-gym': 'photo-1571019613454-1cb2f99b2d8b',
  'daily-coffee-shop': 'photo-1495474472287-4d71bcdd2085',
  'daily-pharmacy': 'photo-1576091160399-112ba8d25d1d',
  'daily-laundry': 'photo-1556911220-e15b29be8c8f',
  'daily-pet-store': 'photo-1450778869180-41d0601e046e',
  'daily-car-repair': 'photo-1486262715619-67b85e0b08d3',
  'daily-library-card': 'photo-1521587760476-6c12a4b040da',
  'daily-drive-through': 'photo-1517248135467-4c7edcad34c4',
  'daily-neighbor': 'photo-1556911220-e15b29be8c8f',
  'daily-returns': 'photo-1558618666-fcd25c85cd64',

  // Social
  'social-meet': 'photo-1529156069898-49953e39b3ac',
  'social-party': 'photo-1530103862676-de8c9debad1d',
  'social-apology': 'photo-1522071820081-009f0129c71c',
  'social-invite': 'photo-1511795409834-ef04bbd61622',
  'social-phone': 'photo-1556742049-0cfed4f6a45d',
  'social-compliment': 'photo-1516589178581-6cd7833ae3b2',
  'social-decline': 'photo-1529626455594-4ff0802cfb7e',
  'social-housewarming': 'photo-1524504388940-b1c1722653e1',
  'social-dating': 'photo-1507003211169-0a1dd7228f2d',
  'social-condolence': 'photo-1492562080023-ab3db95bfbce',
  'social-disagreement': 'photo-1517841905240-472988babdf9',
  'social-reunion': 'photo-1500648767791-00dcc994a43e',
  'social-wedding': 'photo-1519741497674-611481863552',
  'social-gift': 'photo-1544716278-ca5e3f4abd8c',
  'social-advice': 'photo-1438761681033-6461ffad8d80',
  'social-farewell': 'photo-1472099645785-5658abf4ff4e',
  'social-introduction': 'photo-1534528741775-53994a69daeb',
  'social-volunteer': 'photo-1559027615-cd4628902d4a',

  // Academic
  'academic-class': 'photo-1523240795612-9a054b0db644',
  'academic-library': 'photo-1521587760476-6c12a4b040da',
  'academic-group': 'photo-1522202176988-66273c2fd55f',
  'academic-application': 'photo-1434030216411-0b793f4b4173',
  'academic-advisor': 'photo-1524178232363-1fb2b075b655',
  'academic-event': 'photo-1522202176988-66273c2fd55f',
  'academic-lab': 'photo-1532094349884-543bc11b234d',
  'academic-presentation': 'photo-1503676260728-1c00da094a0b',
  'academic-tutoring': 'photo-1516321318423-f06f85e504b3',
  'academic-debate': 'photo-1523240795612-9a054b0db644',
  'academic-exchange': 'photo-1469854523086-cc02fe5d8800',
  'academic-internship': 'photo-1454165804606-c3d57bc86b40',
  'academic-dorm': 'photo-1522708323590-d24dbb6b0267',
  'academic-cafeteria': 'photo-1504674900247-0877df9cc836',
  'academic-office-hours': 'photo-1562774053-701939374585',
  'academic-peer-review': 'photo-1456513080510-7bf3a84b82f8',
  'academic-registration': 'photo-1529390079861-591de354faf5',
  'academic-thesis': 'photo-1456513080510-7bf3a84b82f8',

  // Travel
  'travel-checkin': 'photo-1488646953014-85cb44e25828',
  'travel-hotel': 'photo-1566073771259-6a8506099945',
  'travel-navigation': 'photo-1469854523086-cc02fe5d8800',
  'travel-car-rental': 'photo-1449965408869-eaa3f722e40d',
  'travel-ticket': 'photo-1488646953014-85cb44e25828',
  'travel-lost': 'photo-1582719478250-c89cae4dc85b',
  'travel-customs': 'photo-1551434678-e076c223a692',
  'travel-taxi': 'photo-1449965408869-eaa3f722e40d',
  'travel-restaurant': 'photo-1559339352-11d035aa65de',
  'travel-market': 'photo-1554224311-beee415c201f',
  'travel-emergency': 'photo-1582719478250-c89cae4dc85b',
  'travel-weather': 'photo-1504608524841-42fe6f032b4b',
  'travel-tour': 'photo-1469474968028-56623f02e42e',
  'travel-airbnb': 'photo-1564013799919-ab600027ffc6',
  'travel-train': 'photo-1488646953014-85cb44e25828',
  'travel-border': 'photo-1551434678-e076c223a692',
  'travel-souvenir': 'photo-1512453979798-5ea266f8880c',
  'travel-delay': 'photo-1488646953014-85cb44e25828',

  // Business
  'business-interview': 'photo-1573496359142-b8d87734a5a2',
  'business-meeting': 'photo-1517245386807-bb43f82c33c4',
  'business-client-call': 'photo-1553877522-43269d4ea984',
  'business-presentation': 'photo-1552664730-d307ca884978',
  'business-complaint': 'photo-1556761175-b413da4baf72',
  'business-networking': 'photo-1517245386807-bb43f82c33c4',
  'business-negotiation': 'photo-1556761175-4b46a572b786',
  'business-onboarding': 'photo-1573496359142-b8d87734a5a2',
  'business-review': 'photo-1600880292203-757bb62b4baf',
  'business-standup': 'photo-1559136555-9303baea8ebd',
  'business-followup': 'photo-1551434678-e076c223a692',
  'business-catering': 'photo-1565299624946-b28f40a0ae38',
  'business-expense': 'photo-1554224155-6726b3ff858f',
  'business-remote': 'photo-1454165804606-c3d57bc86b40',
  'business-partnership': 'photo-1556761175-4b46a572b786',
  'business-resignation': 'photo-1454165804606-c3d57bc86b40',
  'business-supplier': 'photo-1554224155-6726b3ff858f',
  'business-conference': 'photo-1552664730-d307ca884978',

  'free-chat': 'photo-1522071820081-009f0129c71c',
};

const CATEGORY_FROM_ID: Record<string, ScenarioCategory> = {
  daily: 'daily_life',
  social: 'social',
  academic: 'academic',
  travel: 'travel',
  business: 'business',
  free: 'free_chat',
};

export const MAIN_CATEGORY_IMAGES: Record<ScenarioCategory, string> = {
  daily_life: u('photo-1554118811-1e0d58224f24', 800, 500),
  social: u('photo-1529156069898-49953e39b3ac', 800, 500),
  academic: u('photo-1524178232363-1fb2b075b655', 800, 500),
  travel: u('photo-1488646953014-85cb44e25828', 800, 500),
  business: u('photo-1517245386807-bb43f82c33c4', 800, 500),
  free_chat: u('photo-1522071820081-009f0129c71c', 800, 500),
};

export const REVIEW_SECTION_IMAGE = u('photo-1456513080510-7bf3a84b82f8', 800, 500);

export const MAIN_CATEGORY_TAGLINES: Record<ScenarioCategory, string> = {
  daily_life: 'Everyday errands, services, and small talk',
  social: 'Meet people, chat, and build connections',
  academic: 'Campus life, classes, and study skills',
  travel: 'Trips, transport, and exploring abroad',
  business: 'Workplace talk, meetings, and interviews',
  free_chat: 'Open conversation on any topic you choose',
};

export const REVIEW_SECTION_TAGLINE = 'Turn practice mistakes into long-term memory';

function categoryFromScenarioId(scenarioId: string): ScenarioCategory {
  const prefix = scenarioId.split('-')[0];
  return CATEGORY_FROM_ID[prefix] ?? 'daily_life';
}

export function getScenarioImage(
  scenarioId: string,
  size: { w: number; h: number } = { w: 400, h: 280 },
): string {
  const photoId = SCENARIO_IMAGE_IDS[scenarioId];
  const category = categoryFromScenarioId(scenarioId);
  if (!photoId) return MAIN_CATEGORY_IMAGES[category];
  return u(photoId, size.w, size.h);
}
