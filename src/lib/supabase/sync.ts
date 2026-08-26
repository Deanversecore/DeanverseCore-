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

export async function pullWorkspace(userId: string): Promise<AppData | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABLE).select("data").eq("user_id", userId).maybeSingle();
  if (error || !data?.data) return null;
  return data.data as AppData;
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
