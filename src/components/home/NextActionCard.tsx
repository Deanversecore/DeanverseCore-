"use client";

import { useRouter } from "next/navigation";
import { Check, Compass } from "lucide-react";
import type { AppData } from "@/lib/types";
import { nextBestAction } from "@/lib/ai/briefing";
import { Eyebrow, Panel } from "@/components/ui/Primitives";
import { useStore } from "@/lib/store";
import { haptic } from "@/lib/haptics";

export function NextActionCard({ data, now }: { data: AppData; now: Date }) {
  const router = useRouter();
  const toggleTask = useStore((state) => state.toggleTask);
  const action = nextBestAction(data, now);

  return (
    <Panel
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="relative p-5"
      style={{
        borderColor: "color-mix(in srgb, var(--admin-gold) 26%, transparent)",
        background:
          "linear-gradient(145deg, #c9a9620f, color-mix(in srgb, var(--admin-panel) 90%, transparent))",
      }}
    >
      <div className="flex items-center gap-2">
        <Compass size={13} className="text-[color:var(--admin-gold)]" />
        <Eyebrow>What should I do next?</Eyebrow>
      </div>

      <h3 className="admin-heading-serif mt-3 text-[1.125rem] leading-snug text-white">{action.headline}</h3>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-white/60">{action.reason}</p>

      <div className="mt-4 flex gap-2">
        {action.task ? (
          <button
            type="button"
            onClick={() => {
              haptic("success");
              toggleTask(action.task!.id);
            }}
            className="admin-btn-gold flex-1"
          >
            <Check size={15} />
            Mark done
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            haptic("tap");
            router.push("/ai?q=Plan%20my%20day");
          }}
          className={action.task ? "admin-btn-ghost flex-1" : "admin-btn-gold w-full"}
        >
          Plan my day
        </button>
      </div>
    </Panel>
  );
}
