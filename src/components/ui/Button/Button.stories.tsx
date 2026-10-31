import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from './Button';

const submitted = fn();

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
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Continue' });
    await expect(button).not.toBeDisabled();
    await expect(button).toHaveAttribute('aria-disabled', 'true');
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const LoadingKeepsFocus: Story = {
  args: { isLoading: true },
  render: (args) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submitted();
      }}
    >
      <Button {...args} type="submit" />
    </form>
  ),
  play: async ({ canvasElement, args }) => {
    submitted.mockClear();
    const button = within(canvasElement).getByRole('button', { name: 'Continue' });
    button.focus();
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    await userEvent.click(button);
    await expect(button).toHaveFocus();
    await expect(document.activeElement).toBe(button);
    await expect(args.onClick).not.toHaveBeenCalled();
    await expect(submitted).not.toHaveBeenCalled();
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button).toHaveAttribute('aria-disabled', 'true');
  },
};

export const LoadingKeepsSize: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <Button {...args}>Continue</Button>
      <Button {...args} isLoading>
        Continue
      </Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [idle, busy] = within(canvasElement).getAllByRole('button');
    if (!idle || !busy) throw new Error('expected two buttons');
    await expect(busy.getBoundingClientRect().width).toBe(idle.getBoundingClientRect().width);
    await expect(busy.getBoundingClientRect().height).toBe(idle.getBoundingClientRect().height);
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
