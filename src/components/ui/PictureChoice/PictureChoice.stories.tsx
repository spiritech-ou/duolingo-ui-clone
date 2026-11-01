import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
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
    await expect(args.onSelect).toHaveBeenCalledTimes(1);
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

const rectOf = (element: Element) => element.getBoundingClientRect();

/** Cards are the radios' label ancestors; the group is the radiogroup. */
function cardsOf(canvasElement: HTMLElement): HTMLElement[] {
  return within(canvasElement)
    .getAllByRole('radio')
    .map((radio) => {
      const card = radio.closest('label');
      if (!card) throw new Error('radio without a card');
      return card;
    });
}

async function expectNoHorizontalOverflow(canvasElement: HTMLElement) {
  const group = within(canvasElement).getByRole('radiogroup');
  await expect(group.scrollWidth).toBeLessThanOrEqual(group.clientWidth);
  await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth,
  );
  const groupRight = rectOf(group).right;
  for (const card of cardsOf(canvasElement)) {
    await expect(rectOf(card).right).toBeLessThanOrEqual(groupRight + 0.5);
    for (const word of card.querySelectorAll('[lang="et"]')) {
      await expect(word.scrollWidth).toBeLessThanOrEqual(word.clientWidth);
      await expect(rectOf(word).right).toBeLessThanOrEqual(rectOf(card).right);
    }
  }
}

/**
 * The question column of the reference: 790px wide, three cards of about 256 x 334, 12px apart.
 * In a tall window (the card keeps its tall size from a window about 950px high up).
 */
