"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarDays, LayoutGrid, ListChecks, MoreHorizontal, Sparkles } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { unlockAudioPlayback } from "@/lib/voice";
import { cx } from "@/components/ui/Primitives";

const ITEMS = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/ai", label: "AI", icon: Sparkles },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/more", label: "More", icon: MoreHorizontal },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="app-bottomnav relative z-40 shrink-0"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1.5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                onClick={() => {
                  haptic("select");
                  if (href === "/ai") unlockAudioPlayback();
                }}
                aria-current={active ? "page" : undefined}
                className="relative flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5"
              >
                {active ? (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-1.5 inset-y-0.5 rounded-2xl"
                    style={{
                      background: "var(--admin-gold-soft)",
                      border: "1px solid color-mix(in srgb, var(--admin-gold) 24%, transparent)",
                    }}
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                ) : null}
                <Icon
                  size={19}
                  strokeWidth={active ? 2.1 : 1.7}
                  className={cx(
                    "relative z-10 transition-colors duration-300",
                    active ? "text-[color:var(--admin-gold-light)]" : "text-white/70",
                  )}
                />
                <span
                  className={cx(
                    "relative z-10 text-[0.625rem] font-semibold tracking-wide transition-colors duration-300",
                    active ? "text-[color:var(--admin-gold-light)]" : "text-white/70",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
