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
