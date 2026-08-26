"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Search } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { formatClock, formatLongDate, greetingFor } from "@/lib/date";

export function HomeHeader({ name, now }: { name: string; now: Date }) {
  return (
    <header className="px-5 pt-4 pb-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark size={34} />
          <div className="leading-none">
            <p className="admin-eyebrow">DeanVerse AI</p>
            <p className="mt-1 text-[0.6875rem] text-white/40">Command center</p>
          </div>
        </div>

        <Link
          href="/more/search"
          aria-label="Search everything"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/55 transition-colors active:bg-white/10"
        >
          <Search size={17} />
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6"
      >
        <h1 className="admin-heading-serif text-[1.75rem] text-white">
          {greetingFor(now)}
          {name.trim() ? (
            <>
              , <span className="text-gold-gradient">{name.trim()}</span>
            </>
          ) : (
            "."
          )}
        </h1>
        <p className="mt-1.5 text-[0.8125rem] text-[color:var(--admin-text-muted)]">
          {formatLongDate(now)} · <span className="tabular">{formatClock(now)}</span>
        </p>
      </motion.div>
    </header>
  );
}
