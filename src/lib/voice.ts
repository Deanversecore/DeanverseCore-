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
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
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
}

/** Starts dictation and returns a stop function, or null when unsupported. */
export function startDictation(handlers: VoiceHandlers): (() => void) | null {
  const Recognition = getConstructor();
  if (!Recognition) return null;

  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;

  let finalTranscript = "";

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) finalTranscript += result[0].transcript;
      else interim += result[0].transcript;
    }
    handlers.onPartial(`${finalTranscript}${interim}`.trim());
  };

  recognition.onerror = () => handlers.onEnd();

  recognition.onend = () => {
    const transcript = finalTranscript.trim();
    if (transcript) handlers.onFinal(transcript);
    handlers.onEnd();
  };

  try {
    recognition.start();
  } catch {
    return null;
  }

  return () => recognition.stop();
}

/* ------------------------------------------------------------------ speech out */

const speechListeners = new Set<() => void>();
let speakingId: string | null = null;
let activeAudio: HTMLAudioElement | null = null;
let serverVoice: boolean | null = null;

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

/** Voices the device can use, once the browser has finished loading them. */
export function listVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechOutputSupported()) return [];
  return window.speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith("en"));
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
  if (activeAudio) {
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio.pause();
    URL.revokeObjectURL(activeAudio.src);
    activeAudio = null;
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

    const audio = new Audio(url);
    activeAudio = audio;
    const finish = () => {
      if (activeAudio === audio) {
        URL.revokeObjectURL(url);
        activeAudio = null;
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
  const voice = voiceURI ? listVoices().find((item) => item.voiceURI === voiceURI) : undefined;
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? "en-US";
  utterance.rate = 1.02;
  utterance.pitch = 1;

  const finish = () => {
    if (speakingId === id) {
      setSpeaking(null);
      onDone();
    }
  };
  utterance.onend = finish;
  utterance.onerror = finish;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
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
