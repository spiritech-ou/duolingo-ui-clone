import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Icon, iconNames } from './Icon';

const meta = {
  title: 'UI/Icon',
  component: Icon,
  args: { name: 'check' },
  argTypes: { name: { control: 'select', options: iconNames } },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Decorative: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('img')).toBeNull();
    await expect(canvasElement.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  },
};

export const Labelled: Story = {
  args: { name: 'heart', label: 'Lives' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img', { name: 'Lives' })).toBeVisible();
    await expect(canvasElement.querySelector('svg')).not.toHaveAttribute('aria-hidden');
  },
};

export const AllIcons: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
      {iconNames.map((name) => (
        <Icon key={name} {...args} name={name} label={name} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const name of iconNames) {
      await expect(canvas.getByRole('img', { name })).toBeVisible();
    }
  },
};

export const Small: Story = {
  args: { name: 'close', size: 16, label: 'Close' },
};

export const Large: Story = {
  args: { name: 'book', size: 64, label: 'Lessons' },
};

export const InheritsColor: Story = {
  args: { name: 'alert', size: 48, label: 'Error' },
  decorators: [
    (Story) => (
      <div style={{ color: 'var(--color-danger)' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg');
    await expect(svg).not.toBeNull();
    if (svg) {
      await expect(getComputedStyle(svg).color).toBe(
        getComputedStyle(svg.parentElement ?? svg).color,
      );
    }
  },
};
