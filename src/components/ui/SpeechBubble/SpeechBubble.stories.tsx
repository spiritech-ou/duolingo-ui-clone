import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { SpeechBubble } from './SpeechBubble';
import type { SpeechBubbleProps } from './SpeechBubble';

const meta = {
  title: 'UI/SpeechBubble',
  component: SpeechBubble,
  args: {
    message: 'How much Estonian do you know?',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '36rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SpeechBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

const reducedMotion = '(prefers-reduced-motion: reduce)';

export const Prompt: Story = {
  args: { role: 'heading', ref: fn() },
  play: async ({ canvas, canvasElement, args }) => {
    const heading = canvas.getByRole('heading', { level: 1, name: 'How much Estonian do you know?' });
    await expect(heading).toHaveAttribute('tabindex', '-1');
    await expect(canvas.queryByRole('status')).toBeNull();
    // The mascot is decorative: the bubble holds the text.
    await expect(canvasElement.querySelector('img')).toHaveAttribute('alt', '');
    await expect(canvas.queryByRole('img')).toBeNull();
    // The forwarded ref is the heading, and it takes focus without being a tab stop.
    await expect(args.ref).toHaveBeenCalledWith(heading);
    await userEvent.tab();
    await expect(heading).not.toHaveFocus();
    heading.focus();
    await expect(heading).toHaveFocus();
  },
};

export const PromptHeadingLevel: Story = {
  args: { role: 'heading', headingLevel: 2 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 2 })).toHaveTextContent(
      'How much Estonian do you know?',
    );
    await expect(canvas.queryByRole('heading', { level: 1 })).toBeNull();
  },
};

export const Reaction: Story = {
  args: { message: "Let's start from the very beginning!", ref: fn() },
  play: async ({ canvas, canvasElement, args }) => {
    const status = canvas.getByRole('status');
    await expect(status).toHaveTextContent("Let's start from the very beginning!");
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toHaveAttribute('aria-atomic', 'true');
    await expect(status).not.toHaveAttribute('tabindex');
    await expect(canvas.queryByRole('heading')).toBeNull();
    await expect(canvasElement.querySelector('img')).toHaveAttribute('alt', '');
    await expect(args.ref).toHaveBeenCalledWith(status);
  },
};

// Story-only harness: the component is controlled, so the button owns the message and
// the bounce key it receives. (`updateArgs` does not re-render inside the Vitest story runner.)
const reactions = [
  "Let's start from the very beginning!",
  "That's a good start. We'll build on it.",
  'Nice, you already know quite a bit!',
];

function RenderWithNextButton(args: SpeechBubbleProps) {
  const [index, setIndex] = useState(0);
  return (
    <div>
      <SpeechBubble {...args} message={reactions[index] ?? ''} bounceKey={index} />
      <button type="button" onClick={() => setIndex((i) => (i + 1) % reactions.length)}>
        Choose another level
      </button>
    </div>
  );
}

export const ChangesMessage: Story = {
  render: RenderWithNextButton,
  play: async ({ canvas, canvasElement }) => {
    const mascot = () => {
      const img = canvasElement.querySelector('img');
      if (!img) throw new Error('mascot image missing');
      return img;
    };
    const status = canvas.getByRole('status');
    await expect(status).toHaveTextContent(reactions[0] ?? '');
    // The first message does not bounce the mascot.
    await expect(getComputedStyle(mascot()).animationName).toBe('none');

    await userEvent.click(canvas.getByRole('button', { name: 'Choose another level' }));

    // The same live region stays in the page (so the change is announced) and holds the new text.
    await waitFor(() => expect(status).toHaveTextContent(reactions[1] ?? ''));
    await expect(canvas.getByRole('status')).toBe(status);
    const text = status.firstElementChild;
    if (!text) throw new Error('bubble text missing');
    // The new text fades in and the mascot bounces once, unless motion is reduced on this machine.
    const expectedFade = matchMedia(reducedMotion).matches ? 'none' : 'fade';
    await expect(getComputedStyle(text).animationName).toContain(expectedFade);
    await waitFor(() =>
      expect(getComputedStyle(mascot()).animationName).toContain(
        matchMedia(reducedMotion).matches ? 'none' : 'bounce',
      ),
    );
  },
};

export const ReducedMotion: Story = {
  render: RenderWithNextButton,
  play: async ({ canvas, canvasElement }) => {
    // Media emulation needs the Vitest browser runner. Without it this story cannot assert
    // anything, so it fails loudly instead of passing without checking.
    const runner = await import('vitest/browser').catch(() => null);
    if (!runner) {
      throw new Error('ReducedMotion needs the Vitest browser runner (npm run test:storybook).');
    }
    const session = runner.cdp();
    await session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    try {
      await expect(matchMedia(reducedMotion).matches).toBe(true);
      const status = canvas.getByRole('status');
      await userEvent.click(canvas.getByRole('button', { name: 'Choose another level' }));
      await waitFor(() => expect(status).toHaveTextContent(reactions[1] ?? ''));
      // The text swaps at once: no fade, no bounce.
      const text = status.firstElementChild;
      if (!text) throw new Error('bubble text missing');
      await expect(getComputedStyle(text).animationName).toBe('none');
      const mascot = canvasElement.querySelector('img');
      if (!mascot) throw new Error('mascot image missing');
      await expect(getComputedStyle(mascot).animationName).toBe('none');
      await expect(canvas.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    } finally {
      await session.send('Emulation.setEmulatedMedia', { features: [] });
    }
  },
};

export const LongText: Story = {
  args: {
    role: 'heading',
    message:
      'Averyveryverylongunbrokenwordthatshouldwrapinsteadofoverflowing and then a much longer sentence that needs several lines inside the bubble to be read in full.',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '18rem' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas, canvasElement }) => {
    const heading = canvas.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading.scrollWidth).toBeLessThanOrEqual(heading.clientWidth);
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};

export const RestPropsKeepAccessibility: Story = {
  args: {
    role: 'heading',
    id: 'level-bubble',
    className: 'extra',
    // Forced past the types on purpose: rest props must not change the semantics.
    ...({ 'aria-live': 'off', tabIndex: 0 } as object),
  },
  play: async ({ canvas, canvasElement }) => {
    const root = canvasElement.querySelector('#level-bubble');
    await expect(root).toHaveClass('extra');
    await expect(root).not.toHaveAttribute('aria-live');
    await expect(root).not.toHaveAttribute('tabindex');
    const heading = canvas.getByRole('heading', { level: 1 });
    await expect(heading).toHaveAttribute('tabindex', '-1');
    await expect(heading).not.toHaveAttribute('aria-live');
  },
};
