"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type {
  AppData,
  CalendarEvent,
  ChatMessage,
  FollowUp,
  Goal,
  Memory,
  Note,
  Priority,
  Reminder,
  Routine,
  Task,
  UserProfile,
} from "@/lib/types";
import { createId } from "@/lib/id";
import { emptyData, seedData } from "@/lib/seed";
import type { Effect } from "@/lib/ai/engine";
import { isSameDay } from "@/lib/date";

const STORAGE_KEY = "deanverse-ai:v1";

interface StoreState extends AppData {
  hydrated: boolean;
  seeded: boolean;
  setHydrated: () => void;
  bootstrap: () => void;
  reset: (withSeed: boolean) => void;

  addTask: (input: Partial<Task> & { title: string }) => Task;
  updateTask: (id: string, changes: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;

  addReminder: (input: { title: string; remindAt: string }) => Reminder;
  updateReminder: (id: string, changes: Partial<Reminder>) => void;
  toggleReminder: (id: string) => void;
  removeReminder: (id: string) => void;

  addEvent: (input: Omit<CalendarEvent, "id" | "createdAt">) => CalendarEvent;
  removeEvent: (id: string) => void;

  addNote: (input: { title: string; body: string; tags?: string[] }) => Note;
  updateNote: (id: string, changes: Partial<Note>) => void;
  removeNote: (id: string) => void;

  addMemory: (input: Omit<Memory, "id" | "createdAt">) => Memory;
  removeMemory: (id: string) => void;

  addGoal: (input: { title: string; description?: string; targetDate?: string | null }) => Goal;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  addMilestone: (goalId: string, title: string) => void;
  removeGoal: (id: string) => void;

  addRoutine: (input: Omit<Routine, "id" | "createdAt" | "streak" | "lastCompletedAt">) => Routine;
  completeRoutine: (id: string) => void;
  removeRoutine: (id: string) => void;

  addFollowUp: (input: Omit<FollowUp, "id" | "createdAt" | "done">) => FollowUp;
  toggleFollowUp: (id: string) => void;
  removeFollowUp: (id: string) => void;

  appendMessage: (message: ChatMessage) => void;
  clearMessages: () => void;

  applyEffects: (effects: Effect[]) => void;
  dismissInsight: (id: string) => void;
  updateProfile: (changes: Partial<UserProfile>) => void;
}

function nowIso() {
  return new Date().toISOString();
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...emptyData(),
      hydrated: false,
      seeded: false,

      setHydrated: () => set({ hydrated: true }),

      bootstrap: () => {
        if (get().seeded) return;
        set({ ...seedData(new Date()), seeded: true, hydrated: true });
      },

      reset: (withSeed) => {
        set({ ...(withSeed ? seedData(new Date()) : emptyData()), seeded: true, hydrated: true });
      },

      // ------------------------------------------------------------- tasks
      addTask: (input) => {
        const task: Task = {
          id: createId("task"),
          title: input.title,
          notes: input.notes,
          done: false,
          dueAt: input.dueAt ?? null,
          priority: (input.priority as Priority) ?? "normal",
          tags: input.tags ?? [],
          goalId: input.goalId ?? null,
          source: input.source ?? "manual",
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        set((state) => ({ tasks: [task, ...state.tasks] }));
        return task;
      },

      updateTask: (id, changes) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...changes, updatedAt: nowIso() } : task,
          ),
        })),

      toggleTask: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  done: !task.done,
                  completedAt: task.done ? null : nowIso(),
                  updatedAt: nowIso(),
                }
              : task,
          ),
        })),

      removeTask: (id) => set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) })),

      // --------------------------------------------------------- reminders
      addReminder: (input) => {
        const reminder: Reminder = {
          id: createId("rem"),
          title: input.title,
          remindAt: input.remindAt,
          done: false,
          createdAt: nowIso(),
        };
        set((state) => ({ reminders: [reminder, ...state.reminders] }));
        return reminder;
      },

      updateReminder: (id, changes) =>
        set((state) => ({
          reminders: state.reminders.map((item) => (item.id === id ? { ...item, ...changes } : item)),
        })),

      toggleReminder: (id) =>
        set((state) => ({
          reminders: state.reminders.map((item) =>
            item.id === id ? { ...item, done: !item.done } : item,
          ),
        })),

      removeReminder: (id) =>
        set((state) => ({ reminders: state.reminders.filter((item) => item.id !== id) })),

      // ------------------------------------------------------------ events
      addEvent: (input) => {
        const event: CalendarEvent = { ...input, id: createId("evt"), createdAt: nowIso() };
        set((state) => ({ events: [...state.events, event] }));
        return event;
      },

      removeEvent: (id) => set((state) => ({ events: state.events.filter((item) => item.id !== id) })),

      // ------------------------------------------------------------- notes
      addNote: (input) => {
        const note: Note = {
          id: createId("note"),
          title: input.title,
          body: input.body,
          tags: input.tags ?? [],
          pinned: false,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        set((state) => ({ notes: [note, ...state.notes] }));
        return note;
      },

      updateNote: (id, changes) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, ...changes, updatedAt: nowIso() } : note,
          ),
        })),

      removeNote: (id) => set((state) => ({ notes: state.notes.filter((note) => note.id !== id) })),

      // ------------------------------------------------------------ memory
      addMemory: (input) => {
        const memory: Memory = { ...input, id: createId("mem"), createdAt: nowIso() };
        set((state) => ({ memories: [memory, ...state.memories] }));
        return memory;
      },

      removeMemory: (id) =>
        set((state) => ({ memories: state.memories.filter((item) => item.id !== id) })),

      // ------------------------------------------------------------- goals
      addGoal: (input) => {
        const goal: Goal = {
          id: createId("goal"),
          title: input.title,
          description: input.description,
          targetDate: input.targetDate ?? null,
          milestones: [],
          createdAt: nowIso(),
        };
        set((state) => ({ goals: [goal, ...state.goals] }));
        return goal;
      },

      toggleMilestone: (goalId, milestoneId) =>
        set((state) => ({
          goals: state.goals.map((goal) =>
            goal.id === goalId
              ? {
                  ...goal,
                  milestones: goal.milestones.map((milestone) =>
                    milestone.id === milestoneId ? { ...milestone, done: !milestone.done } : milestone,
                  ),
                }
              : goal,
          ),
        })),

      addMilestone: (goalId, title) =>
        set((state) => ({
          goals: state.goals.map((goal) =>
            goal.id === goalId
              ? { ...goal, milestones: [...goal.milestones, { id: createId("ms"), title, done: false }] }
              : goal,
          ),
        })),

      removeGoal: (id) => set((state) => ({ goals: state.goals.filter((goal) => goal.id !== id) })),

      // ---------------------------------------------------------- routines
      addRoutine: (input) => {
        const routine: Routine = {
          ...input,
          id: createId("rtn"),
          streak: 0,
          lastCompletedAt: null,
          createdAt: nowIso(),
        };
        set((state) => ({ routines: [...state.routines, routine] }));
        return routine;
      },

      completeRoutine: (id) =>
        set((state) => ({
          routines: state.routines.map((routine) => {
            if (routine.id !== id) return routine;
            const now = new Date();
            const alreadyDone = routine.lastCompletedAt && isSameDay(new Date(routine.lastCompletedAt), now);
            if (alreadyDone) {
              return { ...routine, lastCompletedAt: null, streak: Math.max(0, routine.streak - 1) };
            }
            return { ...routine, lastCompletedAt: now.toISOString(), streak: routine.streak + 1 };
          }),
        })),

      removeRoutine: (id) =>
        set((state) => ({ routines: state.routines.filter((routine) => routine.id !== id) })),

      // -------------------------------------------------------- follow-ups
      addFollowUp: (input) => {
        const followUp: FollowUp = { ...input, id: createId("fup"), done: false, createdAt: nowIso() };
        set((state) => ({ followUps: [followUp, ...state.followUps] }));
        return followUp;
      },

      toggleFollowUp: (id) =>
        set((state) => ({
          followUps: state.followUps.map((item) =>
            item.id === id ? { ...item, done: !item.done } : item,
          ),
        })),

      removeFollowUp: (id) =>
        set((state) => ({ followUps: state.followUps.filter((item) => item.id !== id) })),

      // ----------------------------------------------------------- messages
      appendMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

      clearMessages: () => set({ messages: [] }),

      // ------------------------------------------------------------ effects
      applyEffects: (effects) => {
        for (const effect of effects) {
          switch (effect.op) {
            case "addTask":
              set((state) => ({ tasks: [effect.payload, ...state.tasks] }));
              break;
            case "updateTask":
              set((state) => ({
                tasks: state.tasks.map((task) =>
                  task.id === effect.id ? { ...task, ...effect.changes } : task,
                ),
              }));
              break;
            case "addReminder":
              set((state) => ({ reminders: [effect.payload, ...state.reminders] }));
              break;
            case "updateReminder":
              set((state) => ({
                reminders: state.reminders.map((item) =>
                  item.id === effect.id ? { ...item, ...effect.changes } : item,
                ),
              }));
              break;
            case "addEvent":
              set((state) => ({ events: [...state.events, effect.payload] }));
              break;
            case "addNote":
              set((state) => ({ notes: [effect.payload, ...state.notes] }));
              break;
            case "addMemory":
              set((state) => ({ memories: [effect.payload, ...state.memories] }));
              break;
            case "addGoal":
              set((state) => ({ goals: [effect.payload, ...state.goals] }));
              break;
            case "addFollowUp":
              set((state) => ({ followUps: [effect.payload, ...state.followUps] }));
              break;
          }
        }
      },

      dismissInsight: (id) =>
        set((state) => ({ dismissedInsights: [...state.dismissedInsights, id] })),

      updateProfile: (changes) => set((state) => ({ profile: { ...state.profile, ...changes } })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        profile: state.profile,
        tasks: state.tasks,
        reminders: state.reminders,
        events: state.events,
        notes: state.notes,
        memories: state.memories,
        goals: state.goals,
        routines: state.routines,
        followUps: state.followUps,
        messages: state.messages,
        dismissedInsights: state.dismissedInsights,
        seeded: state.seeded,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

/**
 * Reading the whole workspace in a component needs a shallow comparison —
 * selectData builds a fresh wrapper object on every call, which would otherwise
 * look like a new snapshot to useSyncExternalStore on each render.
 */
export function useAppData(): AppData {
  return useStore(useShallow(selectData));
}

export function selectData(state: StoreState): AppData {
  return {
    profile: state.profile,
    tasks: state.tasks,
    reminders: state.reminders,
    events: state.events,
    notes: state.notes,
    memories: state.memories,
    goals: state.goals,
    routines: state.routines,
    followUps: state.followUps,
    messages: state.messages,
    dismissedInsights: state.dismissedInsights,
  };
}
