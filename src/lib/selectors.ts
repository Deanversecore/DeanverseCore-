import type { AppData, CalendarEvent, FollowUp, Priority, Reminder, Routine, Task } from "@/lib/types";
import { addDays, endOfDay, isSameDay, startOfDay } from "@/lib/date";

const PRIORITY_WEIGHT: Record<Priority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function openTasks(data: AppData): Task[] {
  return data.tasks.filter((task) => !task.done);
}

export function overdueTasks(data: AppData, now: Date): Task[] {
  return openTasks(data)
    .filter((task) => task.dueAt && new Date(task.dueAt).getTime() < startOfDay(now).getTime())
    .sort(byDue);
}

export function tasksDueToday(data: AppData, now: Date): Task[] {
  return openTasks(data)
    .filter((task) => task.dueAt && isSameDay(new Date(task.dueAt), now))
    .sort(byDue);
}

export function tasksDueWithin(data: AppData, now: Date, days: number): Task[] {
  const limit = endOfDay(addDays(now, days)).getTime();
  return openTasks(data)
    .filter((task) => task.dueAt && new Date(task.dueAt).getTime() <= limit)
    .sort(byDue);
}

export function completedToday(data: AppData, now: Date): Task[] {
  return data.tasks.filter((task) => task.done && task.completedAt && isSameDay(new Date(task.completedAt), now));
}

/**
 * The ordered shortlist the dashboard and the assistant both treat as
 * "today's priorities": overdue first, then due today, then high-signal work.
 */
export function todaysPriorities(data: AppData, now: Date, limit = 5): Task[] {
  const seen = new Set<string>();
  const ordered: Task[] = [];

  const push = (tasks: Task[]) => {
    for (const task of tasks) {
      if (seen.has(task.id)) continue;
      seen.add(task.id);
      ordered.push(task);
    }
  };

  push(overdueTasks(data, now));
  push(tasksDueToday(data, now));
  push(
    openTasks(data)
      .filter((task) => task.priority === "critical" || task.priority === "high")
      .sort(byPriority),
  );
  push(openTasks(data).sort(byPriority));

  return ordered.slice(0, limit);
}

export function eventsOnDay(data: AppData, day: Date): CalendarEvent[] {
  return data.events
    .filter((event) => isSameDay(new Date(event.startAt), day))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

export function upcomingEvents(data: AppData, now: Date, limit = 4): CalendarEvent[] {
  return data.events
    .filter((event) => new Date(event.endAt).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, limit);
}

export function nextEvent(data: AppData, now: Date): CalendarEvent | null {
  return upcomingEvents(data, now, 1)[0] ?? null;
}

export function activeReminders(data: AppData, now: Date, withinHours = 36): Reminder[] {
  const limit = now.getTime() + withinHours * 3600_000;
  return data.reminders
    .filter((reminder) => !reminder.done && new Date(reminder.remindAt).getTime() <= limit)
    .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());
}

export function dueReminders(data: AppData, now: Date): Reminder[] {
  return data.reminders
    .filter((reminder) => !reminder.done && new Date(reminder.remindAt).getTime() <= now.getTime())
    .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());
}

export function openFollowUps(data: AppData): FollowUp[] {
  return data.followUps
    .filter((followUp) => !followUp.done)
    .sort((a, b) => {
      const aTime = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
}

export function staleFollowUps(data: AppData, now: Date, days = 3): FollowUp[] {
  const threshold = now.getTime() - days * 86_400_000;
  return openFollowUps(data).filter((followUp) => new Date(followUp.createdAt).getTime() <= threshold);
}

export function routinesForDay(data: AppData, day: Date): Routine[] {
  const weekday = day.getDay();
  const order: Record<Routine["timeOfDay"], number> = { morning: 0, afternoon: 1, evening: 2 };
  return data.routines
    .filter((routine) => routine.days.includes(weekday))
    .sort((a, b) => order[a.timeOfDay] - order[b.timeOfDay]);
}

export function isRoutineDoneToday(routine: Routine, now: Date): boolean {
  return Boolean(routine.lastCompletedAt && isSameDay(new Date(routine.lastCompletedAt), now));
}

export function goalProgress(data: AppData, goalId: string): number {
  const goal = data.goals.find((item) => item.id === goalId);
  if (!goal || goal.milestones.length === 0) return 0;
  const done = goal.milestones.filter((milestone) => milestone.done).length;
  return Math.round((done / goal.milestones.length) * 100);
}

/** Free hours left in the workday — used for realistic capacity advice. */
export function remainingCapacityHours(data: AppData, now: Date): number {
  const endHour = data.profile.workdayEndHour;
  const endOfWork = new Date(now);
  endOfWork.setHours(endHour, 0, 0, 0);
  const rawHours = (endOfWork.getTime() - now.getTime()) / 3600_000;
  if (rawHours <= 0) return 0;

  const bookedMs = eventsOnDay(data, now)
    .filter((event) => new Date(event.endAt).getTime() > now.getTime())
    .reduce((total, event) => {
      const start = Math.max(new Date(event.startAt).getTime(), now.getTime());
      const end = Math.min(new Date(event.endAt).getTime(), endOfWork.getTime());
      return total + Math.max(0, end - start);
    }, 0);

  return Math.max(0, Math.round((rawHours - bookedMs / 3600_000) * 10) / 10);
}

export function byDue(a: Task, b: Task): number {
  const aTime = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const bTime = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  if (aTime !== bTime) return aTime - bTime;
  return byPriority(a, b);
}

export function byPriority(a: Task, b: Task): number {
  const delta = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  if (delta !== 0) return delta;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export function searchAll(data: AppData, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return { tasks: [], events: [], notes: [], memories: [], followUps: [], goals: [] };
  }
  const match = (...values: Array<string | undefined | null>) =>
    values.some((value) => value?.toLowerCase().includes(query));

  return {
    tasks: data.tasks.filter((task) => match(task.title, task.notes, task.tags.join(" "))),
    events: data.events.filter((event) => match(event.title, event.location, event.notes)),
    notes: data.notes.filter((note) => match(note.title, note.body, note.tags.join(" "))),
    memories: data.memories.filter((memory) => match(memory.content, memory.subject)),
    followUps: data.followUps.filter((followUp) => match(followUp.person, followUp.context)),
    goals: data.goals.filter((goal) => match(goal.title, goal.description)),
  };
}

export function findTaskByQuery(data: AppData, query: string): Task | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return null;
  const candidates = openTasks(data);
  return (
    candidates.find((task) => task.title.toLowerCase() === needle) ??
    candidates.find((task) => task.title.toLowerCase().includes(needle)) ??
    candidates.find((task) => needle.includes(task.title.toLowerCase())) ??
    candidates.find((task) =>
      needle
        .split(/\s+/)
        .filter((word) => word.length > 3)
        .some((word) => task.title.toLowerCase().includes(word)),
    ) ??
    null
  );
}
