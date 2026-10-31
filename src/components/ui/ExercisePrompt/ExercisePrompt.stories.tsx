import { createRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { ExercisePrompt } from './ExercisePrompt';

const meta = {
  title: 'UI/ExercisePrompt',
  component: ExercisePrompt,
  args: { english: 'tea' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '28rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ExercisePrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const heading = canvas.getByRole('heading', { level: 1 });
    await expect(heading).toHaveTextContent('Which one of these is “tea”?');
    await expect(heading).toHaveAttribute('tabindex', '-1');
    await expect(canvas.queryByText('NEW WORD')).toBeNull();
  },
};

export const WithNewWordTag: Story = {
  args: { isNewWord: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('NEW WORD')).toBeVisible();
    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Which one of these is “tea”?',
    );
  },
};

export const LongWord: Story = {
  args: {
    isNewWord: true,
    english: 'Averyveryverylongunbrokenwordthatshouldwrapinsteadofoverflowingthecontainer',
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};

const headingRef = createRef<HTMLHeadingElement>();

export const HeadingIsFocusableAndRefForwarded: Story = {
  args: { ref: headingRef },
  play: async ({ canvas }) => {
    const heading = canvas.getByRole('heading', { level: 1 });
    await expect(headingRef.current).toBe(heading);
    heading.focus();
    await expect(heading).toHaveFocus();
  },
};
