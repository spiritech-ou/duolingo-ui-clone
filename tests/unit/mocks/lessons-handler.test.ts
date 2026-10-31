import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorBodySchema } from '@/api/schemas/error';
import { lessonSchema } from '@/api/schemas/lesson';
import { generateCourse } from '@/mocks/data/generators';
import {
  lessonEmptyHandler,
  lessonErrorHandler,
  lessonNotFoundHandler,
} from '@/mocks/handlers/lessons';
import { server } from '@/mocks/server';

const KNOWN_ID = generateCourse().units[0]?.lessons[0]?.id ?? '';
const lessonUrl = (id: string) => `http://localhost/api/lessons/${id}`;

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe('GET /api/lessons/:lessonId mock', () => {
  it('has a known lesson id to test with', () => {
    expect(KNOWN_ID).not.toBe('');
  });

  it('returns the 10 exercises of a known lesson by default', async () => {
    const response = await fetch(lessonUrl(KNOWN_ID));
    expect(response.status).toBe(200);
    const lesson = lessonSchema.parse(await response.json());
    expect(lesson.id).toBe(KNOWN_ID);
    expect(lesson.exercises).toHaveLength(10);
  });

  it('returns the same lesson on every call', async () => {
    const first = await (await fetch(lessonUrl(KNOWN_ID))).json();
    const second = await (await fetch(lessonUrl(KNOWN_ID))).json();
    expect(second).toEqual(first);
  });

  it.each(['ok', 'bogus', 'empty', 'notfound', 'error'])(
    'returns 404 not_found for an unknown id in scenario %s',
    async (scenario) => {
      localStorage.setItem('mockScenario', scenario);
      const response = await fetch(lessonUrl('no-such-lesson'));
      expect(response.status).toBe(404);
      expect(errorBodySchema.parse(await response.json()).code).toBe('not_found');
    },
  );

  it('returns 404 not_found for an unknown id with no scenario', async () => {
    const response = await fetch(lessonUrl('no-such-lesson'));
    expect(response.status).toBe(404);
    expect(errorBodySchema.parse(await response.json()).code).toBe('not_found');
  });

  it('scenario notfound returns 404 not_found for a known id', async () => {
    localStorage.setItem('mockScenario', 'notfound');
    const response = await fetch(lessonUrl(KNOWN_ID));
    expect(response.status).toBe(404);
    expect(errorBodySchema.parse(await response.json()).code).toBe('not_found');
  });

  it('scenario error returns 500 server_error for a known id', async () => {
    localStorage.setItem('mockScenario', 'error');
    const response = await fetch(lessonUrl(KNOWN_ID));
    expect(response.status).toBe(500);
    expect(errorBodySchema.parse(await response.json()).code).toBe('server_error');
  });

  it('scenario empty returns a valid lesson with no exercises', async () => {
    localStorage.setItem('mockScenario', 'empty');
    const response = await fetch(lessonUrl(KNOWN_ID));
    expect(response.status).toBe(200);
    const lesson = lessonSchema.parse(await response.json());
    expect(lesson.id).toBe(KNOWN_ID);
    expect(lesson.exercises).toEqual([]);
  });

  it('scenario slow answers only after 3 s', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    localStorage.setItem('mockScenario', 'slow');
    let settled = false;
    const pending = fetch(lessonUrl(KNOWN_ID)).then((response) => {
      settled = true;
      return response;
    });

    await vi.advanceTimersByTimeAsync(2900);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect((await pending).status).toBe(200);
  });

  it('scenario timeout never answers', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    localStorage.setItem('mockScenario', 'timeout');
    let settled = false;
    // Left pending on purpose: aborting a hung mocked request destabilised later tests.
    void fetch(lessonUrl(KNOWN_ID)).finally(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(settled).toBe(false);
  });

  it('lessonErrorHandler returns 500 server_error', async () => {
    server.use(lessonErrorHandler);
    const response = await fetch(lessonUrl(KNOWN_ID));
    expect(response.status).toBe(500);
    expect(errorBodySchema.parse(await response.json()).code).toBe('server_error');
  });

  it('lessonNotFoundHandler returns 404 not_found for a known id', async () => {
    server.use(lessonNotFoundHandler);
    const response = await fetch(lessonUrl(KNOWN_ID));
    expect(response.status).toBe(404);
    expect(errorBodySchema.parse(await response.json()).code).toBe('not_found');
  });

  it('lessonEmptyHandler returns no exercises for a known id and 404 for an unknown one', async () => {
    server.use(lessonEmptyHandler);
    const known = await fetch(lessonUrl(KNOWN_ID));
    expect(lessonSchema.parse(await known.json()).exercises).toEqual([]);
    expect((await fetch(lessonUrl('no-such-lesson'))).status).toBe(404);
  });
});
