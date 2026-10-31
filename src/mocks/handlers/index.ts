import type { RequestHandler } from 'msw';
import { authHandlers } from '@/mocks/handlers/auth';
import { courseHandlers } from '@/mocks/handlers/course';
import { lessonsHandlers } from '@/mocks/handlers/lessons';
import { practiceHandlers } from '@/mocks/handlers/practice';

// Aggregates the per-resource handlers (handlers/<resource>.ts) added by feature work.
export const handlers: RequestHandler[] = [
  ...authHandlers,
  ...courseHandlers,
  ...lessonsHandlers,
  ...practiceHandlers,
];
