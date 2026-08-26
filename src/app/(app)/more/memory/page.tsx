"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Plus, Trash2 } from "lucide-react";
import type { MemoryKind } from "@/lib/types";
import { useAppData, useStore } from "@/lib/store";
import { useMounted } from "@/lib/hooks";
import { formatDayLabel } from "@/lib/date";
import { Chip, EmptyState, Panel, Skeleton, cx } from "@/components/ui/Primitives";
import { SubPage } from "@/components/more/SubPage";
import { Sheet } from "@/components/ui/Sheet";
import { haptic } from "@/lib/haptics";

const KINDS: MemoryKind[] = ["fact", "preference", "person", "project"];

export default function MemoryPage() {
  const mounted = useMounted();
  const hydrated = useStore((state) => state.hydrated);
  const data = useAppData();
  const addMemory = useStore((state) => state.addMemory);
  const removeMemory = useStore((state) => state.removeMemory);

  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<MemoryKind>("fact");

  if (!mounted || !hydrated) {
    return (
      <div className="flex flex-col gap-2 px-4 pt-20">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-16 rounded-[var(--admin-radius-md)]" />
        ))}
      </div>
    );
  }

  const submit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    haptic("success");
    addMemory({ content: trimmed, kind });
    setContent("");
    setOpen(false);
  };

  return (
    <SubPage
      eyebrow="Context"
      title="Personal memory"
      action={
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Add a memory"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/70 active:bg-white/10"
        >
          <Plus size={17} />
        </button>
      }
    >
      <Panel className="mb-5 p-4">
        <p className="text-[0.75rem] leading-relaxed text-white/55">
          Everything here shapes how the assistant answers you. It never leaves this device unless you turn
          on sync.
        </p>
      </Panel>

      {data.memories.length === 0 ? (
        <EmptyState
          icon={<Brain size={22} />}
          title="Nothing remembered yet"
          body="Tell the assistant “remember that…” and the detail lives here, shaping every answer it gives you."
        />
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {data.memories.map((memory) => (
              <motion.div
                key={memory.id}
                layout
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -80, height: 0, marginBottom: -8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="admin-tool-card flex items-start gap-3 px-4 py-3.5"
              >
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[color:var(--admin-gold)]"
                  style={{
                    background: "var(--admin-gold-soft)",
                    border: "1px solid color-mix(in srgb, var(--admin-gold) 20%, transparent)",
                  }}
                >
                  <Brain size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] leading-relaxed text-white/85">{memory.content}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Chip tone="emerald">{memory.kind}</Chip>
                    {memory.subject ? <Chip>{memory.subject}</Chip> : null}
                    <Chip>{formatDayLabel(memory.createdAt)}</Chip>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    haptic("warning");
                    removeMemory(memory.id);
                  }}
                  aria-label="Forget this"
                  className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/25 active:bg-white/10"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Remember this"
        description="Written the way you'd say it out loud."
      >
        <div className="flex flex-col gap-4 pb-4">
          <textarea
            name="memory-content"
            rows={3}
            className="admin-input resize-none"
            value={content}
            autoFocus
            aria-label="What should I remember?"
            placeholder="I do my best deep work before 11am."
            onChange={(event) => setContent(event.target.value)}
          />
          <div>
            <p className="admin-eyebrow mb-2">Type</p>
            <div className="grid grid-cols-4 gap-2">
              {KINDS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setKind(item)}
                  aria-pressed={kind === item}
                  className={cx(
                    "rounded-xl border py-2.5 text-[0.6875rem] font-semibold capitalize transition-colors",
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
          <button
            type="button"
            onClick={submit}
            disabled={!content.trim()}
            className="admin-btn-gold w-full disabled:opacity-40"
          >
            Save to memory
          </button>
        </div>
      </Sheet>
    </SubPage>
  );
}
