import assert from "node:assert/strict";
import test from "node:test";
import { interpret } from "../src/lib/ai/nlu";
import { respond } from "../src/lib/ai/engine";
import { testWorkspace } from "./fixture";
import { emptyData } from "../src/lib/seed";
import { toSpokenText } from "../src/lib/voice";
import type { AppData } from "../src/lib/types";

/* A fixed Wednesday so weekday and "tomorrow" maths are deterministic. */
const NOW = new Date("2026-08-26T10:00:00");

function workspace(): AppData {
  return testWorkspace(NOW);
}

test("captures a reminder with a natural date", () => {
  const intent = interpret("Remind me tomorrow to call John", NOW);
  assert.equal(intent.type, "create_reminder");
  if (intent.type !== "create_reminder") return;

  assert.equal(intent.title, "Call John");
  const remindAt = new Date(intent.remindAt);
  assert.equal(remindAt.getDate(), 27);
  assert.equal(remindAt.getMonth(), 7);
});

test("turns a remembered deadline into a dated task", () => {
  const intent = interpret("Remember that this project is due Friday", NOW);
  assert.equal(intent.type, "create_task");
  if (intent.type !== "create_task") return;

  assert.ok(intent.dueAt, "expected a due date");
  assert.equal(new Date(intent.dueAt).getDay(), 5);
  assert.ok(!/friday/i.test(intent.title), `date leaked into title: ${intent.title}`);
});

test("stores a preference as memory rather than a task", () => {
  const intent = interpret("Remember that I prefer mornings for deep work", NOW);
  assert.equal(intent.type, "remember");
});

test("reads a bare imperative as a task with a deadline", () => {
  const intent = interpret("Send the invoice by Friday", NOW);
  assert.equal(intent.type, "create_task");
  if (intent.type !== "create_task") return;
  assert.equal(intent.title, "Send the invoice");
  assert.ok(intent.dueAt);
});

test("marks urgency as critical priority", () => {
  const intent = interpret("Create a task for the urgent client fix", NOW);
  assert.equal(intent.type, "create_task");
  if (intent.type !== "create_task") return;
  assert.equal(intent.priority, "critical");
});

test("schedules an event at a specific time", () => {
  const intent = interpret("Schedule a meeting with Maria tomorrow at 2pm", NOW);
  assert.equal(intent.type, "create_event");
  if (intent.type !== "create_event") return;

  const start = new Date(intent.startAt);
  assert.equal(start.getHours(), 14);
  assert.equal(start.getDate(), 27);
});

test("recognises the planning and review questions", () => {
  const cases: Array<[string, string]> = [
    ["Plan my day.", "plan_day"],
    ["Help me organize my week.", "plan_week"],
    ["What's important today?", "whats_important"],
    ["What am I forgetting?", "forgetting"],
    ["What should I do next?", "next_action"],
    ["Who do I need to follow up with?", "follow_ups"],
    ["Summarize everything I need to know.", "summary"],
  ];
  for (const [utterance, expected] of cases) {
    assert.equal(interpret(utterance, NOW).type, expected, `failed on: ${utterance}`);
  }
});

test("completes an existing task by loose reference", () => {
  const data = workspace();
  const result = respond("Mark the invoice as done", data, NOW);

  const receipt = result.receipts.find((item) => item.verb === "completed");
  assert.ok(receipt, "expected a completion receipt");
  assert.match(receipt.label, /Invoice SoCal Appliance/);
});

test("moves a reminder to another day", () => {
  const data = workspace();
  const result = respond("Move the back up reminder to tomorrow", data, NOW);

  const effect = result.effects.find((item) => item.op === "updateReminder");
  assert.ok(effect, "expected the reminder to be rescheduled");
});

test("creating a task through the engine emits an effect and a receipt", () => {
  const data = workspace();
  const result = respond("Create a task to renew the domain tomorrow", data, NOW);

  assert.equal(result.effects.length, 1);
  assert.equal(result.effects[0].op, "addTask");
  assert.equal(result.receipts[0].kind, "task");
});

test("the forgetting report names overdue work", () => {
  const data = workspace();
  const result = respond("What am I forgetting?", data, NOW);
  assert.match(result.text, /Overdue/);
  assert.match(result.text, /Outlaw Tattoo/);
});

test("a day plan includes fixed calendar points", () => {
  const data = workspace();
  const result = respond("Plan my day", data, NOW);
  assert.match(result.text, /Fixed points/);
  assert.match(result.text, /Discovery call/);
});

test("unrecognised input still offers a useful next step", () => {
  const data = workspace();
  const result = respond("asdfgh qwerty", data, NOW);
  assert.equal(result.effects.length, 0);
  assert.ok(result.suggestions.length > 0);
});

test("an empty workspace answers honestly instead of inventing work", () => {
  const data = emptyData();

  assert.match(respond("What am I forgetting?", data, NOW).text, /Nothing's slipping/);
  assert.match(respond("What's important today?", data, NOW).text, /Nothing is fighting/);
  assert.match(respond("Who do I need to follow up with?", data, NOW).text, /No one is waiting/);
  assert.match(respond("Plan my day", data, NOW).text, /nothing pressing/);
});

test("a fresh profile carries no identity until onboarding fills it in", () => {
  const { profile } = emptyData();
  assert.equal(profile.name, "");
  assert.equal(profile.timezoneLabel, "");
  assert.equal(profile.onboardedAt, null);
});

test("spoken text drops the markup the screen renders", () => {
  const spoken = toSpokenText("**Overdue** — 2 items\n• Invoice SoCal Appliance\n1. Call John");
  assert.ok(!spoken.includes("**"));
  assert.ok(!spoken.includes("•"));
  assert.match(spoken, /Overdue, 2 items/);
  assert.match(spoken, /Invoice SoCal Appliance/);
  assert.match(spoken, /1, Call John/);
});
