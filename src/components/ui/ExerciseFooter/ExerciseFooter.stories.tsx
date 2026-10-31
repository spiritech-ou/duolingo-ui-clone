import type { Meta, StoryObj } from '@storybook/react-vite';
import { createRef } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ExerciseFooter } from './ExerciseFooter';
import type { ExerciseFooterHandle } from './ExerciseFooter';

const meta = {
  title: 'UI/ExerciseFooter',
  component: ExerciseFooter,
  parameters: { layout: 'fullscreen' },
  args: { status: 'idle', onSkip: fn(), onCheck: fn(), onContinue: fn() },
} satisfies Meta<typeof ExerciseFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Check' })).toBeDisabled();
    await expect(canvas.getByRole('status')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Skip' }));
    await expect(args.onSkip).toHaveBeenCalledTimes(1);
  },
};

export const Selected: Story = {
  args: { status: 'selected', announcement: 'tee selected' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('tee selected');
    await userEvent.click(canvas.getByRole('button', { name: 'Check' }));
    await expect(args.onCheck).toHaveBeenCalledTimes(1);
  },
};

export const Correct: Story = {
  args: {
    status: 'correct',
    word: 'tee',
    praise: 'Nicely done!',
    announcement: 'Correct. Nicely done!',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('Correct. Nicely done!');
    await expect(canvas.getByText('tee')).toHaveAttribute('lang', 'et');
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    await expect(args.onContinue).toHaveBeenCalledTimes(1);
  },
};

export const Wrong: Story = {
  args: {
    status: 'wrong',
    word: 'tee',
    announcement: 'Wrong. The correct answer is tee, card 2.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Correct solution:')).toBeInTheDocument();
    await expect(canvas.getByText('tee')).toHaveAttribute('lang', 'et');
    await expect(canvas.getByRole('status')).toHaveTextContent('The correct answer is tee');
  },
};

export const Skipped: Story = {
  args: {
    status: 'skipped',
    word: 'tee',
    announcement: 'Skipped. The correct answer is tee, card 2.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Correct solution:')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  },
};

export const LongWord: Story = {
  args: {
    status: 'wrong',
    word: 'Rahvusvaheline kosmosejaam',
    announcement: 'Wrong. The correct answer is Rahvusvaheline kosmosejaam.',
  },
};

const handleRef = createRef<ExerciseFooterHandle>();

export const ContinueFocusedByRef: Story = {
  args: { status: 'correct', word: 'tee', ref: handleRef },
  play: async ({ canvasElement }) => {
    handleRef.current?.focusContinue();
    await expect(within(canvasElement).getByRole('button', { name: 'Continue' })).toHaveFocus();
  },
};
