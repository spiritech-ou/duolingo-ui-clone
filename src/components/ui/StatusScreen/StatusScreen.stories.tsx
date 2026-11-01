import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { Button } from '@/components/ui/Button';
import { LessonStats } from '@/components/ui/LessonStats';
import { StatusScreen } from './StatusScreen';
import type { StatusScreenProps } from './StatusScreen';

const meta = {
  title: 'UI/StatusScreen',
  component: StatusScreen,
  args: {
    variant: 'info',
    title: 'Practice complete!',
  },
} satisfies Meta<typeof StatusScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: {
    variant: 'loading',
    title: 'Getting your lesson ready…',
    statusRef: fn(),
  },
  play: async ({ canvas, canvasElement, args }) => {
    const status = canvas.getByRole('status');
    await expect(status).toHaveTextContent('Getting your lesson ready…');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    // Focusable by script without joining the tab order, and exposed through `statusRef`.
    await expect(status).toHaveAttribute('tabindex', '-1');
    await expect(args.statusRef).toHaveBeenCalledWith(status);
    status.focus();
    await expect(status).toHaveFocus();
    await userEvent.tab();
    await expect(status).not.toHaveFocus();
    await expect(canvasElement.firstElementChild).toHaveAttribute('aria-busy', 'true');
    const mascot = canvasElement.querySelector('img');
    await expect(mascot).toHaveAttribute('alt', '');
    // The mascot bobs when motion is allowed (reduced motion is covered by LoadingWithReducedMotion).
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await expect(getComputedStyle(mascot as HTMLElement).animationName).not.toBe('none');
    }
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};

export const LoadingWithReducedMotion: Story = {
  args: Loading.args as StatusScreenProps,
  play: async ({ canvas, canvasElement }) => {
    // Media emulation needs the Vitest browser runner; the plain Storybook UI
    // has none (a top-level import would break the page).
    const runner = await import('vitest/browser').catch(() => null);
    if (!runner) {
      console.warn('LoadingWithReducedMotion: no Vitest browser runner, motion check skipped.');
      return;
    }
    const session = runner.cdp();
    await session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    try {
      await expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
      const mascot = canvasElement.querySelector('img') as HTMLElement;
      await expect(getComputedStyle(mascot).animationName).toBe('none');
      // Still announced and still busy.
      await expect(canvas.getByRole('status')).toHaveTextContent('Getting your lesson ready…');
      await expect(canvasElement.firstElementChild).toHaveAttribute('aria-busy', 'true');
    } finally {
      await session.send('Emulation.setEmulatedMedia', { features: [] });
    }
  },
};

