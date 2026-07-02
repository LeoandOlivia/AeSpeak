import { useEffect, useMemo, useRef, useState } from 'react';

import { useLiveQuery } from 'dexie-react-hooks';

import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { toast } from 'sonner';

import { ChatInputBar, CHAT_INPUT_HEIGHT } from '@/components/chat/ChatInputBar';

import { MessageBubble } from '@/components/chat/MessageBubble';

import { WarmCard } from '@/components/ui/WarmCard';

import { useReviewChatStream } from '@/hooks/useChatStream';

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

import { scheduleReview } from '@/lib/anki-scheduler';

import { db } from '@/lib/db';

import { llmJsonCompletion } from '@/lib/providers/types';

import {

  REVIEW_JUDGE_SYSTEM,

  buildReviewGuidePrompt,

  buildReviewJudgeUser,

} from '@/lib/prompts/review-guide';

import { addMessage, endConversation } from '@/lib/services/conversation';

import { DEFAULT_SETTINGS, type ReviewJudgeResult, type ReviewRating } from '@/types';



const SCROLL_PADDING = `calc(${CHAT_INPUT_HEIGHT} + 3.5rem + env(safe-area-inset-bottom, 0px) + 1rem)`;



const RATING_OPTIONS: { rating: ReviewRating; label: string; emoji: string; color: string }[] = [

  { rating: 'again', label: 'Forgot', emoji: '😅', color: 'bg-red-50 text-red-500' },

  { rating: 'hard', label: 'Hard', emoji: '😓', color: 'bg-orange-50 text-orange-500' },

  { rating: 'good', label: 'Good', emoji: '😊', color: 'bg-green-50 text-green-600' },

  { rating: 'easy', label: 'Easy', emoji: '🎉', color: 'bg-[var(--color-fill-secondary)] text-[#007AFF]' },

];



export function ReviewSessionPage() {

  const { reviewCardId = '' } = useParams();

  const [searchParams] = useSearchParams();

  const conversationId = searchParams.get('conv') ?? '';

  const navigate = useNavigate();

  const bottomRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState('');

  const [showRating, setShowRating] = useState(false);

  const [judging, setJudging] = useState(false);

  const greetedRef = useRef(false);



  const settings = useLiveQuery(() => db.userSettings.get(1), []) ?? DEFAULT_SETTINGS;

  const reviewCard = useLiveQuery(() => db.reviewCards.get(reviewCardId), [reviewCardId]);

  const errorRecord = useLiveQuery(

    async () => {

      if (!reviewCard) return undefined;

      return db.errorRecords.get(reviewCard.errorRecordId);

    },

    [reviewCard?.errorRecordId],

  );

  const messages = useLiveQuery(

    () =>

      conversationId

        ? db.messages.where('conversationId').equals(conversationId).sortBy('createdAt')

        : [],

    [conversationId],

  );



  const systemPrompt = useMemo(() => {

    if (!errorRecord) return '';

    return buildReviewGuidePrompt(

      errorRecord.correctExpression,

      errorRecord.contextSnippet,

    );

  }, [errorRecord]);



  const { sendUserMessage, isStreaming } = useReviewChatStream({

    conversationId,

    systemPrompt,

    settings,

  });

  const { toggle, state: voiceState, isAvailable: voiceAvailable } = useVoiceRecorder(settings);



  useEffect(() => {

    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  }, [messages, isStreaming]);



  useEffect(() => {

    if (!conversationId || !errorRecord || greetedRef.current) return;

    greetedRef.current = true;

    void (async () => {

      await addMessage(

        conversationId,

        'assistant',

        "Let's practice a natural expression together. I'll guide you — try to respond in English!",

      );

    })();

  }, [conversationId, errorRecord]);



  const handleSend = async () => {

    if (!input.trim() || isStreaming || showRating) return;

    const text = input.trim();

    setInput('');

    await sendUserMessage(text);



    if (!errorRecord) return;

    setJudging(true);

    try {

      const result = await llmJsonCompletion<ReviewJudgeResult>(

        settings,

        REVIEW_JUDGE_SYSTEM,

        buildReviewJudgeUser(text, errorRecord.correctExpression),

      );

      if (result.passed) {

        setShowRating(true);

        toast.success('Correct! Rate how well you know it');

      }

    } catch {

      // judge is best-effort; user can keep trying

    } finally {

      setJudging(false);

    }

  };



  const handleRating = async (rating: ReviewRating) => {

    if (!reviewCard) return;

    const next = scheduleReview(reviewCard, rating);

    await db.reviewCards.update(reviewCardId, next);

    await endConversation(conversationId);

    toast.message('Review complete');

    navigate('/review');

  };



  if (!reviewCard || !errorRecord || !conversationId) {

    return (

      <div className="flex h-full items-center justify-center text-[var(--color-label-secondary)]">

        Review item not found

      </div>

    );

  }



  return (

    <div className="flex h-full flex-col">

      <div className="mx-4 mt-2 shrink-0">

        <WarmCard padding="sm" className="border-dashed">

          <p className="text-[10px] font-semibold text-[var(--color-label-secondary)]">

            Review goal (answer not revealed)

          </p>

          <p className="mt-1 text-sm text-[var(--color-label)]/60 line-through">

            {errorRecord.originalExpression}

          </p>

        </WarmCard>

      </div>



      <div

        className="min-h-0 flex-1 overflow-y-auto px-4 py-3"

        style={{ paddingBottom: SCROLL_PADDING }}

      >

        {messages?.map((m) => (

          <MessageBubble key={m.id} message={m} />

        ))}

        {judging && (

          <p className="text-center text-xs text-[var(--color-label-secondary)]">Checking…</p>

        )}

        <div ref={bottomRef} />

      </div>



      {showRating ? (

        <div

          className="fixed left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-[var(--color-separator)] bg-[var(--color-bg-elevated)]/95 p-4 backdrop-blur-md"

          style={{ bottom: `calc(3.5rem + env(safe-area-inset-bottom, 0px))` }}

        >

          <p className="mb-3 text-center text-sm font-semibold text-[var(--color-label)]">

            How well did you know it?

          </p>

          <div className="grid grid-cols-4 gap-2">

            {RATING_OPTIONS.map(({ rating, label, emoji, color }) => (

              <button

                key={rating}

                type="button"

                onClick={() => void handleRating(rating)}

                className={`flex flex-col items-center gap-1 rounded-xl py-3 transition active:scale-95 ${color}`}

              >

                <span className="text-lg">{emoji}</span>

                <span className="text-[10px] font-bold">{label}</span>

              </button>

            ))}

          </div>

        </div>

      ) : (

        <ChatInputBar

          value={input}

          onChange={setInput}

          onSend={() => void handleSend()}

          onVoiceToggle={() =>

            void toggle((text) => setInput((prev) => (prev ? `${prev} ${text}` : text)))

          }

          disabled={isStreaming || voiceState === 'transcribing' || judging}

          voiceState={voiceState}

          showVoice={voiceAvailable}

          placeholder="Reply in English…"

        />

      )}

    </div>

  );

}

