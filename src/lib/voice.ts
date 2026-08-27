"use client";

interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionConstructor = new () => SpeechRecognitionLike;

function getConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isVoiceSupported(): boolean {
  return getConstructor() !== null;
}

interface VoiceHandlers {
  onPartial: (transcript: string) => void;
  onFinal: (transcript: string) => void;
  onEnd: () => void;
  onError?: (reason: string) => void;
}

const SILENCE_MS = 1400;

/** Ask for the mic up front so speech recognition is allowed to start. */
export async function unlockMicrophone(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) track.stop();
    return true;
  } catch {
    return false;
  }
}

/** Starts dictation and returns a stop function, or null when unsupported. */
export function startDictation(handlers: VoiceHandlers): (() => void) | null {
  const Recognition = getConstructor();
  if (!Recognition) {
    handlers.onError?.("unsupported");
    return null;
  }

  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let stopped = false;
  let committed = false;
  let finalTranscript = "";
  let interimTranscript = "";
  let silenceTimer: number | undefined;
  let restartTimer: number | undefined;

  let emptyRestarts = 0;
  let startedAt = 0;

  const snapshot = () => `${finalTranscript} ${interimTranscript}`.replace(/\s+/g, " ").trim();

  const finish = (transcript?: string) => {
    if (stopped) return;
    stopped = true;
    window.clearTimeout(silenceTimer);
    window.clearTimeout(restartTimer);
    try {
      recognition.stop();
    } catch {
      /* already stopping */
    }
    const text = (transcript ?? snapshot()).trim();
    if (text && !committed) {
      committed = true;
      handlers.onFinal(text);
    }
    handlers.onEnd();
  };

  const bumpSilence = () => {
    window.clearTimeout(silenceTimer);
    silenceTimer = window.setTimeout(() => {
      if (snapshot()) finish();
    }, SILENCE_MS);
  };

  recognition.onresult = (event) => {
    if (stopped) return;
    interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) finalTranscript += ` ${result[0].transcript}`;
      else interimTranscript += result[0].transcript;
    }
    handlers.onPartial(snapshot());
    bumpSilence();
  };

  recognition.onerror = (event) => {
    const error = event?.error ?? "";
    if (stopped) return;
    if (error === "no-speech" || error === "aborted") return;
    if (error === "not-allowed" || error === "service-not-allowed") {
      handlers.onError?.(error);
      finish("");
    }
  };

  const pump = () => {
    if (stopped) return;
    startedAt = Date.now();
    try {
      recognition.start();
    } catch {
      restartTimer = window.setTimeout(pump, 180);
    }
  };

  recognition.onend = () => {
    if (stopped) return;
    if (snapshot()) {
      finish();
      return;
    }
    const elapsed = Date.now() - startedAt;
    if (elapsed < 400) {
      emptyRestarts += 1;
      if (emptyRestarts > 12) {
        handlers.onError?.("failed");
        finish("");
        return;
      }
    } else {
      emptyRestarts = 0;
    }
    restartTimer = window.setTimeout(pump, 80);
  };

  pump();

  return () => finish();
}

/* ------------------------------------------------------------------ speech out */

const speechListeners = new Set<() => void>();
let speakingId: string | null = null;
let player: HTMLAudioElement | null = null;
let serverVoice: boolean | null = null;
let watchdog: number | undefined;
let audioUnlocked = false;
let unlockGeneration = 0;

const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

function getPlayer(): HTMLAudioElement {
  if (!player) {
    player = new Audio();
    player.preload = "auto";
  }
  return player;
}

/**
 * Browsers drop the user-gesture token once we await the reply, which would
 * otherwise block auto-played spoken replies. Warm the same Audio element
 * during the tap so later playback is allowed.
 */
export function unlockAudioPlayback() {
  if (typeof window === "undefined" || audioUnlocked) return;
  const audio = getPlayer();
  const token = ++unlockGeneration;
  audio.muted = true;
  audio.src = SILENT_WAV;
  void audio
    .play()
    .then(() => {
      audioUnlocked = true;
      if (token !== unlockGeneration || audio.src !== SILENT_WAV) {
        audio.muted = false;
        return;
      }
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    })
    .catch(() => {
      audio.muted = false;
    });
}

/** Ask the server whether a voice is configured, so the first reply isn't delayed. */
export function primeSpeech() {
  void hasServerVoice();
}

function notifySpeech() {
  for (const listener of speechListeners) listener();
}

function setSpeaking(id: string | null) {
  if (speakingId === id) return;
  speakingId = id;
  notifySpeech();
}

export function subscribeSpeech(listener: () => void): () => void {
  speechListeners.add(listener);
  return () => {
    speechListeners.delete(listener);
  };
}

export function getSpeakingId(): string | null {
  return speakingId;
}

