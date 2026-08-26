type HapticPattern = "tap" | "select" | "success" | "warning";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 8,
  select: 12,
  success: [10, 40, 18],
  warning: [16, 60, 16],
};

let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

/** No-ops silently on devices without a vibration motor. */
export function haptic(pattern: HapticPattern = "tap") {
  if (!enabled) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    /* vibration is a nicety, never a failure path */
  }
}
