import { request } from '@/api/client';
import {
  loginResponseSchema,
  type LoginRequest,
  type LoginResponse,
} from '@/api/schemas/auth';

/** `POST /api/auth/login`. */
export function login(body: LoginRequest, signal?: AbortSignal): Promise<LoginResponse> {
  return request('/auth/login', {
    schema: loginResponseSchema,
    method: 'POST',
    body,
    ...(signal ? { signal } : {}),
  });
}
