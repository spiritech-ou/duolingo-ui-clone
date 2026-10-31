import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import blueFlame from '@/assets/brand/flame.svg';
import redFlame from '@/assets/brand/flame-red.svg';
import { Mascot } from './Mascot';
import type { MascotProps } from './Mascot';

const meta = {
  title: 'UI/Mascot',
  component: Mascot,
} satisfies Meta<typeof Mascot>;

export default meta;
type Story = StoryObj<typeof meta>;

const reducedMotion = '(prefers-reduced-motion: reduce)';

/** The absolute URL an imported asset resolves to, comparable with `img.src`. */
function resolved(asset: string) {
  return new URL(asset, document.baseURI).href;
}

/** The absolute URL an element's `src` attribute points to. */
function srcOf(element: HTMLElement) {
  return resolved(element.getAttribute('src') ?? '');
}

function getImage(canvasElement: HTMLElement) {
  const img = canvasElement.querySelector('img');
  if (!img) throw new Error('mascot image missing');
  return img;
}

// Story-only harness: the component is controlled, so the button owns the bounce key.
// (`updateArgs` does not re-render inside the Vitest story runner.)
function RenderWithBounceButton(args: MascotProps) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <Mascot {...args} bounceKey={count} />
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        Bounce
      </button>
    </div>
  );
}

async function emulateReducedMotion() {
  // Media emulation needs the Vitest browser runner. Without it the story cannot assert
  // anything, so it fails loudly instead of passing without checking.
  const runner = await import('vitest/browser').catch(() => null);
  if (!runner) {
    throw new Error('Reduced-motion stories need the Vitest browser runner (npm run test:storybook).');
  }
  const session = runner.cdp();
  await session.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await waitFor(() => expect(matchMedia(reducedMotion).matches).toBe(true));
  return async () => {
    await session.send('Emulation.setEmulatedMedia', { features: [] });
  };
}

export const Decorative: Story = {
  play: async ({ canvasElement }) => {
    // alt="" makes the image presentational, so it has no accessible role.
    await expect(within(canvasElement).queryByRole('img')).toBeNull();
    await expect(canvasElement.querySelector('img')).toHaveAttribute('alt', '');
  },
};

export const Labelled: Story = {
  args: { label: 'Spiritech flame', size: 160 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img', { name: 'Spiritech flame' })).toBeVisible();
  },
};

export const Small: Story = {
  args: { size: 32, label: 'Spiritech flame' },
};

export const Default: Story = {
  args: { mood: 'default', label: 'Default flame' },
  play: async ({ canvas }) => {
    const img = canvas.getByRole('img', { name: 'Default flame' });
    await expect(img).toHaveAttribute('data-mood', 'default');
    // Neutral state: the blue flame.
    await expect(srcOf(img)).toBe(resolved(blueFlame));
    await expect(srcOf(img)).not.toBe(resolved(redFlame));
    await expect(getComputedStyle(img).filter).toBe('none');
  },
};

export const Sad: Story = {
  args: { mood: 'sad', label: 'Sad flame' },
  play: async ({ canvas }) => {
    const img = canvas.getByRole('img', { name: 'Sad flame' });
    await expect(img).toHaveAttribute('data-mood', 'sad');
    // The failure look is the red flame artwork, not a filtered blue one.
    await expect(srcOf(img)).toBe(resolved(redFlame));
    await expect(srcOf(img)).not.toBe(resolved(blueFlame));
    await expect(getComputedStyle(img).filter).toBe('none');
    // The mood is a static change, so it is visible without any animation.
    await expect(getComputedStyle(img).rotate).not.toBe('none');
    await expect(getComputedStyle(img).translate).not.toBe('none');
  },
};

export const Celebrating: Story = {
  args: { mood: 'celebrating', label: 'Celebrating flame' },
  play: async ({ canvas }) => {
    const img = canvas.getByRole('img', { name: 'Celebrating flame' });
    await expect(img).toHaveAttribute('data-mood', 'celebrating');
    // Success keeps the blue flame.
    await expect(srcOf(img)).toBe(resolved(blueFlame));
    await expect(srcOf(img)).not.toBe(resolved(redFlame));
    await expect(getComputedStyle(img).scale).not.toBe('none');
  },
};

export const SadDecorative: Story = {
  args: { mood: 'sad' },
  play: async ({ canvas, canvasElement }) => {
    // Without a label the red flame is still decorative.
    await expect(canvas.queryByRole('img')).toBeNull();
    const img = getImage(canvasElement);
    await expect(img).toHaveAttribute('alt', '');
    await expect(srcOf(img)).toBe(resolved(redFlame));
  },
};

