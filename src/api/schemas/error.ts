import { z } from 'zod';

/**
 * Common error body of every endpoint: `{ code, message }`
 * (`invalid_credentials`, `not_found`, `server_error`). `code` stays a plain
 * string so an unknown code from the server still parses.
 */
export const errorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type ErrorBody = z.infer<typeof errorBodySchema>;
