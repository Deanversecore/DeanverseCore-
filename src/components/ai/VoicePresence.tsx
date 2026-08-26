"use client";

import { LogoMark } from "@/components/ui/Logo";
import { cx } from "@/components/ui/Primitives";

export type PresenceState = "idle" | "listening" | "thinking" | "speaking";

const STATUS: Record<PresenceState, string> = {
  idle: "Say Core",
  listening: "I'm listening",
  thinking: "Give me a second",
  speaking: "Speaking",
};

export function VoicePresence({ state }: { state: PresenceState }) {
  return (
    <div className="flex flex-col items-center">
      <div className="voice-orb-stage" role="img" aria-label={STATUS[state]}>
        <span className={cx("voice-orb-ring", `voice-orb-ring--${state}`)} aria-hidden />
        <span className={cx("voice-orb-ring", "voice-orb-ring--lag", `voice-orb-ring--${state}`)} aria-hidden />
        <div className={cx("voice-orb", `voice-orb--${state}`)}>
          <LogoMark size={52} />
        </div>
      </div>
      <p className="mt-5 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-gold-light)]">
        {STATUS[state]}
      </p>
    </div>
  );
}
