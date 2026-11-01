import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '@/api/schemas/lesson';
import { ExerciseSession } from '@/features/exercise';
import type { AudioClips } from '@/api/endpoints/audio';
import type { ClipAudio, CreateClipAudio, SpeechAdapter } from '@/hooks/useSpeech';
import { selectProfile, useProfileStore } from '@/store/useProfileStore';
import { server } from '@/mocks/server';
import { useSessionStore } from '@/store/useSessionStore';
import { ENGLISH, ESTONIAN, makeSynth } from './fakeSynth';

const USER = { id: 'u1', email: 'a@b.co', displayName: 'Ann' };

const makeExercise = (n: number, right: string, others: [string, string]): Exercise => ({
  id: `ex${n}`,
  type: 'picture-choice',
  english: `word${n}`,
  isNewWord: false,
  options: [
    { id: `ex${n}-a`, estonian: others[0], picture: { emoji: 'A', alt: `${others[0]} picture` } },
    { id: `ex${n}-b`, estonian: right, picture: { emoji: 'B', alt: `${right} picture` } },
    { id: `ex${n}-c`, estonian: others[1], picture: { emoji: 'C', alt: `${others[1]} picture` } },
  ],
  correctOptionId: `ex${n}-b`,
});

const EXERCISES = [makeExercise(0, 'tee', ['kohv', 'leib']), makeExercise(1, 'piim', ['vesi', 'mahl'])];

const NO_CLIPS: AudioClips = {};
const clipFor = (word: string): AudioClips[string] => ({
  itemId: `item-${word}`,
  file: `${word}.mp3`,
  needsReview: false,
});
const CLIPS: AudioClips = { kohv: clipFor('kohv'), tee: clipFor('tee') };

interface FakeClip extends ClipAudio {
  url: string;
  plays: number;
  pauses: number;
}

/** Records the clips created and lets a test end or fail them. */
function makeAudio() {
  const created: FakeClip[] = [];
  const createAudio: CreateClipAudio = (url) => {
    const clip: FakeClip = {
      url,
      plays: 0,
      pauses: 0,
      onended: null,
      onerror: null,
      play: () => {
        clip.plays += 1;
      },
      pause: () => {
        clip.pauses += 1;
      },
    };
    created.push(clip);
    return clip;
  };
  return { created, createAudio };
}

interface SetupOptions {
  mode?: 'lesson' | 'practice';
  clips?: AudioClips;
  audio?: ReturnType<typeof makeAudio>;
}

function setup(synth: SpeechAdapter, { mode = 'lesson', clips = NO_CLIPS, audio }: SetupOptions = {}) {
  const fakeAudio = audio ?? makeAudio();
  const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTimeAsync(ms) });
  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <ExerciseSession
          mode={mode}
          exercises={EXERCISES}
          speechAdapter={synth}
          loadClips={() => Promise.resolve(clips)}
          createAudio={fakeAudio.createAudio}
          onLessonComplete={vi.fn()}
          onOutOfHearts={vi.fn()}
          onQuit={vi.fn()}
        />
      ),
    },
  ]);
  const { unmount } = render(<RouterProvider router={router} />);
  return { user, unmount, audio: fakeAudio };
}

const card = (word: string) => screen.getByRole('radio', { name: new RegExp(word) });
// The 2 s voice check, then the notice's own tick that fills its live region.
async function settle(): Promise<void> {
  await act(() => vi.advanceTimersByTimeAsync(2100));
  await act(() => vi.advanceTimersByTimeAsync(100));
}
const dismissed = () => selectProfile(USER.id)(useProfileStore.getState()).noVoiceNoteDismissed;

