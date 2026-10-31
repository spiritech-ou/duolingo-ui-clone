import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { Notice } from './Notice';

const meta = {
  title: 'UI/Notice',
  component: Notice,
  args: {
    variant: 'info',
    children: 'We recommend starting at Unit 2.',
    onAction: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '28rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Notice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  play: async ({ canvas, canvasElement }) => {
    const notice = canvas.getByRole('status');
    await expect(notice).toHaveTextContent('We recommend starting at Unit 2.');
    await expect(notice).toHaveAttribute('aria-live', 'polite');
    await expect(canvas.queryByRole('alert')).toBeNull();
    await expect(canvas.queryByRole('button')).toBeNull();
    // The icon is decorative and present, so state is not carried by colour alone.
    await expect(canvasElement.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  },
};

export const InfoWithTitleAndAction: Story = {
  args: {
    title: 'No Estonian voice on this device',
    children: "Words won't be spoken, but you can still do every exercise.",
    actionLabel: 'Got it',
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText('No Estonian voice on this device')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Got it' }));
    await expect(args.onAction).toHaveBeenCalledTimes(1);
  },
};

export const InfoActionByKeyboard: Story = {
  args: { actionLabel: 'Got it' },
  play: async ({ canvas, args }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Got it' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onAction).toHaveBeenCalledTimes(1);
  },
};

export const ErrorAlert: Story = {
  args: {
    variant: 'error',
    role: 'alert',
    children: "That email or password isn't right.",
  },
  play: async ({ canvas, canvasElement }) => {
    const notice = canvas.getByRole('alert');
    await expect(notice).toHaveTextContent("That email or password isn't right.");
    await expect(notice).toHaveAttribute('aria-live', 'assertive');
    await expect(canvas.queryByRole('status')).toBeNull();
    await expect(canvasElement.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  },
};

export const ErrorWithTitleAndAction: Story = {
  args: {
    variant: 'error',
    role: 'alert',
    title: "Couldn't play this word.",
    children: 'You can keep going without sound.',
    actionLabel: 'Got it',
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent("Couldn't play this word.");
    await userEvent.click(canvas.getByRole('button', { name: 'Got it' }));
    await expect(args.onAction).toHaveBeenCalledTimes(1);
  },
};

export const ErrorAsStatus: Story = {
  args: { variant: 'error', children: 'Not available in this prototype.' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent('Not available in this prototype.');
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};

export const ActionWithoutHandlerIsHidden: Story = {
  args: { actionLabel: 'Got it' },
  render: (args) => (
    <Notice variant={args.variant} actionLabel="Got it">
      {args.children}
    </Notice>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

export const RestPropsCannotOverrideSemantics: Story = {
  args: {
    role: 'alert',
    // Untyped bag: the types forbid these props, a caller could still force them at runtime.
    ...({ 'aria-live': 'off', 'aria-atomic': 'false' } as object),
  },
  play: async ({ canvas }) => {
    const notice = canvas.getByRole('alert');
    await expect(notice).toHaveAttribute('aria-live', 'assertive');
    await expect(notice).toHaveAttribute('aria-atomic', 'true');
  },
};

export const LongText: Story = {
  args: {
    variant: 'error',
    title: 'This browser cannot speak words aloud, so sound is switched off for this lesson',
    children:
      'Averyveryverylongunbrokenwordthatshouldwrapinsteadofoverflowingthecontainerorpushingthebuttonaway and more text to fill several lines.',
    actionLabel: 'Got it',
  },
  play: async ({ canvas, canvasElement }) => {
    const notice = canvas.getByRole('status');
    await expect(notice.scrollWidth).toBeLessThanOrEqual(notice.clientWidth);
    await expect(canvas.getByRole('button', { name: 'Got it' })).toBeVisible();
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
