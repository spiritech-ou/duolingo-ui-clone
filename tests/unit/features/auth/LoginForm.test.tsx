import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  INERT_MESSAGE,
  LoginForm,
  REQUEST_FAILED_MESSAGE,
} from '@/features/auth/forms/LoginForm';
import type { LoginFormValues } from '@/features/auth/forms/LoginForm.schema';

const VALID = { email: 'ann@example.com', password: 'longenough' };
const SOCIAL_NAMES = ['SIGN IN WITH GOOGLE', 'SIGN IN WITH FACEBOOK', 'SIGN IN WITH APPLE'];

function deferred() {
  let resolve: () => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup(onSubmit = vi.fn<(values: LoginFormValues) => Promise<void>>(() => Promise.resolve())) {
  const user = userEvent.setup();
  render(<LoginForm onSubmit={onSubmit} />);
  return {
    user,
    onSubmit,
    email: screen.getByLabelText('Email'),
    password: screen.getByLabelText('Password'),
    logIn: () => screen.getByRole('button', { name: 'LOG IN' }),
  };
}

describe('LoginForm pristine', () => {
  it('renders the heading, labelled fields with autocomplete, Forgot? inside the password field and the social buttons', () => {
    const { email, password } = setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Log in' })).toBeInTheDocument();
    expect(email).toHaveAttribute('type', 'email');
    expect(email).toHaveAttribute('autocomplete', 'email');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    const passwordField = password.closest('div');
    expect(passwordField).not.toBeNull();
    if (passwordField) {
      expect(within(passwordField).getByRole('button', { name: 'Forgot?' })).toBeInTheDocument();
      expect(within(passwordField).getByLabelText('Password')).toBe(password);
    }
    expect(screen.getByRole('button', { name: 'LOG IN' })).toBeEnabled();
    expect(screen.getByText('OR')).toBeInTheDocument();
    for (const name of SOCIAL_NAMES) expect(screen.getByRole('button', { name })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /sign up/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(email).not.toHaveAttribute('aria-invalid');
  });

  it('tabs through email, password, Forgot?, LOG IN, then the social buttons', async () => {
    const { user } = setup();
    await user.tab();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Password')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Forgot?' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'LOG IN' })).toHaveFocus();
    for (const name of SOCIAL_NAMES) {
      await user.tab();
      expect(screen.getByRole('button', { name })).toHaveFocus();
    }
  });

  it('keeps LOG IN enabled on empty values and uses defaultValues when given', () => {
    render(<LoginForm onSubmit={vi.fn(() => Promise.resolve())} defaultValues={{ email: 'x@y.co' }} />);
    expect(screen.getByLabelText('Email')).toHaveValue('x@y.co');
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'LOG IN' })).toBeEnabled();
  });
});

describe('LoginForm validation messages', () => {
  it('shows both messages on an empty submit, links them to the inputs and sends nothing', async () => {
    const { user, onSubmit, email, password, logIn } = setup();
    await user.click(logIn());
    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
    expect(screen.getByText('Password too short')).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Invalid email address');
    expect(password).toHaveAccessibleDescription('Password too short');
    expect(onSubmit).toHaveBeenCalledTimes(0);
  });

  it('rejects a malformed email with the email message only', async () => {
    const { user, onSubmit, email, password, logIn } = setup();
    await user.type(email, 'not-an-email');
    await user.type(password, VALID.password);
    await user.click(logIn());
    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
    expect(screen.queryByText('Password too short')).not.toBeInTheDocument();
    expect(password).not.toHaveAttribute('aria-invalid');
    expect(onSubmit).toHaveBeenCalledTimes(0);
  });

  it('rejects a 7-character password and accepts exactly 8', async () => {
    const { user, onSubmit, email, password, logIn } = setup();
    await user.type(email, VALID.email);
    await user.type(password, '1234567');
    await user.click(logIn());
    expect(await screen.findByText('Password too short')).toBeInTheDocument();
    expect(screen.queryByText('Invalid email address')).not.toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(0);

    await user.type(password, '8');
    await waitFor(() => expect(screen.queryByText('Password too short')).not.toBeInTheDocument());
    await user.click(logIn());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ email: VALID.email, password: '12345678' });
  });

  it('submits valid values once with exactly the typed values, and Enter in a field submits', async () => {
    const { user, onSubmit, email, password } = setup();
    await user.type(email, VALID.email);
    await user.type(password, `${VALID.password}{Enter}`);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual(VALID);
  });
});

