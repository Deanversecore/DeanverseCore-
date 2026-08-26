"use client";

import type { AppData } from "@/lib/types";
import { getSupabase } from "@/lib/supabase/client";

const TABLE = "assistant_workspaces";

export interface SyncSession {
  userId: string;
  email: string | null;
}

export async function getSession(): Promise<SyncSession | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  return { userId: data.session.user.id, email: data.session.user.email ?? null };
}

export async function signInWithEmail(email: string): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
  });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
}

/**
 * Reports sign-in and sign-out as they happen, including the session Supabase
 * recovers from a magic-link redirect.
 */
export function onAuthChange(handler: (session: SyncSession | null) => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    handler(session ? { userId: session.user.id, email: session.user.email ?? null } : null);
  });
  return () => data.subscription.unsubscribe();
}

/** Streams workspace writes made on your other devices. */
export function subscribeWorkspace(
  userId: string,
  handler: (data: AppData) => void,
): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`workspace:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE, filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as { data?: AppData } | null;
        if (row?.data) handler(row.data);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export interface PullResult {
  data: AppData | null;
  error: string | null;
}

export async function pullWorkspace(userId: string): Promise<PullResult> {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: "Supabase is not configured." };
  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: (data?.data as AppData | undefined) ?? null, error: null };
}

export async function pushWorkspace(userId: string, data: AppData): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.from(TABLE).upsert(
    { user_id: userId, data, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  return { error: error?.message ?? null };
}
