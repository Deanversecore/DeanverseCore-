"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Flame, Plus, Repeat, Trash2 } from "lucide-react";
import type { TimeOfDay } from "@/lib/types";
import { useStore, selectData } from "@/lib/store";
import { useMounted, useNow } from "@/lib/hooks";
import { isRoutineDoneToday } from "@/lib/selectors";
import { WEEKDAYS } from "@/lib/date";
import { Chip, EmptyState, Skeleton, cx } from "@/components/ui/Primitives";
import { SubPage } from "@/components/more/SubPage";
import { Sheet } from "@/components/ui/Sheet";
import { haptic } from "@/lib/haptics";

const TIMES: TimeOfDay[] = ["morning", "afternoon", "evening"];
const WEEKDAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

export default function RoutinesPage() {
  const mounted = useMounted();
  const hydrated = useStore((state) => state.hydrated);
  const data = useStore(selectData);
  const addRoutine = useStore((state) => state.addRoutine);
  const removeRoutine = useStore((state) => state.removeRoutine);
  const completeRoutine = useStore((state) => state.completeRoutine);
  const now = useNow(60_000);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("morning");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);

  if (!mounted || !hydrated) {
    return (
      <div className="flex flex-col gap-2 px-4 pt-20">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-20 rounded-[var(--admin-radius-md)]" />
        ))}
      </div>
    );
  }

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed || days.length === 0) return;
    haptic("success");
    addRoutine({ title: trimmed, timeOfDay, days });
    setTitle("");
    setOpen(false);
  };

  return (
    <SubPage
      eyebrow="Rhythm"
      title="Routines"
      action={
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="New routine"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/70 active:bg-white/10"
        >
          <Plus size={17} />
        </button>
      }
    >
      {data.routines.length === 0 ? (
        <EmptyState
          icon={<Repeat size={22} />}
          title="No routines yet"
          body="Routines are the things you want to hold steady. The assistant tracks the streak and nudges you before it breaks."
          action={
            <button type="button" onClick={() => setOpen(true)} className="admin-btn-gold">
              <Plus size={15} />
              New routine
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {data.routines.map((routine) => {
              const done = isRoutineDoneToday(routine, now);
              const scheduledToday = routine.days.includes(now.getDay());
              return (
                <motion.div
                  key={routine.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: -8 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="admin-tool-card flex items-start gap-3 px-4 py-3.5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      haptic(done ? "tap" : "success");
                      completeRoutine(routine.id);
                    }}
                    disabled={!scheduledToday}
                    aria-pressed={done}
                    aria-label={`Mark ${routine.title} complete`}
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all disabled:opacity-30"
                    style={{
                      borderColor: done
                        ? "color-mix(in srgb, var(--admin-emerald) 60%, transparent)"
                        : "#ffffff1f",
                      background: done ? "#6f8f7233" : "transparent",
                    }}
                  >
                    {done ? <CheckCircle2 size={13} className="text-[#a3c9a8]" /> : null}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cx(
                        "text-[0.875rem] font-medium leading-snug",
                        done ? "text-white/40 line-through" : "text-white/90",
                      )}
                    >
                      {routine.title}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex gap-1">
                        {WEEKDAY_SHORT.map((label, index) => (
                          <span
                            key={index}
                            aria-hidden
                            className={cx(
                              "flex h-4 w-4 items-center justify-center rounded text-[0.5rem] font-bold",
                              routine.days.includes(index)
                                ? "bg-[color:var(--admin-gold-soft)] text-[color:var(--admin-gold-light)]"
                                : "bg-white/[0.04] text-white/20",
                            )}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                      <span className="sr-only">
                        {routine.days.map((day) => WEEKDAYS[day]).join(", ")}
                      </span>
                      <Chip>{routine.timeOfDay}</Chip>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="admin-chip admin-chip-gold">
                      <Flame size={10} />
                      {routine.streak}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        haptic("warning");
                        removeRoutine(routine.id);
                      }}
                      aria-label={`Delete routine: ${routine.title}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-white/20 active:bg-white/10"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="New routine">
        <div className="flex flex-col gap-4 pb-4">
          <div>
            <label htmlFor="routine-title" className="admin-eyebrow mb-2 block">
              What you&apos;ll repeat
            </label>
            <input
              id="routine-title"
              className="admin-input"
              value={title}
              autoFocus
              placeholder="Review the day's three priorities"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div>
            <p className="admin-eyebrow mb-2">Time of day</p>
            <div className="grid grid-cols-3 gap-2">
              {TIMES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTimeOfDay(item)}
                  aria-pressed={timeOfDay === item}
                  className={cx(
                    "rounded-xl border py-2.5 text-[0.6875rem] font-semibold capitalize transition-colors",
                    timeOfDay === item
                      ? "border-[color:color-mix(in_srgb,var(--admin-gold)_42%,transparent)] bg-[color:var(--admin-gold-soft)] text-[color:var(--admin-gold-light)]"
                      : "border-white/[0.08] bg-white/[0.03] text-white/45",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="admin-eyebrow mb-2">Days</p>
            <div className="flex gap-1.5">
              {WEEKDAY_SHORT.map((label, index) => {
                const active = days.includes(index);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() =>
                      setDays((current) =>
                        current.includes(index)
                          ? current.filter((day) => day !== index)
                          : [...current, index].sort(),
                      )
                    }
                    aria-pressed={active}
                    aria-label={WEEKDAYS[index]}
                    className={cx(
                      "h-10 flex-1 rounded-xl border text-[0.75rem] font-semibold transition-colors",
                      active
                        ? "border-[color:color-mix(in_srgb,var(--admin-gold)_42%,transparent)] bg-[color:var(--admin-gold-soft)] text-[color:var(--admin-gold-light)]"
                        : "border-white/[0.08] bg-white/[0.03] text-white/40",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={!title.trim() || days.length === 0}
            className="admin-btn-gold w-full disabled:opacity-40"
          >
            Start routine
          </button>
        </div>
      </Sheet>
    </SubPage>
  );
}
