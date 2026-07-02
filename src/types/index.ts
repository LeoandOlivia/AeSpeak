export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type ScenarioCategory =
  | 'daily_life'
  | 'business'
  | 'travel'
  | 'academic'
  | 'social'
  | 'free_chat';

export type LlmProvider = 'deepseek' | 'openai';
export type SttProvider = 'whisper' | 'mock';
export type TtsProvider = 'openai' | 'edge' | 'mock';
export type ConversationType = 'practice' | 'review';
export type ConversationStatus = 'active' | 'ended' | 'archived';
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'complete' | 'streaming' | 'failed';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface UserSettings {
  id: number;
  deepseekKey: string;
  openaiKey: string;
  /** 留空 = 官方 https://api.deepseek.com/v1 */
  deepseekBaseUrl: string;
  /** 留空 = 官方 https://api.openai.com/v1；OpenRouter 填 https://openrouter.ai/api/v1 */
  openaiBaseUrl: string;
  llmProvider: LlmProvider;
  llmModel: string;
  sttProvider: SttProvider;
  ttsProvider: TtsProvider;
  /** OpenAI TTS 音色：alloy / echo / fable / onyx / nova / shimmer */
  ttsVoice: string;
  /** OpenAI TTS 模型：tts-1 / tts-1-hd */
  ttsModel: string;
  /** Whisper 模型：官方 whisper-1；OpenRouter 用 openai/whisper-1 */
  whisperModel: string;
  mockVoice: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  category: ScenarioCategory;
  difficulty: Difficulty;
  systemPrompt: string;
  characterRole: string;
  suggestedVocab: string[];
  seedVersion: number;
}

export interface Conversation {
  id: string;
  scenarioId?: string;
  reviewCardId?: string;
  type: ConversationType;
  status: ConversationStatus;
  startedAt: number;
  endedAt?: number;
  updatedAt: number;
  lastMessagePreview?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  createdAt: number;
}

export interface ErrorRecord {
  id: string;
  conversationId: string;
  messageId: string;
  scenarioId: string;
  originalExpression: string;
  correctExpression: string;
  explanation: string;
  contextSnippet?: string;
  createdAt: number;
}

export interface ReviewCard {
  id: string;
  errorRecordId: string;
  due: number;
  interval: number;
  easeFactor: number;
  reps: number;
  lapses: number;
  lastReviewAt?: number;
  lastRating?: ReviewRating;
}

export interface ExpressionDetectResult {
  isExpressionError: boolean;
  severity?: 'low' | 'medium' | 'high';
  originalExpression?: string;
  correctExpression?: string;
  explanation?: string;
}

export interface ReviewJudgeResult {
  passed: boolean;
  feedback?: string;
}

export const CATEGORY_LABELS: Record<ScenarioCategory, string> = {
  daily_life: 'Daily Life',
  business: 'Business',
  travel: 'Travel',
  academic: 'Academic',
  social: 'Social',
  free_chat: 'Free Chat',
};

/** 主界面 6 大场景（2×3）显示顺序 */
export const MAIN_SCENE_ORDER: ScenarioCategory[] = [
  'daily_life',
  'social',
  'academic',
  'travel',
  'business',
  'free_chat',
];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const OPENAI_TTS_VOICES: [string, string][] = [
  ['nova', 'Nova (female, recommended)'],
  ['shimmer', 'Shimmer (female)'],
  ['alloy', 'Alloy (neutral)'],
  ['echo', 'Echo (male)'],
  ['fable', 'Fable (British)'],
  ['onyx', 'Onyx (male)'],
];

export const EDGE_TTS_VOICES: [string, string][] = [
  ['en-US-JennyNeural', 'Jenny (US female)'],
  ['en-US-GuyNeural', 'Guy (US male)'],
  ['en-GB-SoniaNeural', 'Sonia (British female)'],
  ['en-AU-NatashaNeural', 'Natasha (Australian female)'],
];

export const DEFAULT_SETTINGS: UserSettings = {
  id: 1,
  deepseekKey: '',
  openaiKey: '',
  deepseekBaseUrl: '',
  openaiBaseUrl: '',
  llmProvider: 'deepseek',
  llmModel: 'deepseek-chat',
  sttProvider: 'whisper',
  ttsProvider: 'edge',
  ttsVoice: 'en-US-JennyNeural',
  ttsModel: 'tts-1',
  whisperModel: '',
  mockVoice: false,
};
