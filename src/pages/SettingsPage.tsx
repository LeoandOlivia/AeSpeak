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

    setForm((f) => ({ ...f, [key]: value }));

  };



  const handleSave = async () => {

    try {

      const toSave = normalizeForm(form);

      await saveUserSettings(toSave);

      setForm(toSave);

      loadedRef.current = true;

      toast.success('设置已保存');

    } catch (e) {

      toast.error(e instanceof Error ? e.message : '保存失败，请重试');

    }

  };



  const settings = () => normalizeForm(form);



  const handleValidateLlm = async () => {

    const s = settings();

    if (s.llmProvider === 'deepseek' && !s.deepseekKey) {

      toast.error('请先填写 DeepSeek API Key');

      return;

    }

    if (s.llmProvider === 'openai' && !s.openaiKey) {

      toast.error('请先填写 OpenAI API Key');

      return;

    }

    try {

      await validateLlm(s);

      toast.success('对话 API 连通正常', {

        description: `${s.llmProvider === 'deepseek' ? 'DeepSeek' : 'OpenAI'} · ${s.llmModel}`,

      });

    } catch (e) {

      toast.error(e instanceof Error ? e.message : '验证失败');

    }

  };



  const handleValidateStt = async () => {

    const s = settings();

    if (!s.openaiKey) {

      toast.error('请先填写 OpenAI API Key（Whisper 录音识别）');

      return;

    }

    try {

      await validateStt(s);

      toast.success('Whisper Key 验证通过', {

        description: isNativePlatform() ? '可在下方测试识别' : '完整录音测试请在 Android 真机进行',

      });

    } catch (e) {

      toast.error(e instanceof Error ? e.message : '验证失败');

    }

  };



  const handleTestTts = async () => {

    const s = settings();

    try {

      const buf = await synthesizeSpeech({ settings: s, text: TEST_TTS_TEXT, voice: s.ttsVoice });

      if (s.mockVoice) {

        toast.success('Mock 朗读通过');

        return;

      }

      if (buf.byteLength === 0) {

        toast.success('朗读成功（Edge/系统降级）');

        return;

      }

      const url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));

      const audio = new Audio(url);

      audio.onended = () => URL.revokeObjectURL(url);

      await audio.play();

      toast.success('朗读测试成功', {

        description: `${s.ttsProvider === 'openai' ? 'OpenAI TTS' : 'Edge TTS'} · ${s.ttsVoice}`,

      });

    } catch (e) {

      toast.error(e instanceof Error ? e.message : '朗读测试失败');

    }

  };



  const handleTestStt = async () => {

    const s = settings();

    if (s.mockVoice) {

      toast.success('Mock 识别通过', { description: "I'd like a coffee, please." });

      return;

    }

    if (!s.openaiKey) {

      toast.error('请先配置 OpenAI API Key（Whisper）');

      return;

    }

    if (!voiceAvailable) {

      toast.message('录音识别请在 Android App 中测试');

      return;

    }

    if (voiceState === 'idle') {

      toast.message('请说英文…', { description: '再次点击停止并识别' });

      await voiceToggle(() => {});

      return;

    }

    if (voiceState === 'recording') {

      await voiceToggle((text) => toast.success('识别成功', { description: text }));

      return;

    }

    toast.message('识别中…');

  };



  const ttsVoices = form.ttsProvider === 'openai' ? OPENAI_TTS_VOICES : EDGE_TTS_VOICES;



  return (

    <div className="h-full overflow-y-auto px-4 py-3 pb-8">

      {/* Quick status */}

      <WarmCard padding="md" className="mb-4 bg-gradient-to-r from-[var(--color-fill-secondary)] to-[var(--color-bg-elevated)]">

        <div className="flex items-center gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-bg-elevated)] text-2xl shadow-sm">

            ⚙️

          </div>

          <div>

            <p className="text-sm font-bold text-[var(--color-label)]">API 配置</p>

            <p className="text-xs text-[var(--color-label-secondary)]">

              配置后即可开始 AI 对话和语音功能

            </p>

          </div>

        </div>

      </WarmCard>



      <SettingsSection title="DeepSeek 对话" icon="💬" description="AI 情景对话使用 DeepSeek（或下方高级里切换 OpenAI）。">

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

          hint="留空则用官方 api.deepseek.com。走中转则填到 /v1。"

        />

        <Field

          label="对话模型"

          value={form.llmModel}

          onChange={(v) => update('llmModel', v)}

          placeholder="deepseek-chat"

          hint="常见：deepseek-chat / deepseek-v4-flash（须小写）"

        />

        <PrimaryButton onClick={() => void handleValidateLlm()} variant="outline" className="w-full">

          验证对话 API

        </PrimaryButton>

      </SettingsSection>



      <SettingsSection

        title="语音"

        icon="🎙️"

        description="朗读用 Edge TTS。Whisper 识别：Android 真机为正式路径；浏览器 dev 可预览测 Key/API。"

      >

        <Select

          label="朗读引擎"

          value={form.ttsProvider}

          options={[

            ['edge', 'Edge TTS（免费，推荐）'],

            ['openai', 'OpenAI TTS（需中转支持）'],

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

            label="TTS 模型"

            value={form.ttsModel}

            options={[

              ['tts-1', 'tts-1（快）'],

              ['tts-1-hd', 'tts-1-hd（高清）'],

            ]}

            onChange={(v) => update('ttsModel', v)}

          />

        )}

        <Select

          label="朗读音色"

          value={form.ttsVoice}

          options={ttsVoices}

          onChange={(v) => update('ttsVoice', v)}

        />



        <WarmCard padding="sm" className="space-y-3 bg-[var(--color-fill-secondary)]/50">

          <p className="text-xs font-bold text-[var(--color-label)]">Whisper 录音识别</p>

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

            hint="OpenRouter 填 https://openrouter.ai/api/v1；语音/STT 需账户余额 ≥ $0.50。"

          />

          <Field

            label="Whisper 模型"

            value={form.whisperModel}

            onChange={(v) => update('whisperModel', v)}

            placeholder="openai/whisper-1"

            hint="OpenRouter 用 openai/whisper-1；官方 OpenAI 用 whisper-1。留空则自动选择。"

          />

          <PrimaryButton

            onClick={() => void handleValidateStt()}

            disabled={!form.openaiKey.trim()}

            variant="outline"

            className="w-full"

          >

            验证 Whisper Key

          </PrimaryButton>

        </WarmCard>



        <div className="flex gap-2">

          <PrimaryButton onClick={() => void handleTestTts()} variant="outline" className="flex-1">

            测试朗读

          </PrimaryButton>

          {voiceAvailable ? (

            <PrimaryButton

              onClick={() => void handleTestStt()}

              disabled={voiceBusy && voiceState === 'transcribing'}

              variant="outline"

              className="flex-1"

            >

              {voiceState === 'recording' ? '停止识别' : '测试识别'}

            </PrimaryButton>

          ) : (

            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--color-separator)] px-2 text-center text-[10px] text-[var(--color-label-secondary)]">

              录音测试需 Android 真机

            </div>

          )}

        </div>

        {(voiceState === 'recording' || voiceState === 'transcribing') && (

          <p className="text-xs font-semibold text-[#007AFF]">

            {voiceState === 'recording' ? '🎤 录音中…' : '识别中…'}

          </p>

        )}

      </SettingsSection>



      <button

        type="button"

        onClick={() => setShowKey((s) => !s)}

        className="mb-3 text-xs font-semibold text-[var(--color-label-secondary)]"

      >

        {showKey ? '隐藏' : '显示'} Key

      </button>



      <PrimaryButton onClick={() => void handleSave()} variant="primary" className="mb-4 w-full py-3">

        保存设置

      </PrimaryButton>



      <details

        open={showAdvanced}

        onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}

        className="rounded-2xl border border-[var(--color-separator)] bg-[var(--color-bg-elevated)] p-4 shadow-sm"

      >

        <summary className="cursor-pointer text-sm font-semibold text-[var(--color-label-secondary)]">

          高级选项

        </summary>

        <div className="mt-3 space-y-3">

          <Select

            label="对话引擎"

            value={form.llmProvider}

            options={[

              ['deepseek', 'DeepSeek（默认）'],

              ['openai', 'OpenAI（共用 Whisper Key）'],

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

            Mock 语音（测试用，勿在生产开启）

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

