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

export const EqualCellsFillColumn: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '30rem' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const list = canvas.getByRole('list');
    const cells = canvas.getAllByRole('listitem').map((li) => li.getBoundingClientRect());
    const listWidth = list.getBoundingClientRect().width;
    await expect(listWidth).toBe(480);
    // Three equal cells and two 12px gaps fill the row.
    const first = cells[0]?.width ?? 0;
    await expect(cells[1]?.width).toBeCloseTo(first, 0);
    await expect(cells[2]?.width).toBeCloseTo(first, 0);
    await expect(first * 3 + 24).toBeCloseTo(listWidth, 0);
    // One row: all cells share the same top.
    await expect(cells[1]?.top).toBe(cells[0]?.top);
    await expect(cells[2]?.top).toBe(cells[0]?.top);
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
