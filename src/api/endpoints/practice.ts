import { request } from '@/api/client';
import { practiceSchema, type Practice } from '@/api/schemas/lesson';

export const DEFAULT_PRACTICE_COUNT = 5;

/** `GET /api/practice?count=N`; `count` defaults to 5. */
export function getPractice(
  count: number = DEFAULT_PRACTICE_COUNT,
  signal?: AbortSignal,
): Promise<Practice> {
  return request(`/practice?count=${encodeURIComponent(String(count))}`, {
    schema: practiceSchema,
    ...(signal ? { signal } : {}),
  });
}
