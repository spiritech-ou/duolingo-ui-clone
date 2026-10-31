import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 8;
export const INVALID_EMAIL_MESSAGE = 'Invalid email address';
export const PASSWORD_TOO_SHORT_MESSAGE = 'Password too short';

/**
 * Body of `POST /api/auth/login`, and the single source of the login form's
 * rules: the form resolves against this schema instead of duplicating it.
 * An empty or malformed email shows "Invalid email address"; a password of
 * fewer than 8 characters (empty included) shows "Password too short".
 */
export const loginRequestSchema = z.object({
  email: z.email({ error: INVALID_EMAIL_MESSAGE }),
  password: z
    .string({ error: PASSWORD_TOO_SHORT_MESSAGE })
    .min(MIN_PASSWORD_LENGTH, { error: PASSWORD_TOO_SHORT_MESSAGE }),
});

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
});

/** 200 body of `POST /api/auth/login`. */
export const loginResponseSchema = z.object({
  token: z.string(),
  user: authUserSchema,
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
