import { emptyData } from "../src/lib/seed";
import type { AppData } from "../src/lib/types";
import { addDays, startOfDay } from "../src/lib/date";

function at(base: Date, dayOffset: number, hour: number, minute = 0): string {
  const date = new Date(startOfDay(addDays(base, dayOffset)));
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

/**
 * A workspace the assistant tests can reason about. It lives here rather than in
 * the app so nothing the app ships is invented.
 */
export function testWorkspace(now: Date): AppData {
  return {
    ...emptyData(),
    profile: {
      ...emptyData().profile,
      name: "Test",
      timezoneLabel: "UTC",
      onboardedAt: at(now, -30, 9),
    },
    tasks: [
      {
        id: "task_overdue",
        title: "Send Outlaw Tattoo the revised homepage mockups",
        done: false,
        dueAt: at(now, -1, 17),
        priority: "high",
        tags: ["client"],
        source: "manual",
        createdAt: at(now, -3, 9),
        updatedAt: at(now, -3, 9),
      },
      {
        id: "task_invoice",
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
        id: "task_case_study",
        title: "Write the case study for Artisan Coffee Co.",
        done: false,
        dueAt: at(now, 2, 12),
        priority: "normal",
        tags: ["marketing"],
        source: "manual",
        createdAt: at(now, -4, 14),
        updatedAt: at(now, -4, 14),
      },
    ],
    reminders: [
      {
        id: "rem_backup",
        title: "Back up the client project drive",
        remindAt: at(now, 1, 9),
        done: false,
        createdAt: at(now, -5, 12),
      },
    ],
    events: [
      {
        id: "evt_discovery",
        title: "Discovery call — new restaurant client",
        startAt: at(now, 0, 13),
        endAt: at(now, 0, 14),
        kind: "call",
        createdAt: at(now, -3, 10),
      },
    ],
    followUps: [
      {
        id: "fup_john",
        person: "John",
        context: "Phase two scope for SoCal Appliance",
        channel: "call",
        dueAt: at(now, 0, 14),
        done: false,
        createdAt: at(now, -9, 11),
      },
    ],
  };
}
