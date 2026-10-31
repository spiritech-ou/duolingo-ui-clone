import type { SpeechAdapter, SpeechRequest, SpeechVoiceInfo } from '@/hooks/useSpeech';

export const ESTONIAN: SpeechVoiceInfo = { lang: 'et-EE', name: 'Anu', voiceURI: 'anu' };
export const ENGLISH: SpeechVoiceInfo = { lang: 'en-US', name: 'Sam', voiceURI: 'sam' };

export interface FakeSynth extends SpeechAdapter {
  spoken: SpeechRequest[];
  cancels: number;
  setVoices: (voices: SpeechVoiceInfo[]) => void;
}

/** A recording speech synthesis for container tests; speaks nothing for real. */
export function makeSynth(
  options: { supported?: boolean; voices?: SpeechVoiceInfo[] } = {},
): FakeSynth {
  let voices = options.voices ?? [ESTONIAN];
  const listeners = new Set<() => void>();
  const synth: FakeSynth = {
    spoken: [],
    cancels: 0,
    isSupported: () => options.supported ?? true,
    getVoices: () => voices,
    onVoicesChanged: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    speak: (request) => {
      synth.spoken.push(request);
    },
    cancel: () => {
      synth.cancels += 1;
    },
    setVoices: (next) => {
      voices = next;
      listeners.forEach((listener) => {
        listener();
      });
    },
  };
  return synth;
}
