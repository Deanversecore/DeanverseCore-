"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/shell/BottomNav";
import { Onboarding } from "@/components/shell/Onboarding";
import { LogoMark } from "@/components/ui/Logo";
import { useStore } from "@/lib/store";
import { useCloudSync } from "@/lib/supabase/useCloudSync";
import { setHapticsEnabled } from "@/lib/haptics";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useStore((state) => state.hydrated);
  const onboardedAt = useStore((state) => state.profile.onboardedAt);
  const hapticsEnabled = useStore((state) => state.profile.hapticsEnabled);

  useCloudSync();

  useEffect(() => {
    setHapticsEnabled(hapticsEnabled);
  }, [hapticsEnabled]);

  useEffect(() => {
    const finish = () => useStore.getState().setHydrated();
    const unsub = useStore.persist.onFinishHydration(finish);
    if (useStore.persist.hasHydrated()) finish();
    const fallback = window.setTimeout(finish, 80);
    return () => {
      unsub();
      window.clearTimeout(fallback);
    };
  }, []);

  if (!hydrated) {
    return (
      <div className="relative z-10 mx-auto flex h-dvh w-full max-w-lg items-center justify-center overflow-hidden">
        <LogoMark size={52} />
      </div>
    );
  }

  if (!onboardedAt) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="relative z-10 mx-auto flex h-dvh w-full max-w-lg flex-col overflow-hidden">
          <Onboarding />
        </div>
      </MotionConfig>
    );
  }

  const immersive = pathname === "/ai";

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative z-10 mx-auto flex h-dvh max-h-dvh w-full max-w-lg flex-col overflow-hidden">
        <main
          className={
            immersive
              ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
              : "min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
          }
          style={immersive ? undefined : { paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              className={immersive ? "flex h-full min-h-0 flex-1 flex-col" : undefined}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNav />
      </div>
    </MotionConfig>
  );
}
