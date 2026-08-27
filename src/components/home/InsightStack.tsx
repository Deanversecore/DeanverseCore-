"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowUpRight, BellRing, CircleCheck, Lightbulb, X } from "lucide-react";
import type { AppData, Insight, InsightTone } from "@/lib/types";
import { buildInsights } from "@/lib/ai/proactive";
import { Eyebrow, cx } from "@/components/ui/Primitives";
import { useStore } from "@/lib/store";
import { haptic } from "@/lib/haptics";

const TONE_STYLES: Record<InsightTone, { border: string; glow: string; icon: typeof BellRing; color: string }> = {
  urgent: {
    border: "color-mix(in srgb, #c45c5c 34%, transparent)",
    glow: "#c45c5c14",
    icon: AlertTriangle,
    color: "#e39a9a",
  },
  attention: {
    border: "color-mix(in srgb, var(--admin-gold) 30%, transparent)",
    glow: "#c9a96212",
    icon: BellRing,
    color: "var(--admin-gold-light)",
  },
  opportunity: {
    border: "color-mix(in srgb, var(--admin-emerald) 34%, transparent)",
    glow: "#6f8f7214",
    icon: Lightbulb,
    color: "#a3c9a8",
  },
  positive: {
    border: "color-mix(in srgb, var(--admin-emerald) 30%, transparent)",
    glow: "#6f8f7212",
    icon: CircleCheck,
    color: "#a3c9a8",
  },
};

export function InsightStack({ data, now }: { data: AppData; now: Date }) {
  const router = useRouter();
  const dismissInsight = useStore((state) => state.dismissInsight);
  const insights = buildInsights(data, now);

  if (insights.length === 0) return null;

  return (
    <section aria-label="Assistant signals">
      <Eyebrow className="mb-2.5 px-1">Core noticed</Eyebrow>
      <div className="flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {insights.map((insight, index) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              index={index}
              onDismiss={() => {
                haptic("tap");
                dismissInsight(insight.id);
              }}
              onAct={() => {
                haptic("tap");
                router.push(`/ai?q=${encodeURIComponent(insight.actionPrompt ?? insight.title)}`);
              }}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

function InsightCard({
  insight,
  index,
  onDismiss,
  onAct,
}: {
  insight: Insight;
  index: number;
  onDismiss: () => void;
  onAct: () => void;
}) {
  const tone = TONE_STYLES[insight.tone];
  const Icon = tone.icon;

  return (
    <motion.article
      layout
      initial={false}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -140, height: 0, marginBottom: -10 }}
      transition={{ duration: 0.34, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 100) onDismiss();
      }}
      className="admin-tool-card flex touch-pan-y items-start gap-3 px-4 py-3.5"
      style={{ borderColor: tone.border, background: `linear-gradient(145deg, ${tone.glow}, #0d1713cc)` }}
    >
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ background: tone.glow, border: `1px solid ${tone.border}`, color: tone.color }}
      >
        <Icon size={14} />
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="text-[0.8125rem] font-semibold leading-snug text-white/90">{insight.title}</h3>
        <p className="mt-1 text-[0.75rem] leading-relaxed text-white/55">{insight.body}</p>
        {insight.actionLabel ? (
          <button
            type="button"
            onClick={onAct}
            className={cx(
              "mt-2.5 inline-flex items-center gap-1 text-[0.6875rem] font-semibold",
              "text-[color:var(--admin-gold-light)]",
            )}
          >
            {insight.actionLabel}
            <ArrowUpRight size={12} />
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label={`Dismiss: ${insight.title}`}
        className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/30 transition-colors active:bg-white/10 active:text-white/60"
      >
        <X size={14} />
      </button>
    </motion.article>
  );
}
