import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audioClipUrl, loadAudioClips, NO_AUDIO_CLIPS, type AudioClips } from '@/api/endpoints/audio';

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

/** The slice of an audio element the hook uses; a fake in tests. */
export interface ClipAudio {
  onended: (() => void) | null;
  onerror: (() => void) | null;
  play: () => Promise<void> | void;
  pause: () => void;
}

/** Creates an audio element for a clip URL, or null when the browser has no Audio. */
export type CreateClipAudio = (url: string) => ClipAudio | null;

export const browserCreateAudio: CreateClipAudio = (url) => {
  if (typeof Audio === 'undefined') return null;
  const element = new Audio(url);
  const audio: ClipAudio = {
    onended: null,
    onerror: null,
    play: () => element.play(),
    pause: () => {
      element.pause();
    },
  };
  element.onended = () => {
    audio.onended?.();
  };
  element.onerror = () => {
    audio.onerror?.();
  };
  return audio;
};

export type ClipStatus = 'checking' | 'available' | 'none';
export type SoundStatus = 'checking' | 'available' | 'none';
/** Why no sound exists (picks the notice text); null unless `soundStatus` is `none`. */
export type SoundUnavailableReason = 'no-voice' | 'unsupported';
/** Outcome of `speak`: started, nothing to play for this word (not an error), or failed at once. */
export type SpeakOutcome = 'started' | 'nothing' | 'failed';

/** Upper bound of the manifest wait; afterwards the clip status is `none`. */
export const CLIP_CHECK_TIMEOUT_MS = 3000;

export interface UseSpeechOptions {
  adapter?: SpeechAdapter;
  /** Loads the clip manifest (never throws). Read once per hook lifetime. */
  loadClips?: (signal?: AbortSignal) => Promise<AudioClips>;
  createAudio?: CreateClipAudio;
  clipCheckTimeoutMs?: number;
}

export interface UseSpeechResult {
  isSupported: boolean;
  /** About the browser voice only. */
  voiceStatus: VoiceStatus;
  /** About the manifest only. */
  clipStatus: ClipStatus;
  /** Whether any sound exists: a voice or at least one clip. Drives the icon and the notice. */
  soundStatus: SoundStatus;
  soundUnavailableReason: SoundUnavailableReason | null;
  playbackFailed: boolean;
  /** Call only from a user gesture. */
  speak: (text: string) => SpeakOutcome;
  cancel: () => void;
}

