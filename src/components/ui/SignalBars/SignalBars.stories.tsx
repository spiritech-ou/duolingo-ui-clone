import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { SignalBars } from './SignalBars';
import type { SignalBarsProps } from './SignalBars';

const meta = {
  title: 'UI/SignalBars',
  component: SignalBars,
  args: { level: 2 },
} satisfies Meta<typeof SignalBars>;

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

/** Asserts how many bars are filled, that they are the first ones, and their colours. */
async function expectFilled(canvasElement: HTMLElement, count: number) {
  const root = canvasElement.querySelector<HTMLElement>('[aria-hidden="true"]');
  if (!root) throw new Error('signal bars root missing');
  const bars = Array.from(root.children) as HTMLElement[];
  await expect(bars).toHaveLength(4);
  await expect(bars.filter((bar) => bar.dataset['filled'] === 'true')).toHaveLength(count);
  for (const [index, bar] of bars.entries()) {
    const token = index < count ? '--color-primary' : '--color-border';
    await expect(getComputedStyle(bar).backgroundColor).toBe(resolveColor(token));
  }
  // Decorative: hidden from assistive tech and never exposed as an image or text.
  await expect(root).toHaveAttribute('aria-hidden', 'true');
  await expect(root).not.toHaveAttribute('role');
  await expect(root).toHaveTextContent('');
}

export const Level0: Story = {
  args: { level: 0 },
  play: ({ canvasElement }) => expectFilled(canvasElement, 0),
};

export const Level1: Story = {
  args: { level: 1 },
  play: ({ canvasElement }) => expectFilled(canvasElement, 1),
};

export const Level2: Story = {
  args: { level: 2 },
  play: ({ canvasElement }) => expectFilled(canvasElement, 2),
};

export const Level3: Story = {
  args: { level: 3 },
  play: ({ canvasElement }) => expectFilled(canvasElement, 3),
};

export const Level4: Story = {
  args: { level: 4 },
  play: ({ canvasElement }) => expectFilled(canvasElement, 4),
};

export const LevelClamped: Story = {
  args: { level: 9 },
  play: ({ canvasElement }) => expectFilled(canvasElement, 4),
};

export const RestPropsKeepDecorative: Story = {
  // Forced past the types on purpose: rest props must not expose the icon to assistive tech.
  args: {
    level: 3,
    ...({ 'aria-hidden': false, 'aria-label': 'Wrong', role: 'img' } as Partial<SignalBarsProps>),
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.queryByRole('img')).toBeNull();
    await expect(canvasElement.querySelector('[aria-label]')).toBeNull();
    await expectFilled(canvasElement, 3);
  },
};
