import { delay, HttpResponse } from 'msw';
import type { ErrorBody } from '@/api/schemas/error';

/** `localStorage` key of the mock switch (docs/product/data-loading-states.md, OQ-35). */
export const MOCK_SCENARIO_KEY = 'mockScenario';

export const MOCK_SCENARIOS = ['ok', 'slow', 'timeout', 'error', 'empty', 'notfound'] as const;
export type MockScenario = (typeof MOCK_SCENARIOS)[number];

export const SLOW_DELAY_MS = 3000;

function isMockScenario(value: string | null): value is MockScenario {
  return MOCK_SCENARIOS.some((scenario) => scenario === value);
}

/**
 * Reads the scenario on each request. This is a mock-layer read, not app code. A missing key, an
 * unknown value or an unavailable `localStorage` (node without jsdom, blocked storage) is `ok`.
 */
export function readMockScenario(): MockScenario {
  try {
    const value = globalThis.localStorage.getItem(MOCK_SCENARIO_KEY);
    return isMockScenario(value) ? value : 'ok';
  } catch {
    return 'ok';
  }
}

/** Timing of a scenario: `slow` waits 3 s, `timeout` never resolves, anything else a short delay. */
export async function waitForScenario(scenario: MockScenario): Promise<void> {
  if (scenario === 'timeout') return delay('infinite');
  return scenario === 'slow' ? delay(SLOW_DELAY_MS) : delay();
}

export function serverErrorResponse(): Response {
  const body: ErrorBody = { code: 'server_error', message: 'Something went wrong' };
  return HttpResponse.json(body, { status: 500 });
}

export function notFoundResponse(message: string): Response {
  const body: ErrorBody = { code: 'not_found', message };
  return HttpResponse.json(body, { status: 404 });
}

export function invalidRequestResponse(message: string): Response {
  const body: ErrorBody = { code: 'invalid_request', message };
  return HttpResponse.json(body, { status: 400 });
}
