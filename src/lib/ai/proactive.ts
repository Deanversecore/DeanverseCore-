import type { AppData, Insight } from "@/lib/types";
import { format, isSameDay, relativeFromNow } from "@/lib/date";
import {
  activeReminders,
  completedToday,
  eventsOnDay,
  isRoutineDoneToday,
  nextEvent,
  openTasks,
  overdueTasks,
  remainingCapacityHours,
  routinesForDay,
  staleFollowUps,
  tasksDueToday,
  tasksDueWithin,
} from "@/lib/selectors";
import { pluralize } from "@/lib/ai/briefing";

/**
 * Signals the assistant raises on its own. Each insight is keyed by a stable id
 * so a dismissal sticks for the rest of the day rather than reappearing.
 */
export function buildInsights(data: AppData, now: Date): Insight[] {
  if (!data.profile.proactiveEnabled) return [];

  const insights: Insight[] = [];
  const dayKey = format(now, "yyyy-MM-dd");

  const carriedOver = overdueTasks(data, now).filter(
    (task) => task.dueAt && !isSameDay(new Date(task.dueAt), now),
  );
  if (carriedOver.length > 0) {
    insights.push({
      id: `carryover-${dayKey}-${carriedOver.length}`,
      tone: "urgent",
      title: `${pluralize(carriedOver.length, "unfinished task")} carried over`,
      body:
        carriedOver.length === 1
          ? `"${carriedOver[0].title}" was due ${relativeFromNow(carriedOver[0].dueAt!, now)} and is still open.`
          : `Oldest is "${carriedOver[0].title}". Clearing two of these would reset your week.`,
      actionLabel: "Reschedule these",
      actionPrompt: `Move ${carriedOver[0].title} to tomorrow`,
    });
  }

  const upcoming = nextEvent(data, now);
  if (upcoming) {
    const minutes = Math.round((new Date(upcoming.startAt).getTime() - now.getTime()) / 60000);
    if (minutes > 0 && minutes <= 60) {
      insights.push({
        id: `event-soon-${upcoming.id}`,
        tone: "attention",
        title: `${upcoming.title} in ${minutes} ${minutes === 1 ? "minute" : "minutes"}`,
        body: `${format(new Date(upcoming.startAt), "h:mm a")}${upcoming.location ? ` · ${upcoming.location}` : ""}. Wrap what you're doing now.`,
        actionLabel: "See my day",
        actionPrompt: "Plan my day",
      });
    }
  }

  const stale = staleFollowUps(data, now);
  if (stale.length > 0) {
    insights.push({
      id: `stale-followup-${stale[0].id}`,
      tone: "attention",
      title: `You haven't followed up with ${stale[0].person}`,
      body: `${stale[0].context} — open since ${relativeFromNow(stale[0].createdAt, now)}.`,
      actionLabel: "Show follow-ups",
      actionPrompt: "Who do I need to follow up with?",
    });
  }

  const events = eventsOnDay(data, now).filter((event) => new Date(event.startAt).getHours() >= 12);
  const capacity = remainingCapacityHours(data, now);
  if (events.length >= 3 && capacity < 2.5) {
    insights.push({
      id: `busy-afternoon-${dayKey}`,
      tone: "opportunity",
      title: "Your afternoon looks busy",
      body: `${pluralize(events.length, "event")} after noon leaves roughly ${capacity} ${capacity === 1 ? "hour" : "hours"} of open time. Want me to reorganize it?`,
      actionLabel: "Reorganize my day",
      actionPrompt: "Plan my day",
    });
  }

  const weekLoad = tasksDueWithin(data, now, 7);
  if (weekLoad.length >= 5) {
    insights.push({
      id: `week-load-${dayKey}-${weekLoad.length}`,
      tone: "opportunity",
      title: `${pluralize(weekLoad.length, "item")} due this week`,
      body: "That's a heavy week. I can spread it across your open days so nothing stacks up on one afternoon.",
      actionLabel: "Plan my week",
      actionPrompt: "Plan my week",
    });
  }

  const dueSoonReminders = activeReminders(data, now, 3);
  if (dueSoonReminders.length > 0) {
    insights.push({
      id: `reminder-${dueSoonReminders[0].id}`,
      tone: "attention",
      title: dueSoonReminders[0].title,
      body: `Reminder set for ${format(new Date(dueSoonReminders[0].remindAt), "h:mm a")}.`,
    });
  }

  const pendingRoutines = routinesForDay(data, now).filter((routine) => !isRoutineDoneToday(routine, now));
  const eveningRoutine = pendingRoutines.find((routine) => routine.timeOfDay === "evening");
  if (now.getHours() >= 18 && eveningRoutine && eveningRoutine.streak >= 3) {
    insights.push({
      id: `routine-${eveningRoutine.id}-${dayKey}`,
      tone: "opportunity",
      title: `Keep your ${eveningRoutine.streak}-day streak`,
      body: `"${eveningRoutine.title}" is still open for today.`,
    });
  }

  const done = completedToday(data, now);
  const remaining = tasksDueToday(data, now);
  if (done.length >= 3 && remaining.length === 0 && carriedOver.length === 0) {
    insights.push({
      id: `clear-${dayKey}`,
      tone: "positive",
      title: `${pluralize(done.length, "item")} closed out today`,
      body: "Nothing else is due. This is a good moment to pull one thing forward from tomorrow.",
      actionLabel: "What should I do next?",
      actionPrompt: "What should I do next?",
    });
  }

  if (insights.length === 0 && openTasks(data).length === 0) {
    insights.push({
      id: `empty-${dayKey}`,
      tone: "positive",
      title: "Everything is clear",
      body: "No open tasks, no overdue work. Tell me what's on your mind and I'll capture it.",
      actionLabel: "Plan my week",
      actionPrompt: "Plan my week",
    });
  }

  return insights.filter((insight) => !data.dismissedInsights.includes(insight.id)).slice(0, 4);
}
