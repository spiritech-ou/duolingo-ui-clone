import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Guards against hard-coded leading-slash static asset URLs. They resolve against the site root,
 * so they work at `/` (dev, Storybook) but break silently under the GitHub Pages sub path
 * `/duolingo-ui-clone/`. Static assets must go through `assetUrl()` from `@/lib/baseUrl`
 * (or a relative / `%BASE_URL%` reference in `index.html`).
 *
 * Scope: `src/**` non-test, non-story sources and `index.html`. Not scanned:
 * - `src/mocks/handlers/**`: the MSW wildcard patterns there (`*` + `/audio/manifest.json`,
 *   `*` + `/api/...`) are deliberate request matchers, not URLs the app requests.
 * - tests and stories (`*.test.*`, `*.stories.*`), which assert URLs on purpose.
 * Comments are stripped before scanning, so prose may mention a path.
 *
 * `index.html` keeps `href="/favicon.svg"`: Vite rewrites it with the base. Verified with
 * `npm run build:pages` (base `/duolingo-ui-clone/`): `dist/index.html` contains
 * `href="/duolingo-ui-clone/favicon.svg"`. If a future build stops rewriting it, switch the
 * source to `%BASE_URL%favicon.svg` and drop that entry from ALLOWED_DECLARATIONS.
 *
 * Known limitations (accepted):
 * - The asset roots are a fixed list (ASSET_ROOTS): a URL under a root not listed there is only
 *   caught when it is the argument of `fetch(`, `new Audio(` or `.register(`.
 * - Comments are stripped with regexes, not a parser: a `//` or `/*` inside a string or template
 *   literal can hide the rest of that line or block from the scan.
 */

/**
 * Static asset roots. A string literal that starts with a slash followed by one of these is
 * flagged. Add a new asset folder (for example a new `public/` subfolder) here.
 */
const ASSET_ROOTS = ['audio', 'mockServiceWorker', 'favicon', 'fonts', 'data/', 'images', 'assets'];

/** Quote, then `/<root>`: single, double or template literal. */
const ASSET_LITERAL = new RegExp(`(['"\`])/(?:${ASSET_ROOTS.join('|')})`, 'g');

