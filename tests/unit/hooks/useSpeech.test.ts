import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  browserSpeech,
  useSpeech,
  type SpeechAdapter,
  type SpeechRequest,
  type SpeechVoiceInfo,
} from '@/hooks/useSpeech';

const estonian: SpeechVoiceInfo = { lang: 'et-EE', name: 'Tõnu', voiceURI: 'tonu' };
const english: SpeechVoiceInfo = { lang: 'en-US', name: 'Sam', voiceURI: 'sam' };
const finnish: SpeechVoiceInfo = { lang: 'fi-FI', name: 'Satu', voiceURI: 'satu' };

interface FakeSynth extends SpeechAdapter {
  requests: SpeechRequest[];
  cancelCalls: number;
  listenerCount: () => number;
  setVoices: (voices: SpeechVoiceInfo[]) => void;
  fireVoicesChanged: () => void;
}

function createFakeSynth({
  supported = true,
  voices = [] as SpeechVoiceInfo[],
} = {}): FakeSynth {
  let current = voices;
  const listeners = new Set<() => void>();
  const synth: FakeSynth = {
    requests: [],
    cancelCalls: 0,
    isSupported: () => supported,
    getVoices: () => current,
    onVoicesChanged: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    speak: (request) => {
      synth.requests.push(request);
    },
    cancel: () => {
      synth.cancelCalls += 1;
    },
    listenerCount: () => listeners.size,
    setVoices: (next) => {
      current = next;
    },
    fireVoicesChanged: () => {
      listeners.forEach((listener) => {
        listener();
      });
    },
  };
  return synth;
}

