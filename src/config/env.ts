import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default('/api'),
  VITE_USE_MOCKS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const env = envSchema.parse(import.meta.env);
