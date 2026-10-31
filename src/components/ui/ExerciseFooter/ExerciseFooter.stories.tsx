import type { Meta, StoryObj } from '@storybook/react-vite';
import { createRef } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ExerciseFooter } from './ExerciseFooter';
import type { ExerciseFooterHandle } from './ExerciseFooter';

const meta = {
  title: 'UI/ExerciseFooter',
  component: ExerciseFooter,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      options: {
        wide: { name: 'Wide 1280', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
        narrow: { name: 'Narrow 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
      },
    },
  },
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

// Sizes at a wide and a narrow window (docs/product/exercise-session.md, Layout). The footer
// fills the column it is given; the fullscreen canvas stands in for the page here.
const wide = { viewport: { value: 'wide', isRotated: false } };
const narrow = { viewport: { value: 'narrow', isRotated: false } };

const TOLERANCE = 1.5;

function box(element: HTMLElement) {
  const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
  return { left, right, top, bottom, width, height };
}

function expectAbout(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(TOLERANCE);
}

function getRoot(canvasElement: HTMLElement): HTMLElement {
  const root = canvasElement.firstElementChild;
  if (!(root instanceof HTMLElement)) throw new Error('footer root not found');
  return root;
}

const measureActionsWide: NonNullable<Story['play']> = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const root = box(getRoot(canvasElement));
  const skip = box(canvas.getByRole('button', { name: 'Skip' }));
  const check = box(canvas.getByRole('button', { name: 'Check' }));
  expect(window.innerWidth).toBe(1280);
  expectAbout(root.width, 1280);
  expectAbout(root.height, 190);
  expectAbout(skip.width, 197);
  expectAbout(skip.height, 64);
  expectAbout(check.width, 198);
  expectAbout(check.height, 64);
  // Outer edges form a column about 1213px wide, centred on the page.
  expectAbout(check.right - skip.left, 1213);
  expectAbout((skip.left + check.right) / 2, 640);
  // Both vertically centred in the strip.
  expectAbout((skip.top + skip.bottom) / 2, (root.top + root.bottom) / 2 + 1);
  expectAbout((check.top + check.bottom) / 2, (root.top + root.bottom) / 2 + 1);
};

const measureActionsNarrow: NonNullable<Story['play']> = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const skip = box(canvas.getByRole('button', { name: 'Skip' }));
  const check = box(canvas.getByRole('button', { name: 'Check' }));
  expect(window.innerWidth).toBe(390);
  // Side by side, each about half the width between the 16px gutters, 12px apart.
  expectAbout(skip.left, 16);
  expectAbout(check.right, 390 - 16);
  expectAbout(check.left - skip.right, 12);
  expectAbout(skip.width, check.width);
  expect(skip.height).toBeGreaterThanOrEqual(44);
};

const measurePanelWide: NonNullable<Story['play']> = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const root = getRoot(canvasElement);
  const panel = box(root.querySelector<HTMLElement>('[class*="panel"]') ?? root);
  const circle = box(root.querySelector<HTMLElement>('[class*="iconCircle"]') ?? root);
  const continueButton = box(canvas.getByRole('button', { name: 'Continue' }));
  expect(window.innerWidth).toBe(1280);
  expectAbout(panel.width, 1280);
  expectAbout(panel.height, 185);
  expectAbout(circle.width, 105);
  expectAbout(circle.height, 105);
  expectAbout(continueButton.width, 200);
  expect(continueButton.height).toBeGreaterThanOrEqual(44);
  // Content column about 1225px wide, Continue right-aligned in it.
  expectAbout(continueButton.right - circle.left, 1225);
  expectAbout((circle.left + continueButton.right) / 2, 640);
};

