import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';
import { ProgressBar } from './ProgressBar';
import type { ProgressBarProps } from './ProgressBar';

const meta = {
  title: 'UI/ProgressBar',
  component: ProgressBar,
  args: { value: 3, max: 10 },
  decorators: [
    (Story) => (
      <div style={{ width: '20rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The share of the track the fill covers, from the rendered boxes. */
function filledShare(bar: HTMLElement): number {
  const fill = bar.firstElementChild;
  if (!fill) throw new Error('fill missing');
  return (fill.getBoundingClientRect().right - bar.getBoundingClientRect().left) /
    bar.getBoundingClientRect().width;
}

export const Empty: Story = {
  args: { value: 0 },
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('progressbar', { name: 'Lesson progress' });
    await expect(bar).toHaveAttribute('aria-valuenow', '0');
    await expect(bar).toHaveAttribute('aria-valuemax', '10');
    await expect(filledShare(bar)).toBeCloseTo(0, 1);
  },
};

export const Partial: Story = {
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('progressbar', { name: 'Lesson progress' });
    await expect(bar).toHaveAttribute('aria-valuenow', '3');
    await expect(bar).toHaveAttribute('aria-valuemax', '10');
    await expect(filledShare(bar)).toBeCloseTo(0.3, 1);
  },
};

export const Full: Story = {
  args: { value: 10 },
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('progressbar', { name: 'Lesson progress' });
    await expect(bar).toHaveAttribute('aria-valuenow', '10');
    await expect(filledShare(bar)).toBeCloseTo(1, 1);
  },
};

export const Dimensions: Story = {
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('progressbar', { name: 'Lesson progress' });
    // 22px high with fully rounded ends (radius at least half the height).
    await expect(bar.getBoundingClientRect().height).toBeCloseTo(22, 0);
    await expect(parseFloat(getComputedStyle(bar).borderTopLeftRadius)).toBeGreaterThanOrEqual(11);
  },
};

export const CustomLabel: Story = {
  args: { label: 'Practice progress' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('progressbar', { name: 'Practice progress' })).toBeVisible();
  },
};

export const ValueClamped: Story = {
  args: { value: 15 },
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('progressbar');
    await expect(bar).toHaveAttribute('aria-valuenow', '10');
  },
};

// Story-only harness: the component is controlled, so a button owns the value.
function RenderWithButton(args: ProgressBarProps) {
  const [value, setValue] = useState(args.value);
  return (
    <div>
      <ProgressBar {...args} value={value} />
      <button type="button" onClick={() => setValue((v) => v + 1)}>
        Answer correctly
      </button>
    </div>
  );
}

export const ChangesValue: Story = {
  args: { value: 0, max: 4 },
  render: RenderWithButton,
  play: async ({ canvas }) => {
    const bar = () => canvas.getByRole('progressbar', { name: 'Lesson progress' });
    await expect(bar()).toHaveAttribute('aria-valuenow', '0');

    await userEvent.click(canvas.getByRole('button', { name: 'Answer correctly' }));
    await waitFor(() => expect(bar()).toHaveAttribute('aria-valuenow', '1'));
    await waitFor(() => expect(filledShare(bar())).toBeCloseTo(0.25, 1));

    await userEvent.click(canvas.getByRole('button', { name: 'Answer correctly' }));
    await waitFor(() => expect(bar()).toHaveAttribute('aria-valuenow', '2'));
    await waitFor(() => expect(filledShare(bar())).toBeCloseTo(0.5, 1));
  },
};
