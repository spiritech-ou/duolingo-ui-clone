import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';
import type { within } from 'storybook/test';
import { SignalBars } from '@/components/ui/SignalBars';
import { RadioCardGroup } from './RadioCardGroup';
import type { RadioCardGroupProps, RadioCardOption } from './RadioCardGroup';

const levelOptions: RadioCardOption[] = [
  { value: 'new', label: "I'm new to Estonian" },
  { value: 'words', label: 'I know some common words' },
  { value: 'basic', label: 'I can have basic conversations' },
];

const iconOptions: RadioCardOption[] = levelOptions.map((option, index) => ({
  ...option,
  icon: <SignalBars level={index + 1} />,
}));

const startOptions: RadioCardOption[] = [
  {
    value: 'scratch',
    label: 'Start from scratch',
    description: 'Take the easiest lesson of the Estonian course',
  },
  {
    value: 'find',
    label: 'Find my level',
    description: 'Let the flame recommend where you should start learning',
  },
];

// Story-only artwork standing in for the step-2 icons: an 80px-square picture that scales to its slot.
const bookIcon = (
  <svg viewBox="0 0 80 80" width="100%" height="100%">
    <rect x="12" y="6" width="56" height="68" rx="6" style={{ fill: 'var(--color-primary)' }} />
    <rect x="58" y="12" width="6" height="56" rx="2" style={{ fill: 'var(--color-surface)' }} />
  </svg>
);

const compassIcon = (
  <svg viewBox="0 0 80 80" width="100%" height="100%">
    <circle cx="40" cy="40" r="38" style={{ fill: 'var(--color-primary)' }} />
    <circle cx="40" cy="40" r="28" style={{ fill: 'var(--color-surface)' }} />
    <path d="M40 18 52 52 40 44 28 52Z" style={{ fill: 'var(--color-danger)' }} />
  </svg>
);

const startIconOptions: RadioCardOption[] = startOptions.map((option, index) => ({
  ...option,
  icon: index === 0 ? bookIcon : compassIcon,
}));

/** Keeps the selection in state so arrows and Space behave as in the app, and still reports to the spies. */
function Stateful(args: RadioCardGroupProps) {
  const [value, setValue] = useState(args.value);
  // A 640px column, or the screen width minus 16px gutters when that is narrower.
  return (
    <div style={{ inlineSize: 'min(40rem, calc(100vw - 2rem))' }}>
      <RadioCardGroup
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    </div>
  );
}

