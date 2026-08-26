"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NotebookPen, Pin, Plus, Trash2 } from "lucide-react";
import { useAppData, useStore } from "@/lib/store";
import { useMounted } from "@/lib/hooks";
import { formatDayLabel } from "@/lib/date";
import { Chip, EmptyState, Skeleton, cx } from "@/components/ui/Primitives";
import { SubPage } from "@/components/more/SubPage";
import { Sheet } from "@/components/ui/Sheet";
import { haptic } from "@/lib/haptics";

export default function NotesPage() {
  const mounted = useMounted();
  const hydrated = useStore((state) => state.hydrated);
  const data = useAppData();
  const updateNote = useStore((state) => state.updateNote);
  const removeNote = useStore((state) => state.removeNote);
  const addNote = useStore((state) => state.addNote);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  if (!mounted || !hydrated) {
    return (
      <div className="flex flex-col gap-2 px-4 pt-20">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-24 rounded-[var(--admin-radius-md)]" />
        ))}
      </div>
    );
  }

  const notes = [...data.notes].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  const submit = () => {
    if (!title.trim() && !body.trim()) return;
    haptic("success");
    addNote({ title: title.trim() || body.trim().slice(0, 48), body: body.trim() });
    setTitle("");
    setBody("");
    setOpen(false);
  };

  return (
    <SubPage
      eyebrow="Capture"
      title="Notes"
      action={
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="New note"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/70 active:bg-white/10"
        >
          <Plus size={17} />
        </button>
      }
    >
      {notes.length === 0 ? (
        <EmptyState
          icon={<NotebookPen size={22} />}
          title="No notes yet"
          body="Capture the thinking that doesn't belong on a task list. Say “take a note that…” and it lands here."
          action={
            <button type="button" onClick={() => setOpen(true)} className="admin-btn-gold">
              <Plus size={15} />
              New note
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {notes.map((note) => (
              <motion.article
                key={note.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: -10 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={cx("admin-tool-card px-4 py-3.5")}
                style={
                  note.pinned
                    ? { borderColor: "color-mix(in srgb, var(--admin-gold) 30%, transparent)" }
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 flex-1 text-[0.875rem] font-medium leading-snug text-white/90">
                    {note.title}
                  </h2>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        haptic("tap");
                        updateNote(note.id, { pinned: !note.pinned });
                      }}
                      aria-label={note.pinned ? "Unpin note" : "Pin note"}
                      aria-pressed={note.pinned}
                      className={cx(
                        "flex h-8 w-8 items-center justify-center rounded-full transition-colors active:bg-white/10",
                        note.pinned ? "text-[color:var(--admin-gold)]" : "text-white/25",
                      )}
                    >
                      <Pin size={14} fill={note.pinned ? "currentColor" : "none"} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        haptic("warning");
                        removeNote(note.id);
                      }}
                      aria-label={`Delete note: ${note.title}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-white/25 transition-colors active:bg-white/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <p className="mt-2 whitespace-pre-line text-[0.75rem] leading-relaxed text-white/55">
                  {note.body}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Chip>{formatDayLabel(note.createdAt)}</Chip>
                  {note.tags.map((tag) => (
                    <Chip key={tag} tone="emerald">
                      {tag}
                    </Chip>
                  ))}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="New note">
        <div className="flex flex-col gap-4 pb-4">
          <div>
            <label htmlFor="note-title" className="admin-eyebrow mb-2 block">
              Title
            </label>
            <input
              id="note-title"
              className="admin-input"
              value={title}
              autoFocus
              placeholder="Positioning ideas"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="note-body" className="admin-eyebrow mb-2 block">
              Body
            </label>
            <textarea
              id="note-body"
              rows={6}
              className="admin-input resize-none"
              value={body}
              placeholder="What's on your mind?"
              onChange={(event) => setBody(event.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim() && !body.trim()}
            className="admin-btn-gold w-full disabled:opacity-40"
          >
            Save note
          </button>
        </div>
      </Sheet>
    </SubPage>
  );
}
