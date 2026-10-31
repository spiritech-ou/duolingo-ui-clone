import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('product name in index.html', () => {
  const html = readFileSync('index.html', 'utf8');

  it('titles the document exactly with the product name', () => {
    const match = /<title>([^<]*)<\/title>/.exec(html);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('Spiritech');
  });

  it('does not mention Duolingo anywhere', () => {
    expect(html.toLowerCase()).not.toContain('duolingo');
  });
});
