import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useLiveQuery } from 'dexie-react-hooks';

import { toast } from 'sonner';

import { PrimaryButton, WarmCard } from '@/components/ui/WarmCard';

import { db, saveUserSettings } from '@/lib/db';

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

import { synthesizeSpeech, validateLlm, validateStt } from '@/lib/providers/chain';

import { isNativePlatform } from '@/plugins/voice-recorder/adapter';

import type { LlmProvider, TtsProvider, UserSettings } from '@/types';

import { DEFAULT_SETTINGS, EDGE_TTS_VOICES, OPENAI_TTS_VOICES } from '@/types';
import { normalizePracticeDifficulty, PRACTICE_DIFFICULTY_SPECS } from '@/lib/prompts/difficulty-guide';



const TEST_TTS_TEXT = 'Hello! This is a test of text to speech.';



function normalizeForm(input: UserSettings): UserSettings {

  const ttsProvider = input.ttsProvider === 'openai' ? 'openai' : 'edge';

  const ttsVoice =

    ttsProvider === 'openai'

      ? OPENAI_TTS_VOICES.some(([id]) => id === input.ttsVoice)

        ? input.ttsVoice

        : 'nova'

      : EDGE_TTS_VOICES.some(([id]) => id === input.ttsVoice)

        ? input.ttsVoice

        : 'en-US-JennyNeural';



  return {

    ...DEFAULT_SETTINGS,

    ...input,

    id: 1,

    deepseekKey: input.deepseekKey.trim(),

    openaiKey: input.openaiKey.trim(),

    deepseekBaseUrl: input.deepseekBaseUrl.trim(),

    openaiBaseUrl: input.openaiBaseUrl.trim(),

    llmProvider: input.llmProvider === 'openai' ? 'openai' : 'deepseek',

    llmModel:

      (input.llmProvider === 'openai' ? input.llmModel.trim() : input.llmModel.trim().toLowerCase()) ||

      DEFAULT_SETTINGS.llmModel,

    sttProvider: 'whisper',

    ttsProvider,

    ttsVoice,

    ttsModel: input.ttsModel.trim() || 'tts-1',

    whisperModel: input.whisperModel.trim(),

    practiceDifficulty: normalizePracticeDifficulty(input.practiceDifficulty),

  };

}



