"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import type { AppData } from "@/lib/types";
import { buildDailyBriefing } from "@/lib/ai/briefing";
import { Eyebrow, Panel } from "@/components/ui/Primitives";
import { haptic } from "@/lib/haptics";

export function BriefingCard({ data, now }: { data: AppData; now: Date }) {
  const router = useRouter();
  const briefing = buildDailyBriefing(data, now);

  return (
    <Panel
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      className="p-4"
    >
      <div className="flex items-center gap-2">
        <Sparkles size={13} className="text-[color:var(--admin-gold)]" />
        <Eyebrow>Daily overview</Eyebrow>
      </div>

      <h2 className="admin-heading-serif mt-2 text-[1.125rem] text-white">{briefing.headline}</h2>
      <p className="mt-1.5 line-clamp-3 text-[0.8125rem] leading-relaxed text-white/80">{briefing.body}</p>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {briefing.stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[var(--admin-radius-sm)] border border-white/[0.06] bg-white/[0.03] px-1 py-2 text-center"
          >
            <p className="admin-stat-value text-[1.125rem] text-[color:var(--admin-gold-light)]">{stat.value}</p>
            <p className="mt-1 px-0.5 text-[0.5rem] font-semibold uppercase leading-tight tracking-[0.1em] text-white/40">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          haptic("tap");
          router.push("/ai?q=Summarize%20everything%20I%20need%20to%20know");
        }}
        className="admin-btn-ghost mt-3 w-full"
      >
        Full briefing
        <ArrowRight size={15} />
      </button>
    </Panel>
  );
}
