import type { AppData, Task } from "@/lib/types";
import { addDays, endOfDay, format, formatDueLabel, startOfDay } from "@/lib/date";
import {
  completedToday,
  eventsOnDay,
  nextEvent,
  openFollowUps,
  openTasks,
  overdueTasks,
  remainingCapacityHours,
  routinesForDay,
  tasksDueToday,
  tasksDueWithin,
  todaysPriorities,
} from "@/lib/selectors";

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function joinNaturally(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export interface DailyBriefing {
  headline: string;
  body: string;
  stats: Array<{ label: string; value: string }>;
}

export function buildDailyBriefing(data: AppData, now: Date): DailyBriefing {
  const overdue = overdueTasks(data, now);
  const dueToday = tasksDueToday(data, now);
  const events = eventsOnDay(data, now).filter((event) => new Date(event.endAt).getTime() >= now.getTime());
  const followUps = openFollowUps(data);
  const capacity = remainingCapacityHours(data, now);
  const done = completedToday(data, now);

  const load = overdue.length + dueToday.length + events.length;
  let headline: string;
  if (load === 0) {
    headline = "Your day is clear.";
  } else if (overdue.length > 0) {
    headline = `${pluralize(overdue.length, "item")} slipped — start there.`;
  } else if (events.length >= 3) {
    headline = "Meeting-heavy day. Protect your focus blocks.";
  } else if (load >= 5) {
    headline = "Full day ahead, but it's manageable.";
  } else {
    headline = "Light day. Good time to get ahead.";
  }

  const fragments: string[] = [];
  if (dueToday.length > 0) fragments.push(`${pluralize(dueToday.length, "task")} due today`);
  if (overdue.length > 0) fragments.push(`${pluralize(overdue.length, "overdue item")}`);
  if (events.length > 0) fragments.push(`${pluralize(events.length, "event")} still on the calendar`);
  if (followUps.length > 0) fragments.push(`${pluralize(followUps.length, "open follow-up")}`);

  const upcoming = nextEvent(data, now);
  const sentences: string[] = [];

  sentences.push(
    fragments.length > 0
      ? `You have ${joinNaturally(fragments)}.`
      : "Nothing is scheduled and nothing is due — the day is yours to shape.",
  );

  if (upcoming) {
    sentences.push(`Next up is ${upcoming.title} at ${format(new Date(upcoming.startAt), "h:mm a")}.`);
  }

  if (capacity > 0 && (dueToday.length > 0 || overdue.length > 0)) {
    sentences.push(
      `You have about ${capacity} focused ${capacity === 1 ? "hour" : "hours"} left before your day wraps.`,
    );
  }

  if (done.length > 0) {
    sentences.push(`You've already closed out ${pluralize(done.length, "item")} today.`);
  }

  return {
    headline,
    body: sentences.join(" "),
    stats: [
      { label: "Due today", value: String(dueToday.length) },
      { label: "Overdue", value: String(overdue.length) },
      { label: "Events", value: String(eventsOnDay(data, now).length) },
      { label: "Done", value: String(done.length) },
    ],
  };
}

export interface NextBestAction {
  task: Task | null;
  reason: string;
  headline: string;
}

export function nextBestAction(data: AppData, now: Date): NextBestAction {
  const upcoming = nextEvent(data, now);
  const minutesToEvent = upcoming
    ? Math.round((new Date(upcoming.startAt).getTime() - now.getTime()) / 60000)
    : Number.MAX_SAFE_INTEGER;

  if (upcoming && minutesToEvent > 0 && minutesToEvent <= 20) {
    return {
      task: null,
      headline: `Head into ${upcoming.title}`,
      reason: `It starts in ${minutesToEvent} ${minutesToEvent === 1 ? "minute" : "minutes"}. Not enough runway for deep work.`,
    };
  }

  const overdue = overdueTasks(data, now);
  if (overdue.length > 0) {
    return {
      task: overdue[0],
      headline: overdue[0].title,
      reason: `This was due ${formatDueLabel(overdue[0].dueAt)?.toLowerCase()} and it's the oldest thing still open.`,
    };
  }

  const priorities = todaysPriorities(data, now, 1);
  if (priorities.length > 0) {
    const task = priorities[0];
    const window = minutesToEvent < 120 ? ` You have roughly ${minutesToEvent} minutes before your next commitment.` : "";
    return {
      task,
      headline: task.title,
      reason: task.dueAt
        ? `Due ${formatDueLabel(task.dueAt)?.toLowerCase()}, and it's your highest-signal item right now.${window}`
        : `It's your highest-priority open item.${window}`,
    };
  }

  const followUp = openFollowUps(data)[0];
  if (followUp) {
    return {
      task: null,
      headline: `Reach out to ${followUp.person}`,
      reason: `${followUp.context} is still waiting on you.`,
    };
  }

  const routine = routinesForDay(data, now).find(
    (item) => !item.lastCompletedAt || new Date(item.lastCompletedAt).toDateString() !== now.toDateString(),
  );
  if (routine) {
    return {
      task: null,
      headline: routine.title,
      reason: `It's part of your ${routine.timeOfDay} routine and you're on a ${routine.streak}-day streak.`,
    };
  }

  return {
    task: null,
    headline: "Take the win",
    reason: "Nothing is overdue, nothing is due today, and your calendar is clear.",
  };
}

export function buildDayPlan(data: AppData, now: Date): string {
  const events = eventsOnDay(data, now);
  const priorities = todaysPriorities(data, now, 4);
  const capacity = remainingCapacityHours(data, now);
  const parts: string[] = [`Here's how I'd run ${format(now, "EEEE")}.`];

  if (events.length > 0) {
    parts.push(
      `Fixed points on the calendar: ${joinNaturally(events.map((event) => `${event.title} at ${format(new Date(event.startAt), "h:mm a")}`))}.`,
    );
  }

  if (priorities.length > 0) {
    parts.push(
      `I'd work the list in this order: ${joinNaturally(priorities.map((task) => task.title))}.`,
    );
  }

  const routines = routinesForDay(data, now).filter(
    (routine) => !routine.lastCompletedAt || new Date(routine.lastCompletedAt).toDateString() !== now.toDateString(),
  );
  if (routines.length > 0) {
    parts.push(`Don't drop your routines — ${joinNaturally(routines.map((routine) => routine.title))}.`);
  }

  if (priorities.length === 0 && events.length === 0) {
    parts.push("Honestly, there's nothing pressing. Use the space for something that compounds.");
  } else if (capacity > 0) {
    parts.push(
      `You have roughly ${capacity} ${capacity === 1 ? "hour" : "hours"} of open time left. Front-load the first two items while you still have momentum.`,
    );
  } else {
    parts.push("Your workday window is nearly closed — pick one item and let the rest roll to tomorrow.");
  }

  return parts.join(" ");
}

export function buildWeekPlan(data: AppData, now: Date): string {
  const parts: string[] = ["Here's the shape of your week."];

  for (let offset = 0; offset < 7; offset += 1) {
    const day = addDays(now, offset);
    const dayEvents = eventsOnDay(data, day);
    const dayTasks = openTasks(data).filter(
      (task) =>
        task.dueAt &&
        new Date(task.dueAt).getTime() >= startOfDay(day).getTime() &&
        new Date(task.dueAt).getTime() <= endOfDay(day).getTime(),
    );

    if (dayEvents.length === 0 && dayTasks.length === 0) continue;

    const label = offset === 0 ? "Today" : format(day, "EEEE");
    const load: string[] = [];
    if (dayEvents.length > 0) {
      load.push(
        joinNaturally(dayEvents.slice(0, 3).map((event) => `${event.title} at ${format(new Date(event.startAt), "h:mm a")}`)),
      );
    }
    if (dayTasks.length > 0) {
      load.push(joinNaturally(dayTasks.slice(0, 3).map((task) => task.title)));
    }
    parts.push(`${label}: ${load.join("; ")}.`);
  }

  const weekTasks = tasksDueWithin(data, now, 7);
  const heaviest = findHeaviestDay(data, now);

  if (weekTasks.length === 0) {
    parts.push("Nothing is due this week. If you want, I can pull work forward from your goals.");
  } else {
    parts.push(
      `${pluralize(weekTasks.length, "item")} land this week${heaviest ? `, and ${heaviest} is your heaviest day` : ""}. Move one thing off it now and the rest of the week gets easier.`,
    );
  }

  return parts.join(" ");
}

function findHeaviestDay(data: AppData, now: Date): string | null {
  let best: { label: string; load: number } | null = null;
  for (let offset = 0; offset < 7; offset += 1) {
    const day = addDays(now, offset);
    const load =
      eventsOnDay(data, day).length +
      openTasks(data).filter(
        (task) =>
          task.dueAt &&
          new Date(task.dueAt).getTime() >= startOfDay(day).getTime() &&
          new Date(task.dueAt).getTime() <= endOfDay(day).getTime(),
      ).length;
    if (load > 0 && (!best || load > best.load)) {
      best = { label: offset === 0 ? "today" : format(day, "EEEE"), load };
    }
  }
  return best?.label ?? null;
}

export { joinNaturally, pluralize };