export function isSpeechOutputSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Server audio works even when the device has no speech engine of its own. */
export function canSpeakOutLoud(): boolean {
  return typeof window !== "undefined";
}

/** Voices the device can use, once the browser has finished loading them. */
export function listVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechOutputSupported()) return [];
  return window.speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith("en"));
}

function pickVoice(voiceURI: string | null): SpeechSynthesisVoice | undefined {
  const voices = listVoices();
  if (voiceURI) {
    const match = voices.find((item) => item.voiceURI === voiceURI);
    if (match) return match;
  }
  return (
    voices.find((voice) =>
      /natural|enhanced|premium|neural|samantha|jenny|google us english|aria|libby/i.test(voice.name),
    ) ??
    voices.find((voice) => voice.default) ??
    voices[0]
  );
}

export function subscribeVoices(listener: () => void): () => void {
  if (!isSpeechOutputSupported()) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", listener);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", listener);
}

/** Turns the assistant's markdown into something worth listening to. */
export function toSpokenText(content: string): string {
  return content
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^[•\-]\s+/gm, "")
    .replace(/^(\d+)\.\s+/gm, "$1, ")
    .replace(/\s*—\s*/g, ", ")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, ". ")
    .replace(/\s{2,}/g, " ")
    .replace(/\.\s*\./g, ".")
    .trim();
}

export function stopSpeaking() {
  if (typeof window === "undefined") return;
  window.clearInterval(watchdog);
  watchdog = undefined;
  if (player && (speakingId || player.src.startsWith("blob:"))) {
    player.onended = null;
    player.onerror = null;
    player.pause();
    if (player.src.startsWith("blob:")) URL.revokeObjectURL(player.src);
    player.removeAttribute("src");
    player.load();
  }
  if (isSpeechOutputSupported()) window.speechSynthesis.cancel();
  setSpeaking(null);
}

/** True when the server has a text-to-speech key configured. */
async function hasServerVoice(): Promise<boolean> {
  if (serverVoice !== null) return serverVoice;
  try {
    const response = await fetch("/api/speech");
    const payload = (await response.json()) as { available?: boolean };
    serverVoice = Boolean(payload.available);
  } catch {
    serverVoice = false;
  }
  return serverVoice;
}

async function speakOnServer(id: string, text: string, onDone: () => void): Promise<boolean> {
  try {
    const response = await fetch("/api/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("audio/")) {
      serverVoice = false;
      return false;
    }

    const url = URL.createObjectURL(await response.blob());
    if (speakingId !== id) {
      URL.revokeObjectURL(url);
      return true;
    }

    const audio = getPlayer();
    unlockGeneration += 1;
    audio.muted = false;
    audio.src = url;
    const finish = () => {
      if (player === audio && audio.src === url) {
        URL.revokeObjectURL(url);
        audio.onended = null;
        audio.onerror = null;
        setSpeaking(null);
        onDone();
      }
    };
    audio.onended = finish;
    audio.onerror = finish;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

function speakInBrowser(id: string, text: string, voiceURI: string | null, onDone: () => void) {
  if (!isSpeechOutputSupported()) {
    setSpeaking(null);
    onDone();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(voiceURI);
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? "en-US";
  utterance.rate = 0.96;
  utterance.pitch = 1.05;

  const finish = () => {
    window.clearInterval(watchdog);
    watchdog = undefined;
    if (speakingId === id) {
      setSpeaking(null);
      onDone();
    }
  };
  utterance.onend = finish;
  utterance.onerror = finish;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);

  /* A device with no installed voices can accept an utterance and then never
     report back, which would leave the UI stuck mid-sentence. */
  const startedAt = Date.now();
  window.clearInterval(watchdog);
  watchdog = window.setInterval(() => {
    if (speakingId !== id) {
      window.clearInterval(watchdog);
      watchdog = undefined;
      return;
    }
    const idle = !window.speechSynthesis.speaking && !window.speechSynthesis.pending;
    if (idle && Date.now() - startedAt > 1500) finish();
  }, 500);
}

export interface SpeakOptions {
  voiceURI?: string | null;
  /** Runs when playback finishes on its own, not when it is interrupted. */
  onDone?: () => void;
}

/**
 * Reads a reply out loud, preferring the server's higher-quality voice and
 * falling back to the device's own speech synthesis.
 */
export async function speak(id: string, content: string, options: SpeakOptions = {}) {
  const text = toSpokenText(content);
  if (!text) return;

  stopSpeaking();
  setSpeaking(id);

  const onDone = options.onDone ?? (() => {});

  if (await hasServerVoice()) {
    if (speakingId !== id) return;
    if (await speakOnServer(id, text, onDone)) return;
  }

  if (speakingId !== id) return;
  speakInBrowser(id, text, options.voiceURI ?? null, onDone);
}
