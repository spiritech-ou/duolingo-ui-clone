import { delay, http, HttpResponse, type RequestHandler } from 'msw';
import type { Course } from '@/api/schemas/course';
import { generateCourse } from '@/mocks/data/generators';
import { readMockScenario, serverErrorResponse, waitForScenario } from '@/mocks/scenario';

const COURSE_PATH = '*/api/course';

/** Default handler: honours the `mockScenario` switch (`ok`, `slow`, `timeout`, `error`, `empty`). */
export const courseHandler = http.get(COURSE_PATH, async () => {
  const scenario = readMockScenario();
  await waitForScenario(scenario);

  if (scenario === 'error') return serverErrorResponse();
  const course: Course = generateCourse();
  return HttpResponse.json(scenario === 'empty' ? { ...course, units: [] } : course);
});

/** 5xx `server_error`, whatever the scenario. Opt in from tests and stories. */
export const courseErrorHandler = http.get(COURSE_PATH, async () => {
  await delay();
  return serverErrorResponse();
});

/** A course with no units, whatever the scenario. */
export const courseEmptyHandler = http.get(COURSE_PATH, async () => {
  await delay();
  const course: Course = { ...generateCourse(), units: [] };
  return HttpResponse.json(course);
});

export const courseHandlers: RequestHandler[] = [courseHandler];