const meta = {
  title: 'UI/RadioCardGroup',
  component: RadioCardGroup,
  args: {
    label: 'How much Estonian do you know?',
    options: levelOptions,
    value: null,
    onChange: fn(),
    onActivate: fn(),
  },
  render: (args) => <Stateful {...args} />,
} satisfies Meta<typeof RadioCardGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Resolves a colour token to the computed rgb value the browser reports. */
function resolveColor(token: string): string {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

function luminance(rgb: string): number {
  const channels = (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const [r = 0, g = 0, b = 0] = channels.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

function cardOf(radio: HTMLElement): HTMLElement {
  const card = radio.closest('label');
  if (!card) throw new Error('radio is not inside a card');
  return card;
}

/** Asserts the card's text colours against its own background (WCAG AA, 4.5:1) and its border against the page (3:1). */
async function expectContrast(canvas: ReturnType<typeof within>, name: RegExp, selected: boolean) {
  const card = cardOf(canvas.getByRole('radio', { name }));
  const style = getComputedStyle(card);
  await expect(contrast(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(4.5);
  const border = selected ? '--color-primary' : '--color-border';
  await expect(style.borderTopColor).toBe(resolveColor(border));
  await expect(contrast(style.borderTopColor, resolveColor('--color-bg'))).toBeGreaterThanOrEqual(3);
  const description = card.querySelector<HTMLElement>('[id$="-description"]');
  if (description) {
    await expect(
      contrast(getComputedStyle(description).color, style.backgroundColor),
    ).toBeGreaterThanOrEqual(4.5);
  }
}

export const Unselected: Story = {
  play: async ({ canvas }) => {
    const group = canvas.getByRole('radiogroup', { name: 'How much Estonian do you know?' });
    await expect(group).toBeInTheDocument();
    const radios = canvas.getAllByRole('radio');
    await expect(radios).toHaveLength(3);
    for (const radio of radios) {
      await expect(radio).not.toBeChecked();
      await expect(cardOf(radio).querySelector('[data-visible="true"]')).toBeNull();
    }
    await expectContrast(canvas, /new to Estonian/, false);
  },
};

export const Selected: Story = {
  args: { value: 'words' },
  play: async ({ canvas }) => {
    const selected = canvas.getByRole('radio', { name: 'I know some common words' });
    await expect(selected).toBeChecked();
    await expect(canvas.getByRole('radio', { name: /new to Estonian/ })).not.toBeChecked();
    // Check mark is shown on the selected card only, so selection is not colour alone.
    const card = cardOf(selected);
    const mark = card.querySelector<HTMLElement>('[data-visible="true"]');
    await expect(mark).not.toBeNull();
    await expect(mark).toBeVisible();
    await expect(card.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    await expect(getComputedStyle(card).color).toBe(resolveColor('--color-primary'));
    const other = cardOf(canvas.getByRole('radio', { name: /new to Estonian/ }));
    await expect(other.querySelector('[data-visible="true"]')).toBeNull();
    await expect(getComputedStyle(other.querySelector('[data-visible]') as Element).visibility).toBe(
      'hidden',
    );
    await expectContrast(canvas, /common words/, true);
  },
};

export const SelectedLightTheme: Story = {
  ...Selected,
  globals: { theme: 'light' },
  play: async (context) => {
    await expect(document.documentElement.dataset['theme']).toBe('light');
    await Selected.play?.(context);
    await expectContrast(context.canvas, /new to Estonian/, false);
  },
};

export const SelectedDarkTheme: Story = {
  ...Selected,
  globals: { theme: 'dark' },
  play: async (context) => {
    await expect(document.documentElement.dataset['theme']).toBe('dark');
    await Selected.play?.(context);
    await expectContrast(context.canvas, /new to Estonian/, false);
  },
};

export const WithIcons: Story = {
  args: { options: iconOptions, value: 'new' },
  play: async ({ canvas, canvasElement }) => {
    // Icons are decorative: they never join the option's accessible name.
    await expect(canvas.getByRole('radio', { name: "I'm new to Estonian" })).toBeChecked();
    await expect(canvasElement.querySelectorAll('[aria-hidden="true"] [data-level]')).toHaveLength(3);
  },
};

export const WithDescriptions: Story = {
  args: { label: 'Where should we start?', options: startOptions, value: 'find' },
  play: async ({ canvas }) => {
    const radio = canvas.getByRole('radio', { name: 'Find my level' });
    await expect(radio).toHaveAccessibleDescription(
      'Let the flame recommend where you should start learning',
    );
    await expect(canvas.getByRole('radio', { name: 'Start from scratch' })).toHaveAccessibleDescription(
      'Take the easiest lesson of the Estonian course',
    );
    await expectContrast(canvas, /Find my level/, true);
    await expectContrast(canvas, /Start from scratch/, false);
  },
};

export const LargeCards: Story = {
  args: { size: 'lg', label: 'Where should we start?', options: startIconOptions, value: 'find' },
  play: async ({ canvas }) => {
    const find = canvas.getByRole('radio', { name: 'Find my level' });
    await expect(find).toBeChecked();
    await expect(find).toHaveAccessibleDescription(
      'Let the flame recommend where you should start learning',
    );
    // The pictures are decorative: they never join an option's accessible name.
    await expect(canvas.getByRole('radio', { name: 'Start from scratch' })).toHaveAccessibleName(
      'Start from scratch',
    );
    await expectContrast(canvas, /Find my level/, true);
    await expectContrast(canvas, /Start from scratch/, false);
  },
};

const VIEWPORTS = {
  wide: { name: 'Wide 1280', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
  phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
} as const;

const fiveLevelOptions: RadioCardOption[] = [
  { value: 'new', label: "I'm new to Estonian" },
  { value: 'words', label: 'I know some common words' },
  { value: 'basic', label: 'I can have basic conversations' },
  { value: 'topics', label: 'I can talk about various topics' },
  { value: 'detail', label: 'I can discuss most topics in detail' },
].map((option, index) => ({ ...option, icon: <SignalBars level={index} /> }));

/** Measures the group, its cards and their parts in layout px. */
function measureCards(canvas: {
  getByRole: (role: string) => HTMLElement;
  getAllByRole: (role: string) => HTMLElement[];
}) {
  const group = canvas.getByRole('radiogroup');
  const cards = canvas.getAllByRole('radio').map(cardOf);
  const icon = (card: HTMLElement) => {
    const slot = card.querySelector<HTMLElement>('[aria-hidden="true"]');
    if (!slot) throw new Error('icon slot missing');
    return slot;
  };
  const gaps = cards.slice(1).map((card, i) => {
    const previous = cards[i];
    if (!previous) throw new Error('card missing');
    return card.getBoundingClientRect().top - previous.getBoundingClientRect().bottom;
  });
  return {
    group,
    cards,
    icon,
    gaps,
    heights: cards.map((card) => card.offsetHeight),
    widths: cards.map((card) => card.getBoundingClientRect().width),
  };
}

/** Nothing leaves the group or the screen, and no card scrolls sideways. */
async function expectNoOverflow(m: ReturnType<typeof measureCards>) {
  const column = m.group.getBoundingClientRect();
  for (const card of m.cards) {
    const box = card.getBoundingClientRect();
    await expect(box.left).toBeGreaterThanOrEqual(column.left - 0.5);
    await expect(box.right).toBeLessThanOrEqual(column.right + 0.5);
    await expect(box.right).toBeLessThanOrEqual(window.innerWidth);
    await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
  }
  await expect(m.group.scrollWidth).toBeLessThanOrEqual(m.group.clientWidth);
}

export const LevelRowsWide: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'wide', isRotated: false } },
  args: { options: fiveLevelOptions, value: 'words' },
  play: async ({ canvas }) => {
    await expect(window.innerWidth).toBeGreaterThanOrEqual(1280);
    const m = measureCards(canvas);
    await expect(m.cards).toHaveLength(5);
    // The column is 640px; every row fills it exactly.
    await expect(m.group.getBoundingClientRect().width).toBeCloseTo(640, 0);
    for (const width of m.widths) await expect(width).toBeCloseTo(640, 0);
    // Rows about 80px high, 24px apart.
    for (const height of m.heights) await expect(height).toBe(80);
    for (const gap of m.gaps) await expect(gap).toBeCloseTo(24, 0);
    // Signal icon on the left, the text after it.
    for (const card of m.cards) {
      const icon = m.icon(card).getBoundingClientRect();
      const text = card.querySelector<HTMLElement>('[id$="-label"]')?.getBoundingClientRect();
      await expect(text).toBeDefined();
      await expect(text?.left ?? 0).toBeGreaterThanOrEqual(icon.right);
    }
    await expectNoOverflow(m);
  },
};

export const LevelRowsPhone: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'phone', isRotated: false } },
  args: { options: fiveLevelOptions, value: 'detail' },
  play: async ({ canvas }) => {
    await expect(window.innerWidth).toBe(390);
    const m = measureCards(canvas);
    // The column is the screen minus 16px gutters (358px); rows fill it.
    await expect(m.group.getBoundingClientRect().width).toBeLessThanOrEqual(358.5);
    for (const width of m.widths) {
      await expect(width).toBeCloseTo(m.group.getBoundingClientRect().width, 0);
    }
    // At least 64px high, 12px to 16px apart; text may wrap to a second line.
    for (const height of m.heights) await expect(height).toBeGreaterThanOrEqual(64);
    for (const gap of m.gaps) {
      await expect(gap).toBeGreaterThanOrEqual(12);
      await expect(gap).toBeLessThanOrEqual(16);
    }
    await expectNoOverflow(m);
  },
};

export const StartCardsWide: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'wide', isRotated: false } },
  args: { size: 'lg', label: 'Where should we start?', options: startIconOptions, value: 'scratch' },
  play: async ({ canvas }) => {
    await expect(window.innerWidth).toBeGreaterThanOrEqual(1280);
    const m = measureCards(canvas);
    await expect(m.cards).toHaveLength(2);
    await expect(m.group.getBoundingClientRect().width).toBeCloseTo(640, 0);
    for (const width of m.widths) await expect(width).toBeCloseTo(640, 0);
    // Cards about 175px high, about 22px (22 to 24) apart.
    for (const height of m.heights) await expect(height).toBe(175);
    for (const gap of m.gaps) {
      await expect(gap).toBeGreaterThanOrEqual(22);
      await expect(gap).toBeLessThanOrEqual(24);
    }
    for (const card of m.cards) {
      // An 80px-square icon on the left; title and description to its right, title above description.
      const slot = m.icon(card);
      await expect(slot.getBoundingClientRect().width).toBe(80);
      await expect(slot.getBoundingClientRect().height).toBe(80);
      const title = card.querySelector<HTMLElement>('[id$="-label"]');
      const description = card.querySelector<HTMLElement>('[id$="-description"]');
      if (!title || !description) throw new Error('title or description missing');
      await expect(title.getBoundingClientRect().left).toBeGreaterThanOrEqual(
        slot.getBoundingClientRect().right,
      );
      await expect(description.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        title.getBoundingClientRect().bottom - 0.5,
      );
      // Icon and text sit on the card's vertical centre line.
      const middle = card.getBoundingClientRect().top + card.offsetHeight / 2;
      const iconBox = slot.getBoundingClientRect();
      await expect(Math.abs(iconBox.top + iconBox.height / 2 - middle)).toBeLessThanOrEqual(1);
    }
    await expectNoOverflow(m);
  },
};

