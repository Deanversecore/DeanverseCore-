"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Mail, MessageSquare, Phone, Plus, Trash2, Users } from "lucide-react";
import type { FollowUpChannel } from "@/lib/types";
import { useStore, selectData } from "@/lib/store";
import { useMounted, useNow } from "@/lib/hooks";
import { formatDayLabel, parseNaturalDate, relativeFromNow } from "@/lib/date";
import { Chip, EmptyState, Skeleton, cx } from "@/components/ui/Primitives";
import { SubPage } from "@/components/more/SubPage";
import { Sheet } from "@/components/ui/Sheet";
import { haptic } from "@/lib/haptics";

const CHANNELS: Array<{ value: FollowUpChannel; icon: typeof Phone }> = [
  { value: "call", icon: Phone },
  { value: "email", icon: Mail },
  { value: "message", icon: MessageSquare },
  { value: "meeting", icon: Users },
];

export default function FollowUpsPage() {
  const mounted = useMounted();
  const hydrated = useStore((state) => state.hydrated);
  const data = useStore(selectData);
  const addFollowUp = useStore((state) => state.addFollowUp);
  const toggleFollowUp = useStore((state) => state.toggleFollowUp);
  const removeFollowUp = useStore((state) => state.removeFollowUp);
  const now = useNow(60_000);

  const [open, setOpen] = useState(false);
  const [person, setPerson] = useState("");
  const [context, setContext] = useState("");
  const [channel, setChannel] = useState<FollowUpChannel>("call");
  const [when, setWhen] = useState("");

  if (!mounted || !hydrated) {
    return (
      <div className="flex flex-col gap-2 px-4 pt-20">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[4.5rem] rounded-[var(--admin-radius-md)]" />
        ))}
      </div>
    );
  }

  const submit = () => {
    const trimmed = person.trim();
    if (!trimmed) return;
    const parsed = when.trim() ? parseNaturalDate(when, now) : null;
    haptic("success");
    addFollowUp({
      person: trimmed,
      context: context.trim() || "General check-in",
      channel,
      dueAt: parsed?.date.toISOString() ?? null,
    });
    setPerson("");
    setContext("");
    setWhen("");
    setOpen(false);
  };

  const sorted = [...data.followUps].sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <SubPage
      eyebrow="Relationships"
      title="Follow-ups"
      action={
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="New follow-up"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/70 active:bg-white/10"
        >
          <Plus size={17} />
        </button>
      }
    >
      {sorted.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="Nobody's waiting"
          body="Say “follow up with Maria about the brand assets” and the assistant tracks it until it's closed."
          action={
            <button type="button" onClick={() => setOpen(true)} className="admin-btn-gold">
              <Plus size={15} />
              New follow-up
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {sorted.map((followUp) => {
              const Icon = CHANNELS.find((item) => item.value === followUp.channel)?.icon ?? MessageSquare;
              return (
                <motion.div
                  key={followUp.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: -8 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className={cx("admin-tool-card flex items-start gap-3 px-4 py-3.5", followUp.done && "opacity-45")}
                >
                  <button
                    type="button"
                    onClick={() => {
                      haptic(followUp.done ? "tap" : "success");
                      toggleFollowUp(followUp.id);
                    }}
                    aria-pressed={followUp.done}
                    aria-label={`Mark follow-up with ${followUp.person} as handled`}
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all"
                    style={{
                      borderColor: followUp.done
                        ? "color-mix(in srgb, var(--admin-emerald) 60%, transparent)"
                        : "#ffffff1f",
                      background: followUp.done ? "#6f8f7233" : "transparent",
                    }}
                  >
                    {followUp.done ? <Check size={12} className="text-[#a3c9a8]" /> : null}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cx(
                        "text-[0.875rem] font-medium",
                        followUp.done ? "text-white/40 line-through" : "text-white/90",
                      )}
                    >
                      {followUp.person}
                    </p>
                    <p className="mt-0.5 text-[0.75rem] leading-relaxed text-white/50">{followUp.context}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Chip tone="gold">
                        <Icon size={10} />
                        {followUp.channel}
                      </Chip>
                      {followUp.dueAt ? <Chip>{formatDayLabel(followUp.dueAt)}</Chip> : null}
                      {!followUp.done ? <Chip>Open {relativeFromNow(followUp.createdAt, now)}</Chip> : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      haptic("warning");
                      removeFollowUp(followUp.id);
                    }}
                    aria-label={`Delete follow-up with ${followUp.person}`}
                    className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/20 active:bg-white/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="New follow-up">
        <div className="flex flex-col gap-4 pb-4">
          <div>
            <label htmlFor="followup-person" className="admin-eyebrow mb-2 block">
              Who
            </label>
            <input
              id="followup-person"
              className="admin-input"
              value={person}
              autoFocus
              placeholder="Maria"
              onChange={(event) => setPerson(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="followup-context" className="admin-eyebrow mb-2 block">
              About what
            </label>
            <input
              id="followup-context"
              className="admin-input"
              value={context}
              placeholder="Waiting on brand assets"
              onChange={(event) => setContext(event.target.value)}
            />
          </div>
          <div>
            <p className="admin-eyebrow mb-2">How</p>
            <div className="grid grid-cols-4 gap-2">
              {CHANNELS.map(({ value, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setChannel(value)}
                  aria-pressed={channel === value}
                  className={cx(
                    "flex flex-col items-center gap-1.5 rounded-xl border py-2.5 text-[0.625rem] font-semibold capitalize transition-colors",
                    channel === value
                      ? "border-[color:color-mix(in_srgb,var(--admin-gold)_42%,transparent)] bg-[color:var(--admin-gold-soft)] text-[color:var(--admin-gold-light)]"
                      : "border-white/[0.08] bg-white/[0.03] text-white/45",
                  )}
                >
                  <Icon size={14} />
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="followup-when" className="admin-eyebrow mb-2 block">
              By when
            </label>
            <input
              id="followup-when"
              className="admin-input"
              value={when}
              placeholder="friday"
              onChange={(event) => setWhen(event.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!person.trim()}
            className="admin-btn-gold w-full disabled:opacity-40"
          >
            Track follow-up
          </button>
        </div>
      </Sheet>
    </SubPage>
  );
}
