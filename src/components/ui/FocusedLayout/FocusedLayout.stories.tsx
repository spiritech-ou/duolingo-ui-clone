import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { Button } from '@/components/ui/Button';
import { FocusedLayout } from './FocusedLayout';

const header = <p>Step 1 of 2</p>;
const footer = <Button onClick={fn()}>Continue</Button>;

const paragraphs = Array.from({ length: 24 }, (_, index) => (
  <p key={index}>
    Paragraph {index + 1}. Estonian has fourteen cases and no grammatical gender, so learning
    starts with short, useful phrases that you can say out loud right away.
  </p>
));

const meta = {
  title: 'UI/FocusedLayout',
  component: FocusedLayout,
  parameters: { layout: 'fullscreen' },
  args: {
    children: <p>How much Estonian do you know?</p>,
  },
} satisfies Meta<typeof FocusedLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHeaderAndFooter: Story = {
  args: { header, footer },
  play: async ({ canvas, canvasElement }) => {
    const main = canvas.getByRole('main');
    await expect(main).toHaveTextContent('How much Estonian do you know?');
    await expect(canvas.getByText('Step 1 of 2')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Continue' })).toBeVisible();
    // Exactly one main landmark, and the slots are not landmarks (no banner/contentinfo).
    await expect(canvas.getAllByRole('main')).toHaveLength(1);
    await expect(canvas.queryByRole('banner')).toBeNull();
    await expect(canvas.queryByRole('contentinfo')).toBeNull();
    // DOM order: header, main, footer.
    const root = canvasElement.firstElementChild as HTMLElement;
    await expect(root.children).toHaveLength(3);
    await expect(root.children[1]).toBe(main);
  },
};

export const ContentOnly: Story = {
  play: async ({ canvas, canvasElement }) => {
    const root = canvasElement.firstElementChild as HTMLElement;
    await expect(root.children).toHaveLength(1);
    await expect(canvas.getByRole('main')).toHaveTextContent('How much Estonian do you know?');
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

export const HeaderOnly: Story = {
  args: { header },
  play: async ({ canvas, canvasElement }) => {
    const root = canvasElement.firstElementChild as HTMLElement;
    await expect(root.children).toHaveLength(2);
    await expect(canvas.getByText('Step 1 of 2')).toBeVisible();
  },
};

export const FooterOnly: Story = {
  args: { footer },
  play: async ({ canvas, canvasElement }) => {
    const root = canvasElement.firstElementChild as HTMLElement;
    await expect(root.children).toHaveLength(2);
    await expect(canvas.getByRole('button', { name: 'Continue' })).toBeVisible();
  },
};

export const LongContent: Story = {
  args: { header, footer, children: paragraphs },
  play: async ({ canvas, canvasElement }) => {
    const root = canvasElement.firstElementChild as HTMLElement;
    const main = canvas.getByRole('main');
    const button = canvas.getByRole('button', { name: 'Continue' });

    // The content overflows the main area, so the main area scrolls, not the page.
    await expect(main.scrollHeight).toBeGreaterThan(main.clientHeight);
    await expect(getComputedStyle(main).overflowY).toBe('auto');
    await expect(root.getBoundingClientRect().height).toBeLessThanOrEqual(window.innerHeight);

    // The footer is pinned: the content scrolls and the footer does not move.
    const footerTopBefore = button.getBoundingClientRect().top;
    main.scrollTop = main.scrollHeight;
    await expect(main.scrollTop).toBeGreaterThan(0);
    await expect(button.getBoundingClientRect().top).toBe(footerTopBefore);
    await expect(button).toBeVisible();
    // The footer sits at the bottom edge of the frame.
    await expect(button.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      root.getBoundingClientRect().bottom,
    );
    // The last paragraph is reachable.
    await expect(canvas.getByText(/Paragraph 24\./)).toBeVisible();
  },
};

export const ReadableMaxWidth: Story = {
  args: { header, footer, children: paragraphs },
  decorators: [
    (Story) => (
      <div style={{ width: '90rem' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const main = canvas.getByRole('main');
    const content = main.firstElementChild as HTMLElement;
    const maxWidth = 40 * parseFloat(getComputedStyle(document.documentElement).fontSize);
    // Wide frame, but the text column stays at the readable width and is centred.
    await expect(content.getBoundingClientRect().width).toBeLessThanOrEqual(maxWidth);
    const mainRect = main.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    await expect(Math.abs(contentRect.left - mainRect.left - (mainRect.right - contentRect.right))).toBeLessThanOrEqual(1);
  },
};

const frameOf = (width: string) => [
  (Story: () => ReactElement) => (
    <div style={{ width }}>
      <Story />
    </div>
  ),
];

// Expected side padding for the current viewport: 1rem below 48rem, 1.5rem from it up.
const sidePaddingFor = (rem: number) =>
  (window.matchMedia('(min-width: 48rem)').matches ? 1.5 : 1) * rem;

function columns(canvas: { getByRole: (role: 'main') => HTMLElement }) {
  const main = canvas.getByRole('main');
  // The decorator wraps the frame, so the frame is the parent of the main landmark.
  const root = main.parentElement as HTMLElement;
  const rect = (el: Element | null) => (el as HTMLElement).getBoundingClientRect();
  return {
    root: rect(root),
    header: rect(root.children[0]?.firstElementChild ?? null),
    content: rect(main.firstElementChild),
    footer: rect(root.children[2]?.firstElementChild ?? null),
    headerStrip: rect(root.children[0] ?? null),
    footerStrip: rect(root.children[2] ?? null),
  };
}

const exerciseWidths = {
  header,
  footer,
  headerMaxWidth: '82.5rem',
  contentMaxWidth: '49.375rem',
  footerMaxWidth: '76rem',
} as const;

export const ExerciseWidthsWide: Story = {
  args: exerciseWidths,
  decorators: frameOf('100rem'),
  play: async ({ canvas }) => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const c = columns(canvas);
    await expect(c.header.width).toBeCloseTo(82.5 * rem, 0);
    await expect(c.content.width).toBeCloseTo(49.375 * rem, 0);
    await expect(c.footer.width).toBeCloseTo(76 * rem, 0);
    // Strips span the whole frame; columns are centred.
    await expect(c.headerStrip.width).toBe(c.root.width);
    await expect(c.footerStrip.width).toBe(c.root.width);
    const centre = c.root.left + c.root.width / 2;
    for (const col of [c.header, c.content, c.footer]) {
      await expect(Math.abs(col.left + col.width / 2 - centre)).toBeLessThanOrEqual(1);
    }
  },
};

export const ExerciseWidthsNarrow: Story = {
  args: exerciseWidths,
  decorators: frameOf('24rem'),
  play: async ({ canvas }) => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const c = columns(canvas);
    // Every column is clamped to the frame minus the side padding (1rem each side on mobile).
    // Side padding is 1rem below the md breakpoint (48rem) and 1.5rem from it, by viewport.
    const side = parseFloat(getComputedStyle(canvas.getByRole('main')).paddingLeft);
    await expect(side).toBe(sidePaddingFor(rem));
    const available = c.root.width - 2 * side;
    await expect(c.header.width).toBeCloseTo(available, 0);
    await expect(c.content.width).toBeCloseTo(available, 0);
    await expect(c.footer.width).toBeCloseTo(available, 0);
  },
};

export const OnboardingWidthWithHangingChild: Story = {
  args: {
    header,
    footer,
    contentMaxWidth: '40rem',
    children: (
      <div data-testid="wide-row" style={{ width: '60rem', height: '2rem' }}>
        Mascot row wider than the column
      </div>
    ),
  },
  decorators: frameOf('90rem'),
  play: async ({ canvas }) => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const c = columns(canvas);
    await expect(c.content.width).toBeCloseTo(40 * rem, 0);
    // Default header and footer columns stay at 40rem.
    await expect(c.header.width).toBeCloseTo(40 * rem, 0);
    await expect(c.footer.width).toBeCloseTo(40 * rem, 0);
    // The wide child hangs outside the column and is not clipped to it (the frame is wider).
    const rowEl = canvas.getByText('Mascot row wider than the column');
    const row = rowEl.getBoundingClientRect();
    await expect(row.width).toBeCloseTo(60 * rem, 0);
    await expect(row.width).toBeGreaterThan(c.content.width + 10 * rem);
    // The row starts at the column's left edge, hangs out past its right edge, and the point
    // past the column edge hits the child (not clipped).
    await expect(row.right).toBeGreaterThan(c.content.right);
    await expect(document.elementFromPoint(c.content.right + 2 * rem, row.top + 4)).toBe(rowEl);
    await expect(row.left).toBeGreaterThanOrEqual(c.root.left);
    await expect(row.right).toBeLessThanOrEqual(c.root.right);
    await expect(canvas.getByRole('main').scrollWidth).toBeLessThanOrEqual(
      canvas.getByRole('main').clientWidth,
    );
  },
};

export const OnboardingWidthNarrow: Story = {
  args: { header, footer, contentMaxWidth: '40rem' },
  decorators: frameOf('24rem'),
  play: async ({ canvas }) => {
    const c = columns(canvas);
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const side = parseFloat(getComputedStyle(canvas.getByRole('main')).paddingLeft);
    await expect(side).toBe(sidePaddingFor(rem));
    await expect(c.content.width).toBeCloseTo(c.root.width - 2 * side, 0);
  },
};

export const NarrowPhone: Story = {
  args: {
    header,
    footer: (
      <Button onClick={fn()}>Averyveryverylongbuttonlabelwithoutanyspacesatall</Button>
    ),
    children: (
      <>
        <p>Averyveryverylongunbrokenwordthatkeepsgoingandgoingwithoutanyspacesorbreaksatall</p>
        {paragraphs}
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '20rem' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas, canvasElement }) => {
    const root = canvasElement.firstElementChild as HTMLElement;
    const main = canvas.getByRole('main');
    // No horizontal overflow at 320px: neither the frame nor the scrolling area.
    await expect(root.getBoundingClientRect().width).toBeLessThanOrEqual(320);
    await expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    await expect(main.scrollWidth).toBeLessThanOrEqual(main.clientWidth);
    await expect(canvas.getByRole('button')).toBeVisible();
  },
};

export const RestPropsKeepAccessibility: Story = {
  args: {
    header,
    footer,
    id: 'focused-layout',
    // Forced past the types on purpose: rest props must not give the frame a role.
    ...({ role: 'dialog' } as object),
  },
  play: async ({ canvas, canvasElement }) => {
    const root = canvasElement.firstElementChild as HTMLElement;
    await expect(root).toHaveAttribute('id', 'focused-layout');
    await expect(root).not.toHaveAttribute('role');
    await expect(canvas.queryByRole('dialog')).toBeNull();
    await expect(canvas.getAllByRole('main')).toHaveLength(1);
  },
};
