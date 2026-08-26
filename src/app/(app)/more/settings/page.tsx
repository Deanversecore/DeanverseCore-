"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { CloudOff, LogOut, RefreshCw, ShieldCheck, Trash2, Volume2 } from "lucide-react";
import { useStore, selectData, type SyncStatus } from "@/lib/store";
import { useMounted } from "@/lib/hooks";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { pushWorkspace, signInWithEmail, signOut } from "@/lib/supabase/sync";
import {
  isSpeechOutputSupported,
  listVoices,
  speak,
  stopSpeaking,
  subscribeVoices,
} from "@/lib/voice";
import { formatClock } from "@/lib/date";
import { Eyebrow, Panel, Skeleton, cx } from "@/components/ui/Primitives";
import { SubPage } from "@/components/more/SubPage";
import { haptic } from "@/lib/haptics";

const noopSubscribe = () => () => {};
const returnFalse = () => false;

export default function SettingsPage() {
  const mounted = useMounted();
  const hydrated = useStore((state) => state.hydrated);
  const profile = useStore((state) => state.profile);
  const updateProfile = useStore((state) => state.updateProfile);
  const reset = useStore((state) => state.reset);
  const sync = useStore((state) => state.sync);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const session = sync.session;

  const backUpNow = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    const { error } = await pushWorkspace(session.userId, selectData(useStore.getState()));
    setStatus(error ?? "Workspace pushed to your account.");
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

        <VoicePanel />

        <Panel className="p-5">
          <Eyebrow>Timezone</Eyebrow>
          <p className="mt-2.5 text-[0.75rem] leading-relaxed text-white/55">
            {profile.timezoneLabel
              ? `Planning around ${profile.timezoneLabel}.`
              : "No timezone detected on this device."}
          </p>
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
              <p className="mt-1.5 flex items-center gap-2 text-[0.6875rem] text-white/45">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: sync.status === "error" ? "#c45c5c" : "#6f8f72" }}
                />
                {syncLabel(sync.status, sync.lastSyncedAt, sync.message)}
              </p>
              <button
                type="button"
                onClick={backUpNow}
                disabled={busy}
                className="admin-btn-ghost mt-3 w-full"
              >
                <RefreshCw size={15} />
                Sync now
              </button>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  setStatus("Signed out. This device keeps its own copy.");
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
                Sign in with a magic link and your workspace syncs itself from then on — every edit
                pushes automatically and changes from your other devices arrive live. Your rows are
                readable only by you.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  name="sync-email"
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
            Everything here is what you captured — there is no sample content to fall back on.
            Clearing removes every task, event, note, and memory on this device, and on your account
            if sync is on.
          </p>
          <button
            type="button"
            onClick={() => {
              haptic("warning");
              reset();
              setStatus("Workspace cleared.");
            }}
            className="admin-btn-ghost mt-3 w-full"
            style={{ color: "var(--admin-danger)", borderColor: "#c45c5c3d" }}
          >
            <Trash2 size={15} />
            Clear everything
          </button>
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

function syncLabel(status: SyncStatus, lastSyncedAt: string | null, message: string | null): string {
  if (status === "error") return message ?? "Sync failed.";
  if (status === "syncing") return "Syncing…";
  if (status === "connecting") return "Connecting…";
  if (lastSyncedAt) return `Synced at ${formatClock(new Date(lastSyncedAt))}`;
  return "Waiting for the first change.";
}

/** Spoken replies, plus whichever voices this device actually has. */
function VoicePanel() {
  const profile = useStore((state) => state.profile);
  const updateProfile = useStore((state) => state.updateProfile);
  const supported = useSyncExternalStore(noopSubscribe, isSpeechOutputSupported, returnFalse);
  const [voices, setVoices] = useState<{ uri: string; label: string }[]>([]);

  useEffect(() => {
    if (!supported) return;
    const read = () =>
      setVoices(
        listVoices().map((voice) => ({ uri: voice.voiceURI, label: `${voice.name} (${voice.lang})` })),
      );
    read();
    return subscribeVoices(read);
  }, [supported]);

  useEffect(() => () => stopSpeaking(), []);

  if (!supported) return null;

  return (
    <Panel className="p-5">
      <div className="flex items-center gap-2">
        <Volume2 size={13} className="text-[color:var(--admin-gold)]" />
        <Eyebrow>Assistant voice</Eyebrow>
      </div>

      <div className="mt-2 flex flex-col divide-y divide-white/[0.06]">
        <Toggle
          label="Spoken replies"
          description="The assistant reads its answers out loud"
          checked={profile.spokenRepliesEnabled}
          onChange={(value) => {
            if (!value) stopSpeaking();
            updateProfile({ spokenRepliesEnabled: value });
          }}
        />
        <Toggle
          label="Hands-free conversation"
          description="It listens again as soon as it finishes speaking"
          checked={profile.handsFreeEnabled}
          onChange={(value) => updateProfile({ handsFreeEnabled: value })}
        />
      </div>

      {voices.length > 0 ? (
        <div className="mt-4">
          <label htmlFor="assistant-voice" className="mb-1.5 block text-[0.6875rem] text-white/45">
            Voice
          </label>
          <select
            id="assistant-voice"
            name="voice"
            className="admin-input"
            value={profile.voiceURI ?? ""}
            onChange={(event) => updateProfile({ voiceURI: event.target.value || null })}
          >
            <option value="">System default</option>
            {voices.map((voice) => (
              <option key={voice.uri} value={voice.uri}>
                {voice.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          haptic("tap");
          void speak(
            "settings-preview",
            `Hello ${profile.name || "there"}. This is how I'll sound when I read your day back to you.`,
            { voiceURI: profile.voiceURI },
          );
        }}
        className="admin-btn-ghost mt-4 w-full"
      >
        <Volume2 size={15} />
        Hear the voice
      </button>

      <p className="mt-3 text-[0.625rem] leading-relaxed text-white/30">
        A server voice key gives a richer voice; without one your device&apos;s own speech engine is
        used.
      </p>
    </Panel>
  );
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
