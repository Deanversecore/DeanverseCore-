"use client";

import { useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { useStore } from "@/lib/store";
import { detectTimezone } from "@/lib/seed";
import { formatLongDate, greetingFor } from "@/lib/date";
import { useNow } from "@/lib/hooks";
import { haptic } from "@/lib/haptics";
import { LogoMark } from "@/components/ui/Logo";
import { Eyebrow, Panel } from "@/components/ui/Primitives";

const noopSubscribe = () => () => {};
const noTimezone = () => "";

/**
 * Nothing in the workspace is invented, so the profile has to come from
 * somewhere: this asks for it once, then never again.
 */
export function Onboarding() {
  const updateProfile = useStore((state) => state.updateProfile);
  const profile = useStore((state) => state.profile);
  const now = useNow(60_000);

  const [name, setName] = useState(profile.name);
  const [startHour, setStartHour] = useState(profile.workdayStartHour);
  const [endHour, setEndHour] = useState(profile.workdayEndHour);
  const timezone = useSyncExternalStore(noopSubscribe, detectTimezone, noTimezone);

  const trimmed = name.trim();

  const finish = () => {
    if (!trimmed) return;
    haptic("success");
    updateProfile({
      name: trimmed,
      timezoneLabel: timezone,
      workdayStartHour: startHour,
      workdayEndHour: endHour,
      spokenRepliesEnabled: true,
      handsFreeEnabled: true,
      voiceEnabled: true,
      onboardedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="flex min-h-dvh flex-col justify-center px-5 py-10" style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}>
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <LogoMark size={44} />
          <div className="leading-none">
            <p className="admin-eyebrow">DeanVerse AI</p>
            <p className="mt-1.5 text-[0.6875rem] text-white/70">{formatLongDate(now)}</p>
          </div>
        </div>

        <h1 className="admin-heading-serif mt-7 text-[1.625rem] leading-tight text-white">
          {greetingFor(now)}. Let&apos;s set up your{" "}
          <span className="text-gold-gradient">command center</span>.
        </h1>
        <p className="mt-2.5 max-w-[20rem] text-[0.8125rem] leading-relaxed text-white/80">
          I talk. You talk. I turn what you say into tasks, reminders, and memory — then I keep watch.
        </p>

        <Panel className="mt-7 p-5">
          <Eyebrow>Your profile</Eyebrow>

          <div className="mt-3.5">
            <label htmlFor="onboarding-name" className="mb-1.5 block text-[0.6875rem] text-white/70">
              What should I call you?
            </label>
            <input
              id="onboarding-name"
              name="name"
              autoFocus
              autoComplete="given-name"
              className="admin-input"
              placeholder="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") finish();
              }}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="onboarding-start"
                className="mb-1.5 block text-[0.6875rem] text-white/70"
              >
                Day starts
              </label>
              <input
                id="onboarding-start"
                name="workdayStart"
                type="number"
                min={0}
                max={23}
                className="admin-input tabular"
                value={startHour}
                onChange={(event) => setStartHour(clampHour(Number(event.target.value)))}
              />
            </div>
            <div>
              <label htmlFor="onboarding-end" className="mb-1.5 block text-[0.6875rem] text-white/70">
                Day ends
              </label>
              <input
                id="onboarding-end"
                name="workdayEnd"
                type="number"
                min={0}
                max={23}
                className="admin-input tabular"
                value={endHour}
                onChange={(event) => setEndHour(clampHour(Number(event.target.value)))}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1.5 text-[0.6875rem] text-white/70">
            <p className="flex items-center gap-2">
              <MapPin size={12} className="text-[color:var(--admin-gold)]" />
              {timezone ? `Timezone detected: ${timezone}` : "Detecting your timezone…"}
            </p>
            <p className="flex items-center gap-2">
              <Clock size={12} className="text-[color:var(--admin-gold)]" />
              I&apos;ll plan your day between these hours.
            </p>
          </div>
        </Panel>

        <button
          type="button"
          onClick={finish}
          disabled={!trimmed}
          className="admin-btn-gold mt-5 w-full disabled:opacity-40"
        >
          Start
          <ArrowRight size={16} />
        </button>

        <p className="mt-4 text-center text-[0.625rem] leading-relaxed text-white/55">
          Everything stays on this device until you turn on sync in settings.
        </p>
      </motion.div>
    </div>
  );
}

function clampHour(value: number): number {
  if (Number.isNaN(value)) return 9;
  return Math.min(23, Math.max(0, Math.round(value)));
}
