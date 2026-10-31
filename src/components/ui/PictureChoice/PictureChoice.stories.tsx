import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { PictureChoice } from './PictureChoice';

const meta = {
  title: 'UI/PictureChoice',
  component: PictureChoice,
  args: {
    question: 'Which one of these is “tea”?',
    options: [
      { id: 'tee', word: 'tee', picture: { emoji: '🍵', alt: 'A cup of tea' } },
      { id: 'kohv', word: 'kohv', picture: { emoji: '☕', alt: 'A cup of coffee' } },
      { id: 'leib', word: 'leib', picture: { emoji: '🍞', alt: 'A loaf of bread' } },
    ],
    selectedId: null,
    onSelect: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '40rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PictureChoice>;

export default meta;
type Story = StoryObj<typeof meta>;

const checkedCount = (radios: readonly HTMLElement[]) =>
  radios.filter((radio) => radio instanceof HTMLInputElement && radio.checked).length;

function at(radios: readonly HTMLElement[], index: number): HTMLElement {
  const radio = radios[index];
  if (!radio) throw new Error(`expected a radio at ${index}`);
  return radio;
}

export const Idle: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole('radiogroup', { name: 'Which one of these is “tea”?' });
    await expect(group).toHaveAccessibleDescription('Press 1 to 3 to choose, Enter to check');
    const radios = canvas.getAllByRole('radio');
    await expect(radios).toHaveLength(3);
    await expect(checkedCount(radios)).toBe(0);
    await userEvent.click(canvas.getByRole('radio', { name: 'A cup of coffee kohv' }));
    await expect(args.onSelect).toHaveBeenCalledWith('kohv');
  },
};

export const Selected: Story = {
  args: { selectedId: 'kohv' },
  play: async ({ canvasElement }) => {
    const radios = within(canvasElement).getAllByRole('radio');
    await expect(checkedCount(radios)).toBe(1);
    await expect(at(radios, 1)).toBeChecked();
  },
};

export const TabEntersGroup: Story = {
  play: async ({ canvasElement, args }) => {
    const radios = within(canvasElement).getAllByRole('radio');
    await userEvent.tab();
    await expect(at(radios, 0)).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(args.onSelect).toHaveBeenCalledWith('tee');
  },
};

export const ArrowKeys: Story = {
  args: { selectedId: 'tee' },
  play: async ({ canvasElement, args }) => {
    const radios = within(canvasElement).getAllByRole('radio');
    await userEvent.tab();
    await expect(at(radios, 0)).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(args.onSelect).toHaveBeenLastCalledWith('kohv');
    await expect(at(radios, 1)).toHaveFocus();
  },
};

export const Correct: Story = {
  args: { selectedId: 'tee', correctId: 'tee', isLocked: true },
  play: async ({ canvasElement, args }) => {
    const radios = within(canvasElement).getAllByRole('radio');
    await expect(checkedCount(radios)).toBe(1);
    await expect(at(radios, 0)).toBeChecked();
    for (const radio of radios) await expect(radio).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(at(radios, 2));
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};

export const Wrong: Story = {
  // "kohv" was picked (wrong); "tee" is revealed, not checked.
  args: { selectedId: 'kohv', wrongId: 'kohv', correctId: 'tee', isLocked: true },
  play: async ({ canvasElement, args }) => {
    const radios = within(canvasElement).getAllByRole('radio');
    await expect(checkedCount(radios)).toBe(1);
    await expect(at(radios, 0)).not.toBeChecked();
    await expect(at(radios, 1)).toBeChecked();
    await expect(at(radios, 1)).toHaveAccessibleDescription('incorrect');
    await userEvent.tab();
    await expect(at(radios, 1)).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{ArrowUp}');
    await expect(args.onSelect).not.toHaveBeenCalled();
    await expect(checkedCount(radios)).toBe(1);
  },
};

export const Skipped: Story = {
  // Nothing chosen; "tee" is revealed and no radio is checked.
  args: { correctId: 'tee', isLocked: true },
  play: async ({ canvasElement, args }) => {
    const radios = within(canvasElement).getAllByRole('radio');
    await expect(checkedCount(radios)).toBe(0);
    await userEvent.click(at(radios, 2));
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};

export const Locked: Story = {
  args: { selectedId: 'leib', isLocked: true },
  play: async ({ canvasElement, args }) => {
    const radios = within(canvasElement).getAllByRole('radio');
    for (const radio of radios) await expect(radio).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(at(radios, 0));
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};

export const Narrow: Story = {
  args: { selectedId: 'tee' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '20rem' }}>
        <Story />
      </div>
    ),
  ],
};