describe('ExerciseSession speech and sound notices', () => {
  beforeEach(() => {
    // shouldAdvanceTime lets Testing Library's own waiting (user-event, findBy) keep moving.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
    useProfileStore.getState().markHeartsIntroSeen(USER.id);
  });

  describe('with an Estonian voice', () => {
    it('speaks the selected word in et-EE only on selection, never on load or CHECK', async () => {
      const synth = makeSynth();
      const { user } = setup(synth);
      await settle();
      expect(synth.spoken).toHaveLength(0);

      await user.click(card('kohv'));
      expect(synth.spoken.map((s) => [s.text, s.lang, s.voice.lang])).toEqual([
        ['kohv', 'et-EE', 'et-EE'],
      ]);

      await user.click(card('leib'));
      expect(synth.spoken.map((s) => s.text)).toEqual(['kohv', 'leib']);

      await user.click(screen.getByRole('button', { name: 'Check' }));
      expect(synth.spoken).toHaveLength(2);
      expect(screen.queryByRole('button', { name: 'Sound unavailable' })).toBeNull();
      expect(screen.queryByText('No Estonian voice on this device')).toBeNull();
    });

    it('speaks for number keys and arrow keys too', async () => {
      const synth = makeSynth();
      const { user } = setup(synth);
      await settle();

      await user.keyboard('2');
      expect(synth.spoken.map((s) => s.text)).toEqual(['tee']);

      // A click puts focus on the cards, where the arrow keys move the selection.
      await user.click(card('kohv'));
      await user.keyboard('{ArrowDown}');
      expect(synth.spoken.map((s) => s.text)).toEqual(['tee', 'kohv', 'tee']);
    });

    it('cancels speech when the exercise changes', async () => {
      const synth = makeSynth();
      const { user } = setup(synth);
      await settle();
      await user.click(card('tee'));
      await user.click(screen.getByRole('button', { name: 'Check' }));
      const before = synth.cancels;
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(synth.cancels).toBe(before + 1);
    });

    it('does not speak when a card is chosen after CHECK (feedback phase)', async () => {
      const synth = makeSynth();
      const { user } = setup(synth);
      await settle();
      await user.click(card('kohv'));
      await user.click(screen.getByRole('button', { name: 'Check' }));
      expect(synth.spoken).toHaveLength(1);

      await user.click(card('leib'));
      await user.keyboard('3');
      expect(synth.spoken).toHaveLength(1);
    });

    it('speaks in practice mode too', async () => {
      const synth = makeSynth();
      const { user } = setup(synth, { mode: 'practice' });
      await settle();
      expect(synth.spoken).toHaveLength(0);
      await user.click(card('leib'));
      expect(synth.spoken.map((s) => [s.text, s.lang])).toEqual([['leib', 'et-EE']]);
    });

    it('clears the failure message on the next selection', async () => {
      const synth = makeSynth();
      const { user } = setup(synth);
      await settle();
      await user.click(card('kohv'));
      act(() => synth.spoken[0]?.onError('synthesis-failed'));
      expect(screen.getByText("Couldn't play this word.")).toBeInTheDocument();

      await user.click(card('tee'));
      expect(screen.queryByText("Couldn't play this word.")).toBeNull();
      expect(synth.spoken).toHaveLength(2);
    });

    it('announces the failure through a single status region', async () => {
      const synth = makeSynth();
      const { user } = setup(synth);
      await settle();
      await user.click(card('kohv'));
      act(() => synth.spoken[0]?.onError('synthesis-failed'));
      const message = screen.getByText("Couldn't play this word.");
      // One literal status region (implicitly polite and atomic); no second live region around it.
      const region = message.closest('[role="status"]');
      expect(region).not.toBeNull();
      expect(region).not.toHaveAttribute('aria-live');
      expect(message.parentElement?.closest('[aria-live]')).toBeNull();
    });

    it('cancels speech when the screen is left', async () => {
      const synth = makeSynth();
      const { unmount } = setup(synth);
      await settle();
      const before = synth.cancels;
      unmount();
      expect(synth.cancels).toBeGreaterThan(before);
    });

    it('shows "Couldn\'t play this word." for 4 s after a playback error', async () => {
      const synth = makeSynth();
      const { user } = setup(synth);
      await settle();
      await user.click(card('kohv'));
      act(() => synth.spoken[0]?.onError('synthesis-failed'));
      expect(screen.getByText("Couldn't play this word.")).toBeInTheDocument();

      await act(() => vi.advanceTimersByTimeAsync(4100));
      expect(screen.queryByText("Couldn't play this word.")).toBeNull();
    });

    it('does not report an interruption by a newer selection as a failure', async () => {
      const synth = makeSynth();
      const { user } = setup(synth);
      await settle();
      await user.click(card('kohv'));
      act(() => synth.spoken[0]?.onError('interrupted'));
      expect(screen.queryByText("Couldn't play this word.")).toBeNull();
    });
  });

  describe('with no Estonian voice', () => {
    it('speaks nothing, shows the icon and the notice, and cards still work', async () => {
      const synth = makeSynth({ voices: [ENGLISH] });
      const { user } = setup(synth);
      expect(screen.queryByRole('button', { name: 'Sound unavailable' })).toBeNull();
      await settle();

      const icon = screen.getByRole('button', { name: 'Sound unavailable' });
      expect(icon).toHaveAttribute('aria-disabled', 'true');
      expect(icon).toHaveAccessibleDescription(
        "This device has no Estonian voice, so words won't be spoken.",
      );
      expect(screen.getByText('No Estonian voice on this device')).toBeInTheDocument();
      expect(
        screen.getByText("Words won't be spoken, but you can still do every exercise."),
      ).toBeInTheDocument();

      await user.click(card('kohv'));
      expect(card('kohv')).toBeChecked();
      expect(screen.getByRole('button', { name: 'Check' })).toBeEnabled();
      expect(synth.spoken).toHaveLength(0);
    });

    it('dismissal is saved, hides the notice, and the icon re-opens it', async () => {
      const synth = makeSynth({ voices: [ENGLISH] });
      const { user } = setup(synth);
      await settle();

      await user.click(screen.getByRole('button', { name: 'Got it' }));
      expect(dismissed()).toBe(true);
      expect(screen.queryByText('No Estonian voice on this device')).toBeNull();
      expect(screen.getByRole('button', { name: 'Sound unavailable' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Sound unavailable' }));
      await act(() => vi.advanceTimersByTimeAsync(100));
      expect(screen.getByText('No Estonian voice on this device')).toBeInTheDocument();
    });

    it('does not show the notice when it was dismissed before, but keeps the icon', async () => {
      useProfileStore.getState().dismissNoVoiceNote(USER.id);
      setup(makeSynth({ voices: [ENGLISH] }));
      await settle();
      expect(screen.queryByText('No Estonian voice on this device')).toBeNull();
      expect(screen.getByRole('button', { name: 'Sound unavailable' })).toBeInTheDocument();
    });

    it('shows the notice on the first exercise only', async () => {
      const { user } = setup(makeSynth({ voices: [ENGLISH] }));
      await settle();
      expect(screen.getByText('No Estonian voice on this device')).toBeInTheDocument();

      await user.click(card('tee'));
      await user.click(screen.getByRole('button', { name: 'Check' }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await act(() => vi.advanceTimersByTimeAsync(100));
      expect(screen.queryByText('No Estonian voice on this device')).toBeNull();
      expect(screen.getByRole('button', { name: 'Sound unavailable' })).toBeInTheDocument();
    });

    it('removes the icon and notice when an Estonian voice appears, and then speaks', async () => {
      const synth = makeSynth({ voices: [ENGLISH] });
      const { user } = setup(synth);
      await settle();
      expect(screen.getByText('No Estonian voice on this device')).toBeInTheDocument();

      act(() => synth.setVoices([ENGLISH, ESTONIAN]));
      expect(screen.queryByRole('button', { name: 'Sound unavailable' })).toBeNull();
      expect(screen.queryByText('No Estonian voice on this device')).toBeNull();

      await user.click(card('kohv'));
      expect(synth.spoken.map((s) => s.text)).toEqual(['kohv']);
    });
  });

  describe('with speech synthesis unsupported', () => {
    it('shows the unsupported texts at once and cards still work', async () => {
      const synth = makeSynth({ supported: false });
      const { user } = setup(synth);
      // The icon waits for the clip manifest (empty here), which resolves on the first tick.
      expect(screen.queryByRole('button', { name: 'Sound unavailable' })).toBeNull();
      await act(() => vi.advanceTimersByTimeAsync(0));

      const icon = screen.getByRole('button', { name: 'Sound unavailable' });
      expect(icon).toHaveAccessibleDescription("This browser can't speak words aloud, so sound is off.");
      await act(() => vi.advanceTimersByTimeAsync(100));
      expect(screen.getByText("This browser can't speak words aloud")).toBeInTheDocument();
      expect(screen.getByText('You can still do every exercise.')).toBeInTheDocument();

      await user.click(card('leib'));
      expect(card('leib')).toBeChecked();
      expect(synth.spoken).toHaveLength(0);

      await user.click(screen.getByRole('button', { name: 'Got it' }));
      expect(dismissed()).toBe(true);
    });
  });

  describe('with recorded clips', () => {
    const noSoundShown = () => {
      expect(screen.queryByRole('button', { name: 'Sound unavailable' })).toBeNull();
      expect(screen.queryByText('No Estonian voice on this device')).toBeNull();
      expect(screen.queryByText("This browser can't speak words aloud")).toBeNull();
    };

    it('voice only: the voice speaks and no clip is created', async () => {
      const synth = makeSynth();
      const { user, audio } = setup(synth, { clips: CLIPS });
      await settle();
      await user.click(card('kohv'));
      expect(synth.spoken.map((s) => s.text)).toEqual(['kohv']);
      expect(audio.created).toHaveLength(0);
      noSoundShown();
    });

    it('clip only (no voice): plays the clip on selection, with no icon or notice', async () => {
      const synth = makeSynth({ voices: [ENGLISH] });
      const { user, audio } = setup(synth, { clips: CLIPS });
      await settle();
      noSoundShown();
      expect(audio.created).toHaveLength(0);

      await user.click(card('kohv'));
      expect(audio.created.map((c) => [c.url, c.plays])).toEqual([['/audio/kohv.mp3', 1]]);
      expect(synth.spoken).toHaveLength(0);

      // A word without a clip is silent.
      await user.click(card('leib'));
      expect(audio.created).toHaveLength(1);
      expect(screen.queryByText("Couldn't play this word.")).toBeNull();

      // CHECK never plays a clip.
      await user.click(screen.getByRole('button', { name: 'Check' }));
      expect(audio.created).toHaveLength(1);
    });

    it('plays the clip on a selection right after load, before the 2 s voice check ends', async () => {
      const synth = makeSynth({ voices: [ENGLISH] });
      const { user, audio } = setup(synth, { clips: CLIPS });
      await act(() => vi.advanceTimersByTimeAsync(300));
      await user.click(card('kohv'));
      expect(audio.created.map((c) => [c.url, c.plays])).toEqual([['/audio/kohv.mp3', 1]]);
      expect(synth.spoken).toHaveLength(0);
      noSoundShown();
    });

    it('requests the manifest once for a whole lesson, from opening to the end screen', async () => {
      let requests = 0;
      server.use(
        http.get('*/audio/manifest.json', () => {
          requests += 1;
          return HttpResponse.json({ clips: CLIPS });
        }),
      );
      const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTimeAsync(ms) });
      const router = createMemoryRouter([
        {
          path: '/',
          element: (
            <ExerciseSession
              mode="lesson"
              exercises={EXERCISES}
              speechAdapter={makeSynth({ voices: [ENGLISH] })}
              createAudio={makeAudio().createAudio}
              onLessonComplete={vi.fn()}
              onOutOfHearts={vi.fn()}
              onQuit={vi.fn()}
            />
          ),
        },
      ]);
      render(<RouterProvider router={router} />);
      await settle();
      await user.click(card('tee'));
      await user.click(screen.getByRole('button', { name: 'Check' }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await user.click(card('piim'));
      await user.click(screen.getByRole('button', { name: 'Check' }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await act(() => vi.advanceTimersByTimeAsync(100));
      expect(requests).toBe(1);
    });

    it('clip only: a stored dismissal is irrelevant while a clip exists', async () => {
      useProfileStore.getState().dismissNoVoiceNote(USER.id);
      setup(makeSynth({ voices: [ENGLISH] }), { clips: CLIPS });
      await settle();
      noSoundShown();
    });

    it('clip only (no speech synthesis): plays the clip, with no icon or notice', async () => {
      const synth = makeSynth({ supported: false });
      const { user, audio } = setup(synth, { clips: CLIPS });
      await settle();
      noSoundShown();

      await user.click(card('tee'));
      expect(audio.created.map((c) => [c.url, c.plays])).toEqual([['/audio/tee.mp3', 1]]);
      expect(synth.spoken).toHaveLength(0);
    });

    it('neither: shows the icon and the notice, and the dismissal persists', async () => {
      const synth = makeSynth({ voices: [ENGLISH] });
      const first = setup(synth, { clips: NO_CLIPS });
      await settle();
      expect(screen.getByRole('button', { name: 'Sound unavailable' })).toBeInTheDocument();
      expect(screen.getByText('No Estonian voice on this device')).toBeInTheDocument();

      await first.user.click(screen.getByRole('button', { name: 'Got it' }));
      expect(dismissed()).toBe(true);
      await first.user.click(card('kohv'));
      expect(first.audio.created).toHaveLength(0);
      first.unmount();

      setup(makeSynth({ voices: [ENGLISH] }), { clips: NO_CLIPS });
      await settle();
      expect(screen.getByRole('button', { name: 'Sound unavailable' })).toBeInTheDocument();
      expect(screen.queryByText('No Estonian voice on this device')).toBeNull();
    });

    it('a failed clip shows "Couldn\'t play this word." and clears after 4 s', async () => {
      const { user, audio } = setup(makeSynth({ voices: [ENGLISH] }), { clips: CLIPS });
      await settle();
      await user.click(card('kohv'));
      act(() => audio.created[0]?.onerror?.());
      expect(screen.getByText("Couldn't play this word.")).toBeInTheDocument();

      await act(() => vi.advanceTimersByTimeAsync(4100));
      expect(screen.queryByText("Couldn't play this word.")).toBeNull();
    });
  });
});
