import { loginRequestSchema } from '@/api/schemas/auth';
import type { LoginRequest } from '@/api/schemas/auth';

/**
 * The login form validates against the login request schema itself, so the
 * form and `POST /api/auth/login` can never drift apart.
 */
export const loginFormSchema = loginRequestSchema;

export type LoginFormValues = LoginRequest;
