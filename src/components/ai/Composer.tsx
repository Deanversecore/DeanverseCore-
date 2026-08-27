"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUp, Mic, Square } from "lucide-react";
import { isVoiceSupported, startDictation, stopSpeaking, unlockAudioPlayback, unlockMicrophone } from "@/lib/voice";
import { haptic } from "@/lib/haptics";
import { cx } from "@/components/ui/Primitives";

const noopSubscribe = () => () => {};
const returnFalse = () => false;

export type UtteranceSource = "voice" | "typed";
export type VoiceOrigin = "tap" | "handsfree";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string, meta?: { source: UtteranceSource; origin?: VoiceOrigin }) => boolean | void;
  disabled?: boolean;
  autoListen?: boolean;
  voiceEnabled: boolean;
  handsFree?: boolean;
  listenSignal?: number;
  /** Hide the text field and lead with a talk button. */
  talkFirst?: boolean;
  onListeningChange?: (listening: boolean) => void;
  onVoiceError?: (reason: string) => void;
}

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  autoListen,
  voiceEnabled,
  handsFree,
  listenSignal = 0,
  talkFirst = false,
  onListeningChange,
  onVoiceError,
}: ComposerProps) {
  const [listening, setListening] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const originRef = useRef<VoiceOrigin>("tap");
  const startGen = useRef(0);

  const handsFreeRef = useRef(handsFree);
  const submitRef = useRef(onSubmit);
  const onListeningChangeRef = useRef(onListeningChange);
  const onVoiceErrorRef = useRef(onVoiceError);
  const talkFirstRef = useRef(talkFirst);
  useEffect(() => {
    handsFreeRef.current = handsFree;
    submitRef.current = onSubmit;
    onListeningChangeRef.current = onListeningChange;
    onVoiceErrorRef.current = onVoiceError;
    talkFirstRef.current = talkFirst;
  });

  const voiceReady = useSyncExternalStore(noopSubscribe, isVoiceSupported, returnFalse);

  const setListeningState = useCallback((next: boolean) => {
    setListening(next);
    onListeningChangeRef.current?.(next);
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [value, talkFirst]);

  const beginListening = useCallback(
    (origin: VoiceOrigin = "tap") => {
      if (stopRef.current) {
        startGen.current += 1;
        stopRef.current();
        return;
      }
      originRef.current = origin;
      haptic("select");
      unlockAudioPlayback();
      stopSpeaking();
      const gen = ++startGen.current;

      void (async () => {
        const allowed = await unlockMicrophone();
        if (gen !== startGen.current) return;
        if (!allowed) {
          onVoiceErrorRef.current?.("not-allowed");
          return;
        }

        const stop = startDictation({
          onPartial: onChange,
          onFinal: (transcript) => {
            const text = transcript.trim();
            if (!text) return;
            haptic("success");
            submitRef.current(text, { source: "voice", origin: originRef.current });
            if (handsFreeRef.current || talkFirstRef.current) onChange("");
            else onChange(text);
          },
          onEnd: () => {
            setListeningState(false);
            stopRef.current = null;
          },
          onError: (reason) => onVoiceErrorRef.current?.(reason),
        });

        if (gen !== startGen.current) {
          stop?.();
          return;
        }
        if (stop) {
          stopRef.current = stop;
          setListeningState(true);
        } else {
          onVoiceErrorRef.current?.("unsupported");
        }
      })();
    },
    [onChange, setListeningState],
  );

  const autoListenStarted = useRef(false);
  useEffect(() => {
    if (!autoListen || !voiceReady || !voiceEnabled || autoListenStarted.current) return;
    autoListenStarted.current = true;
    const id = window.setTimeout(() => beginListening("handsfree"), 0);
    return () => window.clearTimeout(id);
  }, [autoListen, voiceReady, voiceEnabled, beginListening]);

  useEffect(() => {
    if (listenSignal === 0 || !voiceReady || !voiceEnabled || stopRef.current) return;
    const id = window.setTimeout(() => beginListening("handsfree"), 700);
    return () => window.clearTimeout(id);
  }, [listenSignal, voiceReady, voiceEnabled, beginListening]);

  useEffect(() => {
    if (talkFirst) return;
    startGen.current += 1;
    stopRef.current?.();
  }, [talkFirst]);

  useEffect(
    () => () => {
      startGen.current += 1;
      stopRef.current?.();
    },
    [],
  );

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    startGen.current += 1;
    stopRef.current?.();
    haptic("tap");
    onSubmit(trimmed, { source: "typed" });
  };

  const showVoice = voiceEnabled && voiceReady;

  if (talkFirst && showVoice) {
    return (
      <div className="flex flex-col items-center px-3 pb-2 pt-1">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => beginListening("tap")}
          disabled={disabled}
          aria-label={listening ? "Stop listening" : "Talk to Core"}
          aria-pressed={listening}
          className={cx(
            "flex h-16 w-16 items-center justify-center rounded-full border transition-colors",
            listening && "gold-pulse",
          )}
          style={{
            borderColor: listening
              ? "color-mix(in srgb, var(--admin-gold) 55%, transparent)"
              : "#c9a96273",
            background: listening
              ? "linear-gradient(135deg, #dfc88a 0%, #c9a962 100%)"
              : "linear-gradient(135deg, #c9a962f2 0%, #aa8c46f2 100%)",
            boxShadow: "0 10px 34px -8px var(--admin-gold-glow), var(--admin-elev-2)",
            color: "#0a0a0a",
          }}
        >
          {listening ? <Square size={18} fill="currentColor" /> : <Mic size={26} />}
        </motion.button>
        <p className="mt-1.5 text-[0.6875rem] text-white/40">
          {listening ? "Listening for Core…" : "Say Core, then talk"}
        </p>
      </div>
    );
  }

  return (
    <div
      className="sticky bottom-0 px-3 pb-2 pt-2"
      style={{
        background: "linear-gradient(180deg, transparent, #0a1210 32%)",
      }}
    >
      <div
        className={cx(
          "flex items-end gap-2 rounded-[20px] p-2 transition-colors duration-300",
          listening && "gold-pulse",
        )}
        style={{
          background: "color-mix(in srgb, var(--admin-panel) 82%, transparent)",
          border: listening
            ? "1px solid color-mix(in srgb, var(--admin-gold) 46%, transparent)"
            : "1px solid var(--admin-hairline)",
          backdropFilter: "blur(16px)",
          boxShadow: "var(--admin-elev-1)",
        }}
      >
        <textarea
          ref={textareaRef}
          name="assistant-message"
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={listening ? "Listening for Core…" : "Or type if you'd rather"}
          aria-label="Message Core"
          className="max-h-[8.25rem] min-h-[2.75rem] flex-1 resize-none bg-transparent px-2.5 py-2 text-[1rem] leading-relaxed text-white placeholder:text-white/35 focus:outline-none"
        />

        {showVoice ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => beginListening("tap")}
            aria-label={listening ? "Stop listening" : "Talk to me"}
            aria-pressed={listening}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors"
            style={{
              borderColor: listening
                ? "color-mix(in srgb, var(--admin-gold) 46%, transparent)"
                : "var(--admin-border-subtle)",
              background: listening ? "var(--admin-gold-soft)" : "transparent",
              color: listening ? "var(--admin-gold-light)" : "#ffffff8c",
            }}
          >
            {listening ? <Square size={14} fill="currentColor" /> : <Mic size={17} />}
          </motion.button>
        ) : null}

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={submit}
          disabled={!value.trim() || disabled}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-30"
          style={{
            background: "linear-gradient(135deg, #c9a962f2 0%, #aa8c46f2 100%)",
            border: "1px solid #c9a96273",
            boxShadow: "0 4px 16px -6px var(--admin-gold-glow)",
          }}
        >
          <ArrowUp size={17} color="#0a0a0a" strokeWidth={2.4} />
        </motion.button>
      </div>
    </div>
  );
}
