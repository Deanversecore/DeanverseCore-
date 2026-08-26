"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ListChecks, Plus } from "lucide-react";
import type { Priority, Task } from "@/lib/types";
import { useAppData, useStore } from "@/lib/store";
import { useMounted, useNow } from "@/lib/hooks";
import { byDue } from "@/lib/selectors";
import { isSameDay, parseNaturalDate, startOfDay } from "@/lib/date";
import { EmptyState, Eyebrow, Panel, Skeleton, cx } from "@/components/ui/Primitives";
import { TaskRow } from "@/components/tasks/TaskRow";
import { Sheet } from "@/components/ui/Sheet";
import { haptic } from "@/lib/haptics";

const FILTERS = ["Today", "Upcoming", "All", "Done"] as const;
type Filter = (typeof FILTERS)[number];

const PRIORITIES: Priority[] = ["low", "normal", "high", "critical"];

export default function TasksPage() {
  const mounted = useMounted();
  const hydrated = useStore((state) => state.hydrated);
  const data = useAppData();
  const toggleTask = useStore((state) => state.toggleTask);
  const removeTask = useStore((state) => state.removeTask);
  const now = useNow();

  const [filter, setFilter] = useState<Filter>("Today");
  const [composerOpen, setComposerOpen] = useState(false);

  const groups = useMemo(() => buildGroups(data.tasks, filter, now), [data.tasks, filter, now]);
  const openCount = data.tasks.filter((task) => !task.done).length;

  if (!mounted || !hydrated) return <TasksSkeleton />;

  return (
    <div className="pb-6">
      <header className="px-5 pt-6">
        <Eyebrow>Execution</Eyebrow>
        <div className="mt-1.5 flex items-end justify-between gap-3">
          <h1 className="admin-heading-serif text-[1.75rem] text-white">Tasks</h1>
          <p className="pb-1.5 text-[0.75rem] text-white/40">
            <span className="tabular text-white/70">{openCount}</span> open
          </p>
        </div>
      </header>

      <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              haptic("select");
              setFilter(item);
            }}
            aria-pressed={filter === item}
            className={cx(
              "relative shrink-0 rounded-full px-4 py-2 text-[0.75rem] font-semibold transition-colors",
              filter === item ? "text-[#0f1a17]" : "text-white/50",
            )}
          >
            {filter === item ? (
              <motion.span
                layoutId="task-filter"
                className="absolute inset-0 rounded-full"
                style={{ background: "linear-gradient(135deg, #c9a962f2, #aa8c46f2)" }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : (
              <span className="absolute inset-0 rounded-full border border-white/[0.08] bg-white/[0.03]" />
            )}
            <span className="relative z-10">{item}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-6 px-4">
        {groups.length === 0 ? (
          <Panel variant="flat" className="py-2">
            <EmptyState
              icon={filter === "Done" ? <CheckCircle2 size={22} /> : <ListChecks size={22} />}
              title={filter === "Done" ? "Nothing completed yet" : "You're clear"}
              body={
                filter === "Done"
                  ? "Finished tasks land here so you can see what the day actually produced."
                  : "No tasks in this view. Add one below, or just tell the assistant what needs doing."
              }
              action={
                filter !== "Done" ? (
                  <button type="button" onClick={() => setComposerOpen(true)} className="admin-btn-gold">
                    <Plus size={15} />
                    Add a task
                  </button>
                ) : undefined
              }
            />
          </Panel>
        ) : (
          groups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <div className="mb-2.5 flex items-center justify-between px-1">
                <Eyebrow>{group.label}</Eyebrow>
                <span className="tabular text-[0.6875rem] text-white/30">{group.tasks.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {group.tasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={false}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginBottom: -8 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <TaskRow task={task} now={now} onToggle={toggleTask} onDelete={removeTask} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ))
        )}

        {groups.length > 0 ? (
          <p className="px-1 text-center text-[0.6875rem] text-white/25">
            Swipe right to complete · swipe left to delete
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          haptic("tap");
          setComposerOpen(true);
        }}
        aria-label="Add a task"
        className="fixed bottom-[calc(var(--app-bottomnav-height)+1rem)] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-white/80"
        style={{ background: "#12211ce6", boxShadow: "var(--admin-elev-2)", backdropFilter: "blur(12px)" }}
      >
        <Plus size={20} />
      </button>

      <TaskComposer open={composerOpen} onClose={() => setComposerOpen(false)} />
    </div>
  );
}

