"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CalendarPlus, Plus } from "lucide-react";
import type { EventKind } from "@/lib/types";
import { useAppData, useStore } from "@/lib/store";
import { useMounted, useNow } from "@/lib/hooks";
import { eventsOnDay } from "@/lib/selectors";
import { addDays, format, isSameDay, parseNaturalDate, startOfDay } from "@/lib/date";
import { EmptyState, Eyebrow, Panel, Skeleton, cx } from "@/components/ui/Primitives";
import { EventRow } from "@/components/calendar/EventRow";
import { TaskRow } from "@/components/tasks/TaskRow";
import { Sheet } from "@/components/ui/Sheet";
import { haptic } from "@/lib/haptics";

const KINDS: EventKind[] = ["meeting", "call", "focus", "personal", "travel"];
const STRIP_LENGTH = 14;

export default function CalendarPage() {
  const mounted = useMounted();
  const hydrated = useStore((state) => state.hydrated);
  const data = useAppData();
  const toggleTask = useStore((state) => state.toggleTask);
  const now = useNow();

  const [offset, setOffset] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);

  const selected = useMemo(() => startOfDay(addDays(now, offset)), [now, offset]);
  const days = useMemo(
    () => Array.from({ length: STRIP_LENGTH }, (_, index) => addDays(startOfDay(now), index - 2)),
    [now],
  );

  const dayEvents = eventsOnDay(data, selected);
  const dayTasks = data.tasks.filter(
    (task) => !task.done && task.dueAt && isSameDay(new Date(task.dueAt), selected),
  );

  if (!mounted || !hydrated) return <CalendarSkeleton />;

  return (
    <div className="pb-6">
      <header className="px-5 pt-6">
        <Eyebrow>Schedule</Eyebrow>
        <h1 className="admin-heading-serif mt-1.5 text-[1.75rem] text-white">{format(selected, "MMMM yyyy")}</h1>
      </header>

      <div className="scrollbar-none mt-5 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((day) => {
          const active = isSameDay(day, selected);
          const isToday = isSameDay(day, now);
          const load = eventsOnDay(data, day).length;
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => {
                haptic("select");
                setOffset(Math.round((startOfDay(day).getTime() - startOfDay(now).getTime()) / 86_400_000));
              }}
              aria-pressed={active}
              aria-label={format(day, "EEEE, MMMM d")}
              className={cx(
                "relative flex h-[4.25rem] w-[3.25rem] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border transition-colors",
                active
                  ? "border-[color:color-mix(in_srgb,var(--admin-gold)_44%,transparent)]"
                  : "border-white/[0.07] bg-white/[0.02]",
              )}
              style={active ? { background: "var(--admin-gold-soft)" } : undefined}
            >
              <span
                className={cx(
                  "text-[0.5625rem] font-semibold uppercase tracking-[0.12em]",
                  active ? "text-[color:var(--admin-gold-light)]" : "text-white/35",
                )}
              >
                {format(day, "EEE")}
              </span>
              <span
                className={cx(
                  "admin-stat-value text-[1.0625rem]",
                  active ? "text-[color:var(--admin-gold-light)]" : isToday ? "text-white" : "text-white/60",
                )}
              >
                {format(day, "d")}
              </span>
              <span className="flex h-1.5 items-center gap-0.5">
                {Array.from({ length: Math.min(load, 3) }).map((_, index) => (
                  <span
                    key={index}
                    className="h-1 w-1 rounded-full"
                    style={{ background: active ? "var(--admin-gold)" : "#6f8f72" }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-6 px-4">
        <section aria-label="Events">
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <Eyebrow>Agenda</Eyebrow>
              <h2 className="admin-heading-serif mt-1 text-[1.0625rem] text-white">
                {isSameDay(selected, now) ? "Today" : format(selected, "EEEE, MMM d")}
              </h2>
            </div>
            <span className="pb-1 text-[0.6875rem] text-white/35">
              {dayEvents.length + dayTasks.length} items
            </span>
          </div>

          {dayEvents.length === 0 && dayTasks.length === 0 ? (
            <Panel variant="flat" className="py-2">
              <EmptyState
                icon={<CalendarPlus size={22} />}
                title="Nothing on this day"
                body="An open day is an asset. Add something, or ask the assistant to move work here."
                action={
                  <button type="button" onClick={() => setComposerOpen(true)} className="admin-btn-gold">
                    <Plus size={15} />
                    Add event
                  </button>
                }
              />
            </Panel>
          ) : (
            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {dayEvents.map((event) => (
                  <EventRow key={event.id} event={event} now={now} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {dayTasks.length > 0 ? (
          <section aria-label="Tasks due">
            <Eyebrow className="mb-2.5 px-1">Due this day</Eyebrow>
            <div className="flex flex-col gap-2">
              {dayTasks.map((task) => (
                <TaskRow key={task.id} task={task} now={now} onToggle={toggleTask} compact />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          haptic("tap");
          setComposerOpen(true);
        }}
        aria-label="Add an event"
        className="fixed bottom-[calc(var(--app-bottomnav-height)+5rem)] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-white/80"
        style={{ background: "#12211ce6", boxShadow: "var(--admin-elev-2)", backdropFilter: "blur(12px)" }}
      >
        <Plus size={20} />
      </button>

      <EventComposer open={composerOpen} onClose={() => setComposerOpen(false)} day={selected} />
    </div>
  );
}

function EventComposer({ open, onClose, day }: { open: boolean; onClose: () => void; day: Date }) {
  const addEvent = useStore((state) => state.addEvent);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("9am");
  const [duration, setDuration] = useState(60);
  const [kind, setKind] = useState<EventKind>("meeting");

  const parsed = parseNaturalDate(when, day);
  const start = parsed ? new Date(parsed.date) : null;
  if (start) {
    start.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  }

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed || !start) return;
    haptic("success");
    addEvent({
      title: trimmed,
      startAt: start.toISOString(),
      endAt: new Date(start.getTime() + duration * 60_000).toISOString(),
      kind,
    });
    setTitle("");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="New event" description={format(day, "EEEE, MMMM d")}>
      <div className="flex flex-col gap-4 pb-4">
        <div>
          <label htmlFor="event-title" className="admin-eyebrow mb-2 block">
            Title
          </label>
          <input
            id="event-title"
            className="admin-input"
            value={title}
            autoFocus
            placeholder="Design review"
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="event-time" className="admin-eyebrow mb-2 block">
              Starts
            </label>
            <input
              id="event-time"
              className="admin-input"
              value={when}
              placeholder="2pm"
              onChange={(event) => setWhen(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="event-duration" className="admin-eyebrow mb-2 block">
              Minutes
            </label>
            <input
              id="event-duration"
              type="number"
              min={15}
              step={15}
              className="admin-input tabular"
              value={duration}
              onChange={(event) => setDuration(Math.max(15, Number(event.target.value) || 60))}
            />
          </div>
        </div>

        <div>
          <p className="admin-eyebrow mb-2">Type</p>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setKind(item)}
                aria-pressed={kind === item}
                className={cx(
                  "rounded-full border px-3.5 py-2 text-[0.6875rem] font-semibold capitalize transition-colors",
                  kind === item
                    ? "border-[color:color-mix(in_srgb,var(--admin-gold)_42%,transparent)] bg-[color:var(--admin-gold-soft)] text-[color:var(--admin-gold-light)]"
                    : "border-white/[0.08] bg-white/[0.03] text-white/45",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {start ? (
          <p className="px-1 text-[0.6875rem] text-[color:var(--admin-gold-light)]">
            {format(start, "EEEE, MMM d 'at' h:mm a")}
          </p>
        ) : (
          <p className="px-1 text-[0.6875rem] text-white/35">Try “9am”, “2:30pm”, or “noon”.</p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!title.trim() || !start}
          className="admin-btn-gold w-full disabled:opacity-40"
        >
          Add event
        </button>
      </div>
    </Sheet>
  );
}

function CalendarSkeleton() {
  return (
    <div className="px-4 pt-8">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-3 h-8 w-44 rounded-xl" />
      <div className="mt-6 flex gap-2">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="h-[4.25rem] w-[3.25rem] rounded-2xl" />
        ))}
      </div>
      <div className="mt-7 flex flex-col gap-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-16 rounded-[var(--admin-radius-md)]" />
        ))}
      </div>
    </div>
  );
}
