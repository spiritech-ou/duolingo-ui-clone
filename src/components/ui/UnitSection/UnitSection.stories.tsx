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
      <div style={{ width: 'min(100vw, 26rem)', padding: '3rem 1rem 2rem' }}>
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
    // On a narrow screen the steps shrink.
    if (window.innerWidth < 480) {
      await expect(stepOf(nodes[0] as HTMLElement)).toBe(
        1.25 * parseFloat(getComputedStyle(document.documentElement).fontSize),
      );
    }
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
