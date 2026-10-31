import { describe, expect, it } from 'vitest';
import {
  INVALID_EMAIL_MESSAGE,
  PASSWORD_TOO_SHORT_MESSAGE,
  loginRequestSchema,
  loginResponseSchema,
} from '@/api/schemas/auth';

function omit(source: Record<string, unknown>, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source).filter(([name]) => name !== key));
}

function messagesAt(input: unknown, field: string): string[] {
  const result = loginRequestSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message);
}

describe('user-facing login messages', () => {
  it('are the exact copy from the spec', () => {
    expect(INVALID_EMAIL_MESSAGE).toBe('Invalid email address');
    expect(PASSWORD_TOO_SHORT_MESSAGE).toBe('Password too short');
  });
});

describe('loginRequestSchema', () => {
  it('accepts a valid email and a password of 8 characters', () => {
    const body = { email: 'ada@example.com', password: '12345678' };
    expect(loginRequestSchema.parse(body)).toEqual(body);
  });

  it('accepts a longer password', () => {
    expect(
      loginRequestSchema.safeParse({ email: 'ada@example.com', password: 'a much longer one' })
        .success,
    ).toBe(true);
  });

  it.each(['fail.test', 'error.test'])('accepts an email at %s (mock rule domains)', (domain) => {
    expect(
      loginRequestSchema.safeParse({ email: `user@${domain}`, password: '12345678' }).success,
    ).toBe(true);
  });

  it.each(['', 'plainaddress', 'missing-at.example.com', 'ada@', '@example.com', 'ada@example'])(
    'rejects the email "%s" with "Invalid email address"',
    (email) => {
      expect(messagesAt({ email, password: '12345678' }, 'email')).toEqual([INVALID_EMAIL_MESSAGE]);
    },
  );

  it('rejects a missing email with "Invalid email address"', () => {
    expect(messagesAt({ password: '12345678' }, 'email')).toEqual([INVALID_EMAIL_MESSAGE]);
  });

  it.each(['', '1', '1234567'])(
    'rejects the password "%s" with "Password too short"',
    (password) => {
      expect(messagesAt({ email: 'ada@example.com', password }, 'password')).toEqual([
        PASSWORD_TOO_SHORT_MESSAGE,
      ]);
    },
  );

  it('rejects a missing password with "Password too short"', () => {
    expect(messagesAt({ email: 'ada@example.com' }, 'password')).toEqual([
      PASSWORD_TOO_SHORT_MESSAGE,
    ]);
  });

  it('reports both messages at once when both fields are empty', () => {
    expect(messagesAt({ email: '', password: '' }, 'email')).toEqual([INVALID_EMAIL_MESSAGE]);
    expect(messagesAt({ email: '', password: '' }, 'password')).toEqual([
      PASSWORD_TOO_SHORT_MESSAGE,
    ]);
  });
});

describe('loginResponseSchema', () => {
  const response = {
    token: 'fake-token',
    user: { id: 'ada@example.com', email: 'ada@example.com', displayName: 'ada' },
  };

  it('accepts a token with a user', () => {
    expect(loginResponseSchema.parse(response)).toEqual(response);
  });

  it('rejects a response without a token', () => {
    expect(loginResponseSchema.safeParse({ user: response.user }).success).toBe(false);
  });

  it('rejects a response without a user', () => {
    expect(loginResponseSchema.safeParse({ token: 'fake-token' }).success).toBe(false);
  });

  it.each(['id', 'email', 'displayName'] as const)('rejects a user without %s', (key) => {
    const user = omit(response.user, key);
    expect(loginResponseSchema.safeParse({ token: 'fake-token', user }).success).toBe(false);
  });
});