/** Loaders that take a URL: any literal beginning with `/` is a root-relative URL. */
const LOADER_LITERAL = /(?:\bfetch|\bnew Audio|\.register)\(\s*(['"`])\//g;

/** `assetUrl('/audio/x.mp3')` is the sanctioned way to build the URL: its argument is exempt. */
const ASSET_URL_CALL = /\bassetUrl\(\s*(['"`])\/[^'"`]*\1\s*\)/g;

/** Files that may contain the patterns (the helper documents and normalises leading slashes). */
const ALLOWED_FILES = ['src/lib/baseUrl.ts'];

/**
 * Exemptions allowed in one file, each with the reason. Keep this list tiny. Only the FIRST match
 * of `pattern` in the file is removed before scanning, so any other occurrence of the same
 * literal in that file (for example a `fetch('/audio/manifest.json')`) is still flagged.
 * - audio.ts: the single declaration of the base-relative path constant, which is only ever
 *   passed to `assetUrl()`. The pattern is anchored to the whole declaration line.
 * - index.html: Vite rewrites the favicon link with the base (see the top comment).
 */
const ALLOWED_DECLARATIONS: readonly { file: string; pattern: RegExp }[] = [
  {
    file: 'src/api/endpoints/audio.ts',
    pattern: /^[ \t]*(?:export )?const AUDIO_MANIFEST_PATH = '\/audio\/manifest\.json';[ \t]*$/m,
  },
  { file: 'index.html', pattern: /href="\/favicon\.svg"/ },
];

/** Drops block comments and `//` line comments (not the `//` of `https://`). */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\'"`])\/\/.*$/gm, '$1');
}

/** The offending snippets of one file's source, empty when clean. */
function findRootRelativeUrls(file: string, source: string): string[] {
  if (ALLOWED_FILES.includes(file)) return [];
  let text = stripComments(source).replace(ASSET_URL_CALL, '');
  for (const allowed of ALLOWED_DECLARATIONS) {
    if (allowed.file === file) text = text.replace(allowed.pattern, '');
  }
  const snippets = [...text.matchAll(ASSET_LITERAL), ...text.matchAll(LOADER_LITERAL)];
  return snippets.map((match) => match[0]);
}

const isScanned = (file: string): boolean =>
  !file.startsWith('src/mocks/handlers/') &&
  !/\.(?:test|stories)\.tsx?$/.test(file) &&
  !file.endsWith('.d.ts');

const toPosix = (file: string): string => file.replace(/\\/g, '/');

const sourceFiles = globSync('src/**/*.{ts,tsx}').map(toPosix).filter(isScanned);
const files = [...sourceFiles, 'index.html'];

describe('no hard-coded root-relative asset URLs', () => {
  it('finds source files and index.html (guards against a vacuous pass)', () => {
    expect(sourceFiles.length).toBeGreaterThan(10);
    expect(files).toContain('src/lib/baseUrl.ts');
    expect(files).not.toContain('src/mocks/handlers/index.ts');
  });

  it('flags root-relative asset URLs in a sample (guards against a dead pattern)', () => {
    const offenders = [
      "const a = '/audio/x.mp3';",
      'const a = "/audio/x.mp3";',
      'const a = `/audio/${id}.mp3`;',
      "setup('/mockServiceWorker.js');",
      "const f = '/favicon.svg';",
      "const f = '/fonts/outfit.woff2';",
      "const d = '/data/lessons.json';",
      "const i = '/images/logo.png';",
      "const s = '/assets/a.svg';",
      "fetch('/api/units');",
      "new Audio('/anything.mp3');",
      "navigator.serviceWorker.register('/sw.js');",
      '<link rel="icon" href="/favicon.png" />',
    ];
    for (const sample of offenders) {
      expect(findRootRelativeUrls('src/sample.ts', sample), sample).not.toEqual([]);
    }
  });

  it('accepts the sanctioned forms in a sample', () => {
    const clean = [
      "const a = assetUrl('/audio/x.mp3');",
      'const a = assetUrl(`/audio/${id}.mp3`);',
      "const a = assetUrl('audio/x.mp3');",
      "import { Icon } from '@/assets/icon.svg';",
      "// the clip is served at '/audio/x.mp3'",
      '/** served at `/audio/<file>` under the base */',
      "fetch('https://example.com/audio/x.mp3');",
      "fetch(`${base}/x`);",
      '<script type="module" src="/src/main.tsx"></script>',
    ];
    for (const sample of clean) {
      expect(findRootRelativeUrls('src/sample.ts', sample), sample).toEqual([]);
    }
    expect(findRootRelativeUrls('src/lib/baseUrl.ts', "'/audio/x.mp3'")).toEqual([]);
  });

  it('exempts only the audio manifest declaration, not other uses of its literal', () => {
    const audio = 'src/api/endpoints/audio.ts';
    const declaration = "export const AUDIO_MANIFEST_PATH = '/audio/manifest.json';";
    expect(findRootRelativeUrls(audio, declaration)).toEqual([]);
    expect(findRootRelativeUrls(audio, `${declaration}\nconst u = assetUrl(AUDIO_MANIFEST_PATH);`)).toEqual([]);

    const misuses = [
      `${declaration}\nawait fetch('/audio/manifest.json');`,
      `${declaration}\nawait request('/audio/manifest.json', schema);`,
      `${declaration}\nconst copy = '/audio/manifest.json';`,
      `${declaration}\n${declaration}`,
      "fetch('/audio/manifest.json');",
    ];
    for (const sample of misuses) {
      expect(findRootRelativeUrls(audio, sample), sample).not.toEqual([]);
    }
    expect(findRootRelativeUrls('src/other.ts', declaration)).not.toEqual([]);
  });

  it.each(files)('%s has no root-relative asset URL', (file) => {
    const source = readFileSync(file, 'utf8');
    expect(
      findRootRelativeUrls(file, source),
      `${file} hard-codes a root-relative asset URL; build it with assetUrl() from @/lib/baseUrl`,
    ).toEqual([]);
  });
});
