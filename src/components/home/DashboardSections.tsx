"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Mic,
  NotebookPen,
  Repeat,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import type { AppData } from "@/lib/types";
import { EmptyState, Eyebrow, Panel, SectionHeader, cx } from "@/components/ui/Primitives";
import { TaskRow } from "@/components/tasks/TaskRow";
import { EventRow } from "@/components/calendar/EventRow";
import {
  activeReminders,
  isRoutineDoneToday,
  openFollowUps,
  routinesForDay,
  todaysPriorities,
  upcomingEvents,
} from "@/lib/selectors";
import { formatDayLabel, formatDueLabel } from "@/lib/date";
import { useStore } from "@/lib/store";
import { haptic } from "@/lib/haptics";

/* ---------------------------------------------------------- Priorities */

export function PrioritiesSection({ data, now }: { data: AppData; now: Date }) {
  const toggleTask = useStore((state) => state.toggleTask);
  const priorities = todaysPriorities(data, now, 4);

  return (
    <section aria-label="Today's priorities">
      <SectionHeader
        eyebrow="Focus"
        title="Today's priorities"
        action={
          <Link href="/tasks" className="flex items-center gap-1 text-[0.6875rem] font-semibold text-white/45">
            All tasks
            <ArrowRight size={12} />
          </Link>
        }
        className="mb-3 px-1"
      />

      {priorities.length === 0 ? (
        <Panel variant="flat" className="py-2">
          <EmptyState
            compact
            icon={<CheckCircle2 size={22} />}
            title="Nothing outstanding"
            body="No overdue work and nothing due today. Ask the assistant to pull something forward from your goals."
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-2">
          {priorities.map((task) => (
            <TaskRow key={task.id} task={task} now={now} onToggle={toggleTask} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------ Schedule */

export function ScheduleSection({ data, now }: { data: AppData; now: Date }) {
  const events = upcomingEvents(data, now, 3);

  return (
    <section aria-label="Upcoming events">
      <SectionHeader
        eyebrow="Schedule"
        title="What's coming up"
        action={
          <Link href="/calendar" className="flex items-center gap-1 text-[0.6875rem] font-semibold text-white/45">
            Calendar
            <ArrowRight size={12} />
          </Link>
        }
        className="mb-3 px-1"
      />

      {events.length === 0 ? (
        <Panel variant="flat" className="py-2">
          <EmptyState
            compact
            icon={<CalendarPlus size={22} />}
            title="Your calendar is open"
            body="Nothing scheduled ahead. Say “schedule a call tomorrow at 2pm” and I'll add it."
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((event) => (
            <EventRow key={event.id} event={event} now={now} showDate />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------- Signals */

export function RemindersSection({ data, now }: { data: AppData; now: Date }) {
  const toggleReminder = useStore((state) => state.toggleReminder);
  const reminders = activeReminders(data, now, 48).slice(0, 3);

  if (reminders.length === 0) return null;

  return (
    <section aria-label="Reminders">
      <SectionHeader eyebrow="Reminders" title="Don't let these pass" className="mb-3 px-1" />
      <div className="flex flex-col gap-2">
        {reminders.map((reminder) => {
          const due = new Date(reminder.remindAt).getTime() <= now.getTime();
          return (
            <motion.div
              key={reminder.id}
              layout
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              className="admin-tool-card flex items-center gap-3 px-4 py-3"
              style={
                due ? { borderColor: "color-mix(in srgb, var(--admin-gold) 34%, transparent)" } : undefined
              }
            >
              <span
                className={cx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  due ? "text-[color:var(--admin-gold-light)]" : "text-white/45",
                )}
                style={{
                  background: due ? "var(--admin-gold-soft)" : "#ffffff08",
                  border: "1px solid var(--admin-border-subtle)",
                }}
              >
                <BellRing size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-medium text-white/90">{reminder.title}</p>
                <p className="mt-0.5 text-[0.6875rem] text-white/45">{formatDueLabel(reminder.remindAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  haptic("success");
                  toggleReminder(reminder.id);
                }}
                aria-label={`Dismiss reminder: ${reminder.title}`}
                className="admin-btn-ghost h-9 min-h-0 shrink-0 px-3 text-[0.6875rem]"
              >
                Done
              </button>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

export function FollowUpsSection({ data }: { data: AppData }) {
  const toggleFollowUp = useStore((state) => state.toggleFollowUp);
  const followUps = openFollowUps(data).slice(0, 3);

  if (followUps.length === 0) return null;

  return (
    <section aria-label="Follow-ups">
      <SectionHeader
        eyebrow="People"
        title="Waiting on you"
        action={
          <Link href="/more/followups" className="flex items-center gap-1 text-[0.6875rem] font-semibold text-white/45">
            All
            <ArrowRight size={12} />
          </Link>
        }
        className="mb-3 px-1"
      />
      <div className="flex flex-col gap-2">
        {followUps.map((followUp) => (
          <motion.div
            key={followUp.id}
            layout
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="admin-tool-card flex items-center gap-3 px-4 py-3"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[color:var(--admin-gold-light)]"
              style={{ background: "var(--admin-gold-soft)", border: "1px solid var(--admin-border-subtle)" }}
            >
              <UserRound size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] font-medium text-white/90">{followUp.person}</p>
              <p className="mt-0.5 truncate text-[0.6875rem] text-white/45">
                {followUp.context}
                {followUp.dueAt ? ` · ${formatDayLabel(followUp.dueAt)}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                haptic("success");
                toggleFollowUp(followUp.id);
              }}
              aria-label={`Mark follow-up with ${followUp.person} as handled`}
              className="admin-btn-ghost h-9 min-h-0 shrink-0 px-3 text-[0.6875rem]"
            >
              Handled
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Routines */

export function RoutinesSection({ data, now }: { data: AppData; now: Date }) {
  const completeRoutine = useStore((state) => state.completeRoutine);
  const routines = routinesForDay(data, now);

  if (routines.length === 0) return null;

  return (
    <section aria-label="Routines">
      <SectionHeader eyebrow="Rhythm" title="Today's routines" className="mb-3 px-1" />
      <Panel className="p-4">
        <div className="flex flex-col gap-1">
          {routines.map((routine) => {
            const done = isRoutineDoneToday(routine, now);
            return (
              <button
                key={routine.id}
                type="button"
                onClick={() => {
                  haptic(done ? "tap" : "success");
                  completeRoutine(routine.id);
                }}
                aria-pressed={done}
                className="flex items-center gap-3 rounded-xl px-1 py-2.5 text-left transition-colors active:bg-white/[0.04]"
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-300"
                  style={{
                    borderColor: done
                      ? "color-mix(in srgb, var(--admin-emerald) 60%, transparent)"
                      : "#ffffff1f",
                    background: done ? "#6f8f7233" : "transparent",
                  }}
                >
                  {done ? <CheckCircle2 size={12} className="text-[#a3c9a8]" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cx(
                      "block truncate text-[0.8125rem]",
                      done ? "text-white/35 line-through" : "text-white/85",
                    )}
                  >
                    {routine.title}
                  </span>
                  <span className="mt-0.5 block text-[0.625rem] capitalize text-white/35">
                    {routine.timeOfDay}
                  </span>
                </span>
                <span className="admin-chip shrink-0">
                  <Repeat size={10} />
                  {routine.streak}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>
    </section>
  );
}

/* --------------------------------------------------------- Quick actions */

const QUICK_ACTIONS = [
  { label: "New task", icon: ClipboardList, prompt: "Create a task for " },
  { label: "Reminder", icon: BellRing, prompt: "Remind me to " },
  { label: "Schedule", icon: CalendarPlus, prompt: "Schedule a meeting " },
  { label: "Note", icon: NotebookPen, prompt: "Take a note that " },
  { label: "Remember", icon: Sparkles, prompt: "Remember that " },
  { label: "Goal", icon: Target, prompt: "Set a goal to " },
] as const;

export function QuickActions() {
  const router = useRouter();

  return (
    <section aria-label="Quick actions">
      <Eyebrow className="mb-1.5 px-1">Quick capture</Eyebrow>
      <button
        type="button"
        onClick={() => {
          haptic("tap");
          router.push("/ai?listen=1");
        }}
        className="admin-btn-gold mb-2 w-full"
      >
        <Mic size={15} />
        Speak to Core
      </button>

      <div className="grid grid-cols-3 gap-1.5">
        {QUICK_ACTIONS.map(({ label, icon: Icon, prompt }) => (
          <motion.button
            key={label}
            type="button"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => {
              haptic("tap");
              router.push(`/ai?draft=${encodeURIComponent(prompt)}`);
            }}
            className="admin-tool-card flex flex-col items-center gap-1.5 px-1.5 py-2.5"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[color:var(--admin-gold)]"
              style={{
                background: "var(--admin-gold-soft)",
                border: "1px solid color-mix(in srgb, var(--admin-gold) 22%, transparent)",
              }}
            >
              <Icon size={15} />
            </span>
            <span className="text-[0.6875rem] font-medium text-white/70">{label}</span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
