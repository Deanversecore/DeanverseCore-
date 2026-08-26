import type { AppData } from "@/lib/types";

/**
 * The starting profile carries no identity of its own — onboarding fills in the
 * name and timezone from the person actually using the app.
 */
export const DEFAULT_PROFILE: AppData["profile"] = {
  name: "",
  timezoneLabel: "",
  workdayStartHour: 8,
  workdayEndHour: 18,
  proactiveEnabled: true,
  voiceEnabled: true,
  spokenRepliesEnabled: true,
  handsFreeEnabled: false,
  voiceURI: null,
  hapticsEnabled: true,
  onboardedAt: null,
};

/** Resolves the device's own timezone; used during onboarding. */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

export function emptyData(): AppData {
  return {
    profile: { ...DEFAULT_PROFILE },
    tasks: [],
    reminders: [],
    events: [],
    notes: [],
    memories: [],
    goals: [],
    routines: [],
    followUps: [],
    messages: [],
    dismissedInsights: [],
  };
}
