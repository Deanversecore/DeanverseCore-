"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useStore, selectData } from "@/lib/store";
import { useMounted } from "@/lib/hooks";
import { createId } from "@/lib/id";
import { respond, DEFAULT_SUGGESTIONS } from "@/lib/ai/engine";
import { interpret } from "@/lib/ai/nlu";
import { enhanceReply } from "@/lib/ai/client";
import { canSpeakOutLoud, primeSpeech, speak, stopSpeaking, unlockAudioPlayback } from "@/lib/voice";
import { haptic } from "@/lib/haptics";
import { MessageBubble, ThinkingBubble } from "@/components/ai/MessageBubble";
import { Composer } from "@/components/ai/Composer";
import { Skeleton } from "@/components/ui/Primitives";
import { LogoMark } from "@/components/ui/Logo";

const noopSubscribe = () => () => {};
const returnFalse = () => false;

export function AssistantScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const mounted = useMounted();
  const hydrated = useStore((state) => state.hydrated);

  const messages = useStore((state) => state.messages);
  const appendMessage = useStore((state) => state.appendMessage);
  const clearMessages = useStore((state) => state.clearMessages);
  const applyEffects = useStore((state) => state.applyEffects);
  const updateProfile = useStore((state) => state.updateProfile);
  const voiceEnabled = useStore((state) => state.profile.voiceEnabled);
  const spokenRepliesEnabled = useStore((state) => state.profile.spokenRepliesEnabled);
  const handsFreeEnabled = useStore((state) => state.profile.handsFreeEnabled);

  const [draft, setDraft] = useState(() => params.get("draft") ?? "");
  const [thinking, setThinking] = useState(false);
  const [listenSignal, setListenSignal] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const handledDeepLink = useRef(false);

  const speechReady = useSyncExternalStore(noopSubscribe, canSpeakOutLoud, returnFalse);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      unlockAudioPlayback();
      stopSpeaking();

      const now = new Date();
      appendMessage({
        id: createId("msg"),
        role: "user",
        content: trimmed,
        createdAt: now.toISOString(),
      });
      setDraft("");
      setThinking(true);

      const data = selectData(useStore.getState());
      const outcome = respond(trimmed, data, now);
      applyEffects(outcome.effects);

      const [enhanced] = await Promise.all([
        enhanceReply(trimmed, interpret(trimmed, now).type, outcome.text),
        new Promise((resolve) => setTimeout(resolve, 420)),
      ]);

      setThinking(false);
      haptic(outcome.receipts.length > 0 ? "success" : "tap");

      const reply = enhanced ?? outcome.text;
      const id = createId("msg");
      appendMessage({
        id,
        role: "assistant",
        content: reply,
        createdAt: new Date().toISOString(),
        receipts: outcome.receipts,
        suggestions: outcome.suggestions,
      });

      const { profile } = useStore.getState();
      if (profile.spokenRepliesEnabled) {
        void speak(id, reply, {
          voiceURI: profile.voiceURI,
          /* Hands-free turns this into a conversation: it listens again once it
             has finished its turn, so nothing has to be tapped. */
          onDone: () => {
            if (profile.handsFreeEnabled && profile.voiceEnabled) {
              setListenSignal((value) => value + 1);
            }
          },
        });
      }
    },
    [appendMessage, applyEffects],
  );

  useEffect(() => {
    primeSpeech();
    return () => stopSpeaking();
  }, []);

  /* A question passed in the URL is answered as soon as the workspace is ready. */
  useEffect(() => {
    const question = params.get("q");
    if (!mounted || !hydrated || !question || handledDeepLink.current) return;
    handledDeepLink.current = true;
    const id = window.setTimeout(() => void send(question), 0);
    return () => window.clearTimeout(id);
  }, [mounted, hydrated, params, send]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, thinking]);

  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const suggestions =
    !thinking && lastAssistant?.suggestions?.length ? lastAssistant.suggestions : DEFAULT_SUGGESTIONS.slice(0, 3);

  if (!mounted || !hydrated) {
    return (
      <div className="flex h-dvh flex-col gap-3 px-4 pt-20">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="ml-auto h-11 w-2/3 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="app-topbar sticky top-0 z-20 flex items-center gap-3 px-3 py-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Back to dashboard"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/60 active:bg-white/10"
        >
          <ChevronLeft size={17} />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <LogoMark size={30} />
          <div className="min-w-0 leading-none">
            <p className="admin-heading-serif truncate text-[0.9375rem] text-white">DeanVerse AI</p>
            <p className="mt-1 flex items-center gap-1.5 text-[0.625rem] text-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6f8f72]" />
              {handsFreeEnabled && spokenRepliesEnabled
                ? "Hands-free conversation"
                : "Connected to your workspace"}
            </p>
          </div>
        </div>

        {speechReady ? (
          <button
            type="button"
            onClick={() => {
              haptic("select");
              unlockAudioPlayback();
              if (spokenRepliesEnabled) stopSpeaking();
              updateProfile({ spokenRepliesEnabled: !spokenRepliesEnabled });
            }}
            aria-label={spokenRepliesEnabled ? "Mute spoken replies" : "Let the assistant speak"}
            aria-pressed={spokenRepliesEnabled}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors"
            style={{
              borderColor: spokenRepliesEnabled
                ? "color-mix(in srgb, var(--admin-gold) 46%, transparent)"
                : "#ffffff1a",
              background: spokenRepliesEnabled ? "var(--admin-gold-soft)" : "transparent",
              color: spokenRepliesEnabled ? "var(--admin-gold-light)" : "#ffffff73",
            }}
          >
            {spokenRepliesEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            haptic("tap");
            stopSpeaking();
            clearMessages();
          }}
          aria-label="Start a new conversation"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/45 active:bg-white/10"
        >
          <RotateCcw size={15} />
        </button>
      </header>

      <div
        ref={scrollRef}
        className="scrollbar-none flex-1 overflow-y-auto px-4 pt-4"
        style={{ paddingBottom: "1rem" }}
      >
        {messages.length === 0 ? <ConversationIntro /> : null}

        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <AnimatePresence>{thinking ? <ThinkingBubble key="thinking" /> : null}</AnimatePresence>
        </div>

        <div className="h-2" />
      </div>

      <div
        className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-1"
        style={{ background: "linear-gradient(180deg, transparent, #0a1210 70%)" }}
      >
        <AnimatePresence initial={false}>
          {suggestions.map((suggestion) => (
            <motion.button
              key={suggestion}
              type="button"
              layout
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => void send(suggestion)}
              className="admin-chip shrink-0 py-2 text-[0.6875rem] active:bg-white/10"
            >
              {suggestion}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <div style={{ paddingBottom: "calc(var(--app-bottomnav-height))" }}>
        <Composer
          value={draft}
          onChange={setDraft}
          onSubmit={send}
          disabled={thinking}
          autoListen={params.get("listen") === "1"}
          voiceEnabled={voiceEnabled}
          handsFree={handsFreeEnabled}
          listenSignal={listenSignal}
        />
      </div>
    </div>
  );
}

function ConversationIntro() {
  const examples = [
    "Remind me tomorrow to send the invoice",
    "Remember that this project is due Friday",
    "What am I forgetting?",
    "Help me organize my week",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="pb-6 pt-8 text-center"
    >
      <div className="mx-auto w-fit">
        <LogoMark size={52} />
      </div>
      <h2 className="admin-heading-serif mt-5 text-[1.375rem] text-white">
        Talk to me like an <span className="text-gold-gradient">assistant</span>
      </h2>
      <p className="mx-auto mt-2.5 max-w-[20rem] text-[0.8125rem] leading-relaxed text-white/55">
        I turn what you say into tasks, reminders, events, and memory — then keep watch over all of it.
      </p>

      <div className="mt-6 flex flex-col gap-2 text-left">
        {examples.map((example, index) => (
          <motion.p
            key={example}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.06, duration: 0.35 }}
            className="admin-panel-flat px-4 py-2.5 text-[0.75rem] text-white/50"
          >
            “{example}”
          </motion.p>
        ))}
      </div>
    </motion.div>
  );
}
