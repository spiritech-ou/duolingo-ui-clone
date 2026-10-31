import type { Meta, StoryObj } from '@storybook/react-vite';
import clsx from 'clsx';
import { expect, waitFor, within } from 'storybook/test';
import styles from './Typeface.module.scss';

// Estonian letters: o-tilde, a-umlaut, o-umlaut, u-umlaut (latin subset), s-caron, z-caron (latin-ext subset).
const ESTONIAN = 'õäöüšž ÕÄÖÜŠŽ';
const FAMILY = 'Outfit Variable';

function TypefaceSample() {
  return (
    <div>
      <p className={clsx(styles['sample'], styles['regular'])}>{ESTONIAN}</p>
      <p className={clsx(styles['sample'], styles['medium'])}>{ESTONIAN}</p>
      <p className={clsx(styles['sample'], styles['bold'])}>{ESTONIAN}</p>
    </div>
  );
}

const meta = {
  title: 'Foundation/Typeface',
  component: TypefaceSample,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof TypefaceSample>;

export default meta;
type Story = StoryObj<typeof meta>;

function unquote(family: string): string {
  return family.replace(/^["']|["']$/g, '');
}

function outfitFaces(): FontFace[] {
  return [...document.fonts].filter((face) => unquote(face.family) === FAMILY);
}

// Parses a FontFace.unicodeRange ("U+0000-00FF, U+0131, ...") and tells whether it covers a code point.
function covers(unicodeRange: string, codePoint: number): boolean {
  return unicodeRange.split(',').some((part) => {
    const [from = '', to = from] = part.trim().replace(/^U\+/i, '').split('-');
    return codePoint >= Number.parseInt(from, 16) && codePoint <= Number.parseInt(to, 16);
  });
}

function canvasWidth(font: string, text: string): number {
  const context = document.createElement('canvas').getContext('2d');
  if (context === null) throw new Error('2d canvas context unavailable');
  context.font = font;
  return context.measureText(text).width;
}

export const EstonianLetters: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const samples = canvas.getAllByText(ESTONIAN);
    await expect(samples).toHaveLength(3);

    // 1. The base font token puts Outfit first in the stack.
    for (const sample of samples) {
      const stack = getComputedStyle(sample).fontFamily.split(',').map((name) => unquote(name.trim()));
      await expect(stack[0]).toBe(FAMILY);
    }

    // 2. Both subsets are declared and, once the text is laid out, loaded (no CDN: the files are self-hosted).
    await document.fonts.load(`1em "${FAMILY}"`, ESTONIAN);
    await document.fonts.ready;
    const faces = outfitFaces();
    await expect(faces.length).toBeGreaterThanOrEqual(2);
    await waitFor(() => expect(outfitFaces().every((face) => face.status === 'loaded')).toBe(true));
    for (const face of faces) await expect(face.weight).toBe('100 900');

    // 3. Every Estonian letter is covered by a loaded Outfit face: latin for o-tilde a o u, latin-ext for s z.
    for (const letter of [...'õäöüšžÕÄÖÜŠŽ']) {
      const codePoint = letter.codePointAt(0) ?? 0;
      const carrier = outfitFaces().filter((face) => face.status === 'loaded' && covers(face.unicodeRange, codePoint));
      await expect(carrier.length, `no loaded ${FAMILY} face covers ${letter}`).toBeGreaterThan(0);
    }
    await expect(document.fonts.check(`16px "${FAMILY}"`, ESTONIAN)).toBe(true);

    // 4. No letter falls back: against a monospace-only stack its width changes when Outfit is first.
    for (const weight of [400, 500, 700]) {
      for (const letter of [...'õäöüšžÕÄÖÜŠŽ']) {
        const withOutfit = canvasWidth(`${weight} 64px "${FAMILY}", monospace`, letter);
        const fallbackOnly = canvasWidth(`${weight} 64px monospace`, letter);
        await expect(withOutfit, `${letter} at ${weight} rendered in the fallback`).not.toBe(fallbackOnly);
      }
    }
  },
};
