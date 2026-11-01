import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { PathNode } from './PathNode';

const meta = {
  title: 'UI/PathNode',
  component: PathNode,
  args: { status: 'available', label: 'Lesson 5, Drinks', lessonNumber: 5, onClick: fn() },
  decorators: [
    (Story) => (
      // Room for the bubble above and the widest offsets to the sides.
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 3rem 2rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PathNode>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Resolves a colour token to the computed rgb value the browser reports. */
function resolveColor(token: string): string {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

/** The horizontal shift in px that `offset` steps should produce at the current width. */
function expectedShift(node: HTMLElement, offset: number): number {
  const step = getComputedStyle(node).getPropertyValue('--path-node-step').trim();
  const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const px = step.endsWith('rem') ? parseFloat(step) * rootSize : parseFloat(step);
  return offset * px;
}

function shiftOf(node: HTMLElement): number {
  const translate = getComputedStyle(node).translate;
  return translate === 'none' ? 0 : parseFloat(translate.split(' ')[0] ?? '0');
}

export const Available: Story = {
  play: async ({ canvas, args }) => {
    const node = canvas.getByRole('button', { name: 'Lesson 5, Drinks' });
    await expect(node).toBeEnabled();
    await expect(node).toHaveTextContent('5');
    await expect(node).not.toHaveAttribute('aria-current');
    await expect(canvas.queryByText('START')).toBeNull();
    await expect(getComputedStyle(node).animationName).toBe('none');

    await userEvent.click(node);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const AvailableWithBook: Story = {
  args: { lessonNumber: undefined },
  play: async ({ canvas }) => {
    const node = canvas.getByRole('button', { name: 'Lesson 5, Drinks' });
    // No number, so the book icon marks the node.
    await expect(node).toHaveTextContent('');
    await expect(node.querySelector('svg')).not.toBeNull();
  },
};

export const Completed: Story = {
  args: { status: 'completed', label: 'Lesson 3, Greetings, completed' },
  play: async ({ canvas, args }) => {
    const node = canvas.getByRole('button', { name: 'Lesson 3, Greetings, completed' });
    await expect(node).toBeEnabled();
    // A check mark, not a number, so the state is not colour only.
    await expect(node.querySelector('svg')).not.toBeNull();
    await expect(node).toHaveTextContent('');
    await expect(getComputedStyle(node).backgroundColor).toBe(resolveColor('--color-success'));
    await expect(node).not.toHaveAttribute('aria-current');
    // Completed lessons stay replayable.
    await userEvent.click(node);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const Recommended: Story = {
  args: { status: 'recommended', label: 'Lesson 4, Food, recommended, start' },
  play: async ({ canvas, args }) => {
    const node = canvas.getByRole('button', { name: 'Lesson 4, Food, recommended, start' });
    await expect(node).toBeEnabled();
    await expect(node).toHaveAttribute('aria-current', 'step');
    await expect(node).toHaveTextContent('START');
    await expect(node.querySelector('svg')).not.toBeNull();
    // Same size as the other states (the path pitch stays constant); the ring, the play icon and
    // the bubble set it apart, not colour alone.
    await expect(getComputedStyle(node).boxShadow).not.toBe('none');
    // Pulses while idle (no pointer over it yet).
    await expect(getComputedStyle(node).animationName).toContain('pulse');

    await userEvent.click(node);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const RecommendedWithReducedMotion: Story = {
  args: { status: 'recommended', label: 'Lesson 4, Food, recommended, start' },
  play: async ({ canvas }) => {
    // Media emulation needs the Vitest browser runner; the plain Storybook UI
    // has none (a top-level import would break the page).
    const runner = await import('vitest/browser').catch(() => null);
    if (!runner) {
      console.warn('RecommendedWithReducedMotion: no Vitest browser runner, motion check skipped.');
      return;
    }
    const session = runner.cdp();
    await session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    try {
      await expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
      const node = canvas.getByRole('button', { name: 'Lesson 4, Food, recommended, start' });
      await expect(getComputedStyle(node).animationName).toBe('none');
      // The state is still readable without the pulse.
      await expect(node).toHaveAttribute('aria-current', 'step');
      await expect(node).toHaveTextContent('START');
    } finally {
      await session.send('Emulation.setEmulatedMedia', { features: [] });
    }
  },
};

export const RestPropsKeepA11y: Story = {
  // Forced past the types on purpose: rest props must not replace the component's own attributes.
  args: {
    status: 'recommended',
    label: 'Lesson 4, Food, recommended, start',
    ...({
      'aria-label': 'Wrong',
      'aria-current': 'page',
      disabled: true,
      type: 'submit',
    } as object),
  },
  play: async ({ canvas }) => {
    const node = canvas.getByRole('button', { name: 'Lesson 4, Food, recommended, start' });
    await expect(node).toBeEnabled();
    await expect(node).toHaveAttribute('aria-current', 'step');
    await expect(node).toHaveAttribute('type', 'button');
  },
};

export const OffsetCentre: Story = {
  args: { offset: 0 },
  play: async ({ canvas }) => {
    const node = canvas.getByRole('button', { name: 'Lesson 5, Drinks' });
    await expect(shiftOf(node)).toBe(0);
  },
};

export const OffsetRight: Story = {
  args: { offset: 2 },
  play: async ({ canvas }) => {
    const node = canvas.getByRole('button', { name: 'Lesson 5, Drinks' });
    await expect(node.style.getPropertyValue('--path-node-offset')).toBe('2');
    await expect(shiftOf(node)).toBeGreaterThan(0);
    await expect(shiftOf(node)).toBeCloseTo(expectedShift(node, 2), 1);
  },
};

export const OffsetLeft: Story = {
  args: { offset: -1, status: 'completed', label: 'Lesson 3, Greetings, completed' },
  play: async ({ canvas }) => {
    const node = canvas.getByRole('button', { name: 'Lesson 3, Greetings, completed' });
    await expect(node.style.getPropertyValue('--path-node-offset')).toBe('-1');
    await expect(shiftOf(node)).toBeLessThan(0);
    await expect(shiftOf(node)).toBeCloseTo(expectedShift(node, -1), 1);
  },
};

export const OffsetOnRecommended: Story = {
  args: {
    offset: 1,
    status: 'recommended',
    label: 'Lesson 4, Food, recommended, start',
  },
  play: async ({ canvas }) => {
    const node = canvas.getByRole('button', { name: 'Lesson 4, Food, recommended, start' });
    // The pulse uses `scale`, so it does not replace the offset.
    await expect(getComputedStyle(node).animationName).toContain('pulse');
    await expect(shiftOf(node)).toBeCloseTo(expectedShift(node, 1), 1);
  },
};

export const OffsetIsRounded: Story = {
  args: { offset: 1.6 },
  play: async ({ canvas }) => {
    const node = canvas.getByRole('button', { name: 'Lesson 5, Drinks' });
    await expect(node.style.getPropertyValue('--path-node-offset')).toBe('2');
  },
};

const VIEWPORTS = {
  wide: { name: 'Wide 1280', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
  phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
} as const;

const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);

/** Layout size in px, not affected by `translate` or the pulse's `scale`. */
function layoutSize(node: HTMLElement) {
  return { width: node.offsetWidth, height: node.offsetHeight };
}

export const SizesWide: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'wide', isRotated: false } },
  args: { status: 'available', offset: 2 },
  play: async ({ canvas }) => {
    await expect(window.innerWidth).toBeGreaterThanOrEqual(1280);
    const node = canvas.getByRole('button', { name: 'Lesson 5, Drinks' });
    // Tablet and desktop: 72px node, 50px zigzag step.
    await expect(layoutSize(node)).toEqual({ width: 72, height: 72 });
    await expect(getComputedStyle(node).getPropertyValue('--path-node-step').trim()).toBe('3.125rem');
    await expect(shiftOf(node)).toBeCloseTo(2 * 3.125 * rem(), 1);
    await expect(shiftOf(node)).toBeCloseTo(100, 1);
  },
};

export const SizesPhone: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'phone', isRotated: false } },
  args: { status: 'available', offset: 2 },
  play: async ({ canvas, canvasElement }) => {
    // Chromatic renders in its own browser: no Vitest runner, no window resize, no real focus.
    // The check job runs this interaction test; Chromatic only takes the snapshot.
    if (navigator.userAgent.includes('Chromatic')) return;
    await expect(window.innerWidth).toBe(390);
    const node = canvas.getByRole('button', { name: 'Lesson 5, Drinks' });
    // Mobile: 64px node, 40px zigzag step, so two steps stay at 80px from the centre line.
    await expect(layoutSize(node)).toEqual({ width: 64, height: 64 });
    await expect(shiftOf(node)).toBeCloseTo(80, 1);
    // The widest offset keeps the node fully inside the screen.
    const box = node.getBoundingClientRect();
    await expect(box.left).toBeGreaterThanOrEqual(0);
    await expect(box.right).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};

export const RecommendedSameSize: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'phone', isRotated: false } },
  args: { status: 'recommended', label: 'Lesson 4, Food, recommended, start' },
  play: async ({ canvas }) => {
    const node = canvas.getByRole('button', { name: 'Lesson 4, Food, recommended, start' });
    await expect(layoutSize(node)).toEqual({ width: 64, height: 64 });
  },
};

export const KeyboardActivation: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.tab();
    const node = canvas.getByRole('button', { name: 'Lesson 5, Drinks' });
    await expect(node).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
};
