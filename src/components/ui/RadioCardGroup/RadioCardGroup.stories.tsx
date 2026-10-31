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

/** Keeps the selection in state so arrows and Space behave as in the app, and still reports to the spies. */
function Stateful(args: RadioCardGroupProps) {
  const [value, setValue] = useState(args.value);
  return (
    <div style={{ inlineSize: 'min(28rem, calc(100vw - 2rem))' }}>
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
