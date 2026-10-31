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
} satisfies Meta<typeof ExerciseTopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
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
      <div style={{ width: '20rem' }}>
        <Story />
      </div>
    ),
  ],
};
