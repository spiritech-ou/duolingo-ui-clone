import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '@/components/ui/Button';
import { HeartsCounter } from '@/components/ui/HeartsCounter';
import { Dialog } from './Dialog';

const exitActions = (
  <>
    <Button variant="primary">KEEP LEARNING</Button>
    <Button variant="secondary">QUIT</Button>
  </>
);

const meta = {
  title: 'UI/Dialog',
  component: Dialog,
  parameters: { layout: 'fullscreen' },
  args: {
    isOpen: true,
    onClose: fn(),
    title: 'Quit lesson?',
    description: "You'll lose your progress in this lesson.",
    actions: exitActions,
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// The dialog is portalled to the body, outside the story canvas.
const screen = () => within(document.body);

export const ExitDialog: Story = {
  play: async ({ canvasElement }) => {
    const dialog = screen().getByRole('dialog', { name: 'Quit lesson?' });
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAccessibleDescription("You'll lose your progress in this lesson.");
    // Focus moved in, to the first action.
    await expect(screen().getByRole('button', { name: 'KEEP LEARNING' })).toHaveFocus();
    // The rest of the page is inert.
    await expect(canvasElement).toHaveAttribute('inert');
    // The page behind does not scroll.
    await expect(document.body.style.overflow).toBe('hidden');
  },
};

export const FirstMistakeModal: Story = {
  args: {
    title: 'Each mistake costs 1 heart!',
    description: 'Stay sharp and focused to keep your hearts. You got this!',
    children: <HeartsCounter value={4} />,
    actions: <Button variant="primary">KEEP GOING</Button>,
  },
  play: async () => {
    const dialog = screen().getByRole('dialog', { name: 'Each mistake costs 1 heart!' });
    // Visible once the entrance animation has started to fade in.
    await waitFor(() =>
      expect(within(dialog).getByRole('img', { name: '4 hearts left' })).toBeVisible(),
    );
    await expect(screen().getByRole('button', { name: 'KEEP GOING' })).toHaveFocus();
  },
};

export const WithoutDescription: Story = {
  render: (args) => <Dialog isOpen={args.isOpen} onClose={args.onClose} title={args.title} />,
  play: async () => {
    const dialog = screen().getByRole('dialog', { name: 'Quit lesson?' });
    await expect(dialog).not.toHaveAttribute('aria-describedby');
  },
};

export const LongText: Story = {
  args: {
    title: 'Are you really sure you want to quit this lesson right now and lose everything?',
    description:
      'Averyveryverylongunbrokenwordthatshouldwrapinsteadofoverflowingthedialog and more text to fill several lines of the dialog body.',
  },
  play: async () => {
    const dialog = screen().getByRole('dialog');
    await expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth);
    await waitFor(() => expect(screen().getByRole('button', { name: 'QUIT' })).toBeVisible());
  },
};

export const Closed: Story = {
  args: { isOpen: false },
  play: async ({ canvasElement }) => {
    await expect(screen().queryByRole('dialog')).toBeNull();
    await expect(canvasElement).not.toHaveAttribute('inert');
  },
};

export const FocusIsTrapped: Story = {
  play: async () => {
    const keepLearning = screen().getByRole('button', { name: 'KEEP LEARNING' });
    const quit = screen().getByRole('button', { name: 'QUIT' });
    await expect(keepLearning).toHaveFocus();
    await userEvent.tab();
    await expect(quit).toHaveFocus();
    // Past the last control, focus wraps to the first.
    await userEvent.tab();
    await expect(keepLearning).toHaveFocus();
    // And backwards from the first, to the last.
    await userEvent.tab({ shift: true });
    await expect(quit).toHaveFocus();
    for (let press = 0; press < 5; press += 1) {
      await userEvent.tab();
      await expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull();
    }
  },
};

export const EscapeCallsOnClose: Story = {
  play: async ({ args }) => {
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledTimes(1);
  },
};

export const EscapeDoesNotReachPageShortcuts: Story = {
  play: async ({ args }) => {
    const pageListener = fn();
    window.addEventListener('keydown', pageListener);
    try {
      await userEvent.keyboard('{Escape}');
      await expect(args.onClose).toHaveBeenCalledTimes(1);
      await expect(pageListener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', pageListener);
    }
  },
};

const clickBackdrop = async () => {
  const backdrop = document.body.querySelector<HTMLElement>('[class*="backdrop"]');
  if (!backdrop) throw new Error('backdrop not found');
  await userEvent.click(backdrop);
};

export const KeysWorkAfterClickingBackdrop: Story = {
  play: async ({ args }) => {
    const keepLearning = screen().getByRole('button', { name: 'KEEP LEARNING' });
    await clickBackdrop();
    // Focus left the dialog (nothing focusable was clicked) ...
    await expect(document.activeElement).not.toBe(keepLearning);
    await expect(document.activeElement?.closest('[role="dialog"]')).toBeNull();
    // ... and Tab brings it back in.
    await userEvent.tab();
    await expect(keepLearning).toHaveFocus();
    await clickBackdrop();
    await userEvent.tab({ shift: true });
    await expect(screen().getByRole('button', { name: 'QUIT' })).toHaveFocus();
    // Escape still closes with focus outside the panel.
    await clickBackdrop();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledTimes(1);
  },
};

export const ShiftTabFromThePanelItself: Story = {
  play: async () => {
    screen().getByRole('dialog').focus();
    await userEvent.tab({ shift: true });
    await expect(screen().getByRole('button', { name: 'QUIT' })).toHaveFocus();
  },
};

export const EscapeIgnoresKeyRepeat: Story = {
  play: async ({ args }) => {
    // user-event does not set `repeat`, so dispatch the auto-repeat events directly.
    const press = (repeat: boolean) =>
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', repeat, bubbles: true, cancelable: true }),
      );
    press(false);
    press(true);
    press(true);
    await expect(args.onClose).toHaveBeenCalledTimes(1);
  },
};

export const NoTabbableContent: Story = {
  args: { actions: undefined },
  render: (args) => (
    <Dialog isOpen={args.isOpen} onClose={args.onClose} title={args.title} />
  ),
  play: async ({ args }) => {
    const dialog = screen().getByRole('dialog');
    await expect(dialog).toHaveFocus();
    await expect(dialog).toHaveAttribute('tabindex', '-1');
    await userEvent.tab();
    await expect(dialog).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(dialog).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledTimes(1);
  },
};

export const SkipsDisabledAndHiddenControls: Story = {
  args: {
    actions: (
      <>
        <Button isDisabled>DISABLED FIRST</Button>
        <button type="button" tabIndex={-1}>
          Not in tab order
        </button>
        <button type="button" hidden>
          Hidden
        </button>
        <Button>KEEP LEARNING</Button>
        <Button variant="secondary">QUIT</Button>
      </>
    ),
  },
  play: async () => {
    await expect(screen().getByRole('button', { name: 'KEEP LEARNING' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(screen().getByRole('button', { name: 'QUIT' })).toHaveFocus();
  },
};

export const StackedDialogs: Story = {
  play: async ({ args, mount, canvasElement }) => {
    const closeOuter = fn();
    const closeInner = fn();
    const stack = (outerOpen: boolean, innerOpen: boolean) => (
      <>
        <Dialog {...args} isOpen={outerOpen} onClose={closeOuter} title="Outer" />
        <Dialog {...args} isOpen={innerOpen} onClose={closeInner} title="Inner" />
      </>
    );

    await mount(stack(true, true));
    // Only the top dialog reacts to Escape.
    await userEvent.keyboard('{Escape}');
    await expect(closeInner).toHaveBeenCalledTimes(1);
    await expect(closeOuter).not.toHaveBeenCalled();

    // Close the older dialog first: the page must stay inert for the one still open.
    await mount(stack(false, true));
    await expect(canvasElement).toHaveAttribute('inert');
    await expect(document.body.style.overflow).toBe('hidden');

    await mount(stack(false, false));
    await expect(canvasElement).not.toHaveAttribute('inert');
    await expect(document.body.style.overflow).not.toBe('hidden');

    // Reopened alone, the outer dialog gets the keyboard back.
    await mount(stack(true, false));
    await userEvent.keyboard('{Escape}');
    await expect(closeOuter).toHaveBeenCalledTimes(1);
  },
};

export const OpenerGone: Story = {
  play: async ({ args, mount }) => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    await mount(<Dialog {...args} isOpen />);
    trigger.remove();
    // Closing with the opener gone must not throw and must not leave the page stuck.
    await mount(<Dialog {...args} isOpen={false} />);
    await expect(screen().queryByRole('dialog')).toBeNull();
    await expect(document.activeElement).toBe(document.body);
  },
};

/** Mounts the page three times (closed, open, closed) to show focus returns to the trigger. */
export const FocusRestoredOnClose: Story = {
  play: async ({ args, mount, canvasElement }) => {
    // A trigger outside React, so re-mounting the story cannot replace it.
    const trigger = document.createElement('button');
    trigger.textContent = 'Open';
    document.body.append(trigger);
    try {
      trigger.focus();
      await expect(trigger).toHaveFocus();

      await mount(<Dialog {...args} isOpen />);
      await expect(screen().getByRole('dialog')).toBeInTheDocument();
      await expect(trigger).not.toHaveFocus();
      await expect(trigger).toHaveAttribute('inert');
      await expect(canvasElement).toHaveAttribute('inert');

      await mount(<Dialog {...args} isOpen={false} />);
      await expect(screen().queryByRole('dialog')).toBeNull();
      await expect(trigger).toHaveFocus();
      await expect(trigger).not.toHaveAttribute('inert');
      await expect(canvasElement).not.toHaveAttribute('inert');
    } finally {
      trigger.remove();
    }
  },
};
