import type { EventKind, FollowUpChannel, MemoryKind, Priority } from "@/lib/types";
import { parseNaturalDate } from "@/lib/date";

export type Intent =
  | { type: "create_task"; title: string; dueAt: string | null; priority: Priority }
  | { type: "create_reminder"; title: string; remindAt: string }
  | { type: "create_event"; title: string; startAt: string; endAt: string; kind: EventKind }
  | { type: "create_note"; title: string; body: string }
  | { type: "remember"; content: string; kind: MemoryKind; subject?: string }
  | { type: "create_goal"; title: string; targetDate: string | null }
  | { type: "create_followup"; person: string; context: string; channel: FollowUpChannel; dueAt: string | null }
  | { type: "complete_task"; query: string }
  | { type: "reschedule"; query: string; newDate: string }
  | { type: "plan_day" }
  | { type: "plan_week" }
  | { type: "whats_important" }
  | { type: "forgetting" }
  | { type: "next_action" }
  | { type: "follow_ups" }
  | { type: "summary" }
  | { type: "recall"; query: string }
  | { type: "search"; query: string }
  | { type: "greeting" }
  | { type: "unknown"; text: string };

const FILLER_PREFIX =
  /^(hey|hi|hello|ok|okay|please|could you|can you|would you|i need to|i want to|i have to|i should|let's|lets)\s+/i;

const PRIORITY_PATTERNS: Array<{ pattern: RegExp; priority: Priority }> = [
  { pattern: /\b(urgent|asap|critical|emergency|right away)\b/i, priority: "critical" },
  { pattern: /\b(important|high priority|priority|must)\b/i, priority: "high" },
  { pattern: /\b(low priority|whenever|sometime|eventually|no rush)\b/i, priority: "low" },
];

const EVENT_KIND_PATTERNS: Array<{ pattern: RegExp; kind: EventKind }> = [
  { pattern: /\b(call|phone|dial|zoom call|ring)\b/i, kind: "call" },
  { pattern: /\b(meeting|meet|sync|standup|stand-up|1:1|one on one|review|interview)\b/i, kind: "meeting" },
  { pattern: /\b(focus|deep work|block|work on|writing)\b/i, kind: "focus" },
  { pattern: /\b(flight|drive|travel|trip|airport)\b/i, kind: "travel" },
];

const CHANNEL_PATTERNS: Array<{ pattern: RegExp; channel: FollowUpChannel }> = [
  { pattern: /\b(call|phone|ring)\b/i, channel: "call" },
  { pattern: /\b(email|e-mail|mail)\b/i, channel: "email" },
  { pattern: /\b(meet|meeting|coffee|lunch)\b/i, channel: "meeting" },
];

function clean(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, "")
    .trim();
}

function stripFiller(text: string): string {
  let out = text.trim();
  let previous = "";
  while (out !== previous) {
    previous = out;
    out = out.replace(FILLER_PREFIX, "");
  }
  return out;
}

function extractPriority(text: string): Priority {
  for (const entry of PRIORITY_PATTERNS) {
    if (entry.pattern.test(text)) return entry.priority;
  }
  return "normal";
}

function detectEventKind(text: string): EventKind {
  for (const entry of EVENT_KIND_PATTERNS) {
    if (entry.pattern.test(text)) return entry.kind;
  }
  return "meeting";
}

function detectChannel(text: string): FollowUpChannel {
  for (const entry of CHANNEL_PATTERNS) {
    if (entry.pattern.test(text)) return entry.channel;
  }
  return "message";
}

