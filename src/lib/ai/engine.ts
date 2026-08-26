import type {
  ActionReceipt,
  AppData,
  CalendarEvent,
  FollowUp,
  Goal,
  Memory,
  Note,
  Reminder,
  Task,
} from "@/lib/types";
import { createId } from "@/lib/id";
import { format, formatDayLabel, formatDueLabel, relativeFromNow } from "@/lib/date";
import {
  activeReminders,
  completedToday,
  eventsOnDay,
  findTaskByQuery,
  openFollowUps,
  openTasks,
  overdueTasks,
  searchAll,
  staleFollowUps,
  tasksDueToday,
  tasksDueWithin,
  todaysPriorities,
} from "@/lib/selectors";
import { buildDayPlan, buildWeekPlan, nextBestAction, pluralize } from "@/lib/ai/briefing";
import { interpret, type Intent } from "@/lib/ai/nlu";

export type Effect =
  | { op: "addTask"; payload: Task }
  | { op: "updateTask"; id: string; changes: Partial<Task> }
  | { op: "addReminder"; payload: Reminder }
  | { op: "updateReminder"; id: string; changes: Partial<Reminder> }
  | { op: "addEvent"; payload: CalendarEvent }
  | { op: "addNote"; payload: Note }
  | { op: "addMemory"; payload: Memory }
  | { op: "addGoal"; payload: Goal }
  | { op: "addFollowUp"; payload: FollowUp };

export interface AssistantResult {
  text: string;
  receipts: ActionReceipt[];
  suggestions: string[];
  effects: Effect[];
}

const DEFAULT_SUGGESTIONS = [
  "Plan my day",
  "What am I forgetting?",
  "Who do I need to follow up with?",
  "Summarize everything I need to know",
];

function result(partial: Partial<AssistantResult> & { text: string }): AssistantResult {
  return {
    receipts: [],
    suggestions: [],
    effects: [],
    ...partial,
  };
}

