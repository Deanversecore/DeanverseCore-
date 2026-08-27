"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Search } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { formatClock, formatLongDate, greetingFor } from "@/lib/date";

export function HomeHeader({ name, now }: { name: string; now: Date }) {
  return (
    <header className="px-4 pt-3 pb-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <LogoMark size={28} />
          <div className="min-w-0 leading-none">
            <p className="admin-eyebrow">DeanVerse AI</p>
            <p className="mt-1 truncate text-[0.6875rem] text-white/70">
              {formatLongDate(now)} · <span className="tabular">{formatClock(now)}</span>
            </p>
          </div>
        </div>

        <Link
          href="/more/search"
          aria-label="Search everything"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/55 transition-colors active:bg-white/10"
        >
          <Search size={16} />
        </Link>
      </div>

      <motion.h1
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="admin-heading-serif mt-3 text-[1.375rem] text-white"
      >
        {greetingFor(now)}
        {name.trim() ? (
          <>
            , <span className="text-gold-gradient">{name.trim()}</span>
          </>
        ) : (
          "."
        )}
      </motion.h1>
    </header>
  );
}
