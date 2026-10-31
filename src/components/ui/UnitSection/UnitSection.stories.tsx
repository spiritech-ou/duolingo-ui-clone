import { createRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';
import type { UnitLesson } from './UnitSection';
import { UnitSection } from './UnitSection';

const onPress = fn();

const mixed: UnitLesson[] = [
  { id: 'l1', label: 'Lesson 1, Greetings, completed', status: 'completed', onPress },
  { id: 'l2', label: 'Lesson 2, Numbers, completed', status: 'completed', onPress },
  { id: 'l3', label: 'Lesson 3, Food, recommended, start', status: 'recommended', onPress },
  { id: 'l4', label: 'Lesson 4, Drinks', status: 'available', onPress },
  { id: 'l5', label: 'Lesson 5, Family', status: 'available', onPress },
];

const four: UnitLesson[] = [
  { id: 'a', label: 'Lesson 1, Greetings', status: 'available', onPress },
  { id: 'b', label: 'Lesson 2, Numbers', status: 'available', onPress },
  { id: 'c', label: 'Lesson 3, Food', status: 'available', onPress },
  { id: 'd', label: 'Lesson 4, Drinks', status: 'available', onPress },
];

const nine: UnitLesson[] = Array.from({ length: 9 }, (_, i) => ({
  id: `n${i + 1}`,
  label: `Lesson ${i + 1}, Topic ${i + 1}`,
  status: 'available',
  onPress,
}));

const meta = {
  title: 'UI/UnitSection',
  component: UnitSection,
  args: {
    unitNumber: 1,
    title: 'Basics',
    description: 'Say hello and talk about food and drink.',
    lessons: mixed,
  },
  decorators: [
    (Story) => (
      // A column like the page's: 640px at most, 16px gutters on a phone.
      <div style={{ width: 'min(100vw, 40rem)', padding: '3rem 1rem 2rem' }}>
        <Story />
      </div>
    ),
  ],
  beforeEach: () => {
    onPress.mockClear();
  },
} satisfies Meta<typeof UnitSection>;

export default meta;
type Story = StoryObj<typeof meta>;

function shiftOf(node: HTMLElement): number {
  const translate = getComputedStyle(node).translate;
  return translate === 'none' ? 0 : parseFloat(translate.split(' ')[0] ?? '0');
}

function stepOf(node: HTMLElement): number {
  const step = getComputedStyle(node).getPropertyValue('--path-node-step').trim();
  const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return step.endsWith('rem') ? parseFloat(step) * rootSize : parseFloat(step);
}

export const AllStatuses: Story = {
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: 'Unit 1 Basics' });
    await expect(group).toHaveAccessibleDescription('Say hello and talk about food and drink.');

    // The banner is the heading, "Unit 1" then the title.
    const heading = canvas.getByRole('heading', { level: 2, name: 'Unit 1 Basics' });
    await expect(group.getAttribute('aria-labelledby')).toBe(heading.id);

    const list = canvas.getByRole('list');
    await expect(list.tagName).toBe('OL');
    const nodes = canvas.getAllByRole('button');
    await expect(nodes).toHaveLength(5);
    // Course order is DOM (and focus) order.
    await expect(nodes.map((node) => node.dataset['status'])).toEqual([
      'completed',
      'completed',
      'recommended',
      'available',
      'available',
    ]);
    await expect(canvas.getAllByRole('listitem')).toHaveLength(5);

    // Only the recommended node is the current step.
    await expect(canvas.getByRole('button', { name: /recommended/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
    await expect(canvas.getAllByRole('button', { current: 'step' })).toHaveLength(1);
  },
};

export const OffsetPattern: Story = {
  args: { lessons: nine },
  play: async ({ canvas }) => {
    const nodes = canvas.getAllByRole('button');
    // 0, +1, +2, +1, 0, -1, -2, -1, then the pattern repeats.
    const expected = [0, 1, 2, 1, 0, -1, -2, -1, 0];
    await expect(nodes.map((node) => node.style.getPropertyValue('--path-node-offset'))).toEqual(
      expected.map(String),
    );
    nodes.forEach((node, i) => {
      expect(shiftOf(node)).toBeCloseTo((expected[i] ?? 0) * stepOf(node), 1);
    });
    // The path winds: a node with a positive offset sits right of one with a negative offset.
    const right = nodes[2]?.getBoundingClientRect().x ?? 0;
    const left = nodes[6]?.getBoundingClientRect().x ?? 0;
    await expect(right).toBeGreaterThan(left);
  },
};

export const UnitOfFour: Story = {
  args: { unitNumber: 2, title: 'Everyday life', lessons: four },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('group', { name: 'Unit 2 Everyday life' })).toBeInTheDocument();
    const nodes = canvas.getAllByRole('button');
    await expect(nodes).toHaveLength(4);
    await expect(nodes.map((node) => node.style.getPropertyValue('--path-node-offset'))).toEqual([
      '0',
      '1',
      '2',
      '1',
    ]);
    // No recommended node: none is current.
    await expect(canvas.queryAllByRole('button', { current: 'step' })).toHaveLength(0);
  },
};

