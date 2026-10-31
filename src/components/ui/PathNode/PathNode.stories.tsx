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
    // Bigger than the other states: shape as well as colour.
    await expect(node.getBoundingClientRect().width).toBeGreaterThan(
      parseFloat(getComputedStyle(document.documentElement).fontSize) * 5,
    );
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