/* -------------------------------------------------------------- composer */

function TaskComposer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addTask = useStore((state) => state.addTask);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [when, setWhen] = useState("");

  const parsed = when.trim() ? parseNaturalDate(when, new Date()) : null;

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    haptic("success");
    addTask({ title: trimmed, priority, dueAt: parsed?.date.toISOString() ?? null });
    setTitle("");
    setWhen("");
    setPriority("normal");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New task"
      description="Write it the way you'd say it — dates are understood."
    >
      <div className="flex flex-col gap-4 pb-4">
        <div>
          <label htmlFor="task-title" className="admin-eyebrow mb-2 block">
            What needs doing
          </label>
          <input
            id="task-title"
            className="admin-input"
            value={title}
            autoFocus
            placeholder="Send the revised mockups"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
          />
        </div>

        <div>
          <label htmlFor="task-when" className="admin-eyebrow mb-2 block">
            When
          </label>
          <input
            id="task-when"
            className="admin-input"
            value={when}
            placeholder="tomorrow at 3pm"
            onChange={(event) => setWhen(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
          />
          {parsed ? (
            <p className="mt-2 px-1 text-[0.6875rem] text-[color:var(--admin-gold-light)]">
              Understood as {parsed.date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          ) : null}
        </div>

        <div>
          <p className="admin-eyebrow mb-2">Priority</p>
          <div className="grid grid-cols-4 gap-2">
            {PRIORITIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPriority(item)}
                aria-pressed={priority === item}
                className={cx(
                  "rounded-xl border py-2.5 text-[0.6875rem] font-semibold capitalize transition-colors",
                  priority === item
                    ? "border-[color:color-mix(in_srgb,var(--admin-gold)_42%,transparent)] bg-[color:var(--admin-gold-soft)] text-[color:var(--admin-gold-light)]"
                    : "border-white/[0.08] bg-white/[0.03] text-white/45",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <button type="button" onClick={submit} disabled={!title.trim()} className="admin-btn-gold w-full disabled:opacity-40">
          Add task
        </button>
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------- grouping */

interface Group {
  label: string;
  tasks: Task[];
}

function buildGroups(tasks: Task[], filter: Filter, now: Date): Group[] {
  const open = tasks.filter((task) => !task.done);

  if (filter === "Done") {
    const done = tasks
      .filter((task) => task.done)
      .sort((a, b) => new Date(b.completedAt ?? b.updatedAt).getTime() - new Date(a.completedAt ?? a.updatedAt).getTime());
    return done.length > 0 ? [{ label: "Completed", tasks: done }] : [];
  }

  const overdue = open
    .filter((task) => task.dueAt && new Date(task.dueAt).getTime() < startOfDay(now).getTime())
    .sort(byDue);
  const today = open.filter((task) => task.dueAt && isSameDay(new Date(task.dueAt), now)).sort(byDue);

  if (filter === "Today") {
    return [
      { label: "Overdue", tasks: overdue },
      { label: "Due today", tasks: today },
    ].filter((group) => group.tasks.length > 0);
  }

  if (filter === "Upcoming") {
    const upcoming = open
      .filter((task) => task.dueAt && new Date(task.dueAt).getTime() > now.getTime())
      .filter((task) => !today.some((item) => item.id === task.id))
      .sort(byDue);
    return upcoming.length > 0 ? [{ label: "Scheduled ahead", tasks: upcoming }] : [];
  }

  const scheduled = open.filter((task) => task.dueAt).sort(byDue);
  const someday = open.filter((task) => !task.dueAt);
  return [
    { label: "Scheduled", tasks: scheduled },
    { label: "No date yet", tasks: someday },
  ].filter((group) => group.tasks.length > 0);
}

function TasksSkeleton() {
  return (
    <div className="px-4 pt-8">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-3 h-8 w-32 rounded-xl" />
      <div className="mt-6 flex gap-2">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-9 w-20 rounded-full" />
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="h-[4.5rem] rounded-[var(--admin-radius-md)]" />
        ))}
      </div>
    </div>
  );
}
