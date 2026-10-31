import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Mascot } from './Mascot';

const meta = {
  title: 'UI/Mascot',
  component: Mascot,
} satisfies Meta<typeof Mascot>;

export default meta;
type Story = StoryObj<typeof meta>;

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

export const Sad: Story = {
  args: { mood: 'sad', label: 'Sad flame' },
  play: async ({ canvas }) => {
    const img = canvas.getByRole('img', { name: 'Sad flame' });
    await expect(img).toHaveAttribute('data-mood', 'sad');
    // The mood is a static change, so it is visible without any animation.
    await expect(getComputedStyle(img).rotate).not.toBe('none');
  },
};

export const Celebrating: Story = {
  args: { mood: 'celebrating', label: 'Celebrating flame' },
  play: async ({ canvas }) => {
    const img = canvas.getByRole('img', { name: 'Celebrating flame' });
    await expect(img).toHaveAttribute('data-mood', 'celebrating');
    await expect(getComputedStyle(img).scale).not.toBe('none');
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
