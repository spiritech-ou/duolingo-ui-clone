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
      <div style={{ maxWidth: '60rem' }}>
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
    // Chromatic renders in its own browser: no Vitest runner, no window resize, no real focus.
    // The check job runs this interaction test; Chromatic only takes the snapshot.
    if (navigator.userAgent.includes('Chromatic')) return;
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
    // Chromatic renders in its own browser: no Vitest runner, no window resize, no real focus.
    // The check job runs this interaction test; Chromatic only takes the snapshot.
    if (navigator.userAgent.includes('Chromatic')) return;
    const heading = canvas.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading.scrollWidth).toBeLessThanOrEqual(heading.clientWidth);
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};

const VIEWPORTS = {
  wide: { name: 'Wide 1280', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
  phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
} as const;

const STEP_TWO_PROMPT = "Now let's find the best place to start!";

/** Layout sizes in px of the mascot image and the bubble, and the row that holds them. */
function measure(canvasElement: HTMLElement, bubble: HTMLElement) {
  const img = canvasElement.querySelector('img');
  const row = bubble.parentElement;
  if (!img || !row) throw new Error('mascot or row missing');
  return {
    mascot: { width: img.offsetWidth, height: img.offsetHeight },
    bubble: { width: bubble.offsetWidth, height: bubble.offsetHeight },
    mascotBox: img.getBoundingClientRect(),
    bubbleBox: bubble.getBoundingClientRect(),
    row,
  };
}

export const SizesWide: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'wide', isRotated: false } },
  args: { role: 'heading' },
  play: async ({ canvas, canvasElement }) => {
    // Chromatic renders in its own browser: no Vitest runner, no window resize, no real focus.
    // The check job runs this interaction test; Chromatic only takes the snapshot.
    if (navigator.userAgent.includes('Chromatic')) return;
    await expect(window.innerWidth).toBeGreaterThanOrEqual(1280);
    const m = measure(canvasElement, canvas.getByRole('heading', { level: 1 }));
    // Desktop: mascot 110px, bubble about 400px wide (sized to the text, 400px at least) and 68px high.
    await expect(m.mascot).toEqual({ width: 110, height: 110 });
    await expect(m.bubble.width).toBeGreaterThanOrEqual(400);
    await expect(m.bubble.width).toBeLessThanOrEqual(420);
    await expect(m.bubble.height).toBeGreaterThanOrEqual(68);
    await expect(m.bubble.height).toBeLessThanOrEqual(72);
    // Beside the mascot, on one line, vertically centred on it.
    await expect(m.bubbleBox.left).toBeGreaterThanOrEqual(m.mascotBox.right);
    await expect(
      Math.abs(m.bubbleBox.top + m.bubbleBox.height / 2 - (m.mascotBox.top + m.mascotBox.height / 2)),
    ).toBeLessThanOrEqual(1);
    await expect(m.row.scrollWidth).toBeLessThanOrEqual(m.row.clientWidth);
  },
};

export const SizesWideStepTwoText: Story = {
  ...SizesWide,
  args: { role: 'heading', message: STEP_TWO_PROMPT },
  play: async ({ canvas, canvasElement }) => {
    // Chromatic renders in its own browser: no Vitest runner, no window resize, no real focus.
    // The check job runs this interaction test; Chromatic only takes the snapshot.
    if (navigator.userAgent.includes('Chromatic')) return;
    const m = measure(canvasElement, canvas.getByRole('heading', { level: 1 }));
    // The longer step-2 text widens the bubble to about 450px, still on one line of 68px.
    await expect(m.mascot).toEqual({ width: 110, height: 110 });
    await expect(m.bubble.width).toBeGreaterThanOrEqual(430);
    await expect(m.bubble.width).toBeLessThanOrEqual(470);
    await expect(m.bubble.height).toBeLessThanOrEqual(72);
  },
};

export const SizesTablet: Story = {
  parameters: {
    viewport: {
      options: {
        tablet: { name: 'Tablet 768', styles: { width: '768px', height: '1024px' }, type: 'tablet' },
      },
    },
  },
  globals: { viewport: { value: 'tablet', isRotated: false } },
  args: { role: 'heading' },
  play: async ({ canvas, canvasElement }) => {
    await expect(window.innerWidth).toBe(768);
    const m = measure(canvasElement, canvas.getByRole('heading', { level: 1 }));
    // Tablet: mascot 96px, bubble still at least 400px, side by side.
    await expect(m.mascot).toEqual({ width: 96, height: 96 });
    await expect(m.bubble.width).toBeGreaterThanOrEqual(400);
    await expect(m.bubble.height).toBeLessThanOrEqual(72);
    await expect(m.bubbleBox.left).toBeGreaterThanOrEqual(m.mascotBox.right);
  },
};

/** Mobile layout: mascot 80px above the bubble, which fills the row's width; nothing overflows. */
async function expectStacked(canvasElement: HTMLElement, bubble: HTMLElement) {
  await expect(window.innerWidth).toBe(390);
  const m = measure(canvasElement, bubble);
  await expect(m.mascot).toEqual({ width: 80, height: 80 });
  // Bubble width equals the container (row) width, and the bubble is below the mascot.
  await expect(Math.abs(m.bubble.width - m.row.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
  await expect(m.bubbleBox.top).toBeGreaterThanOrEqual(m.mascotBox.bottom);
  await expect(m.bubble.height).toBeGreaterThanOrEqual(68);
  await expect(m.bubbleBox.right).toBeLessThanOrEqual(window.innerWidth);
  await expect(m.row.scrollWidth).toBeLessThanOrEqual(m.row.clientWidth);
  await expect(bubble.scrollWidth).toBeLessThanOrEqual(bubble.clientWidth);
  await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
}

export const SizesPhone: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'phone', isRotated: false } },
  args: { role: 'heading', message: STEP_TWO_PROMPT },
  play: async ({ canvas, canvasElement }) => {
    await expectStacked(canvasElement, canvas.getByRole('heading', { level: 1 }));
  },
};

export const SizesPhoneLevelReactions: Story = {
  ...SizesPhone,
  args: { message: 'Nice, you already have a head start!' },
  play: async ({ canvas, canvasElement }) => {
    // The longest onboarding level reaction, in the status role.
    await expectStacked(canvasElement, canvas.getByRole('status'));
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
