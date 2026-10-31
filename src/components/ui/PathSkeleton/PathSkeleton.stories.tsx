import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { PathSkeleton } from './PathSkeleton';

const meta = {
  title: 'UI/PathSkeleton',
  component: PathSkeleton,
  decorators: [
    (Story) => (
      <div style={{ width: 'min(100vw, 26rem)', padding: '3rem 1rem 2rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PathSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const status = canvas.getByRole('status');
    await expect(status).toHaveTextContent('Loading your lessons');
    const root = status.parentElement as HTMLElement; // the container is the status text's parent
    await expect(root).toHaveAttribute('aria-busy', 'true');

    // Banner plus five nodes, all hidden from assistive tech.
    const shapes = canvasElement.querySelectorAll('[aria-hidden="true"] > *, [aria-hidden="true"]');
    await expect(shapes.length).toBeGreaterThanOrEqual(6);
    await expect(canvas.queryAllByRole('button')).toHaveLength(0);
    await expect(canvas.queryAllByRole('heading')).toHaveLength(0);

    // The status text is visually hidden, not display:none.
    const box = status.getBoundingClientRect();
    await expect(box.width).toBeLessThanOrEqual(1);
    await expect(getComputedStyle(status).display).not.toBe('none');

    // Zigzag: nodes follow 0, +1, +2, +1, 0 steps like UnitSection.
    const nodes = Array.from(canvasElement.querySelectorAll<HTMLElement>('[style*="--path-node-offset"]'));
    await expect(nodes).toHaveLength(5);
    await expect(nodes.map((n) => n.style.getPropertyValue('--path-node-offset'))).toEqual([
      '0',
      '1',
      '2',
      '1',
      '0',
    ]);
    const xs = nodes.map((n) => n.getBoundingClientRect().x);
    await expect(xs[2]).toBeGreaterThan(xs[0] ?? 0);

    // Shapes shimmer when motion is allowed (reduced motion is covered by WithReducedMotion).
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await expect(getComputedStyle(nodes[0] as HTMLElement).animationName).not.toBe('none');
    }
  },
};

export const WithReducedMotion: Story = {
  play: async ({ canvas, canvasElement }) => {
    // Media emulation needs the Vitest browser runner; the plain Storybook UI
    // has none (a top-level import would break the page).
    const runner = await import('vitest/browser').catch(() => null);
    if (!runner) {
      console.warn('WithReducedMotion: no Vitest browser runner, motion check skipped.');
      return;
    }
    const session = runner.cdp();
    await session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    try {
      await expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
      const shapes = Array.from(canvasElement.querySelectorAll<HTMLElement>('[aria-hidden="true"] *, [aria-hidden="true"]')).filter(
        (el) => getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)',
      );
      await expect(shapes).toHaveLength(6);
      for (const shape of shapes) {
        await expect(getComputedStyle(shape).animationName).toBe('none');
      }
      // Still a placeholder, and still announced.
      await expect(canvas.getByRole('status')).toHaveTextContent('Loading your lessons');
    } finally {
      await session.send('Emulation.setEmulatedMedia', { features: [] });
    }
  },
};

export const RestPropsKeepA11y: Story = {
  args: {
    // Forced past the types on purpose: rest props must not replace aria-busy.
    ...({ 'aria-busy': 'false' } as object),
    id: 'path-loading',
  },
  play: async ({ canvas }) => {
    const root = canvas.getByRole('status').parentElement as HTMLElement;
    await expect(root).toHaveAttribute('aria-busy', 'true');
    await expect(root).toHaveAttribute('id', 'path-loading');
  },
};