export function SettingsPage() {

  const saved = useLiveQuery(() => db.userSettings.get(1), []);

  const [form, setForm] = useState<UserSettings>(DEFAULT_SETTINGS);

  const [showKey, setShowKey] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const loadedRef = useRef(false);

  const { state: voiceState, toggle: voiceToggle, isBusy: voiceBusy, isAvailable: voiceAvailable } =

    useVoiceRecorder(form);



  useEffect(() => {

    if (saved && !loadedRef.current) {

      setForm(normalizeForm({ ...DEFAULT_SETTINGS, ...saved, id: 1 }));

      loadedRef.current = true;

    }

  }, [saved]);



  const update = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {

    setForm((f) => {

      const next = { ...f, [key]: value };

      if (

        key === 'openaiKey' &&

        typeof value === 'string' &&

        value.trim().startsWith('sk-or-v1') &&

        !next.openaiBaseUrl.trim()

      ) {

        next.openaiBaseUrl = 'https://openrouter.ai/api/v1';

      }

      return next;

    });

  };



  const handleSave = async () => {

    try {

      const toSave = normalizeForm(form);

      await saveUserSettings(toSave);

      setForm(toSave);

      loadedRef.current = true;

      toast.success('Settings saved');

    } catch (e) {

      toast.error(e instanceof Error ? e.message : 'Save failed, please try again');

    }

  };



  const settings = () => normalizeForm(form);



  const handleValidateLlm = async () => {

    const s = settings();

    if (s.llmProvider === 'deepseek' && !s.deepseekKey) {

      toast.error('Please enter your DeepSeek API Key first');

      return;

    }

    if (s.llmProvider === 'openai' && !s.openaiKey) {

      toast.error('Please enter your OpenAI API Key first');

      return;

    }

    try {

      await validateLlm(s);

      toast.success('Chat API connected', {

        description: `${s.llmProvider === 'deepseek' ? 'DeepSeek' : 'OpenAI'} · ${s.llmModel}`,

      });

    } catch (e) {

      toast.error(e instanceof Error ? e.message : 'Validation failed');

    }

  };



  const handleValidateStt = async () => {

    const s = settings();

    if (!s.openaiKey) {

      toast.error('Please enter your OpenAI API Key first (Whisper speech recognition)');

      return;

    }

    try {

      await validateStt(s);

      toast.success('Whisper Key verified', {

        description: isNativePlatform() ? 'You can test recognition below' : 'Full recording test requires an Android device',

      });

    } catch (e) {

      toast.error(e instanceof Error ? e.message : 'Validation failed');

    }

  };



  const handleTestTts = async () => {

    const s = settings();

    try {

      const buf = await synthesizeSpeech({ settings: s, text: TEST_TTS_TEXT, voice: s.ttsVoice });

      if (s.mockVoice) {

        toast.success('Mock speech passed');

        return;

      }

      if (buf.byteLength === 0) {

        toast.success('Speech succeeded (Edge/system fallback)');

        return;

      }

      const url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));

      const audio = new Audio(url);

      audio.onended = () => URL.revokeObjectURL(url);

      await audio.play();

      toast.success('Speech test passed', {

        description: `${s.ttsProvider === 'openai' ? 'OpenAI TTS' : 'Edge TTS'} · ${s.ttsVoice}`,

      });

    } catch (e) {

      toast.error(e instanceof Error ? e.message : 'Speech test failed');

    }

  };



  const handleTestStt = async () => {

    const s = settings();

    if (s.mockVoice) {

      toast.success('Mock recognition passed', { description: "I'd like a coffee, please." });

      return;

    }

    if (!s.openaiKey) {

      toast.error('Please configure your OpenAI API Key (Whisper) first');

      return;

    }

    if (!voiceAvailable) {

      toast.message('Speech recognition test requires the Android app');

      return;

    }

    if (voiceState === 'idle') {

      toast.message('Speak in English…', { description: 'Tap again to stop and transcribe' });

      await voiceToggle(() => {});

      return;

    }

    if (voiceState === 'recording') {

      await voiceToggle((text) => toast.success('Transcription successful', { description: text }));

      return;

    }

    toast.message('Transcribing…');

  };



  const ttsVoices = form.ttsProvider === 'openai' ? OPENAI_TTS_VOICES : EDGE_TTS_VOICES;



  return (

    <div className="px-4 py-3">

      {/* Quick status */}

      <WarmCard padding="md" className="mb-4 bg-gradient-to-r from-[var(--color-fill-secondary)] to-[var(--color-bg-elevated)]">

        <div className="flex items-center gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-bg-elevated)] text-2xl shadow-sm">

            ⚙️

          </div>

          <div>

            <p className="text-sm font-bold text-[var(--color-label)]">API Configuration</p>

            <p className="text-xs text-[var(--color-label-secondary)]">

              Configure APIs to enable AI chat and voice features

            </p>

          </div>

        </div>

      </WarmCard>



      <SettingsSection

        title="Learning level"

        icon="📚"

        description="AI vocabulary and sentence complexity for practice, hints, and review. Change anytime — takes effect on the next message."

      >

        <Select

          label="Difficulty"

          value={form.practiceDifficulty}

          options={PRACTICE_DIFFICULTY_SPECS.map((s) => [s.id, `${s.label} (${s.cefr})`])}

          onChange={(v) => update('practiceDifficulty', normalizePracticeDifficulty(v))}

        />

        <p className="text-[11px] leading-relaxed text-[var(--color-label-secondary)]">

          {PRACTICE_DIFFICULTY_SPECS.find((s) => s.id === form.practiceDifficulty)?.summary}

        </p>

      </SettingsSection>



      <SettingsSection title="DeepSeek Chat" icon="💬" description="Scenario chat uses DeepSeek (or switch to OpenAI under Advanced).">

        <Field

          label="DeepSeek API Key"

          type={showKey ? 'text' : 'password'}

          value={form.deepseekKey}

          onChange={(v) => update('deepseekKey', v)}

          placeholder="sk-..."

        />

        <Field

          label="DeepSeek Base URL"

          value={form.deepseekBaseUrl}

          onChange={(v) => update('deepseekBaseUrl', v)}

          placeholder="https://api.deepseek.com/v1"

          hint="Leave empty for official api.deepseek.com. For a relay, enter up to /v1."

        />

        <Field

          label="Chat model"

          value={form.llmModel}

          onChange={(v) => update('llmModel', v)}

          placeholder="deepseek-chat"

          hint="Common: deepseek-chat / deepseek-v4-flash (lowercase required)"

        />

        <PrimaryButton onClick={() => void handleValidateLlm()} variant="outline" className="w-full">

          Validate chat API

        </PrimaryButton>

      </SettingsSection>



      <SettingsSection

        title="Voice"

        icon="🎙️"

        description="Speech uses Edge TTS. Whisper: Android device is the production path; browser dev can preview Key/API."

      >

        <Select

          label="Speech engine"

          value={form.ttsProvider}

          options={[

            ['edge', 'Edge TTS (free, recommended)'],

            ['openai', 'OpenAI TTS (relay required)'],

          ]}

          onChange={(v) => {

            update('ttsProvider', v as TtsProvider);

            if (v === 'openai' && !OPENAI_TTS_VOICES.some(([id]) => id === form.ttsVoice)) {

              update('ttsVoice', 'nova');

            }

            if (v === 'edge' && !EDGE_TTS_VOICES.some(([id]) => id === form.ttsVoice)) {

              update('ttsVoice', 'en-US-JennyNeural');

            }

          }}

        />

        {form.ttsProvider === 'openai' && (

          <Select

            label="TTS model"

            value={form.ttsModel}

            options={[

              ['tts-1', 'tts-1 (fast)'],

              ['tts-1-hd', 'tts-1-hd (HD)'],

            ]}

            onChange={(v) => update('ttsModel', v)}

          />

        )}

        <Select

          label="Voice"

          value={form.ttsVoice}

          options={ttsVoices}

          onChange={(v) => update('ttsVoice', v)}

        />



        <WarmCard padding="sm" className="space-y-3 bg-[var(--color-fill-secondary)]/50">

          <p className="text-xs font-bold text-[var(--color-label)]">Whisper speech recognition</p>

          <Field

            label="OpenRouter / OpenAI Key"

            type={showKey ? 'text' : 'password'}

            value={form.openaiKey}

            onChange={(v) => update('openaiKey', v)}

            placeholder="sk-or-..."

          />

          <Field

            label="Base URL"

            value={form.openaiBaseUrl}

            onChange={(v) => update('openaiBaseUrl', v)}

            placeholder="https://openrouter.ai/api/v1"

            hint="OpenRouter: https://openrouter.ai/api/v1. Auto-filled for sk-or-v1 keys. Voice/STT requires balance ≥ $0.50."

          />

          <Field

            label="Whisper model"

            value={form.whisperModel}

            onChange={(v) => update('whisperModel', v)}

            placeholder="openai/whisper-1"

            hint="OpenRouter: openai/whisper-1. Official OpenAI: whisper-1. Leave empty to auto-select."

          />

          <PrimaryButton

            onClick={() => void handleValidateStt()}

            disabled={!form.openaiKey.trim()}

            variant="outline"

            className="w-full"

          >

            Validate Whisper Key

          </PrimaryButton>

        </WarmCard>



        <div className="flex gap-2">

          <PrimaryButton onClick={() => void handleTestTts()} variant="outline" className="flex-1">

            Test speech

          </PrimaryButton>

          {voiceAvailable ? (

            <PrimaryButton

              onClick={() => void handleTestStt()}

              disabled={voiceBusy && voiceState === 'transcribing'}

              variant="outline"

              className="flex-1"

            >

              {voiceState === 'recording' ? 'Stop' : 'Test recognition'}

            </PrimaryButton>

          ) : (

            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--color-separator)] px-2 text-center text-[10px] text-[var(--color-label-secondary)]">

              Recording test requires Android device

            </div>

          )}

        </div>

        {(voiceState === 'recording' || voiceState === 'transcribing') && (

          <p className="text-xs font-semibold text-[#007AFF]">

            {voiceState === 'recording' ? '🎤 Recording…' : 'Transcribing…'}

          </p>

        )}

      </SettingsSection>



      <button

        type="button"

        onClick={() => setShowKey((s) => !s)}

        className="mb-3 text-xs font-semibold text-[var(--color-label-secondary)]"

      >

        {showKey ? 'Hide' : 'Show'} Key

      </button>



      <PrimaryButton onClick={() => void handleSave()} variant="primary" className="mb-4 w-full py-3">

        Save settings

      </PrimaryButton>



      <details

        open={showAdvanced}

        onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}

        className="rounded-2xl border border-[var(--color-separator)] bg-[var(--color-bg-elevated)] p-4 shadow-sm"

      >

        <summary className="cursor-pointer text-sm font-semibold text-[var(--color-label-secondary)]">

          Advanced options

        </summary>

        <div className="mt-3 space-y-3">

          <Select

            label="Chat engine"

            value={form.llmProvider}

            options={[

              ['deepseek', 'DeepSeek (default)'],

              ['openai', 'OpenAI (shares Whisper Key)'],

            ]}

            onChange={(v) => update('llmProvider', v as LlmProvider)}

          />

          <label className="flex items-center gap-2 text-sm text-[var(--color-label-secondary)]">

            <input

              type="checkbox"

              checked={form.mockVoice}

              onChange={(e) => update('mockVoice', e.target.checked)}

              className="rounded accent-[#007AFF]"

            />

            Mock voice (testing only — do not enable in production)

          </label>

        </div>

      </details>

    </div>

  );

}



