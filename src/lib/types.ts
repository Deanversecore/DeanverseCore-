export type Priority = "low" | "normal" | "high" | "critical";

export type EntityKind =
  | "task"
  | "reminder"
  | "event"
  | "note"
  | "memory"
  | "goal"
  | "routine"
  | "followUp";

export interface Task {
  id: string;
  title: string;
  notes?: string;
  done: boolean;
  completedAt?: string | null;
  dueAt?: string | null;
  priority: Priority;
  tags: string[];
  goalId?: string | null;
  source: "manual" | "ai";
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  remindAt: string;
  done: boolean;
  taskId?: string | null;
  createdAt: string;
}

export type EventKind = "meeting" | "call" | "focus" | "personal" | "travel";

export interface CalendarEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  kind: EventKind;
  location?: string;
  notes?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MemoryKind = "preference" | "fact" | "person" | "project";

export interface Memory {
  id: string;
  content: string;
  kind: MemoryKind;
  subject?: string;
  createdAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetDate?: string | null;
  milestones: Milestone[];
  createdAt: string;
}

export type TimeOfDay = "morning" | "afternoon" | "evening";

export interface Routine {
  id: string;
  title: string;
  timeOfDay: TimeOfDay;
  /** 0 = Sunday … 6 = Saturday */
  days: number[];
  streak: number;
  lastCompletedAt?: string | null;
  createdAt: string;
}

export type FollowUpChannel = "call" | "email" | "message" | "meeting";

export interface FollowUp {
  id: string;
  person: string;
  context: string;
  channel: FollowUpChannel;
  dueAt?: string | null;
  done: boolean;
  createdAt: string;
}

export interface ActionReceipt {
  kind: EntityKind;
  verb: "created" | "updated" | "completed" | "removed" | "recalled";
  id: string;
  label: string;
  detail?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  receipts?: ActionReceipt[];
  suggestions?: string[];
}

export interface UserProfile {
  name: string;
  timezoneLabel: string;
  workdayStartHour: number;
  workdayEndHour: number;
  proactiveEnabled: boolean;
  voiceEnabled: boolean;
  hapticsEnabled: boolean;
}

export interface AppData {
  profile: UserProfile;
  tasks: Task[];
  reminders: Reminder[];
  events: CalendarEvent[];
  notes: Note[];
  memories: Memory[];
  goals: Goal[];
  routines: Routine[];
  followUps: FollowUp[];
  messages: ChatMessage[];
  dismissedInsights: string[];
}

export type InsightTone = "urgent" | "attention" | "opportunity" | "positive";

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
  actionLabel?: string;
  actionPrompt?: string;
}
