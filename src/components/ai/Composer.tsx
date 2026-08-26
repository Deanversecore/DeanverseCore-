"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUp, Mic, Square } from "lucide-react";
import { isVoiceSupported, startDictation, unlockAudioPlayback } from "@/lib/voice";
import { haptic } from "@/lib/haptics";
import { cx } from "@/components/ui/Primitives";

const noopSubscribe = () => () => {};
const returnFalse = () => false;

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  autoListen?: boolean;
  voiceEnabled: boolean;
  /** Sends what you said as soon as you stop talking. */
  handsFree?: boolean;
  /** Any change to this number opens the mic again. */
  listenSignal?: number;
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
}: ComposerProps) {
  const [listening, setListening] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* Dictation callbacks outlive the render that created them, so they read the
     current props from refs rather than closing over stale ones. */
  const handsFreeRef = useRef(handsFree);
  const submitRef = useRef(onSubmit);
  useEffect(() => {
    handsFreeRef.current = handsFree;
    submitRef.current = onSubmit;
  });

  const voiceReady = useSyncExternalStore(noopSubscribe, isVoiceSupported, returnFalse);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [value]);

  const beginListening = useCallback(() => {
    if (stopRef.current) {
      stopRef.current();
      return;
    }
    haptic("select");
    unlockAudioPlayback();
    const stop = startDictation({
      onPartial: onChange,
      onFinal: (transcript) => {
        haptic("success");
        if (handsFreeRef.current) {
          onChange("");
          submitRef.current(transcript);
        } else {
          onChange(transcript);
        }
      },
      onEnd: () => {
        setListening(false);
        stopRef.current = null;
      },
    });
    if (stop) {
      stopRef.current = stop;
      setListening(true);
    }
  }, [onChange]);

  /* Deep links like /ai?listen=1 open straight into dictation. Dictation is an
     external API, so kick it off after the render settles rather than inline. */
  const autoListenStarted = useRef(false);
  useEffect(() => {
    if (!autoListen || !voiceReady || !voiceEnabled || autoListenStarted.current) return;
    autoListenStarted.current = true;
    const id = window.setTimeout(() => beginListening(), 0);
    return () => window.clearTimeout(id);
  }, [autoListen, voiceReady, voiceEnabled, beginListening]);

  /* The assistant re-opens the mic after it finishes speaking. */
  useEffect(() => {
    if (listenSignal === 0 || !voiceReady || !voiceEnabled || stopRef.current) return;
    const id = window.setTimeout(() => beginListening(), 260);
    return () => window.clearTimeout(id);
  }, [listenSignal, voiceReady, voiceEnabled, beginListening]);

  useEffect(() => () => stopRef.current?.(), []);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    stopRef.current?.();
    haptic("tap");
    onSubmit(trimmed);
  };

  const showVoice = voiceEnabled && voiceReady;

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
          placeholder={listening ? "Listening…" : "Tell me what you need"}
          aria-label="Message your assistant"
          className="max-h-[8.25rem] min-h-[2.5rem] flex-1 resize-none bg-transparent px-2.5 py-2 text-[0.875rem] leading-relaxed text-white placeholder:text-white/35 focus:outline-none"
        />

        {showVoice ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={beginListening}
            aria-label={listening ? "Stop dictation" : "Start dictation"}
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
