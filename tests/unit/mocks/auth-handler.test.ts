import { describe, expect, it } from 'vitest';
import { errorBodySchema } from '@/api/schemas/error';
import { loginResponseSchema } from '@/api/schemas/auth';

function login(body: unknown) {
  return fetch('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/auth/login mock', () => {
  it('returns 200 with a token and the user for a valid email and password', async () => {
    const response = await login({ email: 'Mari.Maasikas@Example.ee', password: 'password1' });
    expect(response.status).toBe(200);
    const body = loginResponseSchema.parse(await response.json());
    expect(body.token).not.toBe('');
    expect(body.user.id).toBe('mari.maasikas@example.ee');
    expect(body.user.email).toBe('Mari.Maasikas@Example.ee');
    expect(body.user.displayName).toBe('mari.maasikas');
  });

  it('accepts a password of exactly 8 characters', async () => {
    const response = await login({ email: 'a@b.ee', password: '12345678' });
    expect(response.status).toBe(200);
  });

  it('returns 401 invalid_credentials for @fail.test', async () => {
    const response = await login({ email: 'x@fail.test', password: 'password1' });
    expect(response.status).toBe(401);
    expect(errorBodySchema.parse(await response.json()).code).toBe('invalid_credentials');
  });

  it('returns 500 server_error for @error.test', async () => {
    const response = await login({ email: 'x@error.test', password: 'password1' });
    expect(response.status).toBe(500);
    expect(errorBodySchema.parse(await response.json()).code).toBe('server_error');
  });

  it.each([
    ['a short password', { email: 'a@b.ee', password: '1234567' }],
    ['an invalid email', { email: 'nope', password: 'password1' }],
    ['a missing password', { email: 'a@b.ee' }],
    ['a short password on @fail.test', { email: 'x@fail.test', password: 'short' }],
    ['a non-object body', []],
  ])('returns 400 for %s', async (_name, body) => {
    const response = await login(body);
    expect(response.status).toBe(400);
    errorBodySchema.parse(await response.json());
  });

  it('returns 400 for a body that is not JSON', async () => {
    const response = await login('not json');
    expect(response.status).toBe(400);
  });
});
