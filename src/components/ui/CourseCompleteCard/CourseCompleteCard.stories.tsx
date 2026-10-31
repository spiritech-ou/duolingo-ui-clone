import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { CourseCompleteCard } from './CourseCompleteCard';
import type { CourseCompleteCardProps } from './CourseCompleteCard';

const meta = {
  title: 'UI/CourseCompleteCard',
  component: CourseCompleteCard,
  args: {
    heading: 'You finished the Estonian course!',
    message: 'Replay any lesson to keep your words fresh.',
  },
} satisfies Meta<typeof CourseCompleteCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const card = canvas.getByRole('region', { name: 'You finished the Estonian course!' });
    await expect(card).toHaveAccessibleDescription('Replay any lesson to keep your words fresh.');
    await expect(
      canvas.getByRole('heading', { level: 2, name: 'You finished the Estonian course!' }),
    ).toBeVisible();
    await expect(canvas.getByText('Replay any lesson to keep your words fresh.')).toBeVisible();
    // The celebrating mascot is decorative, so the heading is not read twice.
    const mascot = canvasElement.querySelector('img');
    await expect(mascot).toHaveAttribute('data-mood', 'celebrating');
    await expect(mascot).toHaveAttribute('alt', '');
  },
};

export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '14rem' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const card = canvas.getByRole('region');
    await expect(card.getBoundingClientRect().width).toBeLessThanOrEqual(224);
    // Copy wraps instead of overflowing the card.
    await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
    await expect(canvas.getByRole('heading', { level: 2 })).toBeVisible();
  },
};

export const SubHeading: Story = {
  args: { headingLevel: 3 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 3 })).toBeVisible();
  },
};

export const RestPropsKeepAccessibility: Story = {
  // Forced past the types on purpose: rest props must not replace the card's labelling.
  args: {
    ...({
      role: 'alert',
      'aria-labelledby': 'nope',
      'aria-describedby': 'nope',
    } as Partial<CourseCompleteCardProps>),
  },
  play: async ({ canvas }) => {
    const card = canvas.getByRole('region', { name: 'You finished the Estonian course!' });
    await expect(card).toHaveAccessibleDescription('Replay any lesson to keep your words fresh.');
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};
