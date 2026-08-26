"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Brain, CalendarDays, ClipboardList, NotebookPen, Search, Target, UserRound } from "lucide-react";
import { useAppData, useStore } from "@/lib/store";
import { useMounted } from "@/lib/hooks";
import { searchAll } from "@/lib/selectors";
import { formatDayLabel, formatDueLabel } from "@/lib/date";
import { EmptyState, Eyebrow, Skeleton } from "@/components/ui/Primitives";
import { SubPage } from "@/components/more/SubPage";

export default function SearchPage() {
  const mounted = useMounted();
  const hydrated = useStore((state) => state.hydrated);
  const data = useAppData();
  const [query, setQuery] = useState("");

  const results = useMemo(() => searchAll(data, query), [data, query]);
  const total =
    results.tasks.length +
    results.events.length +
    results.notes.length +
    results.memories.length +
    results.followUps.length +
    results.goals.length;

  if (!mounted || !hydrated) {
    return (
      <div className="px-4 pt-20">
        <Skeleton className="h-12 rounded-2xl" />
      </div>
    );
  }

  const groups = [
    {
      label: "Tasks",
      icon: ClipboardList,
      items: results.tasks.map((task) => ({
        id: task.id,
        primary: task.title,
        secondary: formatDueLabel(task.dueAt) ?? (task.done ? "Completed" : "No due date"),
      })),
    },
    {
      label: "Calendar",
      icon: CalendarDays,
      items: results.events.map((event) => ({
        id: event.id,
        primary: event.title,
        secondary: formatDayLabel(event.startAt),
      })),
    },
    {
      label: "Notes",
      icon: NotebookPen,
      items: results.notes.map((note) => ({ id: note.id, primary: note.title, secondary: note.body })),
    },
    {
      label: "Memory",
      icon: Brain,
      items: results.memories.map((memory) => ({
        id: memory.id,
        primary: memory.content,
        secondary: memory.kind,
      })),
    },
    {
      label: "Follow-ups",
      icon: UserRound,
      items: results.followUps.map((item) => ({
        id: item.id,
        primary: item.person,
        secondary: item.context,
      })),
    },
    {
      label: "Goals",
      icon: Target,
      items: results.goals.map((goal) => ({
        id: goal.id,
        primary: goal.title,
        secondary: goal.description ?? `${goal.milestones.length} milestones`,
      })),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <SubPage eyebrow="Everything" title="Search">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
        <input
          name="workspace-search"
          className="admin-input pl-10"
          value={query}
          autoFocus
          placeholder="Search tasks, notes, people, memory"
          aria-label="Search your workspace"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {query.trim() === "" ? (
        <EmptyState
          icon={<Search size={22} />}
          title="Search across everything"
          body="One query reaches your tasks, calendar, notes, goals, follow-ups, and everything the assistant remembers."
        />
      ) : total === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title="No matches"
          body={`Nothing in your workspace mentions “${query.trim()}”.`}
        />
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.label}>
              <Eyebrow className="mb-2.5 px-1">
                {group.label} · {group.items.length}
              </Eyebrow>
              <div className="flex flex-col gap-2">
                {group.items.slice(0, 6).map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.3 }}
                    className="admin-tool-card flex items-start gap-3 px-4 py-3"
                  >
                    <group.icon size={14} className="mt-0.5 shrink-0 text-[color:var(--admin-gold)]" />
                    <div className="min-w-0">
                      <p className="text-[0.8125rem] font-medium leading-snug text-white/90">{item.primary}</p>
                      <p className="mt-0.5 line-clamp-2 text-[0.6875rem] capitalize text-white/45">
                        {item.secondary}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </SubPage>
  );
}