export const CompletedUnit: Story = {
  args: {
    unitNumber: 3,
    title: 'Travel',
    lessons: four.map((lesson) => ({ ...lesson, status: 'completed' as const })),
  },
  play: async ({ canvas }) => {
    for (const node of canvas.getAllByRole('button')) {
      await expect(node.dataset['status']).toBe('completed');
    }
  },
};

export const NarrowViewport: Story = {
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  decorators: [
    (Story) => (
      <div style={{ width: '20rem', maxWidth: '100%', padding: '3rem 0.5rem 2rem' }}>
        <Story />
      </div>
    ),
  ],
  args: { lessons: nine, title: 'A rather long unit title that has to wrap on a small screen' },
  play: async ({ canvas, canvasElement }) => {
    const group = canvas.getByRole('group');
    const bounds = group.getBoundingClientRect();
    const nodes = canvas.getAllByRole('button');
    // The widest offsets (two steps either side) stay inside the section.
    for (const node of nodes) {
      const box = node.getBoundingClientRect();
      expect(box.left).toBeGreaterThanOrEqual(bounds.left);
      expect(box.right).toBeLessThanOrEqual(bounds.right);
    }
    // Nothing makes the page scroll sideways.
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
    // On a narrow screen the steps shrink to 40px.
    if (window.innerWidth < 480) {
      await expect(stepOf(nodes[0] as HTMLElement)).toBe(
        2.5 * parseFloat(getComputedStyle(document.documentElement).fontSize),
      );
    }
  },
};