describe('LoginForm mode onTouched', () => {
  it('shows no error while typing before the first blur', async () => {
    const { user, email } = setup();
    await user.type(email, 'bad');
    expect(screen.queryByText('Invalid email address')).not.toBeInTheDocument();
    expect(email).not.toHaveAttribute('aria-invalid');
  });

  it('validates on the first blur, then on every change, clearing once valid', async () => {
    const { user, email, password } = setup();
    await user.type(email, 'bad');
    await user.tab();
    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
    // The untouched password field stays quiet.
    expect(screen.queryByText('Password too short')).not.toBeInTheDocument();
    expect(password).toHaveFocus();

    await user.click(email);
    await user.clear(email);
    await user.type(email, VALID.email);
    await waitFor(() => expect(screen.queryByText('Invalid email address')).not.toBeInTheDocument());
    expect(email).not.toHaveAttribute('aria-invalid');

    // Touched now: an invalid edit shows its message immediately, without another blur.
    await user.type(email, '{Backspace}'.repeat(VALID.email.length));
    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
  });

  it('shows the password message after blurring an empty password', async () => {
    const { user, password } = setup();
    await user.click(password);
    await user.tab();
    expect(await screen.findByText('Password too short')).toBeInTheDocument();
  });
});

describe('LoginForm blocked submit', () => {
  it('focuses the email field when both are invalid', async () => {
    const { user, email, logIn } = setup();
    await user.click(logIn());
    await waitFor(() => expect(email).toHaveFocus());
  });

  it('focuses the password field when only it is invalid', async () => {
    const { user, onSubmit, email, password, logIn } = setup();
    await user.type(email, VALID.email);
    await user.type(password, 'short');
    await user.click(logIn());
    await waitFor(() => expect(password).toHaveFocus());
    expect(onSubmit).toHaveBeenCalledTimes(0);
  });
});

