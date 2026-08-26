"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { BottomNav } from "@/components/shell/BottomNav";
import { Onboarding } from "@/components/shell/Onboarding";
import { useStore } from "@/lib/store";
import { useCloudSync } from "@/lib/supabase/useCloudSync";
import { haptic, setHapticsEnabled } from "@/lib/haptics";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useStore((state) => state.hydrated);
  const onboardedAt = useStore((state) => state.profile.onboardedAt);
  const hapticsEnabled = useStore((state) => state.profile.hapticsEnabled);

  useCloudSync();

  useEffect(() => {
    setHapticsEnabled(hapticsEnabled);
  }, [hapticsEnabled]);

  if (hydrated && !onboardedAt) {
    return (
      <div className="relative z-10 mx-auto w-full max-w-lg">
        <Onboarding />
      </div>
    );
  }

  const showAssistantButton = pathname !== "/ai";

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <main
        className="flex-1 pb-[calc(var(--app-bottomnav-height)+0.5rem)]"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showAssistantButton ? (
          <motion.button
            key="assistant-fab"
            type="button"
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 12 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              haptic("tap");
              router.push("/ai");
            }}
            aria-label="Open the DeanVerse assistant"
            className="gold-pulse fixed bottom-[calc(var(--app-bottomnav-height)+1rem)] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              background: "linear-gradient(135deg, #c9a962f2 0%, #aa8c46f2 100%)",
              border: "1px solid #c9a96273",
              boxShadow: "0 10px 34px -8px var(--admin-gold-glow), var(--admin-elev-2)",
            }}
          >
            <Sparkles size={21} strokeWidth={2} color="#0a0a0a" />
          </motion.button>
        ) : null}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