export const ErrorWithRetry: Story = {
  args: {
    variant: 'error',
    mood: 'sad',
    title: "We couldn't load this lesson",
    message: 'You seem to be offline, or the connection is slow. Check it and try again.',
    actions: (
      <>
        <Button onClick={fn()}>Try again</Button>
        <Button variant="secondary" onClick={fn()}>
          Back to path
        </Button>
      </>
    ),
  },
  play: async ({ canvas, canvasElement }) => {
    const alert = canvas.getByRole('alert');
    await expect(alert).toHaveTextContent("We couldn't load this lesson");
    await expect(alert).toHaveTextContent('You seem to be offline');
    await expect(canvasElement.firstElementChild).not.toHaveAttribute('aria-busy');
    await expect(canvasElement.querySelector('img')).toHaveAttribute('data-mood', 'sad');
    await expect(canvas.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Back to path' })).toBeVisible();
    await expect(canvas.queryByRole('status')).toBeNull();
  },
};

export const Empty: Story = {
  args: {
    variant: 'empty',
    title: 'This lesson has no exercises yet',
    actions: <Button>Back to path</Button>,
  },
  play: async ({ canvas }) => {
    const status = canvas.getByRole('status');
    await expect(status).toHaveTextContent('This lesson has no exercises yet');
    await expect(canvas.getByRole('button', { name: 'Back to path' })).toBeVisible();
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};

export const InfoOutOfHearts: Story = {
  args: {
    variant: 'info',
    mood: 'sad',
    title: "You're out of hearts",
    message: 'Practice to earn a heart, or come back later.',
    actions: (
      <>
        <Button>Practice to earn a heart</Button>
        <Button variant="secondary">Quit lesson</Button>
      </>
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent("You're out of hearts");
    await expect(canvas.getByText('Practice to earn a heart, or come back later.')).toBeVisible();
    await expect(canvas.getAllByRole('button')).toHaveLength(2);
  },
};

export const InfoCelebratingWithStats: Story = {
  args: {
    variant: 'info',
    mood: 'celebrating',
    title: 'Lesson complete!',
    children: <p>XP +10 · Accuracy 80% · Time 2:14</p>,
    actions: <Button>Continue</Button>,
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.querySelector('img')).toHaveAttribute('data-mood', 'celebrating');
    await expect(canvas.getByText('XP +10 · Accuracy 80% · Time 2:14')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Continue' })).toBeVisible();
  },
};

export const DefaultMood: Story = {
  args: {
    variant: 'info',
    mood: 'default',
    title: 'Nothing to show',
    message: 'Check back soon.',
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.querySelector('img')).toHaveAttribute('data-mood', 'default');
    // No actions slot, no empty wrapper.
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

export const LongText: Story = {
  args: {
    variant: 'error',
    mood: 'sad',
    title: 'Averyveryverylongunbrokenheadlinethatkeepsgoingandgoingwithoutanyspaces',
    message:
      'Something went wrong on our side. Try again in a moment, and if it keeps happening come back a little later today.',
    actions: <Button>Try again</Button>,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '14rem' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const heading = canvas.getByRole('heading', { level: 1 });
    await expect(heading.scrollWidth).toBeLessThanOrEqual(heading.clientWidth);
    await expect(heading).toBeVisible();
  },
};

export const FocusTargets: Story = {
  args: {
    variant: 'error',
    mood: 'sad',
    title: "We couldn't load this lesson",
    actions: (
      <>
        <Button>Try again</Button>
        <Button variant="secondary">Back to path</Button>
      </>
    ),
    titleRef: fn(),
    firstActionRef: fn(),
  },
  play: async ({ canvas, args }) => {
    const heading = canvas.getByRole('heading', { level: 1 });
    await expect(heading).toHaveAttribute('tabindex', '-1');
    await expect(args.titleRef).toHaveBeenCalledWith(heading);
    const first = canvas.getByRole('button', { name: 'Try again' });
    await expect(args.firstActionRef).toHaveBeenCalledWith(first);

    // The refs are real focus targets: focusing them moves keyboard focus there.
    heading.focus();
    await expect(heading).toHaveFocus();
    first.focus();
    await expect(first).toHaveFocus();
    // Tab continues to the second action.
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Back to path' })).toHaveFocus();
  },
};

const columnArgs = {
  variant: 'error',
  mood: 'sad',
  title: "We couldn't load this lesson",
  message: 'You seem to be offline, or the connection is slow. Check it and try again.',
  actions: (
    <>
      <Button>Try again</Button>
      <Button variant="secondary">Back to path</Button>
    </>
  ),
} satisfies StatusScreenProps;

function measure(canvasElement: HTMLElement) {
  const root = canvasElement.firstElementChild as HTMLElement;
  const rect = (el: Element | null) =>
    el ? el.getBoundingClientRect() : new DOMRect();
  const buttons = Array.from(root.querySelectorAll('button'));
  // The mascot's mood tilts the image, which distorts its bounding box: measure its wrapper.
  const mascotBox = root.querySelector('img')?.parentElement ?? null;
  return {
    root: rect(root),
    mascot: rect(mascotBox),
    heading: rect(root.querySelector('h1')),
    message: rect(root.querySelector('p')),
    buttons: buttons.map((b) => rect(b)),
    isWide: window.matchMedia('(min-width: 48rem)').matches,
  };
}

export const ColumnDesktop: Story = {
  args: columnArgs,
  // Tablet (768px) is the narrowest width where the md rules (48rem) apply.
  globals: { viewport: { value: 'tablet', isRotated: false } },
  play: async ({ canvasElement }) => {
    const m = measure(canvasElement);
    await expect(m.isWide).toBe(true);
    // One 480px column, 120px mascot, 240px buttons, 12px between them.
    await expect(m.root.width).toBe(480);
    await expect(m.mascot.width).toBe(120);
    await expect(m.buttons[0]?.width).toBe(240);
    await expect(m.buttons[1]?.width).toBe(240);
    await expect((m.buttons[1]?.top ?? 0) - (m.buttons[0]?.bottom ?? 0)).toBe(12);
    // Block starts 96px below the top of its container; not vertically centred.
    await expect(getComputedStyle(canvasElement.firstElementChild as Element).paddingTop).toBe(
      '96px',
    );
    // 24px between the mascot and the headline group, 16px headline to message.
    await expect(m.heading.top - m.mascot.bottom).toBe(24);
    await expect(m.message.top - m.heading.bottom).toBe(16);
    // Everything is centred on the column axis.
    const axis = m.root.left + m.root.width / 2;
    await expect(m.mascot.left + m.mascot.width / 2).toBeCloseTo(axis, 0);
    await expect(m.buttons[0] ? m.buttons[0].left + m.buttons[0].width / 2 : 0).toBeCloseTo(axis, 0);
  },
};

export const ColumnMobile: Story = {
  args: columnArgs,
  globals: { viewport: { value: 'mobile2', isRotated: false } },
  play: async ({ canvasElement }) => {
    const m = measure(canvasElement);
    await expect(m.isWide).toBe(false);
    // Column fills the whole width available to it (below the 480px maximum).
    await expect(m.root.width).toBeCloseTo(canvasElement.getBoundingClientRect().width, 0);
    await expect(m.root.width).toBeLessThan(480);
    // 16px gutters inside it; mascot 96px; top offset 48px.
    await expect(m.mascot.width).toBe(96);
    await expect(getComputedStyle(canvasElement.firstElementChild as Element).paddingTop).toBe(
      '48px',
    );
    // Buttons fill the column between the gutters.
    for (const button of m.buttons) {
      await expect(button.width).toBeCloseTo(m.root.width - 32, 0);
    }
    // The headline wraps to at most two lines.
    const lineHeight = parseFloat(
      getComputedStyle(canvasElement.querySelector('h1') as Element).lineHeight,
    );
    await expect(m.heading.height).toBeLessThanOrEqual(lineHeight * 2 + 1);
  },
};

export const EndScreenMascot: Story = {
  args: {
    variant: 'info',
    mood: 'celebrating',
    mascotSize: 160,
    title: 'Lesson complete!',
    children: (
      <LessonStats
        items={[
          { label: 'XP', value: '+10' },
          { label: 'Accuracy', value: '80%' },
          { label: 'Time', value: '2:14' },
        ]}
      />
    ),
    actions: <Button>Continue</Button>,
  },
  globals: { viewport: { value: 'tablet', isRotated: false } },
  play: async ({ canvasElement }) => {
    const m = measure(canvasElement);
    await expect(m.isWide).toBe(true);
    // The size prop wins over the responsive default.
    await expect(m.mascot.width).toBe(160);
    // The stats row fills the 480px column.
    const list = canvasElement.querySelector('ul') as HTMLElement;
    const cells = Array.from(list.querySelectorAll('li')).map((li) => li.getBoundingClientRect());
    await expect(list.getBoundingClientRect().width).toBe(480);
    await expect(cells).toHaveLength(3);
    await expect(cells[0]?.width).toBeCloseTo(cells[1]?.width ?? 0, 0);
    await expect(cells[1]?.width).toBeCloseTo(cells[2]?.width ?? 0, 0);
  },
};

export const HeadingLevel: Story = {
  args: { headingLevel: 2 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 2, name: 'Practice complete!' })).toBeVisible();
    await expect(canvas.queryByRole('heading', { level: 1 })).toBeNull();
  },
};

export const RestPropsKeepAccessibility: Story = {
  args: {
    variant: 'loading',
    title: 'Getting your practice ready…',
    id: 'status-screen',
    // Forced past the types on purpose: rest props must not replace the a11y attributes.
    ...({ role: 'alert', 'aria-busy': 'false', 'aria-live': 'off' } as object),
  },
  play: async ({ canvas, canvasElement }) => {
    const root = canvasElement.firstElementChild as HTMLElement;
    await expect(root).toHaveAttribute('id', 'status-screen');
    await expect(root).toHaveAttribute('aria-busy', 'true');
    await expect(root).not.toHaveAttribute('role');
    const status = canvas.getByRole('status');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};
