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
  explanationZh: string;
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
  explanationZh?: string;
}

export interface ReviewJudgeResult {
  passed: boolean;
  feedback?: string;
}

export const CATEGORY_LABELS: Record<ScenarioCategory, string> = {
  daily_life: '日常生活',
  business: '商务职场',
  travel: '旅游出行',
  academic: '学术校园',
  social: '社交人际',
  free_chat: '自由对话',
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
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
};

export const OPENAI_TTS_VOICES: [string, string][] = [
  ['nova', 'Nova（女声，推荐）'],
  ['shimmer', 'Shimmer（女声）'],
  ['alloy', 'Alloy（中性）'],
  ['echo', 'Echo（男声）'],
  ['fable', 'Fable（英式）'],
  ['onyx', 'Onyx（男声）'],
];

export const EDGE_TTS_VOICES: [string, string][] = [
  ['en-US-JennyNeural', 'Jenny（美式女声）'],
  ['en-US-GuyNeural', 'Guy（美式男声）'],
  ['en-GB-SoniaNeural', 'Sonia（英式女声）'],
  ['en-AU-NatashaNeural', 'Natasha（澳式女声）'],
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