describe('LoginForm busy state', () => {
  it('shows the spinner button as "Logging in", makes fields read-only and disables social buttons', async () => {
    const pending = deferred();
    const { user, onSubmit, email, password } = setup(vi.fn(() => pending.promise));
    await user.type(email, VALID.email);
    await user.type(password, VALID.password);
    await user.click(screen.getByRole('button', { name: 'LOG IN' }));

    const busy = await screen.findByRole('button', { name: 'Logging in' });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).toBeDisabled();
    expect(email).toHaveAttribute('readonly');
    expect(password).toHaveAttribute('readonly');
    for (const name of SOCIAL_NAMES) expect(screen.getByRole('button', { name })).toBeDisabled();

    // Read-only fields ignore typing; a second submit attempt sends nothing more.
    await user.type(email, 'zzz');
    expect(email).toHaveValue(VALID.email);
    await user.type(password, '{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
    // Success keeps the button busy until the route changes.
    expect(screen.getByRole('button', { name: 'Logging in' })).toHaveAttribute('aria-busy', 'true');
    expect(email).toHaveAttribute('readonly');
    expect(password).toHaveAttribute('readonly');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('ignores a second submit event while busy, both in flight and after success', async () => {
    const pending = deferred();
    const { user, onSubmit, email, password } = setup(vi.fn(() => pending.promise));
    await user.type(email, VALID.email);
    await user.type(password, VALID.password);
    await user.click(screen.getByRole('button', { name: 'LOG IN' }));
    const busy = await screen.findByRole('button', { name: 'Logging in' });
    const form = screen.getByRole('form', { name: 'Log in' });

    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(busy).toHaveAttribute('aria-busy', 'true');
  });
});

describe('LoginForm server error', () => {
  it('shows the rejection message in an alert banner, focuses it, keeps values and re-enables the form', async () => {
    const onSubmit = vi.fn<(values: LoginFormValues) => Promise<void>>(() =>
      Promise.reject(new Error('Incorrect email or password.')),
    );
    const { user, email, password } = setup(onSubmit);
    await user.type(email, VALID.email);
    await user.type(password, VALID.password);
    await user.click(screen.getByRole('button', { name: 'LOG IN' }));

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Incorrect email or password.');
    await waitFor(() => expect(banner.parentElement).toHaveFocus());
    expect(email).toHaveValue(VALID.email);
    expect(password).toHaveValue(VALID.password);
    expect(email).not.toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'LOG IN' })).toBeEnabled();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('falls back to the request-failed copy for a rejection without a message, and refocuses the banner on resubmit', async () => {
    const onSubmit = vi.fn<(values: LoginFormValues) => Promise<void>>(() => Promise.reject(new Error('')));
    const { user, email, password } = setup(onSubmit);
    await user.type(email, VALID.email);
    await user.type(password, VALID.password);
    await user.click(screen.getByRole('button', { name: 'LOG IN' }));
    const first = await screen.findByRole('alert');
    expect(first).toHaveTextContent(REQUEST_FAILED_MESSAGE);
    await waitFor(() => expect(first.parentElement).toHaveFocus());

    await user.click(screen.getByRole('button', { name: 'LOG IN' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    const second = await screen.findByRole('alert');
    await waitFor(() => expect(second.parentElement).toHaveFocus());
  });

  it('shows the request-failed copy for a non-Error rejection', async () => {
    const onSubmit = vi.fn<(values: LoginFormValues) => Promise<void>>(() =>
      Promise.reject('boom'),
    );
    const { user, email, password } = setup(onSubmit);
    await user.type(email, VALID.email);
    await user.type(password, VALID.password);
    await user.click(screen.getByRole('button', { name: 'LOG IN' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(REQUEST_FAILED_MESSAGE);
    expect(screen.queryByText('boom')).not.toBeInTheDocument();
  });

  it('clears the banner when the next submit succeeds', async () => {
    const onSubmit = vi
      .fn<(values: LoginFormValues) => Promise<void>>()
      .mockRejectedValueOnce(new Error('Incorrect email or password.'))
      .mockResolvedValueOnce(undefined);
    const { user, email, password } = setup(onSubmit);
    await user.type(email, VALID.email);
    await user.type(password, VALID.password);
    await user.click(screen.getByRole('button', { name: 'LOG IN' }));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'LOG IN' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});

describe('LoginForm inert controls', () => {
  it.each([...SOCIAL_NAMES, 'Forgot?'])('shows the polite info message when "%s" is pressed, and submits nothing', async (name) => {
    const { user, onSubmit } = setup();
    expect(screen.queryByText(INERT_MESSAGE)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name }));
    const message = screen.getByText(INERT_MESSAGE);
    expect(message.closest('[role="status"]')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getAllByText(INERT_MESSAGE)).toHaveLength(1);
    expect(onSubmit).toHaveBeenCalledTimes(0);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears the message on any field edit', async () => {
    const { user, email, password } = setup();
    await user.click(screen.getByRole('button', { name: 'Forgot?' }));
    expect(screen.getByText(INERT_MESSAGE)).toBeInTheDocument();
    await user.type(password, 'a');
    expect(screen.queryByText(INERT_MESSAGE)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'SIGN IN WITH APPLE' }));
    expect(screen.getByText(INERT_MESSAGE)).toBeInTheDocument();
    await user.type(email, 'a');
    expect(screen.queryByText(INERT_MESSAGE)).not.toBeInTheDocument();
  });

  it('clears the message on the next submit, even a blocked one', async () => {
    const { user, onSubmit, logIn } = setup();
    await user.click(screen.getByRole('button', { name: 'SIGN IN WITH GOOGLE' }));
    expect(screen.getByText(INERT_MESSAGE)).toBeInTheDocument();
    await user.click(logIn());
    await waitFor(() => expect(screen.queryByText(INERT_MESSAGE)).not.toBeInTheDocument());
    expect(onSubmit).toHaveBeenCalledTimes(0);
  });
});
