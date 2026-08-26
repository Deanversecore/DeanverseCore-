"use client";

import { motion } from "framer-motion";
import { BellRing, CalendarPlus, ClipboardList, NotebookPen, Sparkles, Target, UserRound } from "lucide-react";
import type { ActionReceipt, ChatMessage, EntityKind } from "@/lib/types";
import { LogoMark } from "@/components/ui/Logo";
import { cx } from "@/components/ui/Primitives";

const RECEIPT_ICON: Record<EntityKind, typeof ClipboardList> = {
  task: ClipboardList,
  reminder: BellRing,
  event: CalendarPlus,
  note: NotebookPen,
  memory: Sparkles,
  goal: Target,
  routine: Target,
  followUp: UserRound,
};

/** Minimal renderer for the bold/bullet markup the engine emits. */
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, index) =>
    chunk.startsWith("**") && chunk.endsWith("**") ? (
      <strong key={index} className="font-semibold text-white">
        {chunk.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{chunk}</span>
    ),
  );
}

function MessageBody({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, index) => {
        if (line.trim() === "") return <div key={index} className="h-1.5" />;
        const bullet = /^[•\-]\s+/.test(line);
        const numbered = /^\d+\.\s+/.test(line);
        return (
          <p
            key={index}
            className={cx(
              "text-[0.8125rem] leading-relaxed",
              bullet || numbered ? "pl-3 text-white/70" : "text-white/80",
            )}
          >
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

function Receipts({ receipts }: { receipts: ActionReceipt[] }) {
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {receipts.map((receipt) => {
        const Icon = RECEIPT_ICON[receipt.kind];
        return (
          <motion.div
            key={`${receipt.id}-${receipt.verb}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2"
            style={{
              background: "var(--admin-gold-soft)",
              border: "1px solid color-mix(in srgb, var(--admin-gold) 22%, transparent)",
            }}
          >
            <Icon size={13} className="shrink-0 text-[color:var(--admin-gold)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.75rem] font-medium text-white/85">{receipt.label}</p>
              {receipt.detail ? (
                <p className="truncate text-[0.625rem] text-white/45">{receipt.detail}</p>
              ) : null}
            </div>
            <span className="shrink-0 text-[0.5625rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-gold-light)]">
              {receipt.verb}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex justify-end"
      >
        <div
          className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5"
          style={{
            background: "linear-gradient(135deg, #c9a962e6 0%, #aa8c46e6 100%)",
            border: "1px solid #c9a96259",
            boxShadow: "0 4px 18px -8px var(--admin-gold-glow)",
          }}
        >
          <p className="text-[0.8125rem] font-medium leading-relaxed text-[#0f1a17]">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-2.5"
    >
      <LogoMark size={28} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div
          className="rounded-2xl rounded-tl-md px-4 py-3"
          style={{
            background: "linear-gradient(145deg, #ffffff0b, #0d1713d9)",
            border: "1px solid var(--admin-hairline)",
          }}
        >
          <MessageBody content={message.content} />
          {message.receipts && message.receipts.length > 0 ? (
            <Receipts receipts={message.receipts} />
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export function ThinkingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-2.5"
    >
      <LogoMark size={28} className="mt-0.5 shrink-0" />
      <div
        className="flex items-center gap-1.5 rounded-2xl rounded-tl-md px-4 py-3.5"
        style={{
          background: "linear-gradient(145deg, #ffffff0b, #0d1713d9)",
          border: "1px solid var(--admin-hairline)",
        }}
      >
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className="h-1.5 w-1.5 rounded-full bg-[color:var(--admin-gold)]"
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: index * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  );
}
