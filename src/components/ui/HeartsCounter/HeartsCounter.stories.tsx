import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';
import { HeartsCounter } from './HeartsCounter';
import type { HeartsCounterProps } from './HeartsCounter';

const meta = {
  title: 'UI/HeartsCounter',
  component: HeartsCounter,
  args: { value: 5 },
} satisfies Meta<typeof HeartsCounter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Resolves a colour token to the computed rgb value the browser reports. */
function resolveColor(token: string): string {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

export const Full: Story = {
  play: async ({ canvas, canvasElement }) => {
    const counter = canvas.getByRole('img', { name: '5 hearts left' });
    await expect(counter).toHaveTextContent('5');
    // The name comes from the label only, so the visible number is not read twice.
    await expect(canvasElement.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    await expect(getComputedStyle(counter).color).toBe(resolveColor('--color-danger'));
    // The first render does not animate.
    await expect(getComputedStyle(counter).animationName).toBe('none');
  },
};

export const LastHeart: Story = {
  args: { value: 1 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: '1 heart left' })).toHaveTextContent('1');
  },
};

export const Empty: Story = {
  args: { value: 0 },
  play: async ({ canvas }) => {
    const counter = canvas.getByRole('img', { name: 'No hearts left' });
    // Still labelled and still showing the number, so the state is not colour only.
    await expect(counter).toHaveTextContent('0');
    await expect(getComputedStyle(counter).color).toBe(resolveColor('--color-text-muted'));
  },
};

export const ValueClamped: Story = {
  args: { value: 9, max: 5 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: '5 hearts left' })).toHaveTextContent('5');
  },
};

export const RestPropsKeepLabel: Story = {
  // Forced past the types on purpose: the component must not let rest props replace its label.
  args: { value: 3, ...({ 'aria-label': 'Wrong', role: 'status' } as Partial<HeartsCounterProps>) },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: '3 hearts left' })).toBeVisible();
    await expect(canvas.queryByRole('status')).toBeNull();
  },
};

// Story-only harness: the component is controlled, so the buttons own the value
// it receives. (`updateArgs` does not re-render inside the Vitest story runner.)
function RenderWithButtons(args: HeartsCounterProps) {
  const [value, setValue] = useState(args.value);
  return (
    <div>
      <button type="button" onClick={() => setValue((v) => v - 1)}>
        Lose a heart
      </button>
      <HeartsCounter {...args} value={value} />
      <button type="button" onClick={() => setValue((v) => v + 1)}>
        Earn a heart
      </button>
    </div>
  );
}

export const ChangesValue: Story = {
  args: { value: 3 },
  render: RenderWithButtons,
  play: async ({ canvas }) => {
    const counter = () => canvas.getByRole('img', { name: /heart/ });
    const heart = () => {
      const svg = counter().querySelector('svg');
      if (!svg) throw new Error('heart icon missing');
      return svg;
    };

    await expect(getComputedStyle(counter()).animationName).toBe('none');

    await userEvent.click(canvas.getByRole('button', { name: 'Lose a heart' }));
    await waitFor(() => expect(counter()).toHaveAccessibleName('2 hearts left'));
    await expect(counter()).toHaveTextContent('2');
    await expect(getComputedStyle(counter()).animationName).toContain('shake');
    await expect(getComputedStyle(heart()).animationName).toContain('fade');

    await userEvent.click(canvas.getByRole('button', { name: 'Earn a heart' }));
    await waitFor(() => expect(counter()).toHaveAccessibleName('3 hearts left'));
    await expect(getComputedStyle(counter()).animationName).toContain('pop');
    await expect(getComputedStyle(heart()).animationName).toBe('none');
  },
};

export const ChangesValueWithReducedMotion: Story = {
  args: { value: 3 },
  render: RenderWithButtons,
  play: async ({ canvas }) => {
    // Media emulation needs the Vitest browser runner; in the plain Storybook UI
    // there is no such runner (importing it at the top would break the page).
    const runner = await import('vitest/browser').catch(() => null);
    if (!runner) return;
    const session = runner.cdp();
    await session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    try {
      await expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);

      await userEvent.click(canvas.getByRole('button', { name: 'Lose a heart' }));
      const lost = await canvas.findByRole('img', { name: '2 hearts left' });
      await expect(getComputedStyle(lost).animationName).toBe('none');
      await expect(getComputedStyle(lost.querySelector('svg') ?? lost).animationName).toBe('none');

      await userEvent.click(canvas.getByRole('button', { name: 'Earn a heart' }));
      const gained = await canvas.findByRole('img', { name: '3 hearts left' });
      await expect(getComputedStyle(gained).animationName).toBe('none');
    } finally {
      await session.send('Emulation.setEmulatedMedia', { features: [] });
    }
  },
};
