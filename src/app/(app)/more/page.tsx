"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Brain,
  ChevronRight,
  NotebookPen,
  Repeat,
  Search,
  Settings2,
  Target,
  UserRound,
} from "lucide-react";
import { useAppData, useStore } from "@/lib/store";
import { useMounted, useNow } from "@/lib/hooks";
import { openFollowUps } from "@/lib/selectors";
import { Eyebrow, Panel, Skeleton } from "@/components/ui/Primitives";
import { LogoWordmark } from "@/components/ui/Logo";
import { completedToday } from "@/lib/selectors";
import { haptic } from "@/lib/haptics";

export default function MorePage() {
  const mounted = useMounted();
  const hydrated = useStore((state) => state.hydrated);
  const data = useAppData();
  const now = useNow(60_000);
  const syncStatus = useStore((state) => state.sync.status);

  if (!mounted || !hydrated) return <MoreSkeleton />;

  const sections = [
    {
      href: "/more/search",
      label: "Search everything",
      description: "Tasks, notes, memory, people",
      icon: Search,
      badge: null,
    },
    {
      href: "/more/notes",
      label: "Notes",
      description: "Thinking, drafts, and captures",
      icon: NotebookPen,
      badge: data.notes.length,
    },
    {
      href: "/more/memory",
      label: "Personal memory",
      description: "What the assistant knows about you",
      icon: Brain,
      badge: data.memories.length,
    },
    {
      href: "/more/goals",
      label: "Goals",
      description: "Outcomes and milestones",
      icon: Target,
      badge: data.goals.length,
    },
    {
      href: "/more/routines",
      label: "Routines",
      description: "The rhythms you keep",
      icon: Repeat,
      badge: data.routines.length,
    },
    {
      href: "/more/followups",
      label: "Follow-ups",
      description: "People waiting on you",
      icon: UserRound,
      badge: openFollowUps(data).length,
    },
    {
      href: "/more/settings",
      label: "Settings",
      description: "Profile, privacy, and sync",
      icon: Settings2,
      badge: null,
    },
  ];

  const doneToday = completedToday(data, now).length;
  const openCount = data.tasks.filter((task) => !task.done).length;

  return (
    <div className="pb-6">
      <header className="px-5 pt-6">
        <Eyebrow>Workspace</Eyebrow>
        <h1 className="admin-heading-serif mt-1.5 text-[1.75rem] text-white">More</h1>
      </header>

      <div className="mt-5 px-4">
        <Panel className="p-5">
          <LogoWordmark />
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Open", value: openCount },
              { label: "Done today", value: doneToday },
              { label: "Memories", value: data.memories.length },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[var(--admin-radius-sm)] border border-white/[0.06] bg-white/[0.03] px-2 py-2.5 text-center"
              >
                <p className="admin-stat-value text-[1.25rem] text-[color:var(--admin-gold-light)]">
                  {stat.value}
                </p>
                <p className="mt-1 text-[0.5625rem] font-semibold uppercase tracking-[0.14em] text-white/40">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <nav className="mt-6 flex flex-col gap-2 px-4" aria-label="Workspace sections">
        {sections.map(({ href, label, description, icon: Icon, badge }) => (
          <motion.div
            key={href}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link
              href={href}
              onClick={() => haptic("select")}
              className="admin-tool-card flex items-center gap-3.5 px-4 py-3.5"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[color:var(--admin-gold)]"
                style={{
                  background: "var(--admin-gold-soft)",
                  border: "1px solid color-mix(in srgb, var(--admin-gold) 20%, transparent)",
                }}
              >
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.875rem] font-medium text-white/90">{label}</span>
                <span className="mt-0.5 block truncate text-[0.6875rem] text-white/45">{description}</span>
              </span>
              {badge !== null && badge > 0 ? (
                <span className="admin-chip shrink-0 tabular">{badge}</span>
              ) : null}
              <ChevronRight size={16} className="shrink-0 text-white/25" />
            </Link>
          </motion.div>
        ))}
      </nav>

      <p className="mt-8 px-6 text-center text-[0.6875rem] leading-relaxed text-white/25">
        {syncStatus === "synced" || syncStatus === "syncing"
          ? "Your workspace is syncing to your account."
          : "Your workspace lives on this device. Sign in from settings to carry it across devices."}
      </p>
    </div>
  );
}

function MoreSkeleton() {
  return (
    <div className="px-4 pt-8">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-8 w-24 rounded-xl" />
      <Skeleton className="mt-6 h-[9.5rem] rounded-[var(--admin-radius)]" />
      <div className="mt-6 flex flex-col gap-2">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="h-[4.25rem] rounded-[var(--admin-radius-md)]" />
        ))}
      </div>
    </div>
  );
}
