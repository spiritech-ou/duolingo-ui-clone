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