const measurePanelNarrow: NonNullable<Story['play']> = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const root = getRoot(canvasElement);
  const panel = box(root.querySelector<HTMLElement>('[class*="panel"]') ?? root);
  const circle = box(root.querySelector<HTMLElement>('[class*="iconCircle"]') ?? root);
  const continueButton = box(canvas.getByRole('button', { name: 'Continue' }));
  expect(window.innerWidth).toBe(390);
  // Stacked: the text row, then Continue filling the width between the gutters.
  expectAbout(continueButton.left, 16);
  expectAbout(continueButton.right, 390 - 16);
  expect(continueButton.top).toBeGreaterThanOrEqual(circle.bottom);
  expect(continueButton.height).toBeGreaterThanOrEqual(44);
  expect(panel.height).toBeGreaterThanOrEqual(198);
  expect(panel.height).toBeLessThan(260);
};

function getFlame(canvasElement: HTMLElement): HTMLImageElement | null {
  return canvasElement.querySelector<HTMLImageElement>('img[data-mood]');
}

// The small red flame: present, red artwork, decorative, 32px, 8px left of the title, centred on it.
const expectFlame: NonNullable<Story['play']> = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const flame = getFlame(canvasElement);
  if (!flame) throw new Error('red flame not found');
  await expect(flame).toHaveAttribute('data-mood', 'sad');
  await expect(flame.src).toContain('flame-red');
  await expect(flame).toHaveAttribute('alt', '');
  // Decorative: not in the accessibility tree, the announcement and the buttons are unchanged.
  await expect(canvas.queryByRole('img')).toBeNull();
  await expect(canvas.getAllByRole('button')).toHaveLength(1);
  const title = canvas.getByText('Correct solution:');
  // The flame's pose is tilted by a CSS transform, so measure its layout box (the wrapper).
  const slot = flame.parentElement;
  if (!slot) throw new Error('flame slot not found');
  const f = box(slot);
  const t = box(title);
  expect(flame.offsetWidth).toBe(32);
  expect(flame.offsetHeight).toBe(32);
  expectAbout(f.width, 32);
  expectAbout(f.height, 32);
  expectAbout(t.left - f.right, 8);
  expectAbout((f.top + f.bottom) / 2, (t.top + t.bottom) / 2);
};

const expectNoFlame: NonNullable<Story['play']> = async ({ canvasElement }) => {
  await expect(getFlame(canvasElement)).toBeNull();
  await expect(canvasElement.querySelector('img')).toBeNull();
};

export const IdleWide: Story = {
  globals: wide,
  play: async (context) => {
    await measureActionsWide(context);
    await expectNoFlame(context);
  },
};

export const SelectedWide: Story = {
  globals: wide,
  args: { status: 'selected' },
  play: async (context) => {
    await measureActionsWide(context);
    await expectNoFlame(context);
    await expect(within(context.canvasElement).getByRole('button', { name: 'Check' })).toBeEnabled();
  },
};

export const IdleNarrow: Story = {
  globals: narrow,
  play: async (context) => {
    await measureActionsNarrow(context);
  },
};

export const SelectedNarrow: Story = {
  globals: narrow,
  args: { status: 'selected' },
  play: async (context) => {
    await measureActionsNarrow(context);
  },
};

export const CorrectWide: Story = {
  globals: wide,
  args: { status: 'correct', word: 'tee' },
  play: async (context) => {
    await measurePanelWide(context);
    await expectNoFlame(context);
  },
};

export const WrongWide: Story = {
  globals: wide,
  args: { status: 'wrong', word: 'tee' },
  play: async (context) => {
    await measurePanelWide(context);
    await expectFlame(context);
  },
};

export const SkippedWide: Story = {
  globals: wide,
  args: { status: 'skipped', word: 'tee' },
  play: async (context) => {
    await measurePanelWide(context);
    await expectFlame(context);
  },
};

export const CorrectNarrow: Story = {
  globals: narrow,
  args: { status: 'correct', word: 'tee' },
  play: async (context) => {
    await measurePanelNarrow(context);
    await expectNoFlame(context);
  },
};

export const WrongNarrow: Story = {
  globals: narrow,
  args: { status: 'wrong', word: 'tee' },
  play: async (context) => {
    await measurePanelNarrow(context);
    await expectFlame(context);
  },
};

export const SkippedNarrow: Story = {
  globals: narrow,
  args: { status: 'skipped', word: 'tee' },
  play: async (context) => {
    await measurePanelNarrow(context);
    await expectFlame(context);
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
