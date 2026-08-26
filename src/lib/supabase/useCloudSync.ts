"use client";

import { useEffect, useRef } from "react";
import type { AppData } from "@/lib/types";
import { selectData, useStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getSession,
  onAuthChange,
  pullWorkspace,
  pushWorkspace,
  subscribeWorkspace,
} from "@/lib/supabase/sync";

const PUSH_DEBOUNCE_MS = 900;

const SLICES = [
  "profile",
  "tasks",
  "reminders",
  "events",
  "notes",
  "memories",
  "goals",
  "routines",
  "followUps",
  "messages",
  "dismissedInsights",
] as const;

/** Store updates are immutable, so reference equality is enough to spot a real edit. */
function workspaceChanged(a: AppData, b: AppData): boolean {
  return SLICES.some((slice) => a[slice] !== b[slice]);
}

function isEmptyWorkspace(data: AppData): boolean {
  return (
    data.tasks.length === 0 &&
    data.reminders.length === 0 &&
    data.events.length === 0 &&
    data.notes.length === 0 &&
    data.memories.length === 0 &&
    data.goals.length === 0 &&
    data.routines.length === 0 &&
    data.followUps.length === 0
  );
}

/**
 * Keeps the workspace and the signed-in account in step without anyone pressing
 * a button: it adopts the account copy on sign-in, pushes every local edit, and
 * applies writes streamed from your other devices.
 */
export function useCloudSync() {
  const hydrated = useStore((state) => state.hydrated);
  const userId = useStore((state) => state.sync.session?.userId ?? null);
  const applyingRemote = useRef(false);

  useEffect(() => {
    const { setSync } = useStore.getState();

    if (!isSupabaseConfigured) {
      setSync({ status: "unconfigured", session: null, message: null });
      return;
    }

    setSync({ status: "connecting" });

    let active = true;
    void getSession().then((current) => {
      if (!active) return;
      setSync({
        session: current,
        status: current ? "connecting" : "signed-out",
      });
    });

    const unsubscribe = onAuthChange((next) => {
      setSync({
        session: next,
        status: next ? "connecting" : "signed-out",
        lastSyncedAt: null,
        message: null,
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !userId) return;

    const { setSync, replaceWorkspace } = useStore.getState();
    let active = true;
    let pushTimer: number | undefined;
    let lastSnapshot = selectData(useStore.getState());

    const applyRemote = (remote: AppData) => {
      applyingRemote.current = true;
      replaceWorkspace(remote);
      lastSnapshot = selectData(useStore.getState());
      applyingRemote.current = false;
      setSync({ status: "synced", lastSyncedAt: new Date().toISOString(), message: null });
    };

    const push = async () => {
      const snapshot = selectData(useStore.getState());
      setSync({ status: "syncing" });
      const { error } = await pushWorkspace(userId, snapshot);
      if (!active) return;
      setSync(
        error
          ? { status: "error", message: error }
          : { status: "synced", lastSyncedAt: new Date().toISOString(), message: null },
      );
    };

    void (async () => {
      setSync({ status: "syncing" });
      const { data: remote, error } = await pullWorkspace(userId);
      if (!active) return;

      if (error) {
        setSync({ status: "error", message: error });
        return;
      }

      const local = selectData(useStore.getState());
      if (remote && !(isEmptyWorkspace(remote) && !isEmptyWorkspace(local))) {
        applyRemote(remote);
      } else {
        await push();
      }
    })();

    const unsubscribeRemote = subscribeWorkspace(userId, (remote) => {
      if (!active || applyingRemote.current) return;
      if (workspaceChanged(remote, selectData(useStore.getState()))) applyRemote(remote);
    });

    const unsubscribeLocal = useStore.subscribe((state) => {
      if (applyingRemote.current) return;
      const snapshot = selectData(state);
      if (!workspaceChanged(snapshot, lastSnapshot)) return;
      lastSnapshot = snapshot;
      window.clearTimeout(pushTimer);
      pushTimer = window.setTimeout(() => void push(), PUSH_DEBOUNCE_MS);
    });

    return () => {
      active = false;
      window.clearTimeout(pushTimer);
      unsubscribeRemote();
      unsubscribeLocal();
    };
  }, [hydrated, userId]);
}
