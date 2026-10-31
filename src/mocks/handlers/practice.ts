import { delay, http, HttpResponse, type RequestHandler } from 'msw';
import { DEFAULT_PRACTICE_COUNT, generatePractice } from '@/mocks/data/generators';
import {
  invalidRequestResponse,
  readMockScenario,
  serverErrorResponse,
  waitForScenario,
} from '@/mocks/scenario';

const PRACTICE_PATH = '*/api/practice';

/**
 * `count` query: absent means 5; otherwise a non-negative integer (the generator clamps it to the
 * 120-item pool). The specs define nothing else, so anything else is a 400 `invalid_request`,
 * like the login handler's bad body.
 */
function parseCount(url: string): number | undefined {
  const raw = new URL(url).searchParams.get('count');
  if (raw === null) return DEFAULT_PRACTICE_COUNT;
  return /^\d+$/.test(raw) ? Number(raw) : undefined;
}

/**
 * Default handler: honours the `mockScenario` switch (`ok`, `slow`, `timeout`, `error`, `empty`).
 * `notfound` affects lessons only, so practice answers normally there.
 */
export const practiceHandler = http.get(PRACTICE_PATH, async ({ request }) => {
  const scenario = readMockScenario();
  await waitForScenario(scenario);

  if (scenario === 'error') return serverErrorResponse();
  const count = parseCount(request.url);
  if (count === undefined) {
    return invalidRequestResponse('count must be a non-negative integer');
  }
  const practice = generatePractice(count);
  return HttpResponse.json(scenario === 'empty' ? { ...practice, exercises: [] } : practice);
});

/** 5xx `server_error`, whatever the scenario. Opt in from tests and stories. */
export const practiceErrorHandler = http.get(PRACTICE_PATH, async () => {
  await delay();
  return serverErrorResponse();
});

/** A practice set with no exercises, whatever the scenario. */
export const practiceEmptyHandler = http.get(PRACTICE_PATH, async () => {
  await delay();
  return HttpResponse.json({ ...generatePractice(0) });
});

export const practiceHandlers: RequestHandler[] = [practiceHandler];