export const StartCardsPhone: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'phone', isRotated: false } },
  args: { size: 'lg', label: 'Where should we start?', options: startIconOptions, value: 'find' },
  play: async ({ canvas }) => {
    await expect(window.innerWidth).toBe(390);
    const m = measureCards(canvas);
    await expect(m.group.getBoundingClientRect().width).toBeLessThanOrEqual(358.5);
    for (const width of m.widths) {
      await expect(width).toBeCloseTo(m.group.getBoundingClientRect().width, 0);
    }
    // Cards stay at least 112px high; the icon shrinks to 64px; text wraps inside the card.
    for (const height of m.heights) await expect(height).toBeGreaterThanOrEqual(112);
    for (const card of m.cards) {
      await expect(m.icon(card).getBoundingClientRect().width).toBe(64);
    }
    for (const gap of m.gaps) {
      await expect(gap).toBeGreaterThanOrEqual(12);
      await expect(gap).toBeLessThanOrEqual(16);
    }
    await expectNoOverflow(m);
  },
};

export const LongTextWrapsInsideCard: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'phone', isRotated: false } },
  args: {
    size: 'lg',
    label: 'Where should we start?',
    value: null,
    options: [
      {
        value: 'long',
        label: 'Averyveryverylongunbrokenlabelwithoutanyspacesthatmustwrap',
        description:
          'Averyveryverylongunbrokendescriptionwithoutanyspaces and a much longer sentence that needs several lines.',
        icon: bookIcon,
      },
    ],
  },
  play: async ({ canvas }) => {
    const m = measureCards(canvas);
    await expectNoOverflow(m);
    await expect(m.heights[0]).toBeGreaterThan(112);
  },
};

