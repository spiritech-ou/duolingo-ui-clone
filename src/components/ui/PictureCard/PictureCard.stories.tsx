import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { PictureCard } from './PictureCard';
import type { PictureCardProps, PictureCardStatus } from './PictureCard';

const meta = {
  title: 'UI/PictureCard',
  component: PictureCard,
  args: {
    word: 'tee',
    picture: { emoji: '🍵', alt: 'A cup of tea' },
    keyHint: '1',
    name: 'answer',
    value: 'tee',
    onSelect: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '12rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PictureCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  play: async ({ canvasElement, args }) => {
    const radio = within(canvasElement).getByRole('radio', { name: 'A cup of tea tee' });
    await expect(radio).not.toBeChecked();
    await userEvent.click(radio);
    await expect(args.onSelect).toHaveBeenCalledWith('tee');
  },
};

export const Keyboard: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.tab();
    const radio = within(canvasElement).getByRole('radio');
    await expect(radio).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(args.onSelect).toHaveBeenCalledWith('tee');
  },
};

export const Selected: Story = {
  args: { status: 'selected' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('radio')).toBeChecked();
  },
};

export const Correct: Story = {
  args: { status: 'correct', isLocked: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const radio = canvas.getByRole('radio');
    await expect(radio).toBeChecked();
    await expect(radio).toHaveAttribute('aria-disabled', 'true');
    await expect(radio).not.toHaveAccessibleDescription();
    await expect(canvasElement.querySelector('svg path[d^="M5 12.5"]')).not.toBeNull();
    await userEvent.click(radio);
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};

export const Revealed: Story = {
  args: { status: 'revealed', isLocked: true },
  play: async ({ canvasElement }) => {
    const radio = within(canvasElement).getByRole('radio');
    await expect(radio).not.toBeChecked();
    await expect(canvasElement.querySelector('svg path[d^="M5 12.5"]')).not.toBeNull();
  },
};

export const Wrong: Story = {
  args: { status: 'wrong', isLocked: true, 'aria-describedby': 'extra-hint' },
  render: (args) => (
    <div>
      <PictureCard {...args} />
      <p id="extra-hint">Extra hint</p>
    </div>
  ),
  play: async ({ canvasElement, args }) => {
    const radio = within(canvasElement).getByRole('radio');
    await expect(radio).toBeChecked();
    await expect(radio).toHaveAccessibleDescription('incorrect Extra hint');
    await expect(canvasElement.querySelector('svg path[d^="M6 6"]')).not.toBeNull();
    await userEvent.click(radio);
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};

export const Locked: Story = {
  args: { isLocked: true },
  play: async ({ canvasElement, args }) => {
    const radio = within(canvasElement).getByRole('radio');
    await expect(radio).toHaveAttribute('aria-disabled', 'true');
    await expect(radio).not.toBeDisabled();
    await userEvent.tab();
    await expect(radio).toHaveFocus();
    await userEvent.click(radio);
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};

export const LongWord: Story = {
  args: {
    word: 'maasikas',
    value: 'maasikas',
    picture: { emoji: '🍓', alt: 'A strawberry' },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '8rem' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('maasikas')).toHaveAttribute('lang', 'et');
  },
};

const groupCards = [
  { word: 'tee', value: 'tee', emoji: '🍵', alt: 'A cup of tea' },
  { word: 'kohv', value: 'kohv', emoji: '☕', alt: 'A cup of coffee' },
  { word: 'leib', value: 'leib', emoji: '🍞', alt: 'A loaf of bread' },
] as const;

type CardStatus = PictureCardStatus;

const checkedCount = (radios: readonly HTMLElement[]) =>
  radios.filter((radio) => radio instanceof HTMLInputElement && radio.checked).length;

function CardGroup({
  statuses,
  ...args
}: PictureCardProps & { statuses: readonly [CardStatus, CardStatus, CardStatus] }) {
  return (
    <div
      role="radiogroup"
      aria-label="Which one of these is “tea”?"
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '12rem' }}
    >
      {groupCards.map(({ word, value, emoji, alt }, index) => (
        <PictureCard
          key={value}
          {...args}
          word={word}
          value={value}
          keyHint={String(index + 1)}
          picture={{ emoji, alt }}
          status={statuses[index] ?? 'idle'}
          isLocked
        />
      ))}
    </div>
  );
}

export const GroupWrongWithRevealed: Story = {
  // The learner picked "kohv" (wrong); "tee" is revealed as the right answer.
  render: (args) => <CardGroup {...args} statuses={['revealed', 'wrong', 'idle']} />,
  play: async ({ canvasElement, args }) => {
    const radios = within(canvasElement).getAllByRole('radio');
    const [revealed, wrong] = radios;
    if (!revealed || !wrong) throw new Error('expected three radios');
    await expect(checkedCount(radios)).toBe(1);
    await expect(revealed).not.toBeChecked();
    await expect(wrong).toBeChecked();
    await expect(wrong).toHaveAccessibleDescription('incorrect');
    // Locked: Tab lands on the checked card, arrows change nothing and report nothing.
    await userEvent.tab();
    await expect(wrong).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{ArrowUp}');
    await expect(args.onSelect).not.toHaveBeenCalled();
    await expect(checkedCount(radios)).toBe(1);
    await expect(wrong).toBeChecked();
  },
};

export const GroupSkipped: Story = {
  // Nothing was chosen; "tee" is revealed, no radio is checked.
  render: (args) => <CardGroup {...args} statuses={['revealed', 'idle', 'idle']} />,
  play: async ({ canvasElement, args }) => {
    const radios = within(canvasElement).getAllByRole('radio');
    const last = radios[2];
    if (!last) throw new Error('expected three radios');
    await expect(checkedCount(radios)).toBe(0);
    for (const radio of radios) {
      await expect(radio).toHaveAttribute('aria-disabled', 'true');
    }
    await userEvent.click(last);
    await expect(args.onSelect).not.toHaveBeenCalled();
    await expect(checkedCount(radios)).toBe(0);
  },
};

const specialWords = [
  { word: 'šokolaad', emoji: '🍫', alt: 'A bar of chocolate' },
  { word: 'žiraff', emoji: '🦒', alt: 'A giraffe' },
  { word: 'õun', emoji: '🍎', alt: 'An apple' },
  { word: 'jäätis', emoji: '🍦', alt: 'An ice cream' },
  { word: 'öö', emoji: '🌙', alt: 'The night' },
  { word: 'küülik', emoji: '🐰', alt: 'A rabbit' },
] as const;

export const SpecialLetters: Story = {
  render: (args) => (
    <div
      role="radiogroup"
      aria-label="Special letters"
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '8rem' }}
    >
      {specialWords.map(({ word, emoji, alt }, index) => (
        <PictureCard
          key={word}
          {...args}
          word={word}
          value={word}
          keyHint={String(index + 1)}
          picture={{ emoji, alt }}
        />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const { word } of specialWords) {
      const element = canvas.getByText(word);
      await expect(element).toHaveTextContent(new RegExp(`^${word}$`));
      await expect(element).toHaveAttribute('lang', 'et');
      await expect(getComputedStyle(element).textTransform).toBe('none');
    }
  },
};
