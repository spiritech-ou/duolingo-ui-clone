import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Keep in sync with conventions react/components.md.
const FORBIDDEN_ALIASES = [
  '@/store',
  '@/hooks',
  '@/api',
  '@/mocks',
  '@/config',
  '@/features',
];
const FORBIDDEN_PACKAGES = [
  'zustand',
  'react-router',
  'react-router-dom',
  'react-hook-form',
  'zod',
];

const files = globSync('src/components/ui/**/*.{ts,tsx}');

const SPECIFIER_PATTERNS = [
  /\bfrom\s+['"]([^'"]+)['"]/g,
  /\bimport\s+['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function specifiers(source: string): string[] {
  return SPECIFIER_PATTERNS.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[1] ?? ''),
  );
}

function isForbidden(specifier: string): boolean {
  const matches = (name: string) => specifier === name || specifier.startsWith(`${name}/`);
  return FORBIDDEN_ALIASES.some(matches) || FORBIDDEN_PACKAGES.some(matches);
}

describe('components/ui purity', () => {
  it('finds ui component files (guards against a vacuous pass)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s has no forbidden imports or side channels', (file) => {
    const source = readFileSync(file, 'utf8');
    const violations = specifiers(source).filter(isForbidden);
    expect(violations, `${file} imports forbidden modules`).toEqual([]);
    expect(source, `${file} reads import.meta.env`).not.toContain('import.meta.env');
    expect(source, `${file} calls fetch(`).not.toMatch(/\bfetch\(/);
  });
});
