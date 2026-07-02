import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChatInputBar } from '@/components/chat/ChatInputBar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { WarmCard } from '@/components/ui/WarmCard';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useReviewChatStream } from '@/hooks/useChatStream';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { scheduleReview } from '@/lib/anki-scheduler';
import { db } from '@/lib/db';
import { llmJsonCompletion } from '@/lib/providers/types';
import { getSpeakableText } from '@/lib/prompts/practice-guide';
import {
  REVIEW_JUDGE_SYSTEM,
  buildReviewGuidePrompt,
  buildReviewJudgeUser,
} from '@/lib/prompts/review-guide';
import { addMessage, endConversation } from '@/lib/services/conversation';
import { DEFAULT_SETTINGS, type ReviewJudgeResult, type ReviewRating } from '@/types';

const RATING_OPTIONS: { rating: ReviewRating; label: string; emoji: string; color: string }[] = [
  { rating: 'again', label: 'Forgot', emoji: '😅', color: 'bg-red-50 text-red-500' },
  { rating: 'hard', label: 'Hard', emoji: '😓', color: 'bg-orange-50 text-orange-500' },
  { rating: 'good', label: 'Good', emoji: '😊', color: 'bg-green-50 text-green-600' },
  { rating: 'easy', label: 'Easy', emoji: '🎉', color: 'bg-[var(--color-fill-secondary)] text-[#007AFF]' },
];

const GREETING =
  "Let's practice a natural expression together. I'll guide you — try to respond in English!";

export function ReviewSessionPage() {
  const { reviewCardId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get('conv') ?? '';
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);
  const playedTtsRef = useRef(new Set<string>());
  const ttsInitRef = useRef(false);
  const [input, setInput] = useState('');
  const [showRating, setShowRating] = useState(false);
  const [judging, setJudging] = useState(false);

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

  const systemPrompt = useMemo(() => {
    if (!errorRecord) return '';
    return buildReviewGuidePrompt(
      errorRecord.correctExpression,
      errorRecord.contextSnippet,
      settings.practiceDifficulty,
    );
  }, [errorRecord, settings.practiceDifficulty]);

  const { sendUserMessage, isStreaming } = useReviewChatStream({
    conversationId,
    systemPrompt,
    settings,
    onAssistantComplete: handleAssistantComplete,
  });

  const { toggle, state: voiceState, isAvailable: voiceAvailable } = useVoiceRecorder(settings);

  useEffect(() => {
    greetedRef.current = false;
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  useEffect(() => {
    if (!conversationId || !errorRecord || greetedRef.current) return;
    greetedRef.current = true;
    void (async () => {
      const msg = await addMessage(conversationId, 'assistant', GREETING);
      handleAssistantComplete(msg.id, GREETING);
    })();
  }, [conversationId, errorRecord, handleAssistantComplete]);

  const submitUserText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || showRating || !errorRecord) return;

    await sendUserMessage(trimmed);

    setJudging(true);
    try {
      const result = await llmJsonCompletion<ReviewJudgeResult>(
        settings,
        REVIEW_JUDGE_SYSTEM,
        buildReviewJudgeUser(trimmed, errorRecord.correctExpression),
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

  const handleSend = async () => {
    if (!input.trim() || isStreaming || showRating) return;
    const text = input;
    setInput('');
    await submitUserText(text);
  };

  const handleVoiceToggle = () => {
    void toggle((text) => {
      void submitUserText(text);
    });
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
    <div className="flex h-full min-h-0 flex-col">
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

      <div className="scroll-area min-h-0 flex-1 px-4 py-3">
        {messages?.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {judging && (
          <p className="text-center text-xs text-[var(--color-label-secondary)]">Checking…</p>
        )}
        <div ref={bottomRef} />
      </div>

      {showRating ? (
        <div className="shrink-0 border-t border-[var(--color-separator)] bg-[var(--color-bg-nav)] p-4 backdrop-blur-md">
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
          onVoiceToggle={handleVoiceToggle}
          disabled={isStreaming || voiceState === 'transcribing' || judging}
          voiceState={voiceState}
          showVoice={voiceAvailable}
          placeholder="Type in English or tap the mic"
        />
      )}
    </div>
  );
}
