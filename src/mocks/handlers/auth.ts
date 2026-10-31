import { delay, http, HttpResponse, type RequestHandler } from 'msw';
import { loginRequestSchema, type LoginResponse } from '@/api/schemas/auth';
import type { ErrorBody } from '@/api/schemas/error';

const FAIL_SUFFIX = '@fail.test';
const ERROR_SUFFIX = '@error.test';

/**
 * Mock rule (docs/product/login.md, OQ-04): a valid email with a password of
 * 8+ characters succeeds; `@fail.test` is a 401 and `@error.test` a 500, so
 * both error states are reachable. The `mockScenario` switch does not apply.
 */
export const authHandlers: RequestHandler[] = [
  http.post('*/api/auth/login', async ({ request }) => {
    await delay();

    const body: unknown = await request.json().catch(() => undefined);
    const parsed = loginRequestSchema.safeParse(body);
    if (!parsed.success) {
      const error: ErrorBody = { code: 'invalid_request', message: 'Invalid login request' };
      return HttpResponse.json(error, { status: 400 });
    }

    const id = parsed.data.email.toLowerCase();
    if (id.endsWith(FAIL_SUFFIX)) {
      const error: ErrorBody = { code: 'invalid_credentials', message: 'Invalid email or password' };
      return HttpResponse.json(error, { status: 401 });
    }
    if (id.endsWith(ERROR_SUFFIX)) {
      const error: ErrorBody = { code: 'server_error', message: 'Something went wrong' };
      return HttpResponse.json(error, { status: 500 });
    }

    const response: LoginResponse = {
      token: `mock-token-${id}`,
      user: { id, email: parsed.data.email, displayName: id.slice(0, id.indexOf('@')) },
    };
    return HttpResponse.json(response);
  }),
];
