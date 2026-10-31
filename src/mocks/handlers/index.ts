import type { RequestHandler } from 'msw';
import { authHandlers } from '@/mocks/handlers/auth';

// Aggregates the per-resource handlers (handlers/<resource>.ts) added by feature work.
export const handlers: RequestHandler[] = [...authHandlers];
