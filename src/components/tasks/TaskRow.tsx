"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { Check, Trash2 } from "lucide-react";
import type { Priority, Task } from "@/lib/types";
import { formatDueLabel, isOverdue } from "@/lib/date";
import { haptic } from "@/lib/haptics";
import { Chip, cx } from "@/components/ui/Primitives";

const PRIORITY_LABEL: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  normal: "Normal",
  low: "Low",
};

const PRIORITY_DOT: Record<Priority, string> = {
  critical: "#c45c5c",
  high: "#c9a962",
  normal: "#6f8f72",
  low: "#ffffff40",
};

interface TaskRowProps {
  task: Task;
  now: Date;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  onOpen?: (task: Task) => void;
  compact?: boolean;
}

export function TaskRow({ task, now, onToggle, onDelete, onOpen, compact = false }: TaskRowProps) {
  const x = useMotionValue(0);
  const completeOpacity = useTransform(x, [0, 60, 110], [0, 0.5, 1]);
  const deleteOpacity = useTransform(x, [-110, -60, 0], [1, 0.5, 0]);

  const due = formatDueLabel(task.dueAt);
  const overdue = !task.done && isOverdue(task.dueAt, now);

  return (
    <div className="relative overflow-hidden rounded-[var(--admin-radius-md)]">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-5">
        <motion.span style={{ opacity: completeOpacity }} className="text-[color:var(--admin-emerald)]">
          <Check size={18} />
        </motion.span>
        {onDelete ? (
          <motion.span style={{ opacity: deleteOpacity }} className="text-[color:var(--admin-danger)]">
            <Trash2 size={17} />
          </motion.span>
        ) : null}
      </div>

      <motion.div
        drag="x"
        style={{ x }}
        dragConstraints={{ left: onDelete ? -120 : 0, right: 120 }}
        dragElastic={0.12}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          if (info.offset.x > 96) {
            haptic("success");
            onToggle(task.id);
          } else if (onDelete && info.offset.x < -96) {
            haptic("warning");
            onDelete(task.id);
          }
        }}
        className={cx(
          "admin-tool-card relative flex touch-pan-y items-start gap-3",
          compact ? "px-3.5 py-3" : "px-4 py-3.5",
        )}
      >
        <button
          type="button"
          onClick={() => {
            haptic(task.done ? "tap" : "success");
            onToggle(task.id);
          }}
          aria-label={task.done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
          aria-pressed={task.done}
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all duration-300"
          style={{
            borderColor: task.done
              ? "color-mix(in srgb, var(--admin-emerald) 60%, transparent)"
              : "color-mix(in srgb, var(--admin-gold) 26%, #ffffff1a)",
            background: task.done ? "#6f8f7233" : "transparent",
          }}
        >
          {task.done ? <Check size={13} className="text-[color:var(--accent,#a3c9a8)]" /> : null}
        </button>

        <button
          type="button"
          onClick={() => onOpen?.(task)}
          className="min-w-0 flex-1 text-left"
          disabled={!onOpen}
        >
          <p
            className={cx(
              "text-[0.875rem] font-medium leading-snug transition-colors",
              task.done ? "text-white/35 line-through" : "text-white/90",
            )}
          >
            {task.title}
          </p>

          {(due || task.tags.length > 0 || task.priority !== "normal") && !compact ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {due ? (
                <Chip tone={overdue ? "danger" : "neutral"}>{overdue ? `Overdue · ${due}` : due}</Chip>
              ) : null}
              {task.priority !== "normal" ? (
                <span className="admin-chip">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: PRIORITY_DOT[task.priority] }}
                  />
                  {PRIORITY_LABEL[task.priority]}
                </span>
              ) : null}
              {task.tags.slice(0, 2).map((tag) => (
                <Chip key={tag}>{tag}</Chip>
              ))}
              {task.source === "ai" ? <Chip tone="gold">AI</Chip> : null}
            </div>
          ) : null}

          {compact && due ? (
            <p
              className={cx(
                "mt-1 text-[0.6875rem]",
                overdue ? "text-[color:var(--admin-danger)]" : "text-[color:var(--admin-text-muted)]",
              )}
            >
              {overdue ? `Overdue · ${due}` : due}
            </p>
          ) : null}
        </button>
      </motion.div>
    </div>
  );
}