export const LabelledByElement: Story = {
  args: { label: '', 'aria-labelledby': 'bubble-text' },
  decorators: [
    (Story) => (
      <div>
        <h1 id="bubble-text">Now let&apos;s find the best place to start!</h1>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('radiogroup', { name: "Now let's find the best place to start!" }),
    ).toBeInTheDocument();
  },
};

export const ArrowKeysMoveSelection: Story = {
  args: { options: iconOptions, value: 'new' },
  play: async ({ canvas, args }) => {
    const first = canvas.getByRole('radio', { name: "I'm new to Estonian" });
    const second = canvas.getByRole('radio', { name: 'I know some common words' });
    const third = canvas.getByRole('radio', { name: 'I can have basic conversations' });
    first.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(second).toHaveFocus();
    await expect(second).toBeChecked();
    await expect(first).not.toBeChecked();
    await expect(args.onChange).toHaveBeenLastCalledWith('words');
    await userEvent.keyboard('{ArrowRight}');
    await expect(third).toBeChecked();
    await expect(args.onChange).toHaveBeenLastCalledWith('basic');
    await userEvent.keyboard('{ArrowUp}');
    await expect(second).toBeChecked();
    await expect(args.onChange).toHaveBeenCalledTimes(3);
    // Wraps from the first option to the last.
    await userEvent.keyboard('{ArrowUp}');
    await userEvent.keyboard('{ArrowUp}');
    await expect(third).toBeChecked();
    await expect(args.onChange).toHaveBeenLastCalledWith('basic');
    // Moving the selection is not activation.
    await expect(args.onActivate).not.toHaveBeenCalled();
  },
};

