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
import { Composer, type UtteranceSource, type VoiceOrigin } from "@/components/ai/Composer";
import { Receipts } from "@/components/ai/MessageBubble";
import { Skeleton } from "@/components/ui/Primitives";
import { LogoMark } from "@/components/ui/Logo";
import { ASSISTANT_NAME, hasWakeWord, resolveVoiceTurn, stripWakeWord } from "@/lib/ai/wake";

const noopSubscribe = () => () => {};
const returnFalse = () => false;
const returnNull = () => null;

function looksLikeEcho(heard: string, spoken: string): boolean {
  const a = heard.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const b = spoken.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  if (!a || a.length < 6) return false;
  if (b.includes(a)) return true;
  const head = b.slice(0, Math.min(48, b.length));
  return head.length >= 12 && a.includes(head);
}

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
  const [listening, setListening] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(() => Boolean(params.get("draft")));
  const [listenSignal, setListenSignal] = useState(0);
  const [wakeHint, setWakeHint] = useState("");
  const handledDeepLink = useRef(false);
  const awaitingCommand = useRef(false);
  const awaitingTimer = useRef<number | undefined>(undefined);

  const speechReady = useSyncExternalStore(noopSubscribe, canSpeakOutLoud, returnFalse);
  const speakingId = useSyncExternalStore(subscribeSpeech, getSpeakingId, returnNull);
  const speaking = speakingId !== null;

  const openCommandWindow = useCallback(() => {
    awaitingCommand.current = true;
    window.clearTimeout(awaitingTimer.current);
    awaitingTimer.current = window.setTimeout(() => {
      awaitingCommand.current = false;
    }, 16000);
  }, []);

  const closeCommandWindow = useCallback(() => {
    awaitingCommand.current = false;
    window.clearTimeout(awaitingTimer.current);
  }, []);

  const send = useCallback(
    (text: string, meta?: { source: UtteranceSource; origin?: VoiceOrigin }): boolean => {
      const trimmed = text.trim();
      if (!trimmed) return true;

      const source = meta?.source ?? "typed";
      const origin = meta?.origin;
      let engineInput = trimmed;

      if (source === "voice") {
        const spoken = [...useStore.getState().messages].reverse().find((message) => message.role === "assistant");
        if (spoken && looksLikeEcho(trimmed, spoken.content)) {
          if (origin === "handsfree") setListenSignal((value) => value + 1);
          return false;
        }

        const turn = resolveVoiceTurn(trimmed);
        const followUp = awaitingCommand.current;

        if (turn.kind === "ignore" && !followUp) {
          setWakeHint("Say Core when you want me.");
          if (origin === "handsfree") {
            setListenSignal((value) => value + 1);
          }
          return false;
        }

        if (turn.kind === "wake") {
          engineInput = trimmed;
          openCommandWindow();
        } else if (turn.kind === "command") {
          engineInput = turn.command;
          closeCommandWindow();
        } else {
          closeCommandWindow();
        }
      }

      unlockAudioPlayback();
      stopSpeaking();
      setWakeHint("");

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
      const outcome = respond(engineInput, data, now);
      applyEffects(outcome.effects);

      void (async () => {
        const command = stripWakeWord(engineInput);
        const intentType =
          hasWakeWord(engineInput) && !command ? "wake" : interpret(command || engineInput, now).type;
        const [enhanced] = await Promise.all([
          enhanceReply(engineInput, intentType, outcome.text),
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
        const listenAgain = () => {
          if (source !== "voice") return;
          if (profile.handsFreeEnabled && profile.voiceEnabled) {
            setListenSignal((value) => value + 1);
          }
        };

        if (profile.spokenRepliesEnabled) {
          void speak(id, reply, {
            voiceURI: profile.voiceURI,
            onDone: listenAgain,
          });
        } else {
          listenAgain();
        }
      })();

      return true;
    },
    [appendMessage, applyEffects, closeCommandWindow, openCommandWindow],
  );

  useEffect(() => {
    primeSpeech();
    return () => {
      stopSpeaking();
      window.clearTimeout(awaitingTimer.current);
    };
  }, []);

  useEffect(() => {
    const question = params.get("q");
    if (!mounted || !hydrated || !question || handledDeepLink.current) return;
    handledDeepLink.current = true;
    const id = window.setTimeout(() => send(question, { source: "typed" }), 0);
    return () => window.clearTimeout(id);
  }, [mounted, hydrated, params, send]);

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
    ? draft || "Go ahead — say Core."
    : thinking
      ? ""
      : lastAssistant?.content || wakeHint || `I'm ${ASSISTANT_NAME}. Say Core when you need me.`;

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
      <header className="app-topbar app-topbar-inset sticky top-0 z-20 flex shrink-0 items-center gap-2 px-2.5 py-2">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Back to dashboard"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/60 active:bg-white/10"
        >
          <ChevronLeft size={17} />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <LogoMark size={26} />
          <div className="min-w-0 leading-none">
            <p className="admin-heading-serif truncate text-[0.9375rem] text-white">{ASSISTANT_NAME}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[0.625rem] text-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6f8f72]" />
              {listening
                ? "Listening for Core"
                : thinking
                  ? "Thinking"
                  : speaking
                    ? "Speaking"
                    : spokenRepliesEnabled
                      ? "Say Core"
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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/45 active:bg-white/10"
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
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors"
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
            closeCommandWindow();
            setWakeHint("");
            clearMessages();
          }}
          aria-label="Start a new conversation"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/45 active:bg-white/10"
        >
          <RotateCcw size={15} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-2">
        <VoicePresence state={presence} />

        {wakeHint && lastAssistant && !listening && !thinking ? (
          <p className="mt-2 max-w-[22rem] text-center text-[0.75rem] text-white/70">{wakeHint}</p>
        ) : null}

        {lastUser && !listening && !wakeHint ? (
            <p className="mt-2 max-w-[22rem] truncate text-center text-[0.75rem] text-white/70">
            You said “{lastUser.content}”
          </p>
        ) : null}

        <div className="mt-2 min-h-[3.25rem] w-full max-w-[22rem]" aria-live="polite">
          <AnimatePresence mode="wait">
            {caption ? (
              <motion.p
                key={caption}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="scrollbar-none max-h-[16vh] overflow-y-auto text-center text-[1rem] leading-relaxed text-white/90"
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
        className="scrollbar-none flex shrink-0 gap-2 overflow-x-auto px-4 pb-1"
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
              onClick={() => send(suggestion, { source: "typed" })}
              className="admin-chip shrink-0 py-2 text-[0.6875rem] active:bg-white/10"
            >
              {suggestion}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <div className="shrink-0">
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
          onVoiceError={(reason) => {
            setWakeHint(
              reason === "not-allowed"
                ? "Allow the microphone so Core can hear you."
                : "This browser can't listen. Type, or try Chrome or Safari.",
            );
          }}
        />
      </div>
    </div>
  );
}
