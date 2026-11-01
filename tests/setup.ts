import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { resetAudioClipsCache } from '@/api/endpoints/audio';
import { server } from '@/mocks/server';

// jsdom does not implement scrolling. Every test starts with a no-op (a test that asserts on scrolling
// replaces it with a spy in its own beforeEach) and the original, whatever it was, is put back after.
const originalScrollIntoView = Element.prototype.scrollIntoView as
  | typeof Element.prototype.scrollIntoView
  | undefined;

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

beforeEach(() => {
  Element.prototype.scrollIntoView = () => undefined;
});

afterEach(() => {
  if (originalScrollIntoView) Element.prototype.scrollIntoView = originalScrollIntoView;
  else Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
  cleanup();
  server.resetHandlers();
  // The manifest is cached for the page session; every test starts from a fresh page.
  resetAudioClipsCache();
});

afterAll(() => {
  server.close();
});