function titleCaseName(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Removes the date phrase from a title so we don't get "Call John tomorrow at 3pm". */
function stripMatched(title: string, matched: string): string {
  if (!matched) return title;
  const escaped = matched.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return clean(
    title
      .replace(new RegExp(`\\b(on|at|by|for|before)\\s+${escaped}`, "i"), "")
      .replace(new RegExp(escaped, "i"), ""),
  );
}

function polishTitle(raw: string): string {
  const value = clean(stripFiller(raw).replace(/^(to|that|about)\s+/i, ""));
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function interpret(input: string, now: Date = new Date()): Intent {
  const text = clean(input);
  if (!text) return { type: "unknown", text: input };
  const lower = text.toLowerCase();

  if (/^(hi|hey|hello|yo|good (morning|afternoon|evening))\b[\s!.?]*$/i.test(lower)) {
    return { type: "greeting" };
  }

  // ---------------------------------------------------------------- queries
  if (/\bplan (out )?my (day|today)\b|\bplan today\b|\borganiz\w* my day\b|\bwhat does my day look like\b/.test(lower)) {
    return { type: "plan_day" };
  }
  if (/\bplan (out )?my week\b|\borganiz\w* my week\b|\bwhat does my week look like\b|\bweek(ly)? plan\b/.test(lower)) {
    return { type: "plan_week" };
  }
  if (/\bwhat('?s| is) important\b|\bwhat matters\b|\btop priorit(y|ies)\b|\bwhat should i focus on\b/.test(lower)) {
    return { type: "whats_important" };
  }
  if (/\bforget(ting|ten)?\b|\bmissing\b|\bdid i miss\b|\bslip(ped| through)\b/.test(lower)) {
    return { type: "forgetting" };
  }
  if (/\bwhat should i do next\b|\bwhat('?s| is) next\b|\bnext (thing|task|action|up)\b|\bwhere do i start\b/.test(lower)) {
    return { type: "next_action" };
  }
  if (/\bfollow(-| )?ups?\b|\bwho do i need to\b|\bwho('?s| is) waiting\b|\bwho should i (call|email|contact|reach)\b|\bchase\b/.test(lower)) {
    return { type: "follow_ups" };
  }
  if (/\bsummar(y|ize|ise)\b|\bbrief me\b|\bcatch me up\b|\beverything i need to know\b|\brundown\b/.test(lower)) {
    return { type: "summary" };
  }
  if (/\bwhat do you (know|remember) about\b|\bremind me what\b|\bdid i (say|tell you|mention)\b/.test(lower)) {
    const query = clean(lower.replace(/.*\babout\b/, "").replace(/.*\bwhat\b/, ""));
    return { type: "recall", query };
  }
  if (/^(find|search|look up|show me|pull up)\b/.test(lower)) {
    const query = clean(text.replace(/^(find|search|look up|show me|pull up)\s*(for|all|my)?\s*/i, ""));
    if (query) return { type: "search", query };
  }

  // ------------------------------------------------------------- mutations
  const completeMatch =
    /^(mark|check off|complete|finish|done with|i (?:finished|completed|did))\s+(?:off\s+)?(.+)$/i.exec(text);
  if (completeMatch) {
    const query = clean(completeMatch[2].replace(/\b(as\s+)?(done|complete|completed|finished)\b/i, ""));
    if (query) return { type: "complete_task", query };
  }

  const rescheduleMatch =
    /^(?:move|push|reschedule|shift|postpone|delay|bump)\s+(.+?)\s+(?:to|until|till|by)\s+(.+)$/i.exec(text);
  if (rescheduleMatch) {
    const parsed = parseNaturalDate(rescheduleMatch[2], now);
    if (parsed) {
      const query = clean(rescheduleMatch[1].replace(/^(the|my|this|that)\s+/i, "").replace(/\b(reminder|task|event)\b/i, ""));
      return { type: "reschedule", query, newDate: parsed.date.toISOString() };
    }
  }

  const rememberMatch = /^(?:remember|note|keep in mind|don'?t forget|save|store)\s+(?:that\s+)?(.+)$/i.exec(text);
  if (rememberMatch && !/^remember\s+to\b/i.test(text) && !/\bremind\b/i.test(lower)) {
    const content = clean(rememberMatch[1]);
    const parsed = parseNaturalDate(content, now);
    let kind: MemoryKind = "fact";
    if (/\bproject\b|\bclient\b|\blaunch\b|\bdeadline\b/i.test(content)) kind = "project";
    else if (/\bi (prefer|like|hate|always|never)\b|\bmy \w+ is\b/i.test(content)) kind = "preference";
    else if (/\b[A-Z][a-z]+('s)?\b/.test(rememberMatch[1]) && /\bhis|her|their|they\b/i.test(content)) kind = "person";

    // "Remember that this project is due Friday" also deserves a real deadline.
    if (parsed && /\bdue\b|\bdeadline\b|\bby\b/i.test(content)) {
      return {
        type: "create_task",
        title: polishTitle(stripMatched(content, parsed.matched)),
        dueAt: parsed.date.toISOString(),
        priority: extractPriority(content),
      };
    }
    return { type: "remember", content: clean(content.charAt(0).toUpperCase() + content.slice(1)), kind };
  }

  const reminderMatch =
    /^(?:remind me|set a reminder|reminder|remember)\s+(?:to\s+)?(.+)$/i.exec(text) ??
    /^(?:ping me|alert me|nudge me)\s+(?:to\s+)?(.+)$/i.exec(text);
  if (reminderMatch) {
    const body = clean(reminderMatch[1]);
    const parsed = parseNaturalDate(body, now);
    const title = polishTitle(stripMatched(body, parsed?.matched ?? ""));
    const remindAt = parsed?.date ?? new Date(now.getTime() + 60 * 60 * 1000);
    if (title) return { type: "create_reminder", title, remindAt: remindAt.toISOString() };
  }

  const followUpMatch =
    /^(?:follow up|check in|circle back|touch base)\s+(?:with\s+)?(.+)$/i.exec(text);
  if (followUpMatch) {
    const rest = clean(followUpMatch[1]);
    const parsed = parseNaturalDate(rest, now);
    const withoutDate = stripMatched(rest, parsed?.matched ?? "");
    const [personPart, ...contextParts] = withoutDate.split(/\s+(?:about|on|re|regarding|for)\s+/i);
    return {
      type: "create_followup",
      person: titleCaseName(clean(personPart)) || "Someone",
      context: clean(contextParts.join(" ")) || "General check-in",
      channel: detectChannel(text),
      dueAt: parsed?.date.toISOString() ?? null,
    };
  }

  const goalMatch = /^(?:my goal is|set a goal|new goal|goal:|i want to achieve)\s*(?:to\s+)?(.+)$/i.exec(text);
  if (goalMatch) {
    const body = clean(goalMatch[1]);
    const parsed = parseNaturalDate(body, now);
    return {
      type: "create_goal",
      title: polishTitle(stripMatched(body, parsed?.matched ?? "")),
      targetDate: parsed?.date.toISOString() ?? null,
    };
  }

  const noteMatch = /^(?:take a note|new note|note down|jot down|write down)\s*(?:that\s+)?(.+)$/i.exec(text);
  if (noteMatch) {
    const body = clean(noteMatch[1]);
    const title = body.split(/[.!?]/)[0].slice(0, 60);
    return { type: "create_note", title: polishTitle(title), body: clean(body.charAt(0).toUpperCase() + body.slice(1)) };
  }

  const eventMatch =
    /^(?:schedule|book|add|set up|put)\s+(?:a\s+|an\s+|my\s+)?(.+?)\s+(?:on|at|for|to)\s+(.+)$/i.exec(text);
  if (eventMatch && /\b(meeting|call|appointment|lunch|dinner|coffee|interview|sync|review|flight|session)\b/i.test(text)) {
    const parsed = parseNaturalDate(`${eventMatch[2]} ${text}`, now) ?? parseNaturalDate(text, now);
    if (parsed) {
      const start = parsed.date;
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const title = polishTitle(stripMatched(clean(eventMatch[1]), parsed.matched));
      return {
        type: "create_event",
        title: title || "New event",
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        kind: detectEventKind(text),
      };
    }
  }

  const taskMatch =
    /^(?:create (?:a )?task(?: for| to)?|add (?:a )?task(?: for| to)?|new task|todo|to-do|add to my list)\s*:?\s*(.+)$/i.exec(
      text,
    );
  if (taskMatch) {
    const body = clean(taskMatch[1]);
    const parsed = parseNaturalDate(body, now);
    return {
      type: "create_task",
      title: polishTitle(stripMatched(body, parsed?.matched ?? "")) || "New task",
      dueAt: parsed?.date.toISOString() ?? null,
      priority: extractPriority(body),
    };
  }

  // Bare imperatives — "call John tomorrow", "send the invoice by Friday".
  if (/^(call|email|send|write|review|finish|draft|prepare|pay|book|buy|submit|update|fix|ship|order|renew)\b/i.test(text)) {
    const parsed = parseNaturalDate(text, now);
    return {
      type: "create_task",
      title: polishTitle(stripMatched(text, parsed?.matched ?? "")),
      dueAt: parsed?.date.toISOString() ?? null,
      priority: extractPriority(text),
    };
  }

  if (/\bhelp me organize\b|\bhelp me plan\b|\bget organized\b/.test(lower)) {
    return { type: "plan_week" };
  }

  return { type: "unknown", text };
}
