import { delay, http, HttpResponse, type RequestHandler } from 'msw';
import { audioManifestFixture } from '@/mocks/data/audio';

const MANIFEST_PATH = '*/audio/manifest.json';

/**
 * Opt-in (tests, stories): serves the fixture manifest. Not in the default set, so it never shadows a
 * real `public/audio/manifest.json` in `dev:mocks` or e2e, whose mp3 files the fixture does not have.
 */
export const audioManifestHandler = http.get(MANIFEST_PATH, async () => {
  await delay();
  return HttpResponse.json(audioManifestFixture);
});

/** The file does not exist (clips not generated yet). */
export const audioManifestMissingHandler = http.get(MANIFEST_PATH, async () => {
  await delay();
  return new HttpResponse(null, { status: 404 });
});

/** 200 with a body that is not JSON (for example an HTML fallback page). */
export const audioManifestNotJsonHandler = http.get(MANIFEST_PATH, async () => {
  await delay();
  return new HttpResponse('<html>not json</html>', { headers: { 'Content-Type': 'text/html' } });
});

/** 200 with JSON that does not match the manifest contract. */
export const audioManifestInvalidHandler = http.get(MANIFEST_PATH, async () => {
  await delay();
  return HttpResponse.json({ version: 2, clips: [] });
});

/** All audio handlers are opt-in; none is part of `handlers/index.ts`. */
export const audioHandlers: RequestHandler[] = [audioManifestHandler];
