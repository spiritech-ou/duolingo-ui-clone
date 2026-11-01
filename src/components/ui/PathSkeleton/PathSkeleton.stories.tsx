import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import type { within } from 'storybook/test';
import { UnitSection } from '@/components/ui/UnitSection';
import type { UnitLesson } from '@/components/ui/UnitSection';
import { PathSkeleton } from './PathSkeleton';

const meta = {
  title: 'UI/PathSkeleton',
  component: PathSkeleton,
  decorators: [
    (Story) => (
      <div style={{ width: 'min(100vw, 26rem)', padding: '3rem 1rem 2rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PathSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const status = canvas.getByRole('status');
    await expect(status).toHaveTextContent('Loading your lessons');
    const root = status.parentElement as HTMLElement; // the container is the status text's parent
    await expect(root).toHaveAttribute('aria-busy', 'true');

    // Banner plus five nodes, all hidden from assistive tech.
    const shapes = canvasElement.querySelectorAll('[aria-hidden="true"] > *, [aria-hidden="true"]');
    await expect(shapes.length).toBeGreaterThanOrEqual(6);
    await expect(canvas.queryAllByRole('button')).toHaveLength(0);
    await expect(canvas.queryAllByRole('heading')).toHaveLength(0);

    // The status text is visually hidden, not display:none.
    const box = status.getBoundingClientRect();
    await expect(box.width).toBeLessThanOrEqual(1);
    await expect(getComputedStyle(status).display).not.toBe('none');

    // Zigzag: nodes follow 0, +1, +2, +1, 0 steps like UnitSection.
    const nodes = Array.from(canvasElement.querySelectorAll<HTMLElement>('[style*="--path-node-offset"]'));
    await expect(nodes).toHaveLength(5);
    await expect(nodes.map((n) => n.style.getPropertyValue('--path-node-offset'))).toEqual([
      '0',
      '1',
      '2',
      '1',
      '0',
    ]);
    const xs = nodes.map((n) => n.getBoundingClientRect().x);
    await expect(xs[2]).toBeGreaterThan(xs[0] ?? 0);

    // Shapes shimmer when motion is allowed (reduced motion is covered by WithReducedMotion).
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await expect(getComputedStyle(nodes[0] as HTMLElement).animationName).not.toBe('none');
    }
  },
};

const VIEWPORTS = {
  wide: { name: 'Wide 1280', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
  phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
} as const;

const onPress = () => undefined;
const fiveLessons: UnitLesson[] = Array.from({ length: 5 }, (_, i) => ({
  id: `s${i + 1}`,
  label: `Lesson ${i + 1}, Topic ${i + 1}`,
  status: 'available',
  onPress,
}));

/** Shows the skeleton and a real unit in the same column, to compare their geometry. */
function SkeletonAndUnit() {
  return (
    <>
      <PathSkeleton />
      <UnitSection
        unitNumber={1}
        title="Food and drink"
        description="Name what you eat and drink every day."
        lessons={fiveLessons}
      />
    </>
  );
}

/** Top (relative to its section) and size of the banner and of each node, in layout px. */
function geometry(section: HTMLElement, banner: HTMLElement, nodes: HTMLElement[]) {
  const top = section.getBoundingClientRect().top;
  const place = (el: HTMLElement) => ({
    top: Math.round(el.getBoundingClientRect().top - top),
    width: el.offsetWidth,
    height: el.offsetHeight,
  });
  return {
    section: { width: section.offsetWidth, height: section.offsetHeight },
    banner: place(banner),
    nodes: nodes.map(place),
  };
}

async function expectSkeletonMatchesUnit(
  canvas: ReturnType<typeof within>,
  expected: { node: number; pitch: number; banner: number },
) {
  const skeleton = canvas.getByRole('status').parentElement as HTMLElement;
  const unit = canvas.getByRole('group');
  const skeletonShapes = Array.from(skeleton.querySelectorAll<HTMLElement>('[aria-hidden="true"]'));
  const skeletonBanner = skeletonShapes[0] as HTMLElement;
  const skeletonNodes = Array.from(skeleton.querySelectorAll<HTMLElement>('[style*="--path-node-offset"]'));
  const unitBanner = canvas.getByRole('heading', { level: 2 }).parentElement as HTMLElement;
  const unitNodes = canvas.getAllByRole('button');

  const s = geometry(skeleton, skeletonBanner, skeletonNodes);
  const u = geometry(unit, unitBanner, unitNodes);

  // Exactly the real sizes, so the ready state replaces the skeleton without a shift.
  await expect(s.banner.height).toBe(expected.banner);
  await expect(s.nodes.map((n) => n.height)).toEqual(Array(5).fill(expected.node));
  await expect(s.nodes.map((n) => n.width)).toEqual(Array(5).fill(expected.node));
  await expect(s.nodes[1] && s.nodes[0] ? s.nodes[1].top - s.nodes[0].top : 0).toBe(expected.pitch);
  await expect(s).toEqual(u);
  // Same horizontal winding too.
  const xs = (els: HTMLElement[]) => els.map((el) => Math.round(el.getBoundingClientRect().x));
  await expect(xs(skeletonNodes)).toEqual(xs(unitNodes));
}

export const MatchesUnitWide: Story = {
  parameters: { layout: 'fullscreen', viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'wide', isRotated: false } },
  render: () => <SkeletonAndUnit />,
  play: async ({ canvas }) => {
    await expect(window.innerWidth).toBeGreaterThanOrEqual(1280);
    await expectSkeletonMatchesUnit(canvas, { node: 72, pitch: 96, banner: 80 });
  },
};

export const MatchesUnitPhone: Story = {
  parameters: { layout: 'fullscreen', viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => <SkeletonAndUnit />,
  play: async ({ canvas }) => {
    await expect(window.innerWidth).toBe(390);
    await expectSkeletonMatchesUnit(canvas, { node: 64, pitch: 88, banner: 72 });
  },
};

export const WithReducedMotion: Story = {
  play: async ({ canvas, canvasElement }) => {
    // Media emulation needs the Vitest browser runner; the plain Storybook UI
    // has none (a top-level import would break the page).
    const runner = await import('vitest/browser').catch(() => null);
    if (!runner) {
      console.warn('WithReducedMotion: no Vitest browser runner, motion check skipped.');
      return;
    }
    const session = runner.cdp();
    await session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    try {
      await expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
      const shapes = Array.from(canvasElement.querySelectorAll<HTMLElement>('[aria-hidden="true"] *, [aria-hidden="true"]')).filter(
        (el) => getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)',
      );
      await expect(shapes).toHaveLength(6);
      for (const shape of shapes) {
        await expect(getComputedStyle(shape).animationName).toBe('none');
      }
      // Still a placeholder, and still announced.
      await expect(canvas.getByRole('status')).toHaveTextContent('Loading your lessons');
    } finally {
      await session.send('Emulation.setEmulatedMedia', { features: [] });
    }
  },
};

export const StatusIsFocusTarget: Story = {
  args: { statusRef: fn() },
  play: async ({ canvas, args }) => {
    const status = canvas.getByRole('status');
    // Focusable by script without joining the tab order, and exposed through `statusRef`.
    await expect(status).toHaveAttribute('tabindex', '-1');
    await expect(args.statusRef).toHaveBeenCalledWith(status);
    status.focus();
    await expect(status).toHaveFocus();
    // Busy semantics stay on the container.
    await expect(status.parentElement).toHaveAttribute('aria-busy', 'true');
  },
};

export const RestPropsKeepA11y: Story = {
  args: {
    // Forced past the types on purpose: rest props must not replace aria-busy.
    ...({ 'aria-busy': 'false' } as object),
    id: 'path-loading',
  },
  play: async ({ canvas }) => {
    const root = canvas.getByRole('status').parentElement as HTMLElement;
    await expect(root).toHaveAttribute('aria-busy', 'true');
    await expect(root).toHaveAttribute('id', 'path-loading');
  },
};