export function runIntent(intent: Intent, data: AppData, now: Date): AssistantResult {
  switch (intent.type) {
    case "greeting": {
      const priorities = todaysPriorities(data, now, 3);
      return result({
        text:
          priorities.length > 0
            ? `I'm here. You have ${pluralize(openTasks(data).length, "open item")} — the one I'd start with is "${priorities[0].title}".`
            : "I'm here. Your board is clear, so tell me what you'd like to line up.",
        suggestions: ["Plan my day", "What's important today?", "Create a task"],
      });
    }

    case "create_task": {
      const task: Task = {
        id: createId("task"),
        title: intent.title || "New task",
        done: false,
        dueAt: intent.dueAt,
        priority: intent.priority,
        tags: [],
        source: "ai",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      const due = formatDueLabel(task.dueAt);
      return result({
        text: due
          ? `Added "${task.title}" to your tasks for ${due.toLowerCase()}.`
          : `Added "${task.title}" to your tasks. Tell me when it's due and I'll schedule it.`,
        effects: [{ op: "addTask", payload: task }],
        receipts: [
          {
            kind: "task",
            verb: "created",
            id: task.id,
            label: task.title,
            detail: due ?? "No due date",
          },
        ],
        suggestions: due ? ["What should I do next?"] : ["Make it due tomorrow", "What should I do next?"],
      });
    }

    case "create_reminder": {
      const reminder: Reminder = {
        id: createId("rem"),
        title: intent.title,
        remindAt: intent.remindAt,
        done: false,
        createdAt: now.toISOString(),
      };
      return result({
        text: `I'll remind you to ${lowerFirst(intent.title)} — ${formatDueLabel(intent.remindAt)}.`,
        effects: [{ op: "addReminder", payload: reminder }],
        receipts: [
          {
            kind: "reminder",
            verb: "created",
            id: reminder.id,
            label: reminder.title,
            detail: formatDueLabel(reminder.remindAt) ?? undefined,
          },
        ],
        suggestions: ["Show my reminders", "What's important today?"],
      });
    }

    case "create_event": {
      const event: CalendarEvent = {
        id: createId("evt"),
        title: intent.title,
        startAt: intent.startAt,
        endAt: intent.endAt,
        kind: intent.kind,
        createdAt: now.toISOString(),
      };
      const conflicts = eventsOnDay(data, new Date(intent.startAt)).filter(
        (existing) =>
          new Date(existing.startAt).getTime() < new Date(intent.endAt).getTime() &&
          new Date(existing.endAt).getTime() > new Date(intent.startAt).getTime(),
      );
      const conflictNote =
        conflicts.length > 0
          ? ` Heads up — that overlaps ${conflicts[0].title}. Say "move ${intent.title} to tomorrow" if you'd rather shift it.`
          : "";
      return result({
        text: `Scheduled "${intent.title}" for ${formatDayLabel(intent.startAt)} at ${format(new Date(intent.startAt), "h:mm a")}.${conflictNote}`,
        effects: [{ op: "addEvent", payload: event }],
        receipts: [
          {
            kind: "event",
            verb: "created",
            id: event.id,
            label: event.title,
            detail: `${formatDayLabel(event.startAt)} · ${format(new Date(event.startAt), "h:mm a")}`,
          },
        ],
        suggestions: ["Plan my day", "What else is on my calendar?"],
      });
    }

    case "create_note": {
      const note: Note = {
        id: createId("note"),
        title: intent.title || "Note",
        body: intent.body,
        tags: [],
        pinned: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      return result({
        text: `Saved a note: "${note.title}".`,
        effects: [{ op: "addNote", payload: note }],
        receipts: [{ kind: "note", verb: "created", id: note.id, label: note.title }],
      });
    }

    case "remember": {
      const memory: Memory = {
        id: createId("mem"),
        content: intent.content,
        kind: intent.kind,
        subject: intent.subject,
        createdAt: now.toISOString(),
      };
      return result({
        text: `Got it — I'll remember that. ${intent.content}`,
        effects: [{ op: "addMemory", payload: memory }],
        receipts: [{ kind: "memory", verb: "created", id: memory.id, label: intent.content, detail: intent.kind }],
        suggestions: ["What do you know about my projects?"],
      });
    }

    case "create_goal": {
      const goal: Goal = {
        id: createId("goal"),
        title: intent.title,
        targetDate: intent.targetDate,
        milestones: [],
        createdAt: now.toISOString(),
      };
      return result({
        text: intent.targetDate
          ? `Tracking "${goal.title}" with a target of ${formatDayLabel(intent.targetDate)}. Add milestones and I'll keep them in your weekly plan.`
          : `Tracking "${goal.title}" as a goal. Give it a target date and I'll pace it for you.`,
        effects: [{ op: "addGoal", payload: goal }],
        receipts: [{ kind: "goal", verb: "created", id: goal.id, label: goal.title }],
      });
    }

    case "create_followup": {
      const followUp: FollowUp = {
        id: createId("fup"),
        person: intent.person,
        context: intent.context,
        channel: intent.channel,
        dueAt: intent.dueAt,
        done: false,
        createdAt: now.toISOString(),
      };
      return result({
        text: `Added a follow-up with ${followUp.person}${intent.dueAt ? ` for ${formatDayLabel(intent.dueAt).toLowerCase()}` : ""}. I'll surface it if it goes cold.`,
        effects: [{ op: "addFollowUp", payload: followUp }],
        receipts: [
          {
            kind: "followUp",
            verb: "created",
            id: followUp.id,
            label: followUp.person,
            detail: followUp.context,
          },
        ],
        suggestions: ["Who do I need to follow up with?"],
      });
    }

    case "complete_task": {
      const task = findTaskByQuery(data, intent.query);
      if (!task) {
        return result({
          text: `I couldn't find an open task matching "${intent.query}". Want me to create it and mark it done?`,
          suggestions: [`Create a task for ${intent.query}`],
        });
      }
      const remaining = openTasks(data).length - 1;
      return result({
        text: `Marked "${task.title}" as done. ${remaining === 0 ? "That clears your list." : `${pluralize(remaining, "item")} left.`}`,
        effects: [
          {
            op: "updateTask",
            id: task.id,
            changes: { done: true, completedAt: now.toISOString(), updatedAt: now.toISOString() },
          },
        ],
        receipts: [{ kind: "task", verb: "completed", id: task.id, label: task.title }],
        suggestions: ["What should I do next?"],
      });
    }

    case "reschedule": {
      const task = findTaskByQuery(data, intent.query);
      if (task) {
        return result({
          text: `Moved "${task.title}" to ${formatDueLabel(intent.newDate)?.toLowerCase()}.`,
          effects: [
            {
              op: "updateTask",
              id: task.id,
              changes: { dueAt: intent.newDate, updatedAt: now.toISOString() },
            },
          ],
          receipts: [
            {
              kind: "task",
              verb: "updated",
              id: task.id,
              label: task.title,
              detail: formatDueLabel(intent.newDate) ?? undefined,
            },
          ],
        });
      }

      const reminder = data.reminders.find(
        (item) => !item.done && item.title.toLowerCase().includes(intent.query.toLowerCase()),
      );
      if (reminder) {
        return result({
          text: `Moved your "${reminder.title}" reminder to ${formatDueLabel(intent.newDate)?.toLowerCase()}.`,
          effects: [{ op: "updateReminder", id: reminder.id, changes: { remindAt: intent.newDate } }],
          receipts: [
            {
              kind: "reminder",
              verb: "updated",
              id: reminder.id,
              label: reminder.title,
              detail: formatDueLabel(intent.newDate) ?? undefined,
            },
          ],
        });
      }

      return result({
        text: `I couldn't find "${intent.query}" to move. Try naming the task the way it's written on your list.`,
      });
    }

    case "plan_day":
      return result({
        text: buildDayPlan(data, now),
        suggestions: ["What should I do next?", "Move my first task to tomorrow"],
      });

    case "plan_week":
      return result({
        text: buildWeekPlan(data, now),
        suggestions: ["What's important today?", "Plan my day"],
      });

    case "whats_important": {
      const priorities = todaysPriorities(data, now, 3);
      const events = eventsOnDay(data, now).filter((event) => new Date(event.endAt).getTime() >= now.getTime());
      if (priorities.length === 0 && events.length === 0) {
        return result({
          text: "Nothing is fighting for your attention today. No overdue work, no deadlines, no meetings left.",
          suggestions: ["Plan my week", "Create a task"],
        });
      }
      const lines = ["Three things actually matter today."];
      priorities.forEach((task, index) => {
        const due = formatDueLabel(task.dueAt);
        lines.push(`${index + 1}. **${task.title}**${due ? ` — ${due.toLowerCase()}` : ""}`);
      });
      if (events.length > 0) {
        lines.push("");
        lines.push(`You also have ${pluralize(events.length, "event")} left, starting with ${events[0].title} at ${format(new Date(events[0].startAt), "h:mm a")}.`);
      }
      return result({ text: lines.join("\n"), suggestions: ["Plan my day", "What am I forgetting?"] });
    }

    case "forgetting": {
      const overdue = overdueTasks(data, now);
      const stale = staleFollowUps(data, now);
      const dueReminderList = activeReminders(data, now, 12);
      const noDueDate = openTasks(data).filter((task) => !task.dueAt);

      if (overdue.length === 0 && stale.length === 0 && dueReminderList.length === 0) {
        return result({
          text: "Nothing's slipping. Everything open has a date on it and no follow-up has gone cold.",
          suggestions: ["Plan my day"],
        });
      }

      const lines = ["Here's what's quietly slipping."];
      if (overdue.length > 0) {
        lines.push("");
        lines.push(`**Overdue** — ${pluralize(overdue.length, "item")}`);
        overdue.slice(0, 4).forEach((task) => {
          lines.push(`• ${task.title} (${formatDueLabel(task.dueAt)?.toLowerCase()})`);
        });
      }
      if (stale.length > 0) {
        lines.push("");
        lines.push("**Follow-ups going cold**");
        stale.slice(0, 3).forEach((followUp) => {
          lines.push(`• ${followUp.person} — ${followUp.context} (${relativeFromNow(followUp.createdAt, now)})`);
        });
      }
      if (dueReminderList.length > 0) {
        lines.push("");
        lines.push("**Reminders landing soon**");
        dueReminderList.slice(0, 3).forEach((reminder) => {
          lines.push(`• ${reminder.title} — ${formatDueLabel(reminder.remindAt)}`);
        });
      }
      if (noDueDate.length > 2) {
        lines.push("");
        lines.push(`${pluralize(noDueDate.length, "task")} have no due date at all, which is usually how things disappear.`);
      }
      return result({
        text: lines.join("\n"),
        suggestions: overdue.length > 0 ? [`Move ${overdue[0].title} to tomorrow`, "Plan my day"] : ["Plan my day"],
      });
    }

    case "next_action": {
      const action = nextBestAction(data, now);
      return result({
        text: `**${action.headline}**\n\n${action.reason}`,
        suggestions: action.task
          ? [`Mark ${action.task.title} as done`, `Move ${action.task.title} to tomorrow`]
          : ["Plan my day"],
      });
    }

    case "follow_ups": {
      const list = openFollowUps(data);
      if (list.length === 0) {
        return result({
          text: "No one is waiting on you. Every follow-up is closed out.",
          suggestions: ["Follow up with someone"],
        });
      }
      const lines = [`${pluralize(list.length, "person is", "people are")} waiting on you.`];
      list.slice(0, 6).forEach((followUp) => {
        const due = followUp.dueAt ? ` — ${formatDayLabel(followUp.dueAt).toLowerCase()}` : "";
        lines.push(`• **${followUp.person}** (${followUp.channel}) — ${followUp.context}${due}`);
      });
      const oldest = staleFollowUps(data, now)[0];
      if (oldest) {
        lines.push("");
        lines.push(`${oldest.person} has been waiting the longest — ${relativeFromNow(oldest.createdAt, now)}. I'd start there.`);
      }
      return result({ text: lines.join("\n"), suggestions: ["Plan my day", "What am I forgetting?"] });
    }

    case "summary": {
      const overdue = overdueTasks(data, now);
      const today = tasksDueToday(data, now);
      const week = tasksDueWithin(data, now, 7);
      const events = eventsOnDay(data, now);
      const followUps = openFollowUps(data);
      const done = completedToday(data, now);
      const reminders = activeReminders(data, now, 24);

      const lines = ["Full picture, nothing left out."];
      lines.push("");
      lines.push(`**Today** — ${pluralize(today.length, "task")} due, ${pluralize(events.length, "event")}, ${pluralize(done.length, "item")} already done.`);
      if (overdue.length > 0) lines.push(`**Overdue** — ${pluralize(overdue.length, "item")}, oldest is "${overdue[0].title}".`);
      lines.push(`**This week** — ${pluralize(week.length, "item")} with a deadline.`);
      if (reminders.length > 0) lines.push(`**Reminders** — ${pluralize(reminders.length, "reminder")} in the next 24 hours.`);
      if (followUps.length > 0) lines.push(`**People** — ${followUps.map((item) => item.person).slice(0, 4).join(", ")} waiting to hear from you.`);
      if (data.goals.length > 0) lines.push(`**Goals** — tracking ${data.goals.map((goal) => goal.title).slice(0, 3).join(", ")}.`);
      if (data.memories.length > 0) lines.push(`**Memory** — I'm holding ${pluralize(data.memories.length, "detail")} about you and your work.`);

      lines.push("");
      const action = nextBestAction(data, now);
      lines.push(`If you only do one thing: ${action.headline.toLowerCase()}.`);

      return result({ text: lines.join("\n"), suggestions: ["Plan my day", "Who do I need to follow up with?"] });
    }

    case "recall": {
      const query = intent.query.trim();
      const matches = query
        ? data.memories.filter((memory) => memory.content.toLowerCase().includes(query.toLowerCase()))
        : data.memories;
      if (matches.length === 0) {
        return result({
          text: query
            ? `I don't have anything stored about "${query}". Tell me and I'll remember it.`
            : "My memory is empty so far. Start with something like \"Remember that I prefer mornings for deep work.\"",
        });
      }
      const lines = [query ? `Here's what I know about "${query}".` : "Here's what I'm holding onto."];
      matches.slice(0, 6).forEach((memory) => lines.push(`• ${memory.content}`));
      return result({
        text: lines.join("\n"),
        receipts: matches.slice(0, 3).map((memory) => ({
          kind: "memory" as const,
          verb: "recalled" as const,
          id: memory.id,
          label: memory.content,
        })),
      });
    }

    case "search": {
      const found = searchAll(data, intent.query);
      const total =
        found.tasks.length + found.events.length + found.notes.length + found.memories.length + found.followUps.length;
      if (total === 0) {
        return result({ text: `Nothing matches "${intent.query}" anywhere in your workspace.` });
      }
      const lines = [`${pluralize(total, "match")} for "${intent.query}".`];
      if (found.tasks.length) {
        lines.push("");
        lines.push("**Tasks**");
        found.tasks.slice(0, 4).forEach((task) => lines.push(`• ${task.title}${task.done ? " (done)" : ""}`));
      }
      if (found.events.length) {
        lines.push("");
        lines.push("**Calendar**");
        found.events.slice(0, 3).forEach((event) => lines.push(`• ${event.title} — ${formatDayLabel(event.startAt)}`));
      }
      if (found.notes.length) {
        lines.push("");
        lines.push("**Notes**");
        found.notes.slice(0, 3).forEach((note) => lines.push(`• ${note.title}`));
      }
      if (found.memories.length) {
        lines.push("");
        lines.push("**Memory**");
        found.memories.slice(0, 3).forEach((memory) => lines.push(`• ${memory.content}`));
      }
      if (found.followUps.length) {
        lines.push("");
        lines.push("**Follow-ups**");
        found.followUps.slice(0, 3).forEach((item) => lines.push(`• ${item.person} — ${item.context}`));
      }
      return result({ text: lines.join("\n") });
    }

    case "unknown":
    default:
      return result({
        text: "I didn't catch a clear action in that. I'm strongest when you tell me what to capture or what to figure out — try one of these.",
        suggestions: DEFAULT_SUGGESTIONS,
      });
  }
}

export function respond(input: string, data: AppData, now: Date = new Date()): AssistantResult {
  const outcome = runIntent(interpret(input, now), data, now);
  return {
    ...outcome,
    suggestions: outcome.suggestions.length > 0 ? outcome.suggestions : DEFAULT_SUGGESTIONS.slice(0, 3),
  };
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

export { DEFAULT_SUGGESTIONS };
