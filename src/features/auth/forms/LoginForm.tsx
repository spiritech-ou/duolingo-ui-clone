import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, Ref } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Divider';
import { Mascot } from '@/components/ui/Mascot';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { loginFormSchema } from './LoginForm.schema';
import type { LoginFormValues } from './LoginForm.schema';
import styles from './LoginForm.module.scss';

export const INERT_MESSAGE = 'Not available in this prototype.';
export const REQUEST_FAILED_MESSAGE =
  "We couldn't log you in. Check your connection and try again.";

const SOCIAL_LABELS = ['SIGN IN WITH GOOGLE', 'SIGN IN WITH FACEBOOK', 'SIGN IN WITH APPLE'] as const;

export interface LoginFormProps {
  /**
   * Called with the validated values. A rejection becomes the server error
   * banner: the error's message is shown, or the request-failed copy when it has none.
   */
  onSubmit: (values: LoginFormValues) => Promise<void>;
  defaultValues?: Partial<LoginFormValues>;
  /** Ref to the "Log in" heading, so the page can focus it on arrival. */
  titleRef?: Ref<HTMLHeadingElement>;
}

export function LoginForm({ onSubmit, defaultValues, titleRef }: LoginFormProps) {
  const headingId = useId();
  const bannerRef = useRef<HTMLDivElement>(null);
  const [isInertMessageShown, setIsInertMessageShown] = useState(false);
  // Success keeps the button busy until the route changes (docs/product/login.md).
  const [hasSucceeded, setHasSucceeded] = useState(false);
  const [failureCount, setFailureCount] = useState(0);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '', ...defaultValues },
  });

  const serverMessage = errors.root?.server?.message;
  const isBusy = isSubmitting || hasSucceeded;

  // Focus moves to the banner on every failed submit, even when the message repeats.
  useEffect(() => {
    if (failureCount > 0) bannerRef.current?.focus();
  }, [failureCount]);

  const hideInertMessage = () => setIsInertMessageShown(false);

  const submit = handleSubmit(async (values) => {
    clearErrors('root.server');
    try {
      await onSubmit(values);
      setHasSucceeded(true);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : REQUEST_FAILED_MESSAGE;
      setError('root.server', { type: 'server', message });
      setFailureCount((count) => count + 1);
    }
  });

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (isBusy) {
      event.preventDefault();
      return;
    }
    hideInertMessage();
    void submit(event);
  };

  return (
    <div className={styles['root']}>
      <header className={styles['header']}>
        <Mascot size={96} />
        <h1 ref={titleRef} id={headingId} tabIndex={-1} className={styles['heading']}>
          Log in
        </h1>
      </header>
      {serverMessage ? (
        <div ref={bannerRef} tabIndex={-1} className={styles['banner']}>
          <Notice variant="error" role="alert">
            {serverMessage}
          </Notice>
        </div>
      ) : null}
      <form
        className={styles['form']}
        aria-labelledby={headingId}
        noValidate
        onSubmit={handleFormSubmit}>
        <div className={styles['fields']}>
          <TextField
            label="Email"
            placeholder="Email"
            type="email"
            autoComplete="email"
            readOnly={isBusy}
            {...(errors.email?.message ? { error: errors.email.message } : {})}
            {...register('email', { onChange: hideInertMessage })}
          />
          <TextField
            label="Password"
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            readOnly={isBusy}
            {...(errors.password?.message ? { error: errors.password.message } : {})}
            endAdornment={
              <Button
                variant="secondary"
                size="sm"
                className={styles['forgot']}
                onClick={() => setIsInertMessageShown(true)}>
                Forgot?
              </Button>
            }
            {...register('password', { onChange: hideInertMessage })}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className={styles['submit']}
          isLoading={isBusy}
          {...(isBusy ? { 'aria-label': 'Logging in' } : {})}
        >
          LOG IN
        </Button>
        <div className={styles['divider']}>
          <Divider label="OR" />
        </div>
        <div className={styles['social']}>
          {SOCIAL_LABELS.map((label) => (
            <Button
              key={label}
              variant="secondary"
              size="lg"
              isDisabled={isBusy}
              onClick={() => setIsInertMessageShown(true)}
            >
              {label}
            </Button>
          ))}
        </div>
        {isInertMessageShown ? (
          <div className={styles['message']}>
            <Notice variant="info" role="status">
              {INERT_MESSAGE}
            </Notice>
          </div>
        ) : null}
      </form>
    </div>
  );
}
