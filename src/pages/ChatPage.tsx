import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLiveQuery } from 'dexie-react-hooks';

import { useNavigate, useParams } from 'react-router-dom';

import { toast } from 'sonner';

import { ChatInputBar, CHAT_INPUT_HEIGHT } from '@/components/chat/ChatInputBar';

import { MessageBubble } from '@/components/chat/MessageBubble';

import { getMainSceneArt, getSubSceneImage } from '@/lib/category-art';

import { getSpeakableText } from '@/lib/prompts/practice-guide';

import { useAudioPlayer } from '@/hooks/useAudioPlayer';

import { useChatStream } from '@/hooks/useChatStream';

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

import { db } from '@/lib/db';

import { endConversation, getConversationErrors } from '@/lib/services/conversation';

import { DEFAULT_SETTINGS } from '@/types';



const SCROLL_PADDING = `calc(${CHAT_INPUT_HEIGHT} + 3.5rem + env(safe-area-inset-bottom, 0px) + 1rem)`;



export function ChatPage() {

  const { conversationId = '' } = useParams();

  const navigate = useNavigate();

  const bottomRef = useRef<HTMLDivElement>(null);

  const openingRef = useRef(false);

  const playedTtsRef = useRef(new Set<string>());

  const ttsInitRef = useRef(false);

  const [input, setInput] = useState('');

  const [showSummary, setShowSummary] = useState(false);

  const [errors, setErrors] = useState<Awaited<ReturnType<typeof getConversationErrors>>>([]);



  const settings = useLiveQuery(() => db.userSettings.get(1), []) ?? DEFAULT_SETTINGS;

  const conversation = useLiveQuery(

    () => db.conversations.get(conversationId),

    [conversationId],

  );

  const scenario = useLiveQuery(

    async () => {

      if (!conversation?.scenarioId) return undefined;

      return db.scenarios.get(conversation.scenarioId);

    },

    [conversation?.scenarioId],

  );


  const messages = useLiveQuery(

    () =>

      db.messages

        .where('conversationId')

        .equals(conversationId)

        .sortBy('createdAt'),

    [conversationId],

  );



  const { play } = useAudioPlayer(settings);



  const handleAssistantComplete = useCallback(

    (messageId: string, content: string) => {

      if (playedTtsRef.current.has(messageId)) return;

      playedTtsRef.current.add(messageId);

      const speakText = getSpeakableText(content);

      if (speakText) void play(messageId, speakText);

    },

    [play],

  );



  const { sendUserMessage, sendOpening, retryLast, isStreaming } = useChatStream({

    conversationId,

    scenario,

    settings,

    onAssistantComplete: handleAssistantComplete,

  });

  const { toggle, state: voiceState, isAvailable: voiceAvailable } = useVoiceRecorder(settings);



  const ended = conversation?.status === 'ended';

  const hasFailed = messages?.some((m) => m.status === 'failed');



  const sceneTile = useMemo(() => {
    if (!scenario) return null;
    if (scenario.category === 'free_chat') {
      return getMainSceneArt('free_chat');
    }
    const imageUrl = getSubSceneImage(scenario.id);
    return { imageUrl, label: scenario.title };
  }, [scenario]);



  // Reset on conversation switch; mark existing messages as already spoken

  useEffect(() => {

    openingRef.current = false;

    playedTtsRef.current = new Set();

    ttsInitRef.current = false;

  }, [conversationId]);



  useEffect(() => {

    if (!messages || ttsInitRef.current) return;

    ttsInitRef.current = true;

    for (const m of messages) {

      if (m.role === 'assistant' && m.status === 'complete') {

        playedTtsRef.current.add(m.id);

      }

    }

  }, [conversationId, messages]);



  // On enter: AI sends opening message

  useEffect(() => {

    if (!scenario || !messages || openingRef.current || ended) return;

    if (messages.length > 0) return;

    openingRef.current = true;

    void sendOpening();

  }, [scenario, messages, ended, sendOpening]);



  useEffect(() => {

    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  }, [messages, isStreaming]);



  const handleSend = async () => {

    if (!input.trim() || isStreaming || ended) return;

    const text = input;

    setInput('');

    await sendUserMessage(text);

  };



  const handleVoiceToggle = () => {

    void toggle((text) => {

      void sendUserMessage(text);

    });

  };



  const handleEnd = async () => {

    const list = await getConversationErrors(conversationId);

    await endConversation(conversationId);

    setErrors(list);

    setShowSummary(true);

    if (list.length === 0) {

      toast.message('Conversation ended');

    }

  };



  if (!conversation) {

    return (

      <div className="flex h-full items-center justify-center text-[var(--color-label-secondary)]">

        Conversation not found

      </div>

    );

  }



  if (showSummary) {

    return (

      <div className="flex h-full flex-col overflow-y-auto px-4 py-4" style={{ paddingBottom: SCROLL_PADDING }}>

        <div className="mb-4 rounded-2xl bg-[var(--color-bg-elevated)] p-6 text-center shadow-sm">

          <div className="mb-2 text-4xl">{errors.length === 0 ? '🎉' : '📝'}</div>

          <h2 className="text-xl font-bold text-[var(--color-label)]">Conversation ended</h2>

          <p className="mt-1 text-[15px] text-[var(--color-label-secondary)]">

            {errors.length === 0

              ? 'No expression errors detected. Keep it up!'

              : `${errors.length} expression(s) to improve`}

          </p>

        </div>



        {errors.length > 0 && (

          <ul className="space-y-2">

            {errors.map((e) => (

              <li key={e.id} className="rounded-2xl bg-[var(--color-bg-elevated)] p-4 shadow-sm">

                <p className="text-[15px] text-[#FF3B30] line-through">{e.originalExpression}</p>

                <p className="mt-1 text-[15px] font-semibold text-[#34C759]">✓ {e.correctExpression}</p>

                <p className="mt-2 text-[13px] text-[var(--color-label-secondary)]">{e.explanation}</p>

              </li>

            ))}

          </ul>

        )}



        <div className="mt-6 flex flex-col gap-2">

          <button

            type="button"

            onClick={() => navigate('/')}

            className="rounded-xl bg-[#007AFF] py-3.5 text-[17px] font-semibold text-white active:opacity-80"

          >

            Continue practicing

          </button>

          {errors.length > 0 && (

            <button

              type="button"

              onClick={() => navigate('/review')}

              className="rounded-xl bg-[var(--color-fill-secondary)] py-3.5 text-[17px] font-semibold text-[var(--color-label)] active:opacity-80"

            >

              Go to review

            </button>

          )}

        </div>

      </div>

    );

  }



  const isOpening = isStreaming && (messages?.length ?? 0) === 0;



  return (

    <div className="flex h-full flex-col">

      {scenario && sceneTile && (

        <div className="mx-3 mt-1 flex shrink-0 items-center gap-2.5 rounded-xl bg-[var(--color-bg-elevated)] px-3 py-2 shadow-sm">

          <img

            src={sceneTile.imageUrl}

            alt=""

            className="h-9 w-9 shrink-0 rounded-[10px] object-cover"

          />

          <div className="min-w-0 flex-1">

            <p className="truncate text-[15px] font-semibold text-[var(--color-label)]">

              {scenario.title}

            </p>

          </div>

          {!ended && (

            <button

              type="button"

              onClick={() => void handleEnd()}

              className="shrink-0 rounded-full bg-[var(--color-fill-secondary)] px-3 py-1 text-[13px] font-medium text-[#FF3B30]"

            >

              End

            </button>

          )}

        </div>

      )}



      <div

        className="min-h-0 flex-1 overflow-y-auto px-3 py-2"

        style={{ paddingBottom: SCROLL_PADDING }}

      >

        {isOpening && (

          <p className="py-8 text-center text-[15px] text-[var(--color-label-secondary)]">

            AI is preparing the opening…

          </p>

        )}

        {messages?.map((m) => (

          <MessageBubble key={m.id} message={m} />

        ))}

        {hasFailed && (

          <button

            type="button"

            onClick={() => void retryLast()}

            className="mx-auto block text-[13px] font-medium text-[#007AFF]"

          >

            Retry last message

          </button>

        )}

        <div ref={bottomRef} />

      </div>



      {!ended && (

        <ChatInputBar

          value={input}

          onChange={setInput}

          onSend={() => void handleSend()}

          onVoiceToggle={handleVoiceToggle}

          disabled={isStreaming || voiceState === 'transcribing'}

          voiceState={voiceState}

          showVoice={voiceAvailable}

          placeholder="Type in English or tap the mic"

        />

      )}

    </div>

  );

}

