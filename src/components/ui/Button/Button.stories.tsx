import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from './Button';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Continue', onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Continue' });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const Secondary: Story = {
  args: { variant: 'secondary' },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Continue' });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const Disabled: Story = {
  args: { isDisabled: true },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Continue' });
    await expect(button).toBeDisabled();
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const Loading: Story = {
  args: { isLoading: true },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Continue' });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-busy', 'true');
  },
};

export const LongText: Story = {
  args: { children: 'Continue to the next lesson of the learning path' },
};

export const Keyboard: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.tab();
    const button = within(canvasElement).getByRole('button', { name: 'Continue' });
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};
