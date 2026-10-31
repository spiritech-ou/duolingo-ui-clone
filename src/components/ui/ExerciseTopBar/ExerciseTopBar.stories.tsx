import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { IconButton } from '@/components/ui/IconButton';
import { ExerciseTopBar } from './ExerciseTopBar';

const meta = {
  title: 'UI/ExerciseTopBar',
  component: ExerciseTopBar,
  // The bar fills its container, so show it full width rather than centred.
  parameters: { layout: 'fullscreen' },
  args: { progress: 2, total: 8, hearts: 5, onClose: fn() },
  // Stands in for the page gutters that FocusedLayout provides.
  decorators: [
    (Story) => (
      <div style={{ padding: '0.75rem 1rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ExerciseTopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Boxes of the row's parts, measured from the rendered page. */
function measureRow(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const row = canvasElement.querySelector('header');
  if (!row) throw new Error('top bar missing');
  const rect = (el: HTMLElement) => el.getBoundingClientRect();
  const close = rect(canvas.getByRole('button', { name: 'Close' }));
  const bar = rect(canvas.getByRole('progressbar', { name: 'Lesson progress' }));
  const hearts = rect(canvas.getByRole('img', { name: /heart/i }));
  const centres = [close, bar, hearts].map((box) => box.top + box.height / 2);
  return {
    row: rect(row),
    close,
    bar,
    hearts,
    // One line: every part is centred on the same horizontal axis.
    isOneLine: Math.max(...centres) - Math.min(...centres) < 1,
  };
}

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const box = measureRow(canvasElement);
    await expect(box.isOneLine).toBe(true);
    await expect(box.bar.height).toBeCloseTo(22, 0);
    await expect(box.close.width).toBeGreaterThanOrEqual(44);
    await expect(box.hearts.width).toBeGreaterThanOrEqual(62);
    // The bar fills the space between the close button and the hearts.
    await expect(box.bar.left).toBeGreaterThan(box.close.right);
    await expect(box.bar.right).toBeLessThan(box.hearts.left);
    await expect(box.bar.width).toBeGreaterThan(box.row.width * 0.5);
    await expect(canvas.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute(
      'aria-valuenow',
      '2',
    );
    await expect(canvas.getByRole('img', { name: '5 hearts left' })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(args.onClose).toHaveBeenCalledTimes(1);
  },
};

export const NoHearts: Story = {
  args: { hearts: 0 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img', { name: 'No hearts left' })).toBeInTheDocument();
    const box = measureRow(canvasElement);
    await expect(box.isOneLine).toBe(true);
    await expect(box.hearts.width).toBeGreaterThanOrEqual(62);
  },
};

export const WithTrailing: Story = {
  args: {
    trailing: (
      <IconButton icon="speaker-off" label="Sound unavailable" isAriaDisabled size="md" />
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClose).toHaveBeenCalledTimes(1);
    // Hearts are not focusable: the next stop is the trailing control.
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Sound unavailable' })).toHaveFocus();
    // The speaker sits between the bar and the hearts counter, and the bar keeps a usable width.
    const box = measureRow(canvasElement);
    const speaker = canvas.getByRole('button', { name: 'Sound unavailable' }).getBoundingClientRect();
    await expect(box.isOneLine).toBe(true);
    await expect(speaker.left).toBeGreaterThanOrEqual(box.bar.right);
    await expect(speaker.right).toBeLessThanOrEqual(box.hearts.left);
    await expect(box.bar.height).toBeCloseTo(22, 0);
    await expect(box.bar.width).toBeGreaterThanOrEqual(150);
  },
};

export const NarrowPhone: Story = {
  args: {
    trailing: (
      <IconButton icon="speaker-off" label="Sound unavailable" isAriaDisabled size="md" />
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '390px' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const box = measureRow(canvasElement);
    const speaker = within(canvasElement)
      .getByRole('button', { name: 'Sound unavailable' })
      .getBoundingClientRect();
    // One line at 390px, bar still usable, close tap target at least 44px.
    await expect(box.isOneLine).toBe(true);
    await expect(box.row.height).toBeLessThan(80);
    await expect(box.close.width).toBeGreaterThanOrEqual(44);
    await expect(box.close.height).toBeGreaterThanOrEqual(44);
    await expect(box.bar.height).toBeCloseTo(22, 0);
    await expect(box.bar.width).toBeGreaterThanOrEqual(150);
    await expect(speaker.right).toBeLessThanOrEqual(box.hearts.left);
    await expect(box.hearts.right).toBeLessThanOrEqual(box.row.right);
  },
};
