"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Target, Trash2 } from "lucide-react";
import { useAppData, useStore } from "@/lib/store";
import { useMounted } from "@/lib/hooks";
import { formatDayLabel, parseNaturalDate } from "@/lib/date";
import { Chip, EmptyState, Panel, ProgressBar, Skeleton, cx } from "@/components/ui/Primitives";
import { SubPage } from "@/components/more/SubPage";
import { Sheet } from "@/components/ui/Sheet";
import { haptic } from "@/lib/haptics";

export default function GoalsPage() {
  const mounted = useMounted();
  const hydrated = useStore((state) => state.hydrated);
  const data = useAppData();
  const addGoal = useStore((state) => state.addGoal);
  const removeGoal = useStore((state) => state.removeGoal);
  const toggleMilestone = useStore((state) => state.toggleMilestone);
  const addMilestone = useStore((state) => state.addMilestone);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<string, string>>({});

  if (!mounted || !hydrated) {
    return (
      <div className="flex flex-col gap-2 px-4 pt-20">
        {[0, 1].map((index) => (
          <Skeleton key={index} className="h-40 rounded-[var(--admin-radius)]" />
        ))}
      </div>
    );
  }

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const parsed = when.trim() ? parseNaturalDate(when, new Date()) : null;
    haptic("success");
    addGoal({ title: trimmed, targetDate: parsed?.date.toISOString() ?? null });
    setTitle("");
    setWhen("");
    setOpen(false);
  };

  return (
    <SubPage
      eyebrow="Direction"
      title="Goals"
      action={
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="New goal"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/70 active:bg-white/10"
        >
          <Plus size={17} />
        </button>
      }
    >
      {data.goals.length === 0 ? (
        <EmptyState
          icon={<Target size={22} />}
          title="No goals set"
          body="Goals give the assistant something to pace you against. Add one and it'll surface in your weekly plan."
          action={
            <button type="button" onClick={() => setOpen(true)} className="admin-btn-gold">
              <Plus size={15} />
              New goal
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {data.goals.map((goal) => {
              const done = goal.milestones.filter((milestone) => milestone.done).length;
              const progress =
                goal.milestones.length > 0 ? Math.round((done / goal.milestones.length) * 100) : 0;

              return (
                <motion.div
                  key={goal.id}
                  layout
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: -12 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Panel className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="admin-heading-serif text-[1.0625rem] leading-snug text-white">
                          {goal.title}
                        </h2>
                        {goal.description ? (
                          <p className="mt-1 text-[0.75rem] text-white/50">{goal.description}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          haptic("warning");
                          removeGoal(goal.id);
                        }}
                        aria-label={`Delete goal: ${goal.title}`}
                        className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/25 active:bg-white/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <ProgressBar value={progress} className="flex-1" />
                      <span className="tabular shrink-0 text-[0.75rem] font-semibold text-[color:var(--admin-gold-light)]">
                        {progress}%
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Chip tone="gold">
                        {done}/{goal.milestones.length} milestones
                      </Chip>
                      {goal.targetDate ? <Chip>Target {formatDayLabel(goal.targetDate)}</Chip> : null}
                    </div>

                    <div className="mt-4 flex flex-col gap-0.5">
                      {goal.milestones.map((milestone) => (
                        <button
                          key={milestone.id}
                          type="button"
                          onClick={() => {
                            haptic(milestone.done ? "tap" : "success");
                            toggleMilestone(goal.id, milestone.id);
                          }}
                          aria-pressed={milestone.done}
                          className="flex items-center gap-2.5 rounded-lg px-1 py-2 text-left active:bg-white/[0.04]"
                        >
                          <span
                            className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-all"
                            style={{
                              width: "1.125rem",
                              height: "1.125rem",
                              borderColor: milestone.done
                                ? "color-mix(in srgb, var(--admin-emerald) 60%, transparent)"
                                : "#ffffff1f",
                              background: milestone.done ? "#6f8f7233" : "transparent",
                            }}
                          >
                            {milestone.done ? <Check size={10} className="text-[#a3c9a8]" /> : null}
                          </span>
                          <span
                            className={cx(
                              "text-[0.75rem]",
                              milestone.done ? "text-white/35 line-through" : "text-white/75",
                            )}
                          >
                            {milestone.title}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <input
                        name="milestone-title"
                        className="admin-input h-10 py-0 text-[0.75rem]"
                        value={milestoneDrafts[goal.id] ?? ""}
                        placeholder="Add a milestone"
                        aria-label={`Add a milestone to ${goal.title}`}
                        onChange={(event) =>
                          setMilestoneDrafts((current) => ({ ...current, [goal.id]: event.target.value }))
                        }
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;
                          const value = (milestoneDrafts[goal.id] ?? "").trim();
                          if (!value) return;
                          haptic("tap");
                          addMilestone(goal.id, value);
                          setMilestoneDrafts((current) => ({ ...current, [goal.id]: "" }));
                        }}
                      />
                    </div>
                  </Panel>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="New goal">
        <div className="flex flex-col gap-4 pb-4">
          <div>
            <label htmlFor="goal-title" className="admin-eyebrow mb-2 block">
              What outcome
            </label>
            <input
              id="goal-title"
              className="admin-input"
              value={title}
              autoFocus
              placeholder="Ship five sites this quarter"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="goal-target" className="admin-eyebrow mb-2 block">
              Target date
            </label>
            <input
              id="goal-target"
              className="admin-input"
              value={when}
              placeholder="in 3 months"
              onChange={(event) => setWhen(event.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim()}
            className="admin-btn-gold w-full disabled:opacity-40"
          >
            Track this goal
          </button>
        </div>
      </Sheet>
    </SubPage>
  );
}
