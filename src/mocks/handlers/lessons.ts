import { delay, http, HttpResponse, type RequestHandler } from 'msw';
import { generateLesson } from '@/mocks/data/generators';
import {
  notFoundResponse,
  readMockScenario,
  serverErrorResponse,
  waitForScenario,
} from '@/mocks/scenario';

const LESSON_PATH = '*/api/lessons/:lessonId';
const NOT_FOUND_MESSAGE = 'Lesson not found';

function lessonId(params: Record<string, string | readonly string[] | undefined>): string {
  const value = params['lessonId'];
  return typeof value === 'string' ? value : '';
}

/**
 * Default handler: honours the `mockScenario` switch. An unknown lesson id is a 404 `not_found` in
 * every scenario that answers (`timeout` never answers).
 */
export const lessonHandler = http.get(LESSON_PATH, async ({ params }) => {
  const scenario = readMockScenario();
  await waitForScenario(scenario);

  const lesson = generateLesson(lessonId(params));
  if (!lesson || scenario === 'notfound') return notFoundResponse(NOT_FOUND_MESSAGE);
  if (scenario === 'error') return serverErrorResponse();
  return HttpResponse.json(scenario === 'empty' ? { ...lesson, exercises: [] } : lesson);
});

/** 5xx `server_error` for any lesson id. Opt in from tests and stories. */
export const lessonErrorHandler = http.get(LESSON_PATH, async () => {
  await delay();
  return serverErrorResponse();
});

/** 404 `not_found` for any lesson id. */
export const lessonNotFoundHandler = http.get(LESSON_PATH, async () => {
  await delay();
  return notFoundResponse(NOT_FOUND_MESSAGE);
});

/** A known lesson with no exercises; an unknown id is still a 404. */
export const lessonEmptyHandler = http.get(LESSON_PATH, async ({ params }) => {
  await delay();
  const lesson = generateLesson(lessonId(params));
  if (!lesson) return notFoundResponse(NOT_FOUND_MESSAGE);
  return HttpResponse.json({ ...lesson, exercises: [] });
});

export const lessonsHandlers: RequestHandler[] = [lessonHandler];
