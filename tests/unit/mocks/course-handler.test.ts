import { afterEach, describe, expect, it, vi } from 'vitest';
import { courseSchema } from '@/api/schemas/course';
import { errorBodySchema } from '@/api/schemas/error';
import { courseEmptyHandler, courseErrorHandler } from '@/mocks/handlers/course';
import { server } from '@/mocks/server';

const URL = 'http://localhost/api/course';

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe('GET /api/course mock', () => {
  it('returns the course by default (no scenario key)', async () => {
    const response = await fetch(URL);
    expect(response.status).toBe(200);
    const course = courseSchema.parse(await response.json());
    expect(course.units.length).toBeGreaterThan(0);
  });

  it('treats an unknown scenario value as ok', async () => {
    localStorage.setItem('mockScenario', 'bogus');
    expect((await fetch(URL)).status).toBe(200);
  });

  it('scenario ok returns the course', async () => {
    localStorage.setItem('mockScenario', 'ok');
    expect((await fetch(URL)).status).toBe(200);
  });

  it('scenario notfound does not affect the course', async () => {
    localStorage.setItem('mockScenario', 'notfound');
    expect((await fetch(URL)).status).toBe(200);
  });

  it('scenario error returns 500 server_error', async () => {
    localStorage.setItem('mockScenario', 'error');
    const response = await fetch(URL);
    expect(response.status).toBe(500);
    expect(errorBodySchema.parse(await response.json()).code).toBe('server_error');
  });

  it('scenario empty returns a valid course with no units', async () => {
    localStorage.setItem('mockScenario', 'empty');
    const response = await fetch(URL);
    expect(response.status).toBe(200);
    expect(courseSchema.parse(await response.json()).units).toEqual([]);
  });

  it('reads the scenario on each request', async () => {
    localStorage.setItem('mockScenario', 'error');
    expect((await fetch(URL)).status).toBe(500);
    localStorage.setItem('mockScenario', 'ok');
    expect((await fetch(URL)).status).toBe(200);
  });

  it('scenario slow answers only after 3 s', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    localStorage.setItem('mockScenario', 'slow');
    let settled = false;
    const pending = fetch(URL).then((response) => {
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
    void fetch(URL).finally(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(settled).toBe(false);
  });

  it('courseErrorHandler returns 500 whatever the scenario', async () => {
    server.use(courseErrorHandler);
    const response = await fetch(URL);
    expect(response.status).toBe(500);
    expect(errorBodySchema.parse(await response.json()).code).toBe('server_error');
  });

  it('courseEmptyHandler returns a course with no units', async () => {
    server.use(courseEmptyHandler);
    const response = await fetch(URL);
    expect(courseSchema.parse(await response.json()).units).toEqual([]);
  });
});