export const SpaceSelects: Story = {
  play: async ({ canvas, args }) => {
    // Tab lands on the group (nothing chosen yet), Space selects the focused option.
    await userEvent.tab();
    const first = canvas.getByRole('radio', { name: /new to Estonian/ });
    await expect(first).toHaveFocus();
    await expect(first).not.toBeChecked();
    await userEvent.keyboard(' ');
    await expect(first).toBeChecked();
    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith('new');
    await expect(args.onActivate).not.toHaveBeenCalled();
  },
};

export const ClickSelects: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByText('I can have basic conversations'));
    await expect(canvas.getByRole('radio', { name: /basic conversations/ })).toBeChecked();
    await expect(args.onChange).toHaveBeenCalledWith('basic');
  },
};

export const EnterActivatesSelected: Story = {
  args: { value: 'words' },
  play: async ({ canvas, args }) => {
    const selected = canvas.getByRole('radio', { name: 'I know some common words' });
    selected.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onActivate).toHaveBeenCalledTimes(1);
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};

export const EnterOnUnselectedDoesNothing: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('radio', { name: /new to Estonian/ })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onActivate).not.toHaveBeenCalled();
  },
};

export const FocusRingOnKeyboardFocus: Story = {
  play: async ({ canvas }) => {
    await userEvent.tab();
    const card = cardOf(canvas.getByRole('radio', { name: /new to Estonian/ }));
    await expect(getComputedStyle(card).outlineStyle).toBe('solid');
    await expect(getComputedStyle(card).outlineColor).toBe(resolveColor('--color-primary'));
  },
};

export const RestPropsKeepGroupSemantics: Story = {
  // Forced past the types on purpose: rest props must not rename or re-role the group.
  args: {
    ...({ role: 'listbox', 'aria-label': 'Wrong' } as Pick<RadioCardGroupProps, 'id'>),
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('listbox')).toBeNull();
    await expect(
      canvas.getByRole('radiogroup', { name: 'How much Estonian do you know?' }),
    ).toBeInTheDocument();
  },
};
