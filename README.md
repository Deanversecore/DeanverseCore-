# DeanVerse AI

A mobile-first personal command center built as a natural extension of
[DeanVerse Digital](https://www.deanversedigital.com/). It is not a chatbot wrapper — it is a
planning system that captures what you say, keeps it organized, and tells you what's slipping
before you have to ask.

## Design lineage

The visual identity is taken directly from the live DeanVerse Digital stylesheet rather than
reinvented. `src/app/globals.css` carries the site's own tokens:

| Token | Value | Role |
| --- | --- | --- |
| `--background` / `--admin-bg` | `#0f1a17` / `#040a08` | Deep emerald canvas |
| `--admin-emerald` | `#6f8f72` | Primary, matching the site's `--primary` |
| `--admin-emerald-deep` | `#2f5d50` | Borders and depth, the site's `--dark-alt` |
| `--admin-gold` | `#c9a962` | Accent — the most-used color on the site |
| `--admin-gold-light` | `#dfc88a` | Highlights and headings |
| `--admin-radius` | `20px` | Card radius |
| `--admin-elev-1..3` | site shadows | Elevation |
| `--admin-ease-out` | `cubic-bezier(.16, 1, .3, 1)` | Motion curve |

Typography follows the same hierarchy: Inter for interface text, a Georgia-metric serif
(Gelasio) for headings and stat values, and the site's uppercase tracked eyebrow labels.
Component classes (`admin-btn-gold`, `admin-btn-ghost`, `admin-input`, `admin-panel`,
`admin-tool-card`) are reproductions of the classes the site already ships.

## Nothing in it is invented

There is no sample workspace and no demo mode. A fresh install asks for your name, your working
hours, and reads your device's timezone — that is the only profile data that exists. Every task,
event, note, memory, goal, routine, and follow-up after that is something you captured, either by
hand or by talking to the assistant. When there is nothing to report, the assistant says so
rather than filling the screen.

## What it does

**Home** — a live command center: personalized greeting, date and time, an AI-generated daily
overview with counts, a "what should I do next?" recommendation with reasoning, proactive
signals, today's priorities, upcoming events, reminders, follow-ups, routines, and quick capture.

**AI** — a full-screen conversation that turns natural language into real records:

```
"Remind me tomorrow to call John."      → reminder, scheduled
"Remember that this project is due Friday."  → task with a Friday deadline
"Create a task for the invoice."        → task
"Move the invoice to tomorrow."         → reschedules the existing task
"Mark the case study as done."          → completes it
"Plan my day." / "Plan my week."        → ordered plan around your real calendar
"What am I forgetting?"                 → overdue work, cold follow-ups, undated tasks
"Who do I need to follow up with?"      → people, sorted by how long they've waited
"Summarize everything I need to know."  → full briefing
```

Every answer that changes something renders a receipt showing exactly what was created or
updated, so the assistant is never a black box.

**It talks back** — the conversation runs both ways. Replies are read out loud, any answer can be
replayed from its own **Listen** button, and hands-free mode re-opens the microphone the moment
the assistant finishes its turn, so you can keep going without touching the screen. With
`AI_API_KEY` set, `/api/speech` streams a real text-to-speech voice; without it the device's own
speech engine is used and you can pick from its installed voices in settings. The speaker button
in the assistant header mutes and unmutes it at any time.

**Proactive layer** — `src/lib/ai/proactive.ts` raises signals on its own: tasks carried over
from yesterday, an appointment starting soon, a follow-up going cold, a busy afternoon with
little open capacity, a heavy week. Each is dismissible and stays dismissed.

**Also included** — tasks with swipe gestures, calendar with a day strip, notes, personal
memory, goals with milestones, routines with streaks, follow-ups, cross-workspace search,
voice input, and settings.

## Architecture

```
src/
  app/(app)/          Mobile shell + screens (home, ai, tasks, calendar, more/*)
  app/api/ai/         Optional LLM rewrite of the computed answer
  app/api/speech/     Optional text-to-speech for the assistant's voice
  components/         UI primitives, shell, onboarding, per-screen components
  lib/ai/             nlu.ts (intent parsing) · engine.ts (execution)
                      briefing.ts (plans) · proactive.ts (signals)
  lib/voice.ts        Dictation in, spoken replies out
  lib/store.ts        Zustand + persisted local storage
  lib/selectors.ts    Derived views shared by the UI and the assistant
  lib/supabase/       Client, workspace table access, and live two-way sync
supabase/schema.sql   Row-level-secured workspace table
```

The assistant is **local-first and deterministic**. `interpret()` parses an utterance into a
typed intent, `runIntent()` executes it against your workspace and returns effects the store
applies. It works offline and responds instantly.

Both optional layers detect their own configuration — there are no feature flags to remember.
When `AI_API_KEY` is present, `/api/ai` restyles the already-computed answer with an LLM (it is
explicitly forbidden from inventing facts, and any failure falls back to the local answer) and
`/api/speech` gives the assistant its voice. When the key is absent both quietly stand down.

Sync is the same story. With Supabase credentials set and an account signed in, `useCloudSync`
adopts the account's copy on sign-in, pushes every local edit on a short debounce, and applies
writes streamed from your other devices over a realtime channel. Settings shows the live status
and the time of the last successful sync. Without credentials the workspace simply stays on the
device.

## Running it

```bash
npm install
npm run dev
```

Open on a phone (or a narrow viewport) — the layout is built mobile-first for a 390px frame.
Answer the two onboarding questions and the workspace is yours.

Configuration is optional; see `.env.example`. For sync, run `supabase/schema.sql` in your
Supabase project, then sign in from **More → Settings** with a magic link. Row-level security
restricts every row to its owner. For the richer assistant voice and LLM-polished replies, set
`AI_API_KEY` — both features switch themselves on.

Tests cover intent parsing, execution against a fixture workspace, the empty-workspace answers,
and the markdown-to-speech conversion:

```bash
npm test
npm run lint
```

## Accessibility and performance

Touch targets meet the 44px minimum, interactive controls carry labels and `aria-pressed` /
`aria-current` state, focus rings use the brand gold, and all motion collapses under
`prefers-reduced-motion`. Every screen renders a branded skeleton before hydration, so there is
no layout shift on load.