function lastRequest(synth: FakeSynth): SpeechRequest {
  const request = synth.requests[synth.requests.length - 1];
  if (!request) throw new Error('no speak request recorded');
  return request;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSpeech', () => {
  it('reports unsupported and every function is a safe no-op', () => {
    const synth = createFakeSynth({ supported: false });
    const { result, unmount } = renderHook(() => useSpeech({ adapter: synth }));
    expect(result.current.isSupported).toBe(false);
    expect(result.current.voiceStatus).toBe('unsupported');
    act(() => {
      result.current.speak('tee');
      result.current.cancel();
    });
    expect(synth.requests).toHaveLength(0);
    expect(synth.cancelCalls).toBe(0);
    expect(synth.listenerCount()).toBe(0);
    unmount();
    expect(synth.cancelCalls).toBe(0);
  });

  it('is available at mount when an Estonian voice already exists', () => {
    const synth = createFakeSynth({ voices: [english, estonian] });
    const { result } = renderHook(() => useSpeech({ adapter: synth }));
    expect(result.current.isSupported).toBe(true);
    expect(result.current.voiceStatus).toBe('available');
  });

  it('accepts any voice whose language starts with et', () => {
    const synth = createFakeSynth({ voices: [{ lang: 'et', name: 'x', voiceURI: 'x' }] });
    const { result } = renderHook(() => useSpeech({ adapter: synth }));
    expect(result.current.voiceStatus).toBe('available');
  });

  it('checks, then settles to no-voice after 2 s without an Estonian voice', () => {
    const synth = createFakeSynth({ voices: [english, finnish] });
    const { result } = renderHook(() => useSpeech({ adapter: synth }));
    expect(result.current.voiceStatus).toBe('checking');
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(result.current.voiceStatus).toBe('checking');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.voiceStatus).toBe('no-voice');
  });

  it('never speaks with another-language voice', () => {
    const synth = createFakeSynth({ voices: [english, finnish] });
    const { result } = renderHook(() => useSpeech({ adapter: synth }));
    act(() => {
      result.current.speak('tee');
    });
    expect(synth.requests).toHaveLength(0);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      result.current.speak('tee');
    });
    expect(synth.requests).toHaveLength(0);
  });

  it('becomes available when an Estonian voice appears later, even after no-voice', () => {
    const synth = createFakeSynth();
    const { result } = renderHook(() => useSpeech({ adapter: synth }));
    expect(result.current.voiceStatus).toBe('checking');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.voiceStatus).toBe('no-voice');
    act(() => {
      synth.setVoices([english, estonian]);
      synth.fireVoicesChanged();
    });
    expect(result.current.voiceStatus).toBe('available');
  });

  it('stays checking on an empty voiceschanged and becomes available on a real one', () => {
    const synth = createFakeSynth();
    const { result } = renderHook(() => useSpeech({ adapter: synth }));
    act(() => {
      synth.fireVoicesChanged();
    });
    expect(result.current.voiceStatus).toBe('checking');
    act(() => {
      synth.setVoices([estonian]);
      synth.fireVoicesChanged();
    });
    expect(result.current.voiceStatus).toBe('available');
  });

  it('does nothing while checking', () => {
    const synth = createFakeSynth();
    const { result } = renderHook(() => useSpeech({ adapter: synth }));
    act(() => {
      result.current.speak('tee');
    });
    expect(synth.requests).toHaveLength(0);
  });

  it('speaks the word with lang et-EE and the Estonian voice', () => {
    const synth = createFakeSynth({ voices: [english, estonian] });
    const { result } = renderHook(() => useSpeech({ adapter: synth }));
    act(() => {
      result.current.speak('tee');
    });
    expect(synth.requests).toHaveLength(1);
    expect(lastRequest(synth)).toMatchObject({ text: 'tee', lang: 'et-EE', voice: estonian });
    act(() => {
      lastRequest(synth).onEnd();
    });
    expect(result.current.playbackFailed).toBe(false);
  });

  it('cancels the previous word before speaking the next', () => {
    const synth = createFakeSynth({ voices: [estonian] });
    const { result } = renderHook(() => useSpeech({ adapter: synth }));
    act(() => {
      result.current.speak('tee');
    });
    const cancelsAfterFirst = synth.cancelCalls;
    act(() => {
      result.current.speak('kohv');
    });
    expect(synth.cancelCalls).toBe(cancelsAfterFirst + 1);
    expect(synth.requests.map((request) => request.text)).toEqual(['tee', 'kohv']);
  });

  it('treats interrupted and canceled errors as no failure', () => {
    const synth = createFakeSynth({ voices: [estonian] });
    const { result } = renderHook(() => useSpeech({ adapter: synth }));
    act(() => {
      result.current.speak('tee');
    });
    const first = lastRequest(synth);
    act(() => {
      result.current.speak('kohv');
    });
    act(() => {
      first.onError('interrupted');
      lastRequest(synth).onError('canceled');
    });
    expect(result.current.playbackFailed).toBe(false);
  });

  it('flags a real error and resets it after 4 s', () => {
    const synth = createFakeSynth({ voices: [estonian] });
    const { result } = renderHook(() => useSpeech({ adapter: synth }));
    act(() => {
      result.current.speak('tee');
    });
    act(() => {
      lastRequest(synth).onError('synthesis-failed');
    });
    expect(result.current.playbackFailed).toBe(true);
    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(result.current.playbackFailed).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.playbackFailed).toBe(false);
  });

  it('clears the failure on the next speak', () => {
    const synth = createFakeSynth({ voices: [estonian] });
    const { result } = renderHook(() => useSpeech({ adapter: synth }));
    act(() => {
      result.current.speak('tee');
    });
    act(() => {
      lastRequest(synth).onError('audio-busy');
    });
    expect(result.current.playbackFailed).toBe(true);
    act(() => {
      result.current.speak('kohv');
    });
    expect(result.current.playbackFailed).toBe(false);
  });

  it('cancel() cancels speech and ignores late errors of the cancelled word', () => {
    const synth = createFakeSynth({ voices: [estonian] });
    const { result } = renderHook(() => useSpeech({ adapter: synth }));
    act(() => {
      result.current.speak('tee');
    });
    const request = lastRequest(synth);
    const before = synth.cancelCalls;
    act(() => {
      result.current.cancel();
    });
    expect(synth.cancelCalls).toBe(before + 1);
    act(() => {
      request.onError('synthesis-failed');
    });
    expect(result.current.playbackFailed).toBe(false);
  });

  it('cancels speech and removes listeners on unmount, ignoring late callbacks', () => {
    const synth = createFakeSynth({ voices: [estonian] });
    const { result, unmount } = renderHook(() => useSpeech({ adapter: synth }));
    act(() => {
      result.current.speak('tee');
    });
    const request = lastRequest(synth);
    const before = synth.cancelCalls;
    unmount();
    expect(synth.cancelCalls).toBeGreaterThan(before);
    expect(synth.listenerCount()).toBe(0);
    expect(() => {
      request.onError('synthesis-failed');
    }).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('returns stable functions across renders and status changes', () => {
    const synth = createFakeSynth();
    const { result, rerender } = renderHook(() => useSpeech({ adapter: synth }));
    const { speak, cancel } = result.current;
    rerender();
    act(() => {
      synth.setVoices([estonian]);
      synth.fireVoicesChanged();
    });
    expect(result.current.speak).toBe(speak);
    expect(result.current.cancel).toBe(cancel);
  });
});

describe('browserSpeech', () => {
  it('reports unsupported when the browser has no speech synthesis (jsdom)', () => {
    expect(browserSpeech.isSupported()).toBe(false);
    const { result } = renderHook(() => useSpeech());
    expect(result.current.voiceStatus).toBe('unsupported');
  });
});
