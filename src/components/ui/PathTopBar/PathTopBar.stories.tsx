import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { PathSkeleton } from '@/components/ui/PathSkeleton';
import { PathTopBar } from './PathTopBar';

const meta = {
  title: 'UI/PathTopBar',
  component: PathTopBar,
  args: { hearts: 5, onLogOut: fn() },
} satisfies Meta<typeof PathTopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHearts: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: '5 hearts left' })).toHaveTextContent('5');
    await expect(canvas.getByRole('button', { name: 'Log out' })).toBeEnabled();
  },
};

export const ZeroHearts: Story = {
  args: { hearts: 0 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'No hearts left' })).toHaveTextContent('0');
    // Logging out stays available with no hearts.
    await expect(canvas.getByRole('button', { name: 'Log out' })).toBeEnabled();
  },
};

export const LogOut: Story = {
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole('button', { name: 'Log out' });
    await expect(args.onLogOut).not.toHaveBeenCalled();
    await userEvent.click(button);
    await expect(args.onLogOut).toHaveBeenCalledTimes(1);

    // Keyboard works too.
    button.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onLogOut).toHaveBeenCalledTimes(2);
  },
};

/** The bar follows the column the page places it in: hearts left, "Log out" right, one row. */
export const FillsColumn: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '40rem' }} data-testid="column">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const column = canvas.getByTestId('column');
    const bar = canvas.getByRole('banner');
    await expect(column.offsetWidth).toBe(640);
    await expect(bar.offsetWidth).toBe(640);
    const hearts = canvas.getByRole('img', { name: '5 hearts left' }).getBoundingClientRect();
    const logOut = canvas.getByRole('button', { name: 'Log out' }).getBoundingClientRect();
    await expect(hearts.left).toBeLessThan(logOut.left);
    // One row: both are vertically within the bar.
    await expect(Math.abs(hearts.top + hearts.height / 2 - (logOut.top + logOut.height / 2))).toBeLessThan(4);
  },
};

export const RestPropsKeepContent: Story = {
  // Forced past the types on purpose: rest props must not replace the bar's content.
  render: (args) => <PathTopBar {...args} {...({ children: 'Wrong' } as object)} />,
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('Wrong')).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Log out' })).toBeVisible();
    await expect(canvas.getByRole('img', { name: '5 hearts left' })).toBeVisible();
  },
};

/** Loading: the bar is usable above the skeleton, and stays pinned while content scrolls. */
export const StickyWhileLoading: Story = {
  render: (args) => (
    <div style={{ height: '16rem', overflow: 'auto' }} data-testid="scroller">
      <PathTopBar {...args} />
      <PathSkeleton />
      <div style={{ height: '40rem' }} />
    </div>
  ),
  play: async ({ canvas, args }) => {
    const scroller = canvas.getByTestId('scroller');
    const bar = canvas.getByRole('banner');
    await expect(getComputedStyle(bar).position).toBe('sticky');

    scroller.scrollTop = 300;
    await expect(scroller.scrollTop).toBeGreaterThan(0);
    const top = bar.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    await expect(Math.round(top)).toBe(0);

    await userEvent.click(canvas.getByRole('button', { name: 'Log out' }));
    await expect(args.onLogOut).toHaveBeenCalled();
  },
};
