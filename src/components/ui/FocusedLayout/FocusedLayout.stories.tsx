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
