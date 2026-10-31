import { describe, expect, it } from 'vitest';
import { errorBodySchema } from '@/api/schemas/error';

describe('errorBodySchema', () => {
  it.each(['invalid_credentials', 'not_found', 'server_error'])('accepts code %s', (code) => {
    const body = { code, message: 'Something happened' };
    expect(errorBodySchema.parse(body)).toEqual(body);
  });

  it('rejects a body without a message', () => {
    expect(errorBodySchema.safeParse({ code: 'server_error' }).success).toBe(false);
  });

  it('rejects a body without a code', () => {
    expect(errorBodySchema.safeParse({ message: 'Oops' }).success).toBe(false);
  });

  it('rejects non-string fields', () => {
    expect(errorBodySchema.safeParse({ code: 500, message: 'Oops' }).success).toBe(false);
  });
});
