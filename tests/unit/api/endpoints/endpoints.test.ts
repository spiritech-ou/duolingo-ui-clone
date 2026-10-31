import { afterEach, describe, expect, it, vi } from 'vitest';
import { delay, http, HttpResponse } from 'msw';
import { isApiError, type ApiError } from '@/api/client';
import { login } from '@/api/endpoints/auth';
import { getCourse } from '@/api/endpoints/course';
import { getLesson } from '@/api/endpoints/lessons';
import { getPractice } from '@/api/endpoints/practice';
import { PRACTICE_ID } from '@/api/schemas/lesson';
import { generateCourse } from '@/mocks/data/generators';
import { courseErrorHandler } from '@/mocks/handlers/course';
import { lessonNotFoundHandler } from '@/mocks/handlers/lessons';
import { server } from '@/mocks/server';

const KNOWN_ID = generateCourse().units[0]?.lessons[0]?.id ?? '';

async function failureOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (isApiError(error)) return error;
    throw error;
  }
  throw new Error('expected the call to fail');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('login', () => {
  it('returns the parsed token and user', async () => {
    const result = await login({ email: 'mari@example.ee', password: 'secret123' });
    expect(result.token).toBe('mock-token-mari@example.ee');
    expect(result.user.email).toBe('mari@example.ee');
  });

  it('sends the body as JSON', async () => {
    let received: unknown;
    server.use(
      http.post('*/api/auth/login', async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ token: 't', user: { id: '1', email: 'a@b.ee', displayName: 'a' } });
      }),
    );
    await login({ email: 'a@b.ee', password: 'secret123' });
    expect(received).toEqual({ email: 'a@b.ee', password: 'secret123' });
  });

  it('turns a 401 into an http ApiError with its code', async () => {
    const error = await failureOf(login({ email: 'x@fail.test', password: 'secret123' }));
    expect(error).toMatchObject({ kind: 'http', status: 401, code: 'invalid_credentials' });
  });

  it('turns a 500 into an http ApiError', async () => {
    const error = await failureOf(login({ email: 'x@error.test', password: 'secret123' }));
    expect(error).toMatchObject({ kind: 'http', status: 500 });
  });

  it('turns a body that fails the schema into invalid-payload', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    server.use(http.post('*/api/auth/login', () => HttpResponse.json({ token: 1 })));
    const error = await failureOf(login({ email: 'a@b.ee', password: 'secret123' }));
    expect(error.kind).toBe('invalid-payload');
  });

  it('rejects with a network ApiError when aborted', async () => {
    server.use(http.post('*/api/auth/login', () => delay('infinite')));
    const controller = new AbortController();
    const pending = failureOf(
      login({ email: 'a@b.ee', password: 'secret123' }, controller.signal),
    );
    controller.abort();
    expect((await pending).kind).toBe('network');
  });
});

describe('getCourse', () => {
  it('returns the parsed course', async () => {
    const course = await getCourse();
    expect(course.units.length).toBeGreaterThan(0);
  });

  it('turns the error handler response into an http ApiError', async () => {
    server.use(courseErrorHandler);
    const error = await failureOf(getCourse());
    expect(error).toMatchObject({ kind: 'http', status: 500, code: 'server_error' });
  });

  it('turns an invalid payload into invalid-payload', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    server.use(http.get('*/api/course', () => HttpResponse.json({ units: 'nope' })));
    expect((await failureOf(getCourse())).kind).toBe('invalid-payload');
  });

  it('rejects with a network ApiError when aborted', async () => {
    const controller = new AbortController();
    const pending = failureOf(getCourse(controller.signal));
    controller.abort();
    expect((await pending).kind).toBe('network');
  });
});

describe('getLesson', () => {
  it('has a known lesson id to test with', () => {
    expect(KNOWN_ID).not.toBe('');
  });

  it('returns the parsed lesson', async () => {
    const lesson = await getLesson(KNOWN_ID);
    expect(lesson.id).toBe(KNOWN_ID);
    expect(lesson.exercises).toHaveLength(10);
  });

  it('turns an unknown lesson into an http ApiError with status 404', async () => {
    const error = await failureOf(getLesson('no-such-lesson'));
    expect(error).toMatchObject({ kind: 'http', status: 404, code: 'not_found' });
  });

  it('turns the not-found handler response into a 404 http ApiError', async () => {
    server.use(lessonNotFoundHandler);
    const error = await failureOf(getLesson(KNOWN_ID));
    expect(error).toMatchObject({ kind: 'http', status: 404 });
  });

  it('url-encodes the lesson id', async () => {
    let seen = '';
    server.use(
      http.get('*/api/lessons/:lessonId', ({ request }) => {
        seen = new URL(request.url).pathname;
        return HttpResponse.json({ id: 'a/b', title: 't', exercises: [] });
      }),
    );
    await getLesson('a/b');
    expect(seen).toBe('/api/lessons/a%2Fb');
  });

  it('turns an invalid payload into invalid-payload', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    server.use(http.get('*/api/lessons/:lessonId', () => HttpResponse.json({ id: 1 })));
    expect((await failureOf(getLesson(KNOWN_ID))).kind).toBe('invalid-payload');
  });

  it('rejects with a network ApiError when aborted', async () => {
    const controller = new AbortController();
    const pending = failureOf(getLesson(KNOWN_ID, controller.signal));
    controller.abort();
    expect((await pending).kind).toBe('network');
  });
});

describe('getPractice', () => {
  it('defaults count to 5', async () => {
    let query: string | null = null;
    server.use(
      http.get('*/api/practice', ({ request }) => {
        query = new URL(request.url).searchParams.get('count');
        return HttpResponse.json({ id: PRACTICE_ID, title: 'Practice', exercises: [] });
      }),
    );
    await getPractice();
    expect(query).toBe('5');
  });

  it('returns the parsed practice set with the default count', async () => {
    const practice = await getPractice();
    expect(practice.id).toBe(PRACTICE_ID);
    expect(practice.exercises).toHaveLength(5);
  });

  it('sends the given count', async () => {
    const practice = await getPractice(3);
    expect(practice.exercises).toHaveLength(3);
  });

  it('turns a non-integer count (400 invalid_request) into an http ApiError', async () => {
    const error = await failureOf(getPractice(1.5));
    expect(error).toMatchObject({ kind: 'http', status: 400, code: 'invalid_request' });
  });

  it('turns an invalid payload into invalid-payload', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    server.use(
      http.get('*/api/practice', () => HttpResponse.json({ id: 'not-practice', title: 't', exercises: [] })),
    );
    expect((await failureOf(getPractice())).kind).toBe('invalid-payload');
  });

  it('rejects with a network ApiError when aborted', async () => {
    const controller = new AbortController();
    const pending = failureOf(getPractice(5, controller.signal));
    controller.abort();
    expect((await pending).kind).toBe('network');
  });
});
