import Dexie, { type EntityTable } from 'dexie';
import type {
  Conversation,
  ErrorRecord,
  Message,
  ReviewCard,
  Scenario,
  UserSettings,
} from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

const STORE_SCHEMA = {
  userSettings: 'id',
  scenarios: 'id, category, difficulty, [category+difficulty]',
  conversations:
    'id, scenarioId, type, status, updatedAt, [scenarioId+updatedAt], [type+status]',
  messages: 'id, conversationId, createdAt, [conversationId+createdAt]',
  errorRecords: 'id, conversationId, messageId, scenarioId, createdAt',
  reviewCards: 'id, errorRecordId, due',
};

export class EspeakDatabase extends Dexie {
  userSettings!: EntityTable<UserSettings, 'id'>;
  scenarios!: EntityTable<Scenario, 'id'>;
  conversations!: EntityTable<Conversation, 'id'>;
  messages!: EntityTable<Message, 'id'>;
  errorRecords!: EntityTable<ErrorRecord, 'id'>;
  reviewCards!: EntityTable<ReviewCard, 'id'>;

  constructor() {
    super('espeak');
    this.version(1).stores(STORE_SCHEMA);
    this.version(2)
      .stores(STORE_SCHEMA)
      .upgrade(async (tx) => {
        const table = tx.table<UserSettings, number>('userSettings');
        const all = await table.toArray();
        for (const row of all) {
          await table.update(row.id, {
            deepseekBaseUrl: row.deepseekBaseUrl ?? '',
            openaiBaseUrl: row.openaiBaseUrl ?? '',
          });
        }
      });
    this.version(3)
      .stores(STORE_SCHEMA)
      .upgrade(async (tx) => {
        const table = tx.table<UserSettings, number>('userSettings');
        const all = await table.toArray();
        for (const row of all) {
          await table.update(row.id, {
            ttsModel: row.ttsModel ?? 'tts-1',
          });
        }
      });
    this.version(4)
      .stores(STORE_SCHEMA)
      .upgrade(async (tx) => {
        const openAiVoices = new Set(['nova', 'shimmer', 'alloy', 'echo', 'fable', 'onyx']);
        const table = tx.table<UserSettings, number>('userSettings');
        const all = await table.toArray();
        for (const row of all) {
          await table.update(row.id, {
            llmProvider: 'deepseek',
            ttsProvider: 'edge',
            llmModel:
              row.llmModel?.startsWith('deepseek') || row.llmModel?.startsWith('DeepSeek')
                ? row.llmModel
                : 'deepseek-chat',
            ttsVoice: openAiVoices.has(row.ttsVoice) ? 'en-US-JennyNeural' : row.ttsVoice,
          });
        }
      });
    this.version(5)
      .stores(STORE_SCHEMA)
      .upgrade(async (tx) => {
        const table = tx.table<UserSettings, number>('userSettings');
        const all = await table.toArray();
        for (const row of all) {
          await table.update(row.id, { sttProvider: 'whisper' as const });
        }
      });
    this.version(6)
      .stores(STORE_SCHEMA)
      .upgrade(async (tx) => {
        const table = tx.table<UserSettings, number>('userSettings');
        const all = await table.toArray();
        for (const row of all) {
          await table.update(row.id, { sttProvider: 'whisper' });
        }
      });
    this.version(7)
      .stores(STORE_SCHEMA)
      .upgrade(async (tx) => {
        const table = tx.table<UserSettings, number>('userSettings');
        await table.toCollection().modify({ sttProvider: 'whisper' });
      });
    this.version(8)
      .stores(STORE_SCHEMA)
      .upgrade(async (tx) => {
        const table = tx.table<UserSettings, number>('userSettings');
        const all = await table.toArray();
        for (const row of all) {
          await table.update(row.id, { whisperModel: row.whisperModel ?? '' });
        }
      });
    this.version(9)
      .stores(STORE_SCHEMA)
      .upgrade(async (tx) => {
        const table = tx.table<UserSettings, number>('userSettings');
        const all = await table.toArray();
        for (const row of all) {
          await table.update(row.id, {
            practiceDifficulty: row.practiceDifficulty ?? 'intermediate',
          });
        }
      });
  }
}

export const db = new EspeakDatabase();

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  await db.userSettings.put({ ...DEFAULT_SETTINGS, ...settings, id: 1 });
}
