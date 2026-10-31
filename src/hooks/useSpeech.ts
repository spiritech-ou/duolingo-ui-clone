import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const ESTONIAN_LANG = 'et-EE';
export const VOICE_CHECK_TIMEOUT_MS = 2000;
export const PLAYBACK_FAILED_RESET_MS = 4000;

export type VoiceStatus = 'checking' | 'available' | 'no-voice' | 'unsupported';

export interface SpeechVoiceInfo {
  lang: string;
  name: string;
  voiceURI: string;
}

export interface SpeechRequest {
  text: string;
  lang: string;
  voice: SpeechVoiceInfo;
  onEnd: () => void;
  onError: (error: string) => void;
}

export interface SpeechAdapter {
  isSupported: () => boolean;
  getVoices: () => readonly SpeechVoiceInfo[];
  /** Subscribes to the browser reporting new voices; returns the unsubscribe function. */
  onVoicesChanged: (listener: () => void) => () => void;
  speak: (request: SpeechRequest) => void;
  cancel: () => void;
}

export const browserSpeech: SpeechAdapter = {
  isSupported: () =>
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined',
  getVoices: () => window.speechSynthesis.getVoices(),
  onVoicesChanged: (listener) => {
    const synth = window.speechSynthesis;
    synth.addEventListener('voiceschanged', listener);
    return () => {
      synth.removeEventListener('voiceschanged', listener);
    };
  },
  speak: ({ text, lang, voice, onEnd, onError }) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    const match = synth.getVoices().find((candidate) => candidate.voiceURI === voice.voiceURI);
    if (match) utterance.voice = match;
    utterance.onend = onEnd;
    utterance.onerror = (event) => {
      onError(event.error);
    };
    synth.speak(utterance);
  },
  cancel: () => {
    window.speechSynthesis.cancel();
  },
};

/** A voice is Estonian when its language is et-EE or starts with et (et, et-EE, et_EE). */
export function isEstonianVoice(voice: SpeechVoiceInfo): boolean {
  return /^et([-_]|$)/i.test(voice.lang);
}

function findEstonianVoice(voices: readonly SpeechVoiceInfo[]): SpeechVoiceInfo | null {
  return voices.find(isEstonianVoice) ?? null;
}

/** Errors caused by a newer selection or by leaving the screen are not failures. */
function isInterruption(error: string): boolean {
  return error === 'interrupted' || error === 'canceled';
}

export interface UseSpeechOptions {
  adapter?: SpeechAdapter;
}

export interface UseSpeechResult {
  isSupported: boolean;
  voiceStatus: VoiceStatus;
  playbackFailed: boolean;
  /** Call only from a user gesture. */
  speak: (text: string) => void;
  cancel: () => void;
}

/** Speaks Estonian words with an Estonian voice only; reports when that is impossible. */
export function useSpeech({ adapter = browserSpeech }: UseSpeechOptions = {}): UseSpeechResult {
  const isSupported = useMemo(() => adapter.isSupported(), [adapter]);
  const [voice, setVoice] = useState<SpeechVoiceInfo | null>(null);
  const [settled, setSettled] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);

  const voiceRef = useRef<SpeechVoiceInfo | null>(null);
  const activeRef = useRef(0);
  const failTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFailTimer = useCallback(() => {
    if (failTimerRef.current !== null) {
      clearTimeout(failTimerRef.current);
      failTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isSupported) return;
    const refresh = () => {
      const found = findEstonianVoice(adapter.getVoices());
      voiceRef.current = found;
      setVoice(found);
    };
    refresh();
    const unsubscribe = adapter.onVoicesChanged(refresh);
    const timer = setTimeout(() => {
      setSettled(true);
    }, VOICE_CHECK_TIMEOUT_MS);
    return () => {
      unsubscribe();
      clearTimeout(timer);
      voiceRef.current = null;
    };
  }, [adapter, isSupported]);

  useEffect(
    () => () => {
      activeRef.current += 1;
      clearFailTimer();
      if (adapter.isSupported()) adapter.cancel();
    },
    [adapter, clearFailTimer],
  );

  const cancel = useCallback(() => {
    activeRef.current += 1;
    if (adapter.isSupported()) adapter.cancel();
  }, [adapter]);

  const speak = useCallback(
    (text: string) => {
      const current = voiceRef.current;
      if (!adapter.isSupported() || current === null) return;
      clearFailTimer();
      setPlaybackFailed(false);
      adapter.cancel();
      activeRef.current += 1;
      const id = activeRef.current;
      adapter.speak({
        text,
        lang: ESTONIAN_LANG,
        voice: current,
        onEnd: () => {},
        onError: (error) => {
          if (id !== activeRef.current || isInterruption(error)) return;
          setPlaybackFailed(true);
          clearFailTimer();
          failTimerRef.current = setTimeout(() => {
            failTimerRef.current = null;
            setPlaybackFailed(false);
          }, PLAYBACK_FAILED_RESET_MS);
        },
      });
    },
    [adapter, clearFailTimer],
  );

  let voiceStatus: VoiceStatus;
  if (!isSupported) voiceStatus = 'unsupported';
  else if (voice !== null) voiceStatus = 'available';
  else if (settled) voiceStatus = 'no-voice';
  else voiceStatus = 'checking';

  return { isSupported, voiceStatus, playbackFailed, speak, cancel };
}