export const Wide: Story = {
  parameters: {
    viewport: {
      options: { tall: { name: 'Tall 1280x1080', styles: { width: '1280px', height: '1080px' }, type: 'desktop' } },
    },
  },
  globals: { viewport: { value: 'tall', isRotated: false } },
  decorators: [
    (Story) => (
      <div style={{ width: '49.375rem' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    // Chromatic renders in its own browser: no Vitest runner, no window resize, no real focus.
    // The check job runs this interaction test; Chromatic only takes the snapshot.
    if (navigator.userAgent.includes('Chromatic')) return;
    const [first, second, third] = cardsOf(canvasElement);
    if (!first || !second || !third) throw new Error('expected three cards');
    for (const card of [first, second, third]) {
      await expect(Math.abs(rectOf(card).width - 255.3)).toBeLessThan(2);
      await expect(Math.abs(rectOf(card).height - 333)).toBeLessThan(4);
    }
    await expect(rectOf(first).top).toBe(rectOf(third).top);
    await expect(Math.round(rectOf(second).left - rectOf(first).right)).toBe(12);
    await expect(Math.round(rectOf(third).left - rectOf(second).right)).toBe(12);
    // Picture in the upper 60%, word bottom-left, key hint bottom-right, 30px side padding.
    const card = rectOf(first);
    const picture = within(first).getByRole('img');
    await expect(rectOf(picture).bottom - card.top).toBeLessThanOrEqual(card.height * 0.62);
    const word = rectOf(within(first).getByText('tee'));
    await expect(word.left - card.left).toBeGreaterThanOrEqual(30);
    await expect(word.left - card.left).toBeLessThan(40);
    await expect(word.top - rectOf(picture).bottom).toBeGreaterThan(40);
    const hint = rectOf(within(first).getByText('1'));
    await expect(card.right - hint.right).toBeGreaterThanOrEqual(30);
    await expect(card.right - hint.right).toBeLessThan(40);
    await expectNoHorizontalOverflow(canvasElement);
  },
};

/** A phone (390 wide, 358px column): three full-width rows, 12px apart, big tap targets. */
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '22.375rem' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const cards = cardsOf(canvasElement);
    const group = rectOf(within(canvasElement).getByRole('radiogroup'));
    await expect(cards).toHaveLength(3);
    for (const [index, card] of cards.entries()) {
      const rect = rectOf(card);
      await expect(Math.round(rect.width)).toBe(Math.round(group.width));
      await expect(rect.height).toBeGreaterThanOrEqual(88);
      await expect(rect.height).toBeLessThan(120);
      const next = cards[index + 1];
      if (next) await expect(Math.round(rectOf(next).top - rect.bottom)).toBe(12);
    }
    // Picture left of the word.
    const first = cards[0];
    if (!first) throw new Error('expected a card');
    await expect(rectOf(within(first).getByRole('img')).right).toBeLessThan(
      rectOf(within(first).getByText('tee')).left,
    );
    await expectNoHorizontalOverflow(canvasElement);
  },
};

/** The selected card scales up slightly: inside the 16px gutter of a phone, never past it. */
export const NarrowSelected: Story = {
  args: { selectedId: 'tee' },
  decorators: [
    (Story) => (
      <div style={{ width: '24.375rem', padding: '0 1rem' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const wrapper = canvasElement.firstElementChild;
    if (!wrapper) throw new Error('expected the gutter wrapper');
    const gutters = rectOf(wrapper);
    const selected = rectOf(cardsOf(canvasElement)[0] ?? canvasElement);
    await expect(selected.left).toBeGreaterThanOrEqual(gutters.left);
    await expect(selected.right).toBeLessThanOrEqual(gutters.right);
  },
};

const longOptions = [
  { id: 'maasikas', word: 'maasikas', picture: { emoji: '🍓', alt: 'A strawberry' } },
  { id: 'šokolaad', word: 'šokolaad', picture: { emoji: '🍫', alt: 'A bar of chocolate' } },
  { id: 'žiraff', word: 'žiraff', picture: { emoji: '🦒', alt: 'A giraffe' } },
] as const;

const specialOptions = [
  { id: 'õun', word: 'õun', picture: { emoji: '🍎', alt: 'An apple' } },
  { id: 'jäätis', word: 'jäätis', picture: { emoji: '🍦', alt: 'An ice cream' } },
  { id: 'küülik', word: 'küülik', picture: { emoji: '🐰', alt: 'A rabbit' } },
] as const;

const shortSpecialOptions = [
  { id: 'öö', word: 'öö', picture: { emoji: '🌙', alt: 'The night' } },
  { id: 'maasikas', word: 'maasikas', picture: { emoji: '🍓', alt: 'A strawberry' } },
  { id: 'šokolaad', word: 'šokolaad', picture: { emoji: '🍫', alt: 'A bar of chocolate' } },
] as const;

const smallestPhone: Decorator = (Story) => (
  <div style={{ width: '18rem' }}>
    <Story />
  </div>
);

/** 320px phone (288px column): the long word and special letters fit without overflow. */
export const SmallestPhoneLongWords: Story = {
  args: { options: longOptions, selectedId: null },
  decorators: [smallestPhone],
  play: async ({ canvasElement }) => {
    await expectNoHorizontalOverflow(canvasElement);
    await expect(within(canvasElement).getByText('maasikas')).toHaveTextContent(/^maasikas$/);
  },
};

export const SmallestPhoneSpecialLetters: Story = {
  args: { options: specialOptions, selectedId: null },
  decorators: [smallestPhone],
  play: async ({ canvasElement }) => {
    await expectNoHorizontalOverflow(canvasElement);
    await expect(within(canvasElement).getByText('küülik')).toHaveAttribute('lang', 'et');
  },
};

export const SmallestPhoneShortSpecial: Story = {
  args: { options: shortSpecialOptions, selectedId: null },
  decorators: [smallestPhone],
  play: async ({ canvasElement }) => {
    await expectNoHorizontalOverflow(canvasElement);
  },
};

/** A tablet column (about 720px, three cards of about 232px): picture scaled down, words fit. */
export const Tablet: Story = {
  args: { options: longOptions, selectedId: null },
  decorators: [
    (Story) => (
      <div style={{ width: '45rem' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const cards = cardsOf(canvasElement);
    const [first, second] = cards;
    if (!first || !second) throw new Error('expected cards');
    await expect(rectOf(first).top).toBe(rectOf(second).top);
    await expect(rectOf(first).width).toBeGreaterThan(200);
    await expect(rectOf(first).width).toBeLessThan(256);
    await expectNoHorizontalOverflow(canvasElement);
  },
};
