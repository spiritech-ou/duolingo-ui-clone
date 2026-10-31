import { setupServer } from 'msw/node';
import { handlers } from '@/mocks/handlers';

// Node server for Vitest (see tests/setup.ts).
export const server = setupServer(...handlers);
