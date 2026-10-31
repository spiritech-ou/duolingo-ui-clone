import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NO_AUDIO_CLIPS, type AudioClips } from '@/api/endpoints/audio';
import {
  browserSpeech,
  useSpeech,
  type ClipAudio,
  type CreateClipAudio,
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
    const { result, unmount } = renderHook(() =>
      useSpeech({ adapter: synth, loadClips: () => Promise.resolve(NO_AUDIO_CLIPS) }),
    );
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

interface FakeAudio extends ClipAudio {
  url: string;
  playCalls: number;
  pauseCalls: number;
  rejectPlayWith: unknown;
}

function createFakeAudioFactory() {
  const created: FakeAudio[] = [];
  const createAudio: CreateClipAudio = (url) => {
    const audio: FakeAudio = {
      url,
      playCalls: 0,
      pauseCalls: 0,
      rejectPlayWith: undefined,
      onended: null,
      onerror: null,
      play: () => {
        audio.playCalls += 1;
        return audio.rejectPlayWith === undefined
          ? Promise.resolve()
          : Promise.reject(audio.rejectPlayWith);
      },
      pause: () => {
        audio.pauseCalls += 1;
      },
    };
    created.push(audio);
    return audio;
  };
  return { created, createAudio };
}

function lastAudio(created: FakeAudio[]): FakeAudio {
  const audio = created[created.length - 1];
  if (!audio) throw new Error('no audio created');
  return audio;
}

const clipsFixture: AudioClips = {
  tee: { itemId: 'tea', file: 'tea.mp3', needsReview: true },
  kohv: { itemId: 'coffee', file: 'coffee.mp3', needsReview: true },
};

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useSpeech clips', () => {
  const loadStub = () => Promise.resolve(clipsFixture);

  it('plays the clip when the device has no Estonian voice, from the same call', async () => {
    const synth = createFakeSynth({ voices: [english] });
    const { created, createAudio } = createFakeAudioFactory();
    const { result } = renderHook(() =>
      useSpeech({ adapter: synth, loadClips: loadStub, createAudio }),
    );
    await flush();
    expect(result.current.clipStatus).toBe('available');
    expect(result.current.voiceStatus).toBe('checking');
    expect(result.current.soundStatus).toBe('available');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.voiceStatus).toBe('no-voice');
    expect(result.current.soundStatus).toBe('available');
    let outcome = '';
    act(() => {
      outcome = result.current.speak('tee');
    });
    expect(outcome).toBe('started');
    expect(lastAudio(created).url).toBe('/audio/tea.mp3');
    expect(lastAudio(created).playCalls).toBe(1);
    expect(synth.requests).toHaveLength(0);
  });

  it('the voice wins over a clip, even when the manifest lists the word', async () => {
    const synth = createFakeSynth({ voices: [estonian] });
    const { created, createAudio } = createFakeAudioFactory();
    const { result } = renderHook(() =>
      useSpeech({ adapter: synth, loadClips: loadStub, createAudio }),
    );
    await flush();
    act(() => {
      result.current.speak('tee');
    });
    expect(synth.requests).toHaveLength(1);
    expect(created).toHaveLength(0);
    act(() => {
      lastRequest(synth).onError('synthesis-failed');
    });
    expect(result.current.playbackFailed).toBe(true);
    expect(created).toHaveLength(0);
  });

  it('plays nothing before the voice check settles, even with a clip (voice first)', async () => {
    const synth = createFakeSynth({ voices: [english] });
    const { created, createAudio } = createFakeAudioFactory();
    const { result } = renderHook(() =>
      useSpeech({ adapter: synth, loadClips: loadStub, createAudio }),
    );
    await flush();
    let outcome = '';
    act(() => {
      outcome = result.current.speak('tee');
    });
    expect(outcome).toBe('nothing');
    expect(created).toHaveLength(0);
  });

  it('plays the clip in a browser without speech synthesis', async () => {
    const synth = createFakeSynth({ supported: false });
    const { created, createAudio } = createFakeAudioFactory();
    const { result } = renderHook(() =>
      useSpeech({ adapter: synth, loadClips: loadStub, createAudio }),
    );
    await flush();
    expect(result.current.voiceStatus).toBe('unsupported');
    expect(result.current.soundStatus).toBe('available');
    act(() => {
      result.current.speak('kohv');
    });
    expect(lastAudio(created).url).toBe('/audio/coffee.mp3');
    expect(synth.cancelCalls).toBe(0);
  });

  it('is silent for a word without a clip', async () => {
    const synth = createFakeSynth({ supported: false });
    const { created, createAudio } = createFakeAudioFactory();
    const { result } = renderHook(() =>
      useSpeech({ adapter: synth, loadClips: loadStub, createAudio }),
    );
    await flush();
    let outcome = '';
    act(() => {
      outcome = result.current.speak('leib');
    });
    expect(outcome).toBe('nothing');
    expect(created).toHaveLength(0);
    expect(result.current.playbackFailed).toBe(false);
    expect(result.current.soundStatus).toBe('available');
  });

  it('treats a failing manifest as no clips: silent, and sound is unavailable', async () => {
    const synth = createFakeSynth({ supported: false });
    const { created, createAudio } = createFakeAudioFactory();
    const loadClips = () => Promise.reject(new Error('boom'));
    const { result } = renderHook(() => useSpeech({ adapter: synth, loadClips, createAudio }));
    await flush();
    expect(result.current.clipStatus).toBe('none');
    expect(result.current.soundStatus).toBe('none');
    expect(result.current.soundUnavailableReason).toBe('unsupported');
    act(() => {
      result.current.speak('tee');
    });
    expect(created).toHaveLength(0);
  });

  it('treats an empty manifest as none and reports no-voice as the reason', async () => {
    const synth = createFakeSynth({ voices: [english] });
    const loadClips = () => Promise.resolve(NO_AUDIO_CLIPS);
    const { result } = renderHook(() => useSpeech({ adapter: synth, loadClips }));
    await flush();
    expect(result.current.soundStatus).toBe('checking');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.soundStatus).toBe('none');
    expect(result.current.soundUnavailableReason).toBe('no-voice');
  });

  it('bounds the manifest wait: after the timeout the clip status is none and a late result is ignored', async () => {
    const synth = createFakeSynth({ supported: false });
    let resolveLoad: (clips: AudioClips) => void = () => {};
    let seenSignal: AbortSignal | undefined;
    const loadClips = (signal?: AbortSignal) => {
      seenSignal = signal;
      return new Promise<AudioClips>((resolve) => {
        resolveLoad = resolve;
      });
    };
    const { result } = renderHook(() =>
      useSpeech({ adapter: synth, loadClips, clipCheckTimeoutMs: 500 }),
    );
    expect(result.current.soundStatus).toBe('checking');
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.clipStatus).toBe('none');
    expect(result.current.soundStatus).toBe('none');
    expect(seenSignal?.aborted).toBe(true);
    resolveLoad(clipsFixture);
    await flush();
    expect(result.current.clipStatus).toBe('none');
  });

  it('loads the manifest once per hook lifetime', async () => {
    const synth = createFakeSynth({ voices: [estonian] });
    const loadClips = vi.fn(loadStub);
    const { rerender } = renderHook(() =>
      useSpeech({ adapter: synth, loadClips: () => loadClips() }),
    );
    await flush();
    rerender();
    await flush();
    expect(loadClips).toHaveBeenCalledTimes(1);
  });

  it('a newer selection stops the previous clip, and the old clip failing is ignored', async () => {
    const synth = createFakeSynth({ supported: false });
    const { created, createAudio } = createFakeAudioFactory();
    const { result } = renderHook(() =>
      useSpeech({ adapter: synth, loadClips: loadStub, createAudio }),
    );
    await flush();
    act(() => {
      result.current.speak('tee');
    });
    const first = lastAudio(created);
    act(() => {
      result.current.speak('kohv');
    });
    expect(first.pauseCalls).toBe(1);
    expect(created).toHaveLength(2);
    act(() => {
      first.onerror?.();
    });
    expect(result.current.playbackFailed).toBe(false);
  });

  it('a clip error sets playbackFailed and resets it after 4 s; the next selection clears it', async () => {
    const synth = createFakeSynth({ supported: false });
    const { created, createAudio } = createFakeAudioFactory();
    const { result } = renderHook(() =>
      useSpeech({ adapter: synth, loadClips: loadStub, createAudio }),
    );
    await flush();
    act(() => {
      result.current.speak('tee');
    });
    act(() => {
      lastAudio(created).onerror?.();
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
    act(() => {
      lastAudio(created).onerror?.();
    });
    act(() => {
      result.current.speak('kohv');
    });
    expect(result.current.playbackFailed).toBe(false);
  });

  it('a rejected play() is a failure, except an AbortError (interruption)', async () => {
    const synth = createFakeSynth({ supported: false });
    const rejection: { value: unknown } = { value: undefined };
    const { created, createAudio: baseCreate } = createFakeAudioFactory();
    const createAudio: CreateClipAudio = (url) => {
      const audio = baseCreate(url);
      if (audio) Object.assign(audio, { rejectPlayWith: rejection.value });
      return audio;
    };
    const { result } = renderHook(() =>
      useSpeech({ adapter: synth, loadClips: loadStub, createAudio }),
    );
    await flush();
    rejection.value = new DOMException('interrupted', 'AbortError');
    act(() => {
      result.current.speak('tee');
    });
    await flush();
    expect(result.current.playbackFailed).toBe(false);

    rejection.value = new DOMException('blocked', 'NotAllowedError');
    act(() => {
      result.current.speak('kohv');
    });
    await flush();
    expect(result.current.playbackFailed).toBe(true);
    expect(created).toHaveLength(2);
  });

  it('cancel() and unmount stop the clip', async () => {
    const synth = createFakeSynth({ supported: false });
    const { created, createAudio } = createFakeAudioFactory();
    const { result, unmount } = renderHook(() =>
      useSpeech({ adapter: synth, loadClips: loadStub, createAudio }),
    );
    await flush();
    act(() => {
      result.current.speak('tee');
    });
    const first = lastAudio(created);
    act(() => {
      result.current.cancel();
    });
    expect(first.pauseCalls).toBe(1);
    act(() => {
      result.current.speak('kohv');
    });
    const second = lastAudio(created);
    unmount();
    expect(second.pauseCalls).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('unmount while the manifest is pending aborts it, leaves no timers and ignores a late result', async () => {
    const synth = createFakeSynth({ supported: false });
    let resolveLoad: (clips: AudioClips) => void = () => {};
    let seenSignal: AbortSignal | undefined;
    const loadClips = (signal?: AbortSignal) => {
      seenSignal = signal;
      return new Promise<AudioClips>((resolve) => {
        resolveLoad = resolve;
      });
    };
    const { result, unmount } = renderHook(() => useSpeech({ adapter: synth, loadClips }));
    unmount();
    expect(seenSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    resolveLoad(clipsFixture);
    await flush();
    expect(result.current.clipStatus).toBe('checking');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a voice that appears after the check settled takes over from the next selection', async () => {
    const synth = createFakeSynth({ voices: [english] });
    const { created, createAudio } = createFakeAudioFactory();
    const { result } = renderHook(() =>
      useSpeech({ adapter: synth, loadClips: loadStub, createAudio }),
    );
    await flush();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      result.current.speak('tee');
    });
    expect(created).toHaveLength(1);
    expect(synth.requests).toHaveLength(0);
    act(() => {
      synth.setVoices([english, estonian]);
      synth.fireVoicesChanged();
    });
    act(() => {
      result.current.speak('kohv');
    });
    expect(synth.requests).toHaveLength(1);
    expect(lastRequest(synth).text).toBe('kohv');
    expect(created).toHaveLength(1);
    expect(created[0]?.pauseCalls).toBe(1);
  });

  it('play() throwing synchronously returns failed and sets playbackFailed', async () => {
    const synth = createFakeSynth({ supported: false });
    const createAudio: CreateClipAudio = () => ({
      onended: null,
      onerror: null,
      play: () => {
        throw new Error('blocked');
      },
      pause: () => {},
    });
    const { result } = renderHook(() =>
      useSpeech({ adapter: synth, loadClips: loadStub, createAudio }),
    );
    await flush();
    let outcome = '';
    act(() => {
      outcome = result.current.speak('tee');
    });
    expect(outcome).toBe('failed');
    expect(result.current.playbackFailed).toBe(true);
  });

  it('reports voice available while the manifest is still checking', () => {
    const synth = createFakeSynth({ voices: [estonian] });
    const loadClips = () => new Promise<AudioClips>(() => {});
    const { result } = renderHook(() => useSpeech({ adapter: synth, loadClips }));
    expect(result.current.voiceStatus).toBe('available');
    expect(result.current.clipStatus).toBe('checking');
    expect(result.current.soundStatus).toBe('available');
    expect(result.current.soundUnavailableReason).toBeNull();
  });

  it('keeps an existing failure message when createAudio returns null', async () => {
    const synth = createFakeSynth({ supported: false });
    let nullNext = false;
    const { created, createAudio: base } = createFakeAudioFactory();
    const createAudio: CreateClipAudio = (url) => (nullNext ? null : base(url));
    const { result } = renderHook(() =>
      useSpeech({ adapter: synth, loadClips: loadStub, createAudio }),
    );
    await flush();
    act(() => {
      result.current.speak('tee');
    });
    act(() => {
      lastAudio(created).onerror?.();
    });
    expect(result.current.playbackFailed).toBe(true);
    nullNext = true;
    let outcome = '';
    act(() => {
      outcome = result.current.speak('kohv');
    });
    expect(outcome).toBe('nothing');
    expect(result.current.playbackFailed).toBe(true);
  });

  it('does not play when the browser has no Audio', async () => {
    const synth = createFakeSynth({ supported: false });
    const { result } = renderHook(() =>
      useSpeech({ adapter: synth, loadClips: loadStub, createAudio: () => null }),
    );
    await flush();
    let outcome = '';
    act(() => {
      outcome = result.current.speak('tee');
    });
    expect(outcome).toBe('nothing');
  });
});

describe('browserSpeech', () => {
  it('reports unsupported when the browser has no speech synthesis (jsdom)', () => {
    expect(browserSpeech.isSupported()).toBe(false);
    const { result } = renderHook(() => useSpeech());
    expect(result.current.voiceStatus).toBe('unsupported');
  });
});