const VIEWPORTS = {
  wide: { name: 'Wide 1280', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
  phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
} as const;

const sizing = {
  parameters: { layout: 'fullscreen', viewport: { options: VIEWPORTS } },
} as const;

// A description long enough to wrap to two lines on a phone, as the longest course ones do.
const longDescription = 'Talk about your home, clothes, school things and getting around.';

/** Layout size in px, not affected by `translate` or the pulse's `scale`. */
function sizeOf(el: HTMLElement) {
  return { width: el.offsetWidth, height: el.offsetHeight };
}

/** Distance between the centres of two vertically stacked nodes, from layout (no `translate`). */
function pitchBetween(a: HTMLElement, b: HTMLElement): number {
  return b.offsetTop + b.offsetHeight / 2 - (a.offsetTop + a.offsetHeight / 2);
}

export const SizesWide: Story = {
  ...sizing,
  globals: { viewport: { value: 'wide', isRotated: false } },
  args: { description: longDescription, lessons: nine },
  play: async ({ canvas }) => {
    await expect(window.innerWidth).toBeGreaterThanOrEqual(1280);
    const group = canvas.getByRole('group');
    const banner = canvas.getByRole('heading', { level: 2 }).parentElement as HTMLElement;
    const nodes = canvas.getAllByRole('button');

    // The banner fills the column and is 80px high, its description on one line.
    await expect(banner.offsetWidth).toBe(group.offsetWidth);
    await expect(banner.offsetHeight).toBe(80);
    const description = canvas.getByText(longDescription);
    const lineHeight = parseFloat(getComputedStyle(description).lineHeight);
    await expect(description.getBoundingClientRect().height).toBeLessThanOrEqual(lineHeight + 1);

    // 72px nodes, 96px between the centres of neighbours.
    for (const node of nodes) {
      await expect(sizeOf(node)).toEqual({ width: 72, height: 72 });
    }
    for (let i = 1; i < nodes.length; i += 1) {
      await expect(pitchBetween(nodes[i - 1] as HTMLElement, nodes[i] as HTMLElement)).toBe(96);
    }

    // The winding stays within about 2 node widths (144px) of the centre line.
    const centre = group.getBoundingClientRect().left + group.offsetWidth / 2;
    for (const node of nodes) {
      const box = node.getBoundingClientRect();
      const reach = Math.max(Math.abs(box.left - centre), Math.abs(box.right - centre));
      await expect(reach).toBeLessThanOrEqual(144);
    }
    // 50px step: the second node is one step right of the first.
    await expect(
      (nodes[1] as HTMLElement).getBoundingClientRect().x - (nodes[0] as HTMLElement).getBoundingClientRect().x,
    ).toBeCloseTo(50, 0);
  },
};

export const SizesPhone: Story = {
  ...sizing,
  globals: { viewport: { value: 'phone', isRotated: false } },
  args: { description: longDescription, lessons: nine },
  play: async ({ canvas, canvasElement }) => {
    await expect(window.innerWidth).toBe(390);
    const group = canvas.getByRole('group');
    const banner = canvas.getByRole('heading', { level: 2 }).parentElement as HTMLElement;
    const nodes = canvas.getAllByRole('button');

    // The column is the width minus 16px gutters; the banner fills it.
    await expect(group.offsetWidth).toBe(358);
    await expect(banner.offsetWidth).toBe(358);
    // 72px high with the description on two lines.
    await expect(banner.offsetHeight).toBe(72);
    const description = canvas.getByText(longDescription);
    const lineHeight = parseFloat(getComputedStyle(description).lineHeight);
    await expect(Math.round(description.getBoundingClientRect().height / lineHeight)).toBe(2);

    // 64px nodes, 88px between the centres of neighbours.
    for (const node of nodes) {
      await expect(sizeOf(node)).toEqual({ width: 64, height: 64 });
    }
    for (let i = 1; i < nodes.length; i += 1) {
      await expect(pitchBetween(nodes[i - 1] as HTMLElement, nodes[i] as HTMLElement)).toBe(88);
    }

    // 40px step: two steps are 80px from the centre line, fully inside the column.
    const bounds = group.getBoundingClientRect();
    const centre = bounds.left + bounds.width / 2;
    for (const node of nodes) {
      const box = node.getBoundingClientRect();
      await expect(box.left).toBeGreaterThanOrEqual(bounds.left);
      await expect(box.right).toBeLessThanOrEqual(bounds.right);
      await expect(Math.max(Math.abs(box.left - centre), Math.abs(box.right - centre))).toBeLessThanOrEqual(112);
    }
    // No horizontal scroll.
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  },
};

export const GapToNextUnit: Story = {
  ...sizing,
  globals: { viewport: { value: 'wide', isRotated: false } },
  render: (args) => (
    <>
      <UnitSection {...args} />
      <UnitSection {...args} unitNumber={2} title="Animals" lessons={four} />
    </>
  ),
  play: async ({ canvas }) => {
    const groups = canvas.getAllByRole('group');
    const lastNode = Array.from(groups[0]?.querySelectorAll<HTMLElement>('button') ?? []).at(-1);
    const nextBanner = groups[1]?.querySelector<HTMLElement>('h2')?.parentElement;
    // 32px from the last node of a unit to the next unit's banner.
    const gap =
      (nextBanner?.getBoundingClientRect().top ?? 0) - (lastNode?.getBoundingClientRect().bottom ?? 0);
    await expect(gap).toBe(32);
  },
};

export const BubbleStaysInColumn: Story = {
  ...sizing,
  globals: { viewport: { value: 'phone', isRotated: false } },
  decorators: [
    (Story) => (
      // Narrower than a real column on purpose: the offset recommended node's bubble would stick
      // out without the clamp.
      <div style={{ width: '12rem' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const list = canvas.getByRole('list');
    const bubble = canvas.getByText('START');
    const listBox = list.getBoundingClientRect();
    const bubbleBox = bubble.getBoundingClientRect();
    await expect(bubbleBox.left).toBeGreaterThanOrEqual(listBox.left);
    await expect(bubbleBox.right).toBeLessThanOrEqual(listBox.right);
    // It still sits above its node.
    const node = canvas.getByRole('button', { name: /recommended/ });
    await expect(bubbleBox.bottom).toBeLessThanOrEqual(node.getBoundingClientRect().top + 1);
  },
};

export const RecommendedNodeRef: Story = {
  render: (args) => {
    const ref = createRef<HTMLButtonElement>();
    return (
      <>
        <button
          type="button"
          onClick={() => {
            ref.current?.focus();
          }}
        >
          Focus recommended
        </button>
        <UnitSection {...args} recommendedRef={ref} />
      </>
    );
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Focus recommended' }));
    await expect(canvas.getByRole('button', { name: 'Lesson 3, Food, recommended, start' })).toHaveFocus();
  },
};

export const PressAndKeyboard: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Lesson 1, Greetings, completed' }));
    await expect(onPress).toHaveBeenCalledTimes(1);

    // Tab follows course order; Enter and Space activate.
    await expect(canvas.getByRole('button', { name: 'Lesson 1, Greetings, completed' })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Lesson 2, Numbers, completed' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    await expect(onPress).toHaveBeenCalledTimes(3);
  },
};

export const RestPropsKeepA11y: Story = {
  args: {
    // Forced past the types on purpose: rest props must not replace the component's own attributes.
    ...({ role: 'presentation', 'aria-labelledby': 'nope', 'aria-describedby': 'nope' } as object),
    id: 'unit-one',
  },
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: 'Unit 1 Basics' });
    await expect(group).toHaveAccessibleDescription('Say hello and talk about food and drink.');
    // Harmless rest props still arrive.
    await expect(group).toHaveAttribute('id', 'unit-one');
  },
};
