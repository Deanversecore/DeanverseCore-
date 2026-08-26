"use client";

import { motion } from "framer-motion";
import { MapPin, Phone, Plane, Target, User, Users } from "lucide-react";
import type { CalendarEvent, EventKind } from "@/lib/types";
import { format, formatTimeRange } from "@/lib/date";
import { cx } from "@/components/ui/Primitives";

const KIND_META: Record<EventKind, { icon: typeof Users; tint: string }> = {
  meeting: { icon: Users, tint: "#c9a962" },
  call: { icon: Phone, tint: "#a3c9a8" },
  focus: { icon: Target, tint: "#6f8f72" },
  personal: { icon: User, tint: "#dfc88a" },
  travel: { icon: Plane, tint: "#8eb4c9" },
};

interface EventRowProps {
  event: CalendarEvent;
  now: Date;
  showDate?: boolean;
  onSelect?: (event: CalendarEvent) => void;
}

export function EventRow({ event, now, showDate = false, onSelect }: EventRowProps) {
  const meta = KIND_META[event.kind];
  const Icon = meta.icon;
  const start = new Date(event.startAt);
  const live = start.getTime() <= now.getTime() && new Date(event.endAt).getTime() >= now.getTime();
  const past = new Date(event.endAt).getTime() < now.getTime();

  return (
    <motion.button
      type="button"
      layout
      onClick={() => onSelect?.(event)}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cx(
        "admin-tool-card flex w-full items-center gap-3 px-4 py-3 text-left",
        past && "opacity-45",
      )}
      style={live ? { borderColor: "color-mix(in srgb, var(--admin-gold) 40%, transparent)" } : undefined}
    >
      <div className="flex w-[3.25rem] shrink-0 flex-col items-start">
        <span className="tabular text-[0.8125rem] font-semibold text-white/85">{format(start, "h:mm")}</span>
        <span className="text-[0.5625rem] font-semibold uppercase tracking-wider text-white/35">
          {format(start, "a")}
        </span>
      </div>

      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: `color-mix(in srgb, ${meta.tint} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${meta.tint} 26%, transparent)`,
          color: meta.tint,
        }}
      >
        <Icon size={14} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.8125rem] font-medium text-white/90">{event.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[0.6875rem] text-white/45">
          {showDate ? `${format(start, "EEE, MMM d")} · ` : ""}
          {formatTimeRange(event.startAt, event.endAt)}
          {event.location ? (
            <>
              <MapPin size={10} className="shrink-0" />
              <span className="truncate">{event.location}</span>
            </>
          ) : null}
        </p>
      </div>

      {live ? (
        <span className="admin-chip admin-chip-gold shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--admin-gold-light)]" />
          Now
        </span>
      ) : null}
    </motion.button>
  );
}
