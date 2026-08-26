"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ Panel */

interface PanelProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  variant?: "raised" | "flat";
  sheen?: boolean;
}

export function Panel({ children, className, variant = "raised", sheen = true, ...rest }: PanelProps) {
  return (
    <motion.div
      className={cx(
        variant === "raised" ? "admin-panel" : "admin-panel-flat",
        sheen && variant === "raised" && "admin-sheen-top relative overflow-hidden",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------------- Eyebrow */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("admin-eyebrow", className)}>{children}</p>;
}

/* ---------------------------------------------------------- SectionHeader */

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ eyebrow, title, action, className }: SectionHeaderProps) {
  return (
    <div className={cx("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow ? <Eyebrow className="mb-1.5">{eyebrow}</Eyebrow> : null}
        <h2 className="admin-heading-serif truncate text-[1.0625rem] text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------- Chip */

type ChipTone = "neutral" | "gold" | "emerald" | "danger";

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: "admin-chip",
  gold: "admin-chip admin-chip-gold",
  emerald: "admin-chip admin-chip-emerald",
  danger: "admin-chip admin-chip-danger",
};

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
}) {
  return <span className={cx(CHIP_TONES[tone], className)}>{children}</span>;
}

/* --------------------------------------------------------------- Skeleton */

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cx("skeleton", className)} style={style} aria-hidden />;
}

export function SkeletonPanel({ lines = 3 }: { lines?: number }) {
  return (
    <div className="admin-panel p-5">
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="mt-3.5 h-5 w-3/5" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className="h-3.5" style={{ width: `${92 - index * 14}%` }} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- EmptyState */

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center px-6 py-12 text-center"
    >
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-[color:var(--admin-gold)]"
        style={{
          border: "1px solid color-mix(in srgb, var(--admin-gold) 26%, transparent)",
          background: "var(--admin-gold-soft)",
        }}
      >
        {icon}
      </div>
      <h3 className="admin-heading-serif text-lg text-white">{title}</h3>
      <p className="mt-2 max-w-[19rem] text-[0.8125rem] leading-relaxed text-[color:var(--admin-text-muted)]">
        {body}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </motion.div>
  );
}

/* ------------------------------------------------------------ ProgressBar */

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={cx("h-1.5 w-full overflow-hidden rounded-full", className)}
      style={{ background: "#ffffff0f" }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: "linear-gradient(90deg, #6f8f72, #c9a962)" }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
