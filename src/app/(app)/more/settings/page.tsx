"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudOff, CloudUpload, LogOut, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useStore, selectData } from "@/lib/store";
import { useMounted } from "@/lib/hooks";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getSession, pullWorkspace, pushWorkspace, signInWithEmail, signOut, type SyncSession } from "@/lib/supabase/sync";
import { Eyebrow, Panel, Skeleton, cx } from "@/components/ui/Primitives";
import { SubPage } from "@/components/more/SubPage";
import { haptic } from "@/lib/haptics";

export default function SettingsPage() {
  const mounted = useMounted();
  const hydrated = useStore((state) => state.hydrated);
  const profile = useStore((state) => state.profile);
  const updateProfile = useStore((state) => state.updateProfile);
  const reset = useStore((state) => state.reset);

  const [session, setSession] = useState<SyncSession | null>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void getSession().then(setSession);
  }, []);

  const push = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    const { error } = await pushWorkspace(session.userId, selectData(useStore.getState()));
    setStatus(error ?? "Workspace backed up.");
    setBusy(false);
  }, [session]);

  const pull = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    const remote = await pullWorkspace(session.userId);
    if (remote) {
      useStore.setState({ ...remote, seeded: true });
      setStatus("Workspace restored from your account.");
    } else {
      setStatus("Nothing stored in the cloud yet.");
    }
    setBusy(false);
  }, [session]);

  if (!mounted || !hydrated) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-20">
        <Skeleton className="h-32 rounded-[var(--admin-radius)]" />
        <Skeleton className="h-40 rounded-[var(--admin-radius)]" />
      </div>
    );
  }

  return (
    <SubPage eyebrow="Preferences" title="Settings">
      <div className="flex flex-col gap-5">
        <Panel className="p-5">
          <Eyebrow>Profile</Eyebrow>
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <label htmlFor="profile-name" className="mb-1.5 block text-[0.6875rem] text-white/45">
                What should I call you?
              </label>
              <input
                id="profile-name"
                className="admin-input"
                value={profile.name}
                onChange={(event) => updateProfile({ name: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="day-start" className="mb-1.5 block text-[0.6875rem] text-white/45">
                  Day starts
                </label>
                <input
                  id="day-start"
                  type="number"
                  min={0}
                  max={23}
                  className="admin-input tabular"
                  value={profile.workdayStartHour}
                  onChange={(event) =>
                    updateProfile({ workdayStartHour: clampHour(Number(event.target.value)) })
                  }
                />
              </div>
              <div>
                <label htmlFor="day-end" className="mb-1.5 block text-[0.6875rem] text-white/45">
                  Day ends
                </label>
                <input
                  id="day-end"
                  type="number"
                  min={0}
                  max={23}
                  className="admin-input tabular"
                  value={profile.workdayEndHour}
                  onChange={(event) => updateProfile({ workdayEndHour: clampHour(Number(event.target.value)) })}
                />
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <Eyebrow>Assistant</Eyebrow>
          <div className="mt-2 flex flex-col divide-y divide-white/[0.06]">
            <Toggle
              label="Proactive signals"
              description="Surface what's slipping without being asked"
              checked={profile.proactiveEnabled}
              onChange={(value) => updateProfile({ proactiveEnabled: value })}
            />
            <Toggle
              label="Voice input"
              description="Dictate to the assistant when your device supports it"
              checked={profile.voiceEnabled}
              onChange={(value) => updateProfile({ voiceEnabled: value })}
            />
            <Toggle
              label="Haptics"
              description="Subtle feedback on completions and captures"
              checked={profile.hapticsEnabled}
              onChange={(value) => updateProfile({ hapticsEnabled: value })}
            />
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={13} className="text-[color:var(--admin-emerald)]" />
            <Eyebrow>Privacy &amp; sync</Eyebrow>
          </div>

          {!isSupabaseConfigured ? (
            <div className="mt-3 flex items-start gap-3">
              <CloudOff size={15} className="mt-0.5 shrink-0 text-white/35" />
              <p className="text-[0.75rem] leading-relaxed text-white/55">
                Sync is off. Everything lives on this device only. Add your Supabase URL and anon key to
                enable an encrypted, row-level-secured backup of your workspace.
              </p>
            </div>
          ) : session ? (
            <div className="mt-3">
              <p className="text-[0.75rem] text-white/55">
                Signed in as <span className="text-white/85">{session.email}</span>
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={push} disabled={busy} className="admin-btn-ghost">
                  <CloudUpload size={15} />
                  Back up
                </button>
                <button type="button" onClick={pull} disabled={busy} className="admin-btn-ghost">
                  <RefreshCw size={15} />
                  Restore
                </button>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  setSession(null);
                  setStatus("Signed out.");
                }}
                className="admin-btn-ghost mt-2 w-full"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-[0.75rem] leading-relaxed text-white/55">
                Sign in with a magic link to carry your workspace across devices. Your rows are readable
                only by you.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  className="admin-input"
                  type="email"
                  value={email}
                  placeholder="you@example.com"
                  aria-label="Email address"
                  onChange={(event) => setEmail(event.target.value)}
                />
                <button
                  type="button"
                  disabled={!email.includes("@") || busy}
                  onClick={async () => {
                    setBusy(true);
                    const { error } = await signInWithEmail(email);
                    setStatus(error ?? "Check your email for the sign-in link.");
                    setBusy(false);
                  }}
                  className="admin-btn-gold shrink-0"
                >
                  Send link
                </button>
              </div>
            </div>
          )}

          {status ? (
            <p className="mt-3 text-[0.6875rem] text-[color:var(--admin-gold-light)]" role="status">
              {status}
            </p>
          ) : null}
        </Panel>

        <Panel className="p-5">
          <Eyebrow>Workspace data</Eyebrow>
          <p className="mt-2.5 text-[0.75rem] leading-relaxed text-white/55">
            Reset clears everything on this device. Sample data gives you a populated workspace to explore.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                haptic("warning");
                reset(true);
                setStatus("Sample workspace loaded.");
              }}
              className="admin-btn-ghost"
            >
              <RefreshCw size={15} />
              Sample data
            </button>
            <button
              type="button"
              onClick={() => {
                haptic("warning");
                reset(false);
                setStatus("Workspace cleared.");
              }}
              className="admin-btn-ghost"
              style={{ color: "var(--admin-danger)", borderColor: "#c45c5c3d" }}
            >
              <Trash2 size={15} />
              Clear all
            </button>
          </div>
        </Panel>

        <p className="pb-4 text-center text-[0.625rem] text-white/25">
          DeanVerse AI · built by DeanVerse Digital
        </p>
      </div>
    </SubPage>
  );
}

function clampHour(value: number): number {
  if (Number.isNaN(value)) return 9;
  return Math.min(23, Math.max(0, Math.round(value)));
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        haptic("select");
        onChange(!checked);
      }}
      className="flex items-center gap-4 py-3.5 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[0.8125rem] font-medium text-white/90">{label}</span>
        <span className="mt-0.5 block text-[0.6875rem] leading-relaxed text-white/45">{description}</span>
      </span>
      <span
        className={cx("relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300")}
        style={{
          background: checked ? "linear-gradient(135deg, #c9a962, #aa8c46)" : "#ffffff14",
          border: checked ? "1px solid #c9a96273" : "1px solid #ffffff1a",
        }}
      >
        <span
          className="absolute top-1/2 h-4.5 w-4.5 -translate-y-1/2 rounded-full bg-white transition-all duration-300"
          style={{ width: "1.125rem", height: "1.125rem", left: checked ? "calc(100% - 1.3rem)" : "0.175rem" }}
        />
      </span>
    </button>
  );
}
