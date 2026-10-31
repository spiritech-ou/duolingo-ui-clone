# Login

Decisions marked (OQ-nn) are listed in `open-questions.md`. Layout reference: `reference/01-login.png`, `reference/02-login-validation-errors.png` (layout and error copy only, no Duolingo branding).

## Purpose
Let a user enter a mock email and password and reach the app. Any valid-looking credentials are accepted; there is no real authentication.

## Entry points and routes
Route: `/login`. Arrived at from any guarded route when there is no session (`from` remembered), and after log out. Success goes to `from` if allowed, else `/onboarding/level` for a user who has not onboarded, else `/learn` (see `app-shell-and-routing.md`).

## States
| State | Trigger | What the user sees | What the user can do | Exit |
|---|---|---|---|---|
| Pristine | Arrive on `/login` | Flame mascot, heading "Log in", empty "Email" and "Password" fields, "Forgot?" inside the password field, enabled "LOG IN" button, "OR" divider, three social buttons | Type, submit, press a social button or "Forgot?" | Any below |
| Typing | User edits a field | Field shows the typed value; no error is shown until the field is touched (blurred) | Keep typing, submit | Blur, submit |
| Field invalid | Field blurred while invalid, or submit with invalid values | The invalid field outlined with the danger token, with an icon and its message under it; both fields can show at once | Correct the field | Field becomes valid (message clears on change once valid) |
| Submit blocked | Submit with at least one invalid field | All invalid fields show messages; focus moves to the first invalid field; no request is sent | Fix fields | Valid submit |
| Submitting | Valid submit | "LOG IN" shows a spinner and is disabled, fields are read-only, social buttons disabled | Nothing | Success or failure |
| Wrong credentials | Endpoint returns 401 | Banner above the form "Incorrect email or password." (`role="alert"`); both fields kept as typed; focus to the banner | Edit and resubmit | Resubmit |
| Request failed | Network failure, timeout (10 s) or 5xx | Banner "We couldn't log you in. Check your connection and try again."; fields kept | Resubmit | Resubmit |
| Success | Endpoint returns 200 | Button stays in busy state until the route changes | Nothing | Redirect |
| Inert control pressed | Social button or "Forgot?" activated | Message under the controls "Not available in this prototype." (`role="status"`); nothing else changes | Continue | Message clears on the next submit or after any field edit |
| Already signed in | Session exists on arrival | Nothing; redirected before first paint | Nothing | Redirect |

Loading, error and empty behaviour: login fetches nothing on arrival, so it has no loading or empty state. Its only request is the submit above.

Validation rules (zod, `react-hook-form`, mode `onTouched`: validate on first blur, then on every change; submit always validates all):
- Email: must be a syntactically valid email address. Empty counts as invalid.
- Password: at least 8 characters. Empty counts as too short (OQ-02).
- The "LOG IN" button is never disabled by validity; pressing it surfaces the errors, as in the reference (OQ-03).

## Copy
- Heading: "Log in".
- Field labels / placeholders: "Email", "Password" (OQ-01).
- Password helper link: "Forgot?".
- Field errors: "Invalid email address", "Password too short" (from the brief).
- Primary button: "LOG IN"; busy: "LOG IN" with a spinner and an accessible name "Logging in".
- Divider: "OR".
- Social buttons: "SIGN IN WITH GOOGLE", "SIGN IN WITH FACEBOOK", "SIGN IN WITH APPLE" (text only, no third-party logos).
- Inert message: "Not available in this prototype."
- Banners: "Incorrect email or password.", "We couldn't log you in. Check your connection and try again."
- Not shown (OQ-05): "Sign up" button, close button, terms and reCAPTCHA lines.

## Motion and sound
Field outline and message appear with a short fade (`--duration-*`, fast). Banner appears without motion. Reduced motion: no fade. No sound.

## Data needed
- `POST /api/auth/login`
  - Request: `{ "email": string, "password": string }`.
  - 200: `{ "token": string, "user": { "id": string, "email": string, "displayName": string } }`.
  - 401: `{ "code": "invalid_credentials", "message": string }`.
  - 5xx: `{ "code": "server_error", "message": string }`.
  - Mock rule (OQ-04): any valid email and password of 8+ characters returns 200, with `user.id` the lower-cased email and `displayName` the part before `@`; emails ending in `@fail.test` return 401; emails ending in `@error.test` return 500. This makes both error states reachable in the app and in e2e tests.
- Client-only: form values (kept in the form, not in a store; never persisted); the resulting `session` (see `app-shell-and-routing.md`). The password is never stored.

## Accessibility notes
- Real `form`, `label`s tied to inputs (`type="email"` with `autocomplete="email"`, `type="password"` with `autocomplete="current-password"`).
- Tab order: email, password, "Forgot?", LOG IN, Google, Facebook, Apple. Enter in either field submits.
- Each message is linked with `aria-describedby`, the input gets `aria-invalid="true"`; messages are announced by `role="status"`; the 401/failed banner uses `role="alert"`.
- The danger outline is never the only signal: the icon and text message are always present.
- The busy button sets `aria-busy="true"` and stays focusable.
- Contrast of the danger text and outline meets WCAG AA in both themes.

## Out of scope
Real authentication, sign-up, password reset, real social sign-in, "remember me", showing/hiding the password, rate limiting, reCAPTCHA, terms and privacy pages.

## Boards
Pending (Penpot not connected).
