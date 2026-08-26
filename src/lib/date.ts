import {
  addDays,
  addHours,
  addMinutes,
  addWeeks,
  endOfDay,
  format,
  isSameDay,
  isToday,
  isTomorrow,
  isYesterday,
  setHours,
  setMinutes,
  startOfDay,
  startOfWeek,
} from "date-fns";

export const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export function iso(date: Date): string {
  return date.toISOString();
}

export function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good evening";
}

export function formatClock(date: Date): string {
  return format(date, "h:mm a");
}

export function formatLongDate(date: Date): string {
  return format(date, "EEEE, MMMM d");
}

export function formatDayLabel(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE, MMM d");
}

export function formatDueLabel(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  const day = formatDayLabel(date);
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  return hasTime ? `${day} · ${format(date, "h:mm a")}` : day;
}

export function formatTimeRange(startAt: string, endAt: string): string {
  return `${format(new Date(startAt), "h:mm a")} – ${format(new Date(endAt), "h:mm a")}`;
}

export function isOverdue(value?: string | null, now: Date = new Date()): boolean {
  if (!value) return false;
  return new Date(value).getTime() < now.getTime();
}

export function isDueToday(value?: string | null, now: Date = new Date()): boolean {
  if (!value) return false;
  return isSameDay(new Date(value), now);
}

export function withinNextDays(
  value: string | null | undefined,
  days: number,
  now: Date = new Date(),
): boolean {
  if (!value) return false;
  const t = new Date(value).getTime();
  return t >= startOfDay(now).getTime() && t <= endOfDay(addDays(now, days)).getTime();
}

export function relativeFromNow(value: string, now: Date = new Date()): string {
  const diffMs = new Date(value).getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const minutes = Math.round(abs / 60000);
  const suffix = diffMs >= 0 ? "" : " ago";
  const prefix = diffMs >= 0 ? "in " : "";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${prefix}${minutes}m${suffix}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${prefix}${hours}h${suffix}`;
  const days = Math.round(hours / 24);
  return `${prefix}${days}d${suffix}`;
}

interface ParsedDate {
  date: Date;
  /** The substring that produced the date, so callers can strip it from titles. */
  matched: string;
  hasExplicitTime: boolean;
}

const TIME_PATTERN =
  /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\bat\s+(\d{1,2})(?::(\d{2}))\b/i;

function applyTime(base: Date, text: string): { date: Date; matched: string; found: boolean } {
  const match = TIME_PATTERN.exec(text);
  if (!match) return { date: base, matched: "", found: false };

  let hour: number;
  let minute: number;

  if (match[1]) {
    hour = parseInt(match[1], 10);
    minute = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3].toLowerCase();
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
  } else {
    hour = parseInt(match[4], 10);
    minute = parseInt(match[5], 10);
  }

  return {
    date: setMinutes(setHours(base, hour), minute),
    matched: match[0],
    found: true,
  };
}

/**
 * Extracts a date/time from free-form text such as
 * "tomorrow at 3pm", "next friday", "in 2 hours", "tonight".
 */
export function parseNaturalDate(input: string, now: Date = new Date()): ParsedDate | null {
  const text = input.toLowerCase();

  const relative = /\bin\s+(\d+)\s*(minute|min|hour|hr|day|week|month)s?\b/.exec(text);
  if (relative) {
    const amount = parseInt(relative[1], 10);
    const unit = relative[2];
    let date = now;
    if (unit.startsWith("min")) date = addMinutes(now, amount);
    else if (unit.startsWith("h")) date = addHours(now, amount);
    else if (unit.startsWith("d")) date = addDays(now, amount);
    else if (unit.startsWith("w")) date = addWeeks(now, amount);
    else date = addDays(now, amount * 30);
    return { date, matched: relative[0], hasExplicitTime: true };
  }

  const anchors: Array<{ pattern: RegExp; resolve: () => Date; defaultHour: number }> = [
    { pattern: /\bthe day after tomorrow\b/, resolve: () => addDays(now, 2), defaultHour: 9 },
    { pattern: /\btomorrow morning\b/, resolve: () => addDays(now, 1), defaultHour: 8 },
    { pattern: /\btomorrow afternoon\b/, resolve: () => addDays(now, 1), defaultHour: 14 },
    { pattern: /\btomorrow evening\b|\btomorrow night\b/, resolve: () => addDays(now, 1), defaultHour: 19 },
    { pattern: /\btomorrow\b/, resolve: () => addDays(now, 1), defaultHour: 9 },
    { pattern: /\btonight\b/, resolve: () => now, defaultHour: 20 },
    { pattern: /\bthis morning\b/, resolve: () => now, defaultHour: 9 },
    { pattern: /\bthis afternoon\b/, resolve: () => now, defaultHour: 14 },
    { pattern: /\bthis evening\b/, resolve: () => now, defaultHour: 19 },
    { pattern: /\blater today\b|\btoday\b/, resolve: () => now, defaultHour: 17 },
    { pattern: /\bnext week\b/, resolve: () => addWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1), defaultHour: 9 },
    { pattern: /\bthis weekend\b/, resolve: () => nextWeekday(now, 6), defaultHour: 10 },
    { pattern: /\bend of (?:the )?week\b/, resolve: () => nextWeekday(now, 5), defaultHour: 17 },
    { pattern: /\bnext month\b/, resolve: () => addDays(now, 30), defaultHour: 9 },
  ];

  for (const anchor of anchors) {
    const match = anchor.pattern.exec(text);
    if (!match) continue;
    const base = startOfDay(anchor.resolve());
    const timed = applyTime(base, text);
    return {
      date: timed.found ? timed.date : setHours(base, anchor.defaultHour),
      matched: `${match[0]}${timed.matched ? ` ${timed.matched}` : ""}`,
      hasExplicitTime: timed.found,
    };
  }

  const weekdayMatch = new RegExp(`\\b(next\\s+|this\\s+|on\\s+)?(${WEEKDAYS.join("|")})\\b`).exec(text);
  if (weekdayMatch) {
    const index = WEEKDAYS.indexOf(weekdayMatch[2] as (typeof WEEKDAYS)[number]);
    const forceNextWeek = weekdayMatch[1]?.trim() === "next";
    const base = startOfDay(nextWeekday(now, index, forceNextWeek));
    const timed = applyTime(base, text);
    return {
      date: timed.found ? timed.date : setHours(base, 9),
      matched: `${weekdayMatch[0]}${timed.matched ? ` ${timed.matched}` : ""}`,
      hasExplicitTime: timed.found,
    };
  }

  const timeOnly = applyTime(startOfDay(now), text);
  if (timeOnly.found) {
    const candidate = timeOnly.date;
    const date = candidate.getTime() < now.getTime() ? addDays(candidate, 1) : candidate;
    return { date, matched: timeOnly.matched, hasExplicitTime: true };
  }

  return null;
}

function nextWeekday(now: Date, weekday: number, forceNextWeek = false): Date {
  const current = now.getDay();
  let delta = (weekday - current + 7) % 7;
  if (delta === 0) delta = 7;
  if (forceNextWeek && delta < 7) delta += 0;
  return addDays(now, delta);
}

export { addDays, addMinutes, endOfDay, format, isSameDay, isToday, startOfDay, startOfWeek };
