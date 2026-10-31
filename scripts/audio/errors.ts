/** Replaces every occurrence of the secret in a text. Used on every message that leaves the script. */
export function redact(text: string, secret: string | undefined): string {
  if (secret === undefined || secret === '') return text;
  return text.split(secret).join('[redacted]');
}

/**
 * The only error type the script throws. The message is built from fixed text and
 * redacted data, and no cause is attached, so a key held by a lower-level error
 * (a failed request, a parse error) can never travel with it.
 */
export class AudioGenerationError extends Error {
  constructor(message: string, secret?: string) {
    super(redact(message, secret));
    this.name = 'AudioGenerationError';
  }
}
