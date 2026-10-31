import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Divider } from './Divider';

const meta = {
  title: 'UI/Divider',
  component: Divider,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '28rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithLabel: Story = {
  args: { label: 'or' },
  play: async ({ canvas, canvasElement }) => {
    // The label is plain readable text; both rules are hidden from assistive tech.
    await expect(canvas.getByText('or')).toBeVisible();
    await expect(canvasElement.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
    await expect(canvasElement.querySelector('[role]')).toBeNull();
    await expect(canvas.getByText('or').closest('[aria-hidden="true"]')).toBeNull();
  },
};

export const WithoutLabel: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
    await expect(canvasElement.textContent).toBe('');
  },
};

export const RestPropsCannotOverrideSemantics: Story = {
  args: {
    label: 'or',
    // Untyped bag: the types forbid these props, a caller could still force them at runtime.
    ...({ role: 'separator', 'aria-hidden': 'true' } as object),
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('or')).toBeVisible();
    await expect(canvasElement.querySelector('[role]')).toBeNull();
    await expect(canvas.getByText('or').closest('[aria-hidden="true"]')).toBeNull();
    await expect(canvasElement.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  },
};

export const LongLabel: Story = {
  args: { label: 'Averyveryverylongunbrokenlabelthatshouldwrapinsteadofoverflowing and more' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
