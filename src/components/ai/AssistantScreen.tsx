"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, Keyboard, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useStore, selectData } from "@/lib/store";
import { useMounted } from "@/lib/hooks";
import { createId } from "@/lib/id";
import { respond, DEFAULT_SUGGESTIONS } from "@/lib/ai/engine";
import { interpret } from "@/lib/ai/nlu";
import { enhanceReply } from "@/lib/ai/client";
import {
  canSpeakOutLoud,
  getSpeakingId,
  primeSpeech,
  speak,
  stopSpeaking,
  subscribeSpeech,
  unlockAudioPlayback,
} from "@/lib/voice";
import { haptic } from "@/lib/haptics";
import { VoicePresence, type PresenceState } from "@/components/ai/VoicePresence";
import { Composer } from "@/components/ai/Composer";
import { Receipts } from "@/components/ai/MessageBubble";
import { Skeleton } from "@/components/ui/Primitives";
import { LogoMark } from "@/components/ui/Logo";

const noopSubscribe = () => () => {};
const returnFalse = () => false;
const returnNull = () => null;

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
  const name = useStore((state) => state.profile.name);
  const voiceEnabled = useStore((state) => state.profile.voiceEnabled);
  const spokenRepliesEnabled = useStore((state) => state.profile.spokenRepliesEnabled);
  const handsFreeEnabled = useStore((state) => state.profile.handsFreeEnabled);

  const [draft, setDraft] = useState(() => params.get("draft") ?? "");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(() => Boolean(params.get("draft")));
  const [listenSignal, setListenSignal] = useState(0);
  const handledDeepLink = useRef(false);
  const greeted = useRef(false);

  const speechReady = useSyncExternalStore(noopSubscribe, canSpeakOutLoud, returnFalse);
  const speakingId = useSyncExternalStore(subscribeSpeech, getSpeakingId, returnNull);
  const speaking = speakingId !== null;

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
        new Promise((resolve) => setTimeout(resolve, 280)),
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
          onDone: () => {
            if (profile.handsFreeEnabled && profile.voiceEnabled) {
              setListenSignal((value) => value + 1);
            }
          },
        });
      } else if (profile.handsFreeEnabled && profile.voiceEnabled) {
        setListenSignal((value) => value + 1);
      }
    },
    [appendMessage, applyEffects],
  );

  useEffect(() => {
    primeSpeech();
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    const question = params.get("q");
    if (!mounted || !hydrated || !question || handledDeepLink.current) return;
    handledDeepLink.current = true;
    greeted.current = true;
    const id = window.setTimeout(() => void send(question), 0);
    return () => window.clearTimeout(id);
  }, [mounted, hydrated, params, send]);

  useEffect(() => {
    if (!mounted || !hydrated || greeted.current || messages.length > 0) return;
    if (params.get("q") || params.get("draft") || params.get("listen") === "1") return;
    greeted.current = true;

    const greeting = name.trim()
      ? `Hey ${name.trim()}. I'm right here. What do you need?`
      : "Hey. I'm right here. What do you need?";
    const id = createId("msg");
    appendMessage({
      id,
      role: "assistant",
      content: greeting,
      createdAt: new Date().toISOString(),
      suggestions: DEFAULT_SUGGESTIONS.slice(0, 3),
    });

    const { profile } = useStore.getState();
    if (profile.spokenRepliesEnabled) {
      const timer = window.setTimeout(() => {
        unlockAudioPlayback();
        void speak(id, greeting, {
          voiceURI: profile.voiceURI,
          onDone: () => {
            if (profile.handsFreeEnabled && profile.voiceEnabled) {
              setListenSignal((value) => value + 1);
            }
          },
        });
      }, 400);
      return () => window.clearTimeout(timer);
    }
  }, [mounted, hydrated, messages.length, name, params, appendMessage]);

  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  const suggestions =
    !thinking && lastAssistant?.suggestions?.length ? lastAssistant.suggestions : DEFAULT_SUGGESTIONS.slice(0, 3);

  const presence: PresenceState = listening
    ? "listening"
    : thinking
      ? "thinking"
      : speaking
        ? "speaking"
        : "idle";

  const caption = listening
    ? draft || "Go ahead — I'm listening."
    : thinking
      ? ""
      : lastAssistant?.content ?? "";

  if (!mounted || !hydrated) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 px-4">
        <Skeleton className="h-32 w-32 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="app-topbar app-topbar-inset sticky top-0 z-20 flex items-center gap-3 px-3 py-3">
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
            <p className="admin-heading-serif truncate text-[0.9375rem] text-white">DeanVerse</p>
            <p className="mt-1 flex items-center gap-1.5 text-[0.625rem] text-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6f8f72]" />
              {listening
                ? "Listening"
                : thinking
                  ? "Thinking"
                  : speaking
                    ? "Speaking"
                    : spokenRepliesEnabled
                      ? "I'm here"
                      : "Voice is muted"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            haptic("select");
            setKeyboardOpen((open) => !open);
          }}
          aria-label={keyboardOpen ? "Hide keyboard" : "Type instead"}
          aria-pressed={keyboardOpen}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/45 active:bg-white/10"
          style={
            keyboardOpen
              ? {
                  borderColor: "color-mix(in srgb, var(--admin-gold) 46%, transparent)",
                  background: "var(--admin-gold-soft)",
                  color: "var(--admin-gold-light)",
                }
              : undefined
          }
        >
          <Keyboard size={15} />
        </button>

        {speechReady ? (
          <button
            type="button"
            onClick={() => {
              haptic("select");
              unlockAudioPlayback();
              if (spokenRepliesEnabled) stopSpeaking();
              updateProfile({ spokenRepliesEnabled: !spokenRepliesEnabled });
            }}
            aria-label={spokenRepliesEnabled ? "Mute spoken replies" : "Let me speak"}
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
            greeted.current = false;
            clearMessages();
          }}
          aria-label="Start a new conversation"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/45 active:bg-white/10"
        >
          <RotateCcw size={15} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-4">
        <VoicePresence state={presence} />

        {lastUser && !listening ? (
          <p className="mt-4 max-w-[22rem] truncate text-center text-[0.75rem] text-white/70">
            You said “{lastUser.content}”
          </p>
        ) : null}

        <div className="mt-3 min-h-[4.5rem] w-full max-w-[22rem]" aria-live="polite">
          <AnimatePresence mode="wait">
            {caption ? (
              <motion.p
                key={caption}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="scrollbar-none max-h-[22vh] overflow-y-auto text-center text-[1.0625rem] leading-relaxed text-white/90"
              >
                {caption}
              </motion.p>
            ) : thinking ? (
              <motion.p
                key="thinking"
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-[0.875rem] text-white/80"
              >
                Let me think…
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        {lastAssistant?.receipts && lastAssistant.receipts.length > 0 && !thinking ? (
          <div className="mt-2 w-full max-w-[22rem]">
            <Receipts receipts={lastAssistant.receipts} />
          </div>
        ) : null}
      </div>

      <div
        className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-2"
        style={{ background: "linear-gradient(180deg, transparent, #0a1210 70%)" }}
      >
        <AnimatePresence initial={false}>
          {suggestions.map((suggestion) => (
            <motion.button
              key={suggestion}
              type="button"
              layout
              initial={false}
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

      <div style={{ paddingBottom: "var(--app-bottomnav-height)" }}>
        <Composer
          value={draft}
          onChange={setDraft}
          onSubmit={send}
          disabled={thinking}
          autoListen={params.get("listen") === "1"}
          voiceEnabled={voiceEnabled}
          handsFree={handsFreeEnabled}
          listenSignal={listenSignal}
          talkFirst={!keyboardOpen}
          onListeningChange={setListening}
        />
      </div>
    </div>
  );
}
