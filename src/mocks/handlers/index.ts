import type { RequestHandler } from 'msw';

// Aggregates the per-resource handlers (handlers/<resource>.ts) added by feature work.
export const handlers: RequestHandler[] = [];
