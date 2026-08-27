"use client";

import { useAppData, useStore } from "@/lib/store";
import { useMounted, useNow } from "@/lib/hooks";
import { HomeHeader } from "@/components/home/HomeHeader";
import { BriefingCard } from "@/components/home/BriefingCard";
import { NextActionCard } from "@/components/home/NextActionCard";
import { InsightStack } from "@/components/home/InsightStack";
import {
  FollowUpsSection,
  PrioritiesSection,
  QuickActions,
  RemindersSection,
  RoutinesSection,
  ScheduleSection,
} from "@/components/home/DashboardSections";
import { SkeletonPanel, Skeleton } from "@/components/ui/Primitives";

export default function HomePage() {
  const mounted = useMounted();
  const hydrated = useStore((state) => state.hydrated);
  const data = useAppData();
  const now = useNow();

  if (!mounted || !hydrated) return <DashboardSkeleton />;

  return (
    <div className="pb-4">
      <HomeHeader name={data.profile.name} now={now} />

      <div className="mt-3 flex flex-col gap-4 px-4">
        <QuickActions />
        <NextActionCard data={data} now={now} />
        <BriefingCard data={data} now={now} />
        <InsightStack data={data} now={now} />
        <PrioritiesSection data={data} now={now} />
        <ScheduleSection data={data} now={now} />
        <RemindersSection data={data} now={now} />
        <FollowUpsSection data={data} />
        <RoutinesSection data={data} now={now} />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="px-4 pt-6 pb-6">
      <div className="flex items-center justify-between px-1">
        <Skeleton className="h-9 w-36 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <Skeleton className="mt-7 h-8 w-56 rounded-xl" />
      <Skeleton className="mt-3 h-3.5 w-40" />

      <div className="mt-7 flex flex-col gap-5">
        <SkeletonPanel lines={3} />
        <SkeletonPanel lines={2} />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-[4.5rem] rounded-[var(--admin-radius-md)]" />
          <Skeleton className="h-[4.5rem] rounded-[var(--admin-radius-md)]" />
        </div>
      </div>
    </div>
  );
}
