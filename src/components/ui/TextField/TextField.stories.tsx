import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { Button } from '@/components/ui/Button';
import { TextField } from './TextField';

const meta = {
  title: 'UI/TextField',
  component: TextField,
  args: {
    label: 'Email',
    type: 'email',
    autoComplete: 'email',
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '24rem', maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

const reducedMotion = '(prefers-reduced-motion: reduce)';

/** Resolves a colour token to the computed rgb string the browser reports for borders. */
function resolveToken(name: string): string {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  document.body.append(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

function fieldOf(input: HTMLElement): HTMLElement {
  const field = input.parentElement;
  if (!field) throw new Error('field wrapper missing');
  return field;
}

export const Default: Story = {
  args: { ref: fn(), placeholder: 'name@example.com' },
  play: async ({ canvas, args }) => {
    // The label is tied to the input, so the label text is its accessible name.
    const input = canvas.getByLabelText('Email');
    await expect(input).toBe(canvas.getByRole('textbox', { name: 'Email' }));
    await expect(args.ref).toHaveBeenCalledWith(input);
    await expect(input).not.toHaveAttribute('aria-invalid');
    await expect(input).not.toHaveAttribute('aria-describedby');
    // Clicking the label focuses the input.
    await userEvent.click(canvas.getByText('Email'));
    await expect(input).toHaveFocus();
    await userEvent.keyboard('ada@example.com');
    await expect(input).toHaveValue('ada@example.com');
    await expect(args.onChange).toHaveBeenCalled();
    // The live region is mounted before any message, so a later message is announced.
    await expect(canvas.getByRole('status')).toBeEmptyDOMElement();
    await expect(getComputedStyle(fieldOf(input)).borderColor).toBe(resolveToken('--color-border'));
  },
};

export const Filled: Story = {
  args: { defaultValue: 'ada@example.com' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Email' })).toHaveValue('ada@example.com');
    await expect(canvas.getByRole('status')).toBeEmptyDOMElement();
  },
};

export const WithHint: Story = {
  args: { hint: 'We never share your email.' },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Email' });
    const hint = canvas.getByText('We never share your email.');
    await expect(input).toHaveAccessibleDescription('We never share your email.');
    await expect(input.getAttribute('aria-describedby')).toBe(hint.id);
  },
};

export const Invalid: Story = {
  args: { error: 'Invalid email address', defaultValue: 'ada@' },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Email' });
    const status = canvas.getByRole('status');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(status).toHaveTextContent('Invalid email address');
    // The message is linked to the input and is the live region itself.
    await expect(input.getAttribute('aria-describedby')).toBe(status.id);
    await expect(input).toHaveAccessibleDescription('Invalid email address');
    // The outline uses the danger token...
    await expect(getComputedStyle(fieldOf(input)).borderColor).toBe(resolveToken('--color-danger'));
    // ...and is never the only signal: the alert icon and the text are present too.
    await expect(status.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    await expect(getComputedStyle(status.querySelector('svg') ?? status).display).not.toBe('none');
    // Visible once the short fade has finished.
    await waitFor(() => expect(canvas.getByText('Invalid email address')).toBeVisible());
  },
};

export const InvalidWithHint: Story = {
  args: { error: 'Password too short', hint: 'At least 8 characters.', type: 'password' },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Email');
    const hint = canvas.getByText('At least 8 characters.');
    const status = canvas.getByRole('status');
    await expect(input.getAttribute('aria-describedby')).toBe(`${hint.id} ${status.id}`);
    await expect(input).toHaveAccessibleDescription('At least 8 characters. Password too short');
  },
};

export const ReadOnly: Story = {
  args: { defaultValue: 'ada@example.com', readOnly: true },
  play: async ({ canvas, args }) => {
    const input = canvas.getByRole('textbox', { name: 'Email' });
    await expect(input).toHaveAttribute('readonly');
    // Still focusable and tabbable, but the value cannot be edited.
    await userEvent.tab();
    await expect(input).toHaveFocus();
    await userEvent.keyboard('more');
    await expect(input).toHaveValue('ada@example.com');
    await expect(args.onChange).not.toHaveBeenCalled();
    // Distinguished by more than colour: a dashed edge.
    await expect(getComputedStyle(fieldOf(input)).borderStyle).toBe('dashed');
  },
};

export const Disabled: Story = {
  args: { defaultValue: 'ada@example.com', disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Email' })).toBeDisabled();
  },
};

export const WithAdornment: Story = {
  args: {
    label: 'Password',
    type: 'password',
    autoComplete: 'current-password',
    endAdornment: (
      <Button variant="secondary" size="sm" onClick={fn()}>
        Forgot?
      </Button>
    ),
  },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Password');
    const forgot = canvas.getByRole('button', { name: 'Forgot?' });
    // The slot sits inside the field box, after the input.
    await expect(fieldOf(input)).toContainElement(forgot);
    await expect(input.compareDocumentPosition(forgot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Tab order: input, then the adornment.
    await userEvent.tab();
    await expect(input).toHaveFocus();
    await userEvent.tab();
    await expect(forgot).toHaveFocus();
  },
};

export const AdornmentWithError: Story = {
  args: {
    label: 'Password',
    type: 'password',
    error: 'Password too short',
    endAdornment: (
      <Button variant="secondary" size="sm">
        Forgot?
      </Button>
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByRole('button', { name: 'Forgot?' })).toBeVisible();
    await expect(canvas.getByRole('status')).toHaveTextContent('Password too short');
  },
};

export const KeepsCallerDescribedBy: Story = {
  args: {
    error: 'Invalid email address',
    hint: 'Use your school email.',
    'aria-describedby': 'caller-note',
    // Untyped bag: the types allow aria-invalid, but it must not beat the derived state.
    ...({ 'aria-invalid': 'false' } as object),
  },
  render: (args) => (
    <>
      <TextField {...args} />
      <p id="caller-note">Caller note</p>
    </>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Email' });
    const ids = (input.getAttribute('aria-describedby') ?? '').split(' ');
    // The caller's id is merged first, then the hint and the message.
    await expect(ids).toHaveLength(3);
    await expect(ids[0]).toBe('caller-note');
    await expect(input).toHaveAccessibleDescription(
      'Caller note Use your school email. Invalid email address',
    );
    // A caller-provided aria-invalid cannot override the derived state.
    await expect(input).toHaveAttribute('aria-invalid', 'true');
  },
};

export const NoErrorIgnoresCallerInvalid: Story = {
  args: {
    // Untyped bag: without an error, the field is valid whatever the caller passes.
    ...({ 'aria-invalid': 'true' } as object),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Email' })).not.toHaveAttribute('aria-invalid');
  },
};

export const MessageFadesIn: Story = {
  args: { error: 'Invalid email address' },
  play: async ({ canvas }) => {
    const message = canvas.getByText('Invalid email address').parentElement;
    if (!message) throw new Error('message missing');
    // Unless motion is reduced on this machine, the message fades in and the outline eases.
    const reduced = matchMedia(reducedMotion).matches;
    const field = fieldOf(canvas.getByRole('textbox', { name: 'Email' }));
    if (reduced) {
      await expect(getComputedStyle(message).animationName).toBe('none');
      await waitFor(() => expect(getComputedStyle(field).transitionProperty).toBe('none'));
    } else {
      await expect(getComputedStyle(message).animationName).toContain('fade');
      await waitFor(() => expect(getComputedStyle(field).transitionProperty).toContain('border-color'));
    }
  },
};

export const ReducedMotion: Story = {
  args: { error: 'Invalid email address' },
  play: async ({ canvas }) => {
    // Chromatic renders in its own browser: no Vitest runner, no window resize, no real focus.
    // The check job runs this interaction test; Chromatic only takes the snapshot.
    if (navigator.userAgent.includes('Chromatic')) return;
    // Media emulation needs the Vitest browser runner. Without it this story cannot assert
    // anything, so it fails loudly instead of passing without checking.
    const runner = await import('vitest/browser').catch(() => null);
    if (!runner) {
      throw new Error('ReducedMotion needs the Vitest browser runner (npm run test:storybook).');
    }
    const session = runner.cdp();
    const message = canvas.getByText('Invalid email address').parentElement;
    if (!message) throw new Error('message missing');
    const field = fieldOf(canvas.getByRole('textbox', { name: 'Email' }));
    // Discriminating: with motion allowed the same elements do animate.
    await session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
    });
    try {
      await waitFor(() => expect(matchMedia(reducedMotion).matches).toBe(false));
      await expect(getComputedStyle(message).animationName).toContain('fade');
      await waitFor(() => expect(getComputedStyle(field).transitionProperty).toContain('border-color'));
      await expect(getComputedStyle(field).transitionDuration).not.toBe('0s');

      await session.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      });
      await waitFor(() => expect(matchMedia(reducedMotion).matches).toBe(true));
      await expect(getComputedStyle(message).animationName).toBe('none');
      await waitFor(() => expect(getComputedStyle(field).transitionProperty).toBe('none'));
    } finally {
      await session.send('Emulation.setEmulatedMedia', { features: [] });
    }
  },
};

export const LongText: Story = {
  args: {
    label: 'A very long label that should wrap instead of overflowing the field container at all',
    error:
      'Averyveryverylongunbrokenerrormessagethatshouldwrapinsteadofoverflowing and more words to fill several lines of the message.',
    defaultValue: 'averyveryverylongvaluewithoutanyspacesthatshouldscrollinsidetheinputandnotoverflowthefield',
    endAdornment: (
      <Button variant="secondary" size="sm">
        Forgot?
      </Button>
    ),
  },
  play: async ({ canvas, canvasElement }) => {
    const input = canvas.getByRole('textbox');
    const field = fieldOf(input);
    await expect(field.scrollWidth).toBeLessThanOrEqual(field.clientWidth);
    await expect(canvas.getByRole('button', { name: 'Forgot?' })).toBeVisible();
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
