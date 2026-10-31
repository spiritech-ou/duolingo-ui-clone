import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { LessonStats } from './LessonStats';

const meta = {
  title: 'UI/LessonStats',
  component: LessonStats,
  args: {
    items: [
      { label: 'XP', value: '+10' },
      { label: 'Accuracy', value: '80%' },
      { label: 'Time', value: '2:14' },
    ],
  },
} satisfies Meta<typeof LessonStats>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const items = canvas.getAllByRole('listitem');
    await expect(items).toHaveLength(3);
    // Each item reads as "label: value" (the colon is visually hidden).
    await expect(items[0]).toHaveTextContent('XP: +10');
    await expect(items[1]).toHaveTextContent('Accuracy: 80%');
    await expect(items[2]).toHaveTextContent('Time: 2:14');
  },
};

export const Narrow: Story = {
  // Storybook's built-in small phone viewport (320px wide).
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getAllByRole('listitem')).toHaveLength(3);
    await expect(canvas.getByText('Accuracy')).toBeVisible();
    const list = canvas.getByRole('list');
    // The row fits its container: nothing overflows horizontally.
    await expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
    await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(
      canvasElement.ownerDocument.documentElement.clientWidth,
    );
  },
};
