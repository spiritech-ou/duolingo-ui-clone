import { compile } from 'sass';
import { describe, expect, it } from 'vitest';

const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

const css = compile('src/styles/_themes.scss').css;

function readTokens(theme: Theme): Map<string, string> {
  const block = new RegExp(`:root\\[data-theme=['"]?${theme}['"]?\\]\\s*\\{([^}]*)\\}`).exec(css);
  if (!block?.[1]) throw new Error(`Theme block "${theme}" not found in compiled CSS`);
  const tokens = new Map<string, string>();
  for (const match of block[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    tokens.set(match[1] ?? '', (match[2] ?? '').trim());
  }
  return tokens;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const [r = 0, g = 0, b = 0] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

function color(tokens: Map<string, string>, name: string): string {
  const value = tokens.get(name);
  if (value === undefined) throw new Error(`Missing token ${name}`);
  if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`Token ${name} is not a hex colour: ${value}`);
  return value;
}

// [foreground, background, minimum ratio]. 4.5 for normal text, 3 for non-text UI.
const PAIRS: readonly (readonly [string, string, number])[] = [
  ['--color-text', '--color-bg', 4.5],
  ['--color-text', '--color-surface', 4.5],
  ['--color-text-muted', '--color-bg', 4.5],
  ['--color-text-muted', '--color-surface', 4.5],
  ['--color-primary', '--color-bg', 4.5],
  ['--color-primary', '--color-surface', 4.5],
  ['--color-danger', '--color-bg', 4.5],
  ['--color-danger', '--color-surface', 4.5],
  ['--color-on-primary', '--color-primary', 4.5],
  ['--color-on-primary', '--color-primary-hover', 4.5],
  ['--color-primary', '--color-primary-soft', 4.5],
  ['--color-border', '--color-bg', 3],
  ['--color-primary', '--color-bg', 3],
];

describe.each(THEMES)('%s theme contrast (WCAG AA)', (theme) => {
  const tokens = readTokens(theme);

  it.each(PAIRS)('%s on %s is at least %d:1', (foreground, background, minimum) => {
    expect(ratio(color(tokens, foreground), color(tokens, background))).toBeGreaterThanOrEqual(minimum);
  });

  it('defines the same token set as the other theme', () => {
    const other = readTokens(theme === 'light' ? 'dark' : 'light');
    const colors = (map: Map<string, string>) => [...map.keys()].filter((k) => k.startsWith('--color-')).sort();
    expect(colors(tokens)).toEqual(colors(other));
  });
});
