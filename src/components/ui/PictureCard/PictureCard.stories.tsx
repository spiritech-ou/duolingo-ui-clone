import type { ReactElement } from 'react';
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

const FIT_VIEWPORTS = {
  floor: { name: 'Short 1280x600', styles: { width: '1280px', height: '600px' }, type: 'desktop' },
  short: { name: 'Short 1280x720', styles: { width: '1280px', height: '720px' }, type: 'desktop' },
  tall: { name: 'Tall 1280x1080', styles: { width: '1280px', height: '1080px' }, type: 'desktop' },
  phone: { name: 'Phone 390x844', styles: { width: '390px', height: '844px' }, type: 'mobile' },
} as const;

export const Idle: Story = {
  play: async ({ canvasElement, args }) => {
    const radio = within(canvasElement).getByRole('radio', { name: 'A cup of tea tee' });
    await expect(radio).not.toBeChecked();
    await userEvent.click(radio);
    await expect(args.onSelect).toHaveBeenCalledWith('tee');
  },
};

/** `onSelect` only fires from `change`, which a click on the checked radio does not produce. */
export const ReselectChecked: Story = {
  args: { status: 'selected' },
  play: async ({ canvasElement, args }) => {
    const radio = within(canvasElement).getByRole('radio');
    await expect(radio).toBeChecked();
    await userEvent.click(radio);
    await expect(args.onSelect).toHaveBeenCalledTimes(1);
    await expect(args.onSelect).toHaveBeenLastCalledWith('tee');
    await expect(radio).toBeChecked();
    await userEvent.click(radio);
    await expect(args.onSelect).toHaveBeenCalledTimes(2);
    await expect(radio).toBeChecked();
  },
};

export const FirstClickOnce: Story = {
  play: async ({ canvasElement, args }) => {
    const radio = within(canvasElement).getByRole('radio');
    await userEvent.click(radio);
    await expect(args.onSelect).toHaveBeenCalledTimes(1);
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

/** In a 256px column: 256 x 334, picture in the upper 60%, word bottom-left, hint bottom-right. */
export const DesktopSize: Story = {
  parameters: { viewport: { options: FIT_VIEWPORTS } },
  globals: { viewport: { value: 'tall', isRotated: false } },
  decorators: [
    (Story) => (
      <div style={{ width: '16rem' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const radio = within(canvasElement).getByRole('radio');
    const card = radio.closest('label');
    if (!card) throw new Error('expected a card');
    const rect = card.getBoundingClientRect();
    await expect(Math.round(rect.width)).toBe(256);
    await expect(Math.abs(rect.height - 334)).toBeLessThan(2);
    const picture = within(card).getByRole('img').getBoundingClientRect();
    await expect(picture.bottom - rect.top).toBeLessThanOrEqual(rect.height * 0.62);
    const word = within(card).getByText('tee').getBoundingClientRect();
    const hint = within(card).getByText('1').getBoundingClientRect();
    await expect(word.left - rect.left).toBeGreaterThanOrEqual(30);
    await expect(rect.right - hint.right).toBeGreaterThanOrEqual(30);
    await expect(word.top - picture.bottom).toBeGreaterThan(40);
    await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
  },
};

const column = (width: string) => [
  (Story: () => ReactElement) => (
    <div style={{ width }}>
      <Story />
    </div>
  ),
];

function cardOf(canvasElement: HTMLElement) {
  const card = within(canvasElement).getByRole('radio').closest('label');
  if (!card) throw new Error('expected a card');
  return card;
}

/** At 1280x720 the room above the footer is 219px: the card shrinks, the label stays inside. */
export const ShortWindow: Story = {
  parameters: { viewport: { options: FIT_VIEWPORTS } },
  globals: { viewport: { value: 'short', isRotated: false } },
  decorators: column('16rem'),
  play: async ({ canvasElement }) => {
    await expect(window.innerHeight).toBe(720);
    const card = cardOf(canvasElement);
    const rect = card.getBoundingClientRect();
    await expect(Math.round(rect.width)).toBe(256);
    await expect(Math.abs(rect.height - 219)).toBeLessThanOrEqual(2);
    const word = within(card).getByText('tee').getBoundingClientRect();
    const hint = within(card).getByText('1').getBoundingClientRect();
    await expect(word.bottom).toBeLessThanOrEqual(rect.bottom);
    await expect(word.top).toBeGreaterThanOrEqual(rect.top);
    await expect(hint.bottom).toBeLessThanOrEqual(rect.bottom);
    const picture = within(card).getByRole('img').getBoundingClientRect();
    await expect(picture.bottom).toBeLessThanOrEqual(word.top);
    await expect(card.scrollHeight).toBeLessThanOrEqual(card.clientHeight);
  },
};

/** At 1280x600 the room is under the floor: the card stays 200px high, label inside. */
export const FloorWindow: Story = {
  parameters: { viewport: { options: FIT_VIEWPORTS } },
  globals: { viewport: { value: 'floor', isRotated: false } },
  decorators: column('16rem'),
  play: async ({ canvasElement }) => {
    await expect(window.innerHeight).toBe(600);
    const card = cardOf(canvasElement);
    const rect = card.getBoundingClientRect();
    await expect(Math.round(rect.width)).toBe(256);
    await expect(Math.abs(rect.height - 200)).toBeLessThanOrEqual(2);
    const word = within(card).getByText('tee').getBoundingClientRect();
    const hint = within(card).getByText('1').getBoundingClientRect();
    await expect(word.bottom).toBeLessThanOrEqual(rect.bottom);
    await expect(hint.bottom).toBeLessThanOrEqual(rect.bottom);
    const picture = within(card).getByRole('img').getBoundingClientRect();
    await expect(picture.bottom).toBeLessThanOrEqual(word.top);
  },
};

/** From a window about 950px high up the card keeps the tall-window size, 256 x 334. */
export const TallWindow: Story = {
  parameters: { viewport: { options: FIT_VIEWPORTS } },
  globals: { viewport: { value: 'tall', isRotated: false } },
  decorators: column('16rem'),
  play: async ({ canvasElement }) => {
    await expect(window.innerHeight).toBe(1080);
    const rect = cardOf(canvasElement).getBoundingClientRect();
    await expect(Math.round(rect.width)).toBe(256);
    await expect(Math.abs(rect.height - 334)).toBeLessThan(2);
  },
};

/** Stacked on a phone, the row stays 358 x 88 whatever the window height. */
export const PhoneRowFixed: Story = {
  parameters: { viewport: { options: FIT_VIEWPORTS } },
  globals: { viewport: { value: 'phone', isRotated: false } },
  decorators: column('22.375rem'),
  play: async ({ canvasElement }) => {
    await expect(window.innerWidth).toBe(390);
    const rect = cardOf(canvasElement).getBoundingClientRect();
    await expect(Math.round(rect.width)).toBe(358);
    await expect(Math.round(rect.height)).toBe(88);
  },
};

/** Stacked on a phone: a full-width row (358px column), at least 88px high, picture left. */
export const PhoneRow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '22.375rem' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const radio = within(canvasElement).getByRole('radio');
    const card = radio.closest('label');
    if (!card) throw new Error('expected a card');
    const rect = card.getBoundingClientRect();
    await expect(Math.round(rect.width)).toBe(358);
    await expect(rect.height).toBeGreaterThanOrEqual(88);
    await expect(rect.height).toBeLessThan(120);
    const picture = within(card).getByRole('img').getBoundingClientRect();
    const word = within(card).getByText('tee').getBoundingClientRect();
    await expect(picture.right).toBeLessThan(word.left);
    await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
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