export const BobbingLoading: Story = {
  args: { isBobbing: true, label: 'Loading' },
  play: async ({ canvas }) => {
    const img = canvas.getByRole('img', { name: 'Loading' });
    await expect(getComputedStyle(img).animationName).toContain('bob');
  },
};

export const MotionOff: Story = {
  args: { mood: 'celebrating', isBobbing: false, label: 'Still flame' },
  parameters: { docs: { description: { story: 'Same as Celebrating with bobbing off; under prefers-reduced-motion every animation is disabled and the lift remains.' } } },
};

export const BounceKeySet: Story = {
  args: { bounceKey: 1, label: 'Flame' },
  parameters: {
    docs: { description: { story: 'The initial bounceKey does not bounce; the flame bounces once each time the value changes.' } },
  },
  play: async ({ canvas }) => {
    const img = canvas.getByRole('img', { name: 'Flame' });
    await expect(getComputedStyle(img).animationName).toBe('none');
  },
};

export const BounceKeyChangeReplaysBounce: Story = {
  args: { label: 'Flame' },
  render: RenderWithBounceButton,
  play: async ({ canvas, canvasElement }) => {
    const button = canvas.getByRole('button', { name: 'Bounce' });
    const initial = getImage(canvasElement);
    // The first value does not bounce.
    await expect(getComputedStyle(initial).animationName).toBe('none');

    await userEvent.click(button);
    // A new key remounts the image, which starts the one-shot bounce.
    await waitFor(() => expect(getImage(canvasElement)).not.toBe(initial));
    const first = getImage(canvasElement);
    await expect(first).toHaveAttribute('data-mood', 'default');

    if (matchMedia(reducedMotion).matches) {
      await expect(getComputedStyle(first).animationName).toBe('none');
      return;
    }
    await expect(getComputedStyle(first).animationName).toContain('bounce');
    await expect(first.getAnimations()).toHaveLength(1);
    // Let the bounce finish: the class stays, so only a remount can play it again.
    await Promise.all(first.getAnimations().map((animation) => animation.finished));
    await expect(first.getAnimations()).toHaveLength(0);

    await userEvent.click(button);
    await waitFor(() => expect(getImage(canvasElement)).not.toBe(first));
    const second = getImage(canvasElement);
    await expect(getComputedStyle(second).animationName).toContain('bounce');
    await expect(second.getAnimations()).toHaveLength(1);
    await expect(second.getAnimations()[0]?.playState).toBe('running');
  },
};

export const SadWithReducedMotion: Story = {
  args: { mood: 'sad', isBobbing: true, label: 'Sad flame' },
  render: RenderWithBounceButton,
  play: async ({ canvas, canvasElement }) => {
    const restore = await emulateReducedMotion();
    try {
      await userEvent.click(canvas.getByRole('button', { name: 'Bounce' }));
      const img = getImage(canvasElement);
      await waitFor(() => expect(getComputedStyle(img).animationName).toBe('none'));
      await expect(img.getAnimations()).toHaveLength(0);
      // The static failure look stays: red artwork, tilt and lift.
      await expect(img).toHaveAttribute('data-mood', 'sad');
      await expect(srcOf(img)).toBe(resolved(redFlame));
      await expect(getComputedStyle(img).rotate).not.toBe('none');
      await expect(getComputedStyle(img).translate).not.toBe('none');
    } finally {
      await restore();
    }
  },
};

export const CelebratingWithReducedMotion: Story = {
  args: { mood: 'celebrating', isBobbing: true, label: 'Celebrating flame' },
  render: RenderWithBounceButton,
  play: async ({ canvas, canvasElement }) => {
    const restore = await emulateReducedMotion();
    try {
      await userEvent.click(canvas.getByRole('button', { name: 'Bounce' }));
      const img = getImage(canvasElement);
      await waitFor(() => expect(getComputedStyle(img).animationName).toBe('none'));
      await expect(img.getAnimations()).toHaveLength(0);
      // The static lift stays, and the flame is fully visible (no half-played entrance).
      await expect(img).toHaveAttribute('data-mood', 'celebrating');
      await expect(srcOf(img)).toBe(resolved(blueFlame));
      await expect(getComputedStyle(img).scale).not.toBe('none');
      await expect(getComputedStyle(img).translate).not.toBe('none');
      await expect(getComputedStyle(img).opacity).toBe('1');
    } finally {
      await restore();
    }
  },
};
