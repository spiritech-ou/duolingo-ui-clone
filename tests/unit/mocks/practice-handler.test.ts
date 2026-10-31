import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorBodySchema } from '@/api/schemas/error';
import { lessonSchema } from '@/api/schemas/lesson';
import { practiceEmptyHandler, practiceErrorHandler } from '@/mocks/handlers/practice';
import { server } from '@/mocks/server';

const URL = 'http://localhost/api/practice';

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe('GET /api/practice mock', () => {
  it('returns 5 exercises with id practice for count=5', async () => {
    const response = await fetch(`${URL}?count=5`);
    expect(response.status).toBe(200);
    const practice = lessonSchema.parse(await response.json());
    expect(practice.id).toBe('practice');
    expect(practice.exercises).toHaveLength(5);
    expect(practice.exercises.every((exercise) => !exercise.isNewWord)).toBe(true);
  });

  it('defaults to 5 exercises when count is absent', async () => {
    const practice = lessonSchema.parse(await (await fetch(URL)).json());
    expect(practice.exercises).toHaveLength(5);
  });

  it('honours another count and clamps it to the 120-item pool', async () => {
    const three = lessonSchema.parse(await (await fetch(`${URL}?count=3`)).json());
    expect(three.exercises).toHaveLength(3);
    const many = lessonSchema.parse(await (await fetch(`${URL}?count=500`)).json());
    expect(many.exercises).toHaveLength(120);
  });

  it('count=0 returns an empty set', async () => {
    const practice = lessonSchema.parse(await (await fetch(`${URL}?count=0`)).json());
    expect(practice.exercises).toEqual([]);
  });

  it.each(['abc', '', '-1', '2.5', '1e3', ' 5'])(
    'returns 400 invalid_request for count=%j',
    async (count) => {
      const response = await fetch(`${URL}?count=${encodeURIComponent(count)}`);
      expect(response.status).toBe(400);
      expect(errorBodySchema.parse(await response.json()).code).toBe('invalid_request');
    },
  );

  it('scenario notfound does not affect practice', async () => {
    localStorage.setItem('mockScenario', 'notfound');
    expect((await fetch(`${URL}?count=5`)).status).toBe(200);
  });

  it('scenario error returns 500 server_error', async () => {
    localStorage.setItem('mockScenario', 'error');
    const response = await fetch(`${URL}?count=5`);
    expect(response.status).toBe(500);
    expect(errorBodySchema.parse(await response.json()).code).toBe('server_error');
  });

  it('scenario empty returns a valid set with no exercises', async () => {
    localStorage.setItem('mockScenario', 'empty');
    const practice = lessonSchema.parse(await (await fetch(`${URL}?count=5`)).json());
    expect(practice.id).toBe('practice');
    expect(practice.exercises).toEqual([]);
  });

  it('scenario slow answers only after 3 s', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    localStorage.setItem('mockScenario', 'slow');
    let settled = false;
    const pending = fetch(`${URL}?count=5`).then((response) => {
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
    void fetch(`${URL}?count=5`).finally(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(settled).toBe(false);
  });

  it('practiceErrorHandler returns 500 server_error', async () => {
    server.use(practiceErrorHandler);
    const response = await fetch(`${URL}?count=5`);
    expect(response.status).toBe(500);
    expect(errorBodySchema.parse(await response.json()).code).toBe('server_error');
  });

  it('practiceEmptyHandler returns a set with no exercises', async () => {
    server.use(practiceEmptyHandler);
    const practice = lessonSchema.parse(await (await fetch(`${URL}?count=5`)).json());
    expect(practice.exercises).toEqual([]);
  });
});