function SettingsSection({

  title,

  icon,

  description,

  children,

}: {

  title: string;

  icon: string;

  description?: string;

  children: ReactNode;

}) {

  return (

    <section className="mb-5">

      <div className="mb-3 flex items-center gap-2">

        <span className="text-lg">{icon}</span>

        <h2 className="text-sm font-bold text-[var(--color-label)]">{title}</h2>

      </div>

      {description && (

        <p className="mb-3 text-xs leading-relaxed text-[var(--color-label-secondary)]">{description}</p>

      )}

      <WarmCard padding="md" className="space-y-3">

        {children}

      </WarmCard>

    </section>

  );

}



function Field({

  label,

  value,

  onChange,

  type = 'text',

  placeholder,

  hint,

}: {

  label: string;

  value: string;

  onChange: (v: string) => void;

  type?: string;

  placeholder?: string;

  hint?: string;

}) {

  return (

    <label className="block">

      <span className="mb-1 block text-xs font-semibold text-[var(--color-label-secondary)]">{label}</span>

      <input

        type={type}

        value={value}

        onChange={(e) => onChange(e.target.value)}

        placeholder={placeholder}

        className="w-full rounded-xl border border-[var(--color-separator)] bg-[var(--color-bg)] px-3 py-2.5 text-sm focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[var(--color-separator)]"

      />

      {hint && <span className="mt-1 block text-[10px] leading-relaxed text-[var(--color-label-secondary)]/70">{hint}</span>}

    </label>

  );

}



function Select({

  label,

  value,

  options,

  onChange,

}: {

  label: string;

  value: string;

  options: [string, string][];

  onChange: (v: string) => void;

}) {

  return (

    <label className="block">

      <span className="mb-1 block text-xs font-semibold text-[var(--color-label-secondary)]">{label}</span>

      <select

        value={value}

        onChange={(e) => onChange(e.target.value)}

        className="w-full rounded-xl border border-[var(--color-separator)] bg-[var(--color-bg)] px-3 py-2.5 text-sm focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[var(--color-separator)]"

      >

        {options.map(([v, l]) => (

          <option key={v} value={v}>

            {l}

          </option>

        ))}

      </select>

    </label>

  );

}

