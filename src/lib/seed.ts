import type { AppData } from "@/lib/types";
import { createId } from "@/lib/id";
import { addDays, startOfDay } from "@/lib/date";

function at(base: Date, dayOffset: number, hour: number, minute = 0): string {
  const date = new Date(startOfDay(addDays(base, dayOffset)));
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export const DEFAULT_PROFILE: AppData["profile"] = {
  name: "Andrey",
  timezoneLabel: "St. George, UT",
  workdayStartHour: 8,
  workdayEndHour: 18,
  proactiveEnabled: true,
  voiceEnabled: true,
  hapticsEnabled: true,
};

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

/**
 * A realistic starting workspace so the dashboard and the assistant have
 * something to reason about on first launch.
 */
export function seedData(now: Date = new Date()): AppData {
  const nowIso = now.toISOString();

  return {
    profile: { ...DEFAULT_PROFILE },
    tasks: [
      {
        id: createId("task"),
        title: "Send Outlaw Tattoo the revised homepage mockups",
        notes: "Second round — they asked for a darker hero and larger gallery tiles.",
        done: false,
        dueAt: at(now, -1, 17),
        priority: "high",
        tags: ["client", "design"],
        source: "manual",
        createdAt: at(now, -3, 9),
        updatedAt: at(now, -3, 9),
      },
      {
        id: createId("task"),
        title: "Invoice SoCal Appliance for phase two",
        done: false,
        dueAt: at(now, 0, 16),
        priority: "critical",
        tags: ["finance"],
        source: "manual",
        createdAt: at(now, -2, 11),
        updatedAt: at(now, -2, 11),
      },
      {
        id: createId("task"),
        title: "Write the case study for Artisan Coffee Co.",
        notes: "Lead with the subscription flow and the 34% lift in repeat orders.",
        done: false,
        dueAt: at(now, 2, 12),
        priority: "normal",
        tags: ["marketing"],
        source: "manual",
        createdAt: at(now, -4, 14),
        updatedAt: at(now, -4, 14),
      },
      {
        id: createId("task"),
        title: "Audit Lighthouse scores across live client sites",
        done: false,
        dueAt: at(now, 4, 10),
        priority: "normal",
        tags: ["performance"],
        source: "manual",
        createdAt: at(now, -1, 8),
        updatedAt: at(now, -1, 8),
      },
      {
        id: createId("task"),
        title: "Renew the St. George business license",
        done: false,
        dueAt: at(now, 6, 9),
        priority: "high",
        tags: ["admin"],
        source: "manual",
        createdAt: at(now, -6, 10),
        updatedAt: at(now, -6, 10),
      },
      {
        id: createId("task"),
        title: "Refresh the portfolio page with two new projects",
        done: false,
        dueAt: null,
        priority: "low",
        tags: ["website"],
        source: "manual",
        createdAt: at(now, -8, 15),
        updatedAt: at(now, -8, 15),
      },
      {
        id: createId("task"),
        title: "Clear the client inbox",
        done: true,
        completedAt: at(now, 0, 8, 40),
        dueAt: at(now, 0, 9),
        priority: "normal",
        tags: ["admin"],
        source: "manual",
        createdAt: at(now, -1, 18),
        updatedAt: at(now, 0, 8, 40),
      },
    ],
    reminders: [
      {
        id: createId("rem"),
        title: "Call the accountant about the quarterly filing",
        remindAt: at(now, 0, 15, 30),
        done: false,
        createdAt: at(now, -2, 9),
      },
      {
        id: createId("rem"),
        title: "Back up the client project drive",
        remindAt: at(now, 1, 9),
        done: false,
        createdAt: at(now, -5, 12),
      },
    ],
    events: [
      {
        id: createId("evt"),
        title: "Discovery call — new restaurant client",
        startAt: at(now, 0, 13),
        endAt: at(now, 0, 14),
        kind: "call",
        location: "Google Meet",
        createdAt: at(now, -3, 10),
      },
      {
        id: createId("evt"),
        title: "Design review with Outlaw Tattoo",
        startAt: at(now, 0, 15),
        endAt: at(now, 0, 16),
        kind: "meeting",
        location: "Zoom",
        createdAt: at(now, -3, 10),
      },
      {
        id: createId("evt"),
        title: "Deep work — Artisan Coffee checkout rebuild",
        startAt: at(now, 1, 9),
        endAt: at(now, 1, 12),
        kind: "focus",
        createdAt: at(now, -2, 16),
      },
      {
        id: createId("evt"),
        title: "Coffee with a referral partner",
        startAt: at(now, 2, 10),
        endAt: at(now, 2, 11),
        kind: "personal",
        location: "Feel Love Coffee",
        createdAt: at(now, -1, 13),
      },
    ],
    notes: [
      {
        id: createId("note"),
        title: "Positioning ideas for DeanVerse",
        body:
          "Lean harder on speed and craft. Every proposal should open with the outcome, not the deliverable. Add a one-line performance guarantee to the pricing page.",
        tags: ["strategy"],
        pinned: true,
        createdAt: at(now, -4, 20),
        updatedAt: at(now, -4, 20),
      },
      {
        id: createId("note"),
        title: "Outlaw Tattoo — feedback from round one",
        body: "Darker hero. Bigger gallery tiles. Keep the booking CTA sticky on mobile.",
        tags: ["client"],
        pinned: false,
        createdAt: at(now, -3, 17),
        updatedAt: at(now, -3, 17),
      },
    ],
    memories: [
      {
        id: createId("mem"),
        content: "I do my best deep work between 8am and 11am, so protect that block.",
        kind: "preference",
        createdAt: at(now, -12, 9),
      },
      {
        id: createId("mem"),
        content: "Artisan Coffee's checkout rebuild is due Friday.",
        kind: "project",
        subject: "Artisan Coffee Co.",
        createdAt: at(now, -2, 10),
      },
      {
        id: createId("mem"),
        content: "John from SoCal Appliance prefers a phone call over email.",
        kind: "person",
        subject: "John",
        createdAt: at(now, -7, 16),
      },
    ],
    goals: [
      {
        id: createId("goal"),
        title: "Ship five client sites this quarter",
        description: "Three delivered, two in build.",
        targetDate: at(now, 45, 17),
        milestones: [
          { id: createId("ms"), title: "Outlaw Tattoo launch", done: true },
          { id: createId("ms"), title: "SoCal Appliance launch", done: true },
          { id: createId("ms"), title: "Artisan Coffee launch", done: true },
          { id: createId("ms"), title: "Restaurant client build", done: false },
          { id: createId("ms"), title: "Portfolio refresh", done: false },
        ],
        createdAt: at(now, -30, 9),
      },
      {
        id: createId("goal"),
        title: "Publish one case study a month",
        targetDate: at(now, 20, 17),
        milestones: [
          { id: createId("ms"), title: "Outlaw Tattoo write-up", done: true },
          { id: createId("ms"), title: "Artisan Coffee write-up", done: false },
        ],
        createdAt: at(now, -20, 9),
      },
    ],
    routines: [
      {
        id: createId("rtn"),
        title: "Review the day's three priorities",
        timeOfDay: "morning",
        days: [1, 2, 3, 4, 5],
        streak: 12,
        lastCompletedAt: at(now, 0, 7, 45),
        createdAt: at(now, -40, 7),
      },
      {
        id: createId("rtn"),
        title: "Inbox to zero",
        timeOfDay: "afternoon",
        days: [1, 2, 3, 4, 5],
        streak: 5,
        lastCompletedAt: at(now, -1, 16),
        createdAt: at(now, -40, 7),
      },
      {
        id: createId("rtn"),
        title: "Shut the laptop and plan tomorrow",
        timeOfDay: "evening",
        days: [0, 1, 2, 3, 4, 5, 6],
        streak: 8,
        lastCompletedAt: at(now, -1, 20),
        createdAt: at(now, -40, 7),
      },
    ],
    followUps: [
      {
        id: createId("fup"),
        person: "John",
        context: "Phase two scope for SoCal Appliance",
        channel: "call",
        dueAt: at(now, 0, 14),
        done: false,
        createdAt: at(now, -5, 11),
      },
      {
        id: createId("fup"),
        person: "Maria",
        context: "Waiting on brand assets for the restaurant build",
        channel: "email",
        dueAt: at(now, 1, 10),
        done: false,
        createdAt: at(now, -2, 9),
      },
      {
        id: createId("fup"),
        person: "Devin",
        context: "Referral introduction he offered to make",
        channel: "message",
        dueAt: null,
        done: false,
        createdAt: at(now, -9, 15),
      },
    ],
    messages: [
      {
        id: createId("msg"),
        role: "assistant",
        content:
          "I'm your DeanVerse command center. I keep your tasks, calendar, follow-ups, and notes in one place — and I'll flag what's slipping before it becomes a problem.\n\nTalk to me the way you'd talk to an assistant.",
        createdAt: nowIso,
        suggestions: ["Plan my day", "What am I forgetting?", "Summarize everything I need to know"],
      },
    ],
    dismissedInsights: [],
  };
}