/** Speaks Estonian words: the Estonian voice first, then the word's recorded clip, then nothing. */
export function useSpeech({
  adapter = browserSpeech,
  loadClips = loadAudioClips,
  createAudio = browserCreateAudio,
  clipCheckTimeoutMs = CLIP_CHECK_TIMEOUT_MS,
}: UseSpeechOptions = {}): UseSpeechResult {
  const isSupported = useMemo(() => adapter.isSupported(), [adapter]);
  const [voice, setVoice] = useState<SpeechVoiceInfo | null>(null);
  const [settled, setSettled] = useState(false);
  const [clipStatus, setClipStatus] = useState<ClipStatus>('checking');
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const [timeoutMs] = useState(clipCheckTimeoutMs);

  const voiceRef = useRef<SpeechVoiceInfo | null>(null);
  const clipsRef = useRef<AudioClips>(NO_AUDIO_CLIPS);
  const loadClipsRef = useRef(loadClips);
  const createAudioRef = useRef(createAudio);
  const audioRef = useRef<ClipAudio | null>(null);
  const activeRef = useRef(0);
  const failTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFailTimer = useCallback(() => {
    if (failTimerRef.current !== null) {
      clearTimeout(failTimerRef.current);
      failTimerRef.current = null;
    }
  }, []);

  const stopClip = useCallback(() => {
    const audio = audioRef.current;
    audioRef.current = null;
    if (audio === null) return;
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
  }, []);

  const reportFailure = useCallback(() => {
    setPlaybackFailed(true);
    clearFailTimer();
    failTimerRef.current = setTimeout(() => {
      failTimerRef.current = null;
      setPlaybackFailed(false);
    }, PLAYBACK_FAILED_RESET_MS);
  }, [clearFailTimer]);

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

  // The manifest is read once, in parallel with the voice check, and the wait is bounded.
  useEffect(() => {
    const controller = new AbortController();
    let done = false;
    const finish = (clips: AudioClips) => {
      if (done) return;
      done = true;
      clipsRef.current = clips;
      setClipStatus(Object.keys(clips).length > 0 ? 'available' : 'none');
    };
    const timer = setTimeout(() => {
      finish(NO_AUDIO_CLIPS);
      controller.abort();
    }, timeoutMs);
    loadClipsRef.current(controller.signal).then(
      (clips) => {
        clearTimeout(timer);
        if (!controller.signal.aborted) finish(clips);
      },
      () => {
        clearTimeout(timer);
        if (!controller.signal.aborted) finish(NO_AUDIO_CLIPS);
      },
    );
    return () => {
      done = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [timeoutMs]);

  useEffect(
    () => () => {
      activeRef.current += 1;
      clearFailTimer();
      stopClip();
      if (adapter.isSupported()) adapter.cancel();
    },
    [adapter, clearFailTimer, stopClip],
  );

  const cancel = useCallback(() => {
    activeRef.current += 1;
    stopClip();
    if (adapter.isSupported()) adapter.cancel();
  }, [adapter, stopClip]);

  const speak = useCallback(
    (text: string): SpeakOutcome => {
      const supported = adapter.isSupported();
      const current = voiceRef.current;
      if (supported && current !== null) {
        clearFailTimer();
        setPlaybackFailed(false);
        stopClip();
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
            reportFailure();
          },
        });
        return 'started';
      }
      // A newer selection always stops what is playing, even when it has nothing to play.
      activeRef.current += 1;
      stopClip();
      if (supported) adapter.cancel();
      // Voice first: a known voice was handled above (and a voice that fails does not hand
      // over to the clip). With no voice known right now, the clip plays as soon as the
      // manifest has loaded (`clipsRef` is empty until then, so nothing plays and nothing is
      // fetched later). The 2 s voice timeout only decides the status and the notice.
      const key = text.normalize('NFC');
      const clip = Object.prototype.hasOwnProperty.call(clipsRef.current, key)
        ? clipsRef.current[key]
        : undefined;
      if (clip === undefined) return 'nothing';
      const audio = createAudioRef.current(audioClipUrl(clip));
      if (audio === null) return 'nothing';
      clearFailTimer();
      setPlaybackFailed(false);
      const id = activeRef.current;
      audioRef.current = audio;
      const fail = () => {
        if (id !== activeRef.current) return;
        audioRef.current = null;
        reportFailure();
      };
      audio.onended = () => {
        if (id === activeRef.current) audioRef.current = null;
      };
      audio.onerror = fail;
      try {
        const played = audio.play();
        if (played !== undefined) {
          played.catch((error: unknown) => {
            // A play() interrupted by pause() or a newer selection is not a failure.
            if (error instanceof DOMException && error.name === 'AbortError') return;
            fail();
          });
        }
      } catch {
        fail();
        return 'failed';
      }
      return 'started';
    },
    [adapter, clearFailTimer, reportFailure, stopClip],
  );

  let voiceStatus: VoiceStatus;
  if (!isSupported) voiceStatus = 'unsupported';
  else if (voice !== null) voiceStatus = 'available';
  else if (settled) voiceStatus = 'no-voice';
  else voiceStatus = 'checking';

  let soundStatus: SoundStatus;
  if (voiceStatus === 'available' || clipStatus === 'available') soundStatus = 'available';
  else if (voiceStatus === 'checking' || clipStatus === 'checking') soundStatus = 'checking';
  else soundStatus = 'none';

  const soundUnavailableReason: SoundUnavailableReason | null =
    soundStatus !== 'none' ? null : voiceStatus === 'unsupported' ? 'unsupported' : 'no-voice';

  return {
    isSupported,
    voiceStatus,
    clipStatus,
    soundStatus,
    soundUnavailableReason,
    playbackFailed,
    speak,
    cancel,
  };
}
