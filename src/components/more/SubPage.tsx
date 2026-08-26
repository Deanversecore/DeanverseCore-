"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/Primitives";

interface SubPageProps {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function SubPage({ eyebrow, title, action, children }: SubPageProps) {
  const router = useRouter();

  return (
    <div className="pb-8">
      <header className="app-topbar sticky top-0 z-20 flex items-center gap-3 px-3 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/60 active:bg-white/10"
        >
          <ChevronLeft size={17} />
        </button>
        <div className="min-w-0 flex-1">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="admin-heading-serif mt-0.5 truncate text-[1.0625rem] text-white">{title}</h1>
        </div>
        {action}
      </header>

      <div className="mt-4 px-4">{children}</div>
    </div>
  );
}
