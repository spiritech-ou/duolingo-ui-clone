# App shell and routing

Decisions marked (OQ-nn) are listed in `open-questions.md` and need the product owner's approval.

## Purpose
Define which screen the user lands on, which routes exist, and the guards that send a user to login or onboarding first, so the feature specs can assume a consistent entry order: log in, onboard once, then learn.

## Entry points and routes
| Route | Screen | Spec |
|---|---|---|
| `/` | Redirects to `/learn` (the guards below then apply) | this file |
| `/login` | Login | `login.md` |
| `/onboarding/level` | Onboarding step 1, level | `onboarding.md` |
| `/onboarding/start` | Onboarding step 2, start choice | `onboarding.md` |
| `/learn` | Learning path | `learning-path.md` |
| `/lesson/:lessonId` | Exercise session for a lesson | `exercise-session.md` |
| `/practice` | Exercise session in practice mode (earn a heart) | `exercise-session.md` |
| `*` | "Page not found" (already in the shell) | this file |

Route guards, evaluated in this order on every navigation:
1. No session and route is not `/login`: redirect to `/login`, remembering the requested path as `from`.
2. Session and route is `/login`: redirect to `/learn` (which may then redirect to onboarding).
3. Session, onboarding not completed, route is not under `/onboarding`: redirect to `/onboarding/level`.
4. Session, onboarding completed, route is under `/onboarding`: redirect to `/learn`.
5. `/onboarding/start` without a chosen level in the profile: redirect to `/onboarding/level`.

There is no lesson guard: once signed in and onboarded, every `/lesson/:lessonId` whose id exists in the course opens, whatever the user's progress (OQ-15). An unknown id shows the "not found" state on the lesson route, not a redirect (OQ-33).

Log in lands on `from` when it is an app route the guards allow, otherwise on the guard's destination.

## States
| State | Trigger | What the user sees | What the user can do | Exit |
|---|---|---|---|---|
| Signed out | No stored session | `/login` | Log in | Successful login |
| Signed in, not onboarded | Session exists, onboarding flag false | `/onboarding/level` | Complete onboarding | Onboarding completed |
| Signed in, onboarded | Both true | `/learn` and the lesson routes, all lessons open | Learn, log out | Log out |
| Page not found | Unknown URL | Heading "Page not found", link "Back to home" (existing shell screen) | Follow the link | Link goes to `/` |
| Unexpected route error | A route throws | Heading "Something went wrong", the error message, link "Back to home" (existing shell screen, `role="alert"`) | Follow the link | Link goes to `/` |
| Log out | "Log out" pressed in the path header | `/login` with empty fields | Log in again | Login |

Header rule: the app header (flame mark, product name, theme toggle) shows only on `/login` and `/learn`. `/onboarding/*`, `/lesson/:lessonId` and `/practice` are focused full-screen views with no app header (OQ-34).

## Copy
- Product name used in copy: "Spiritech" (OQ-06).
- Not found: "Page not found", "Back to home".
- Route error: "Something went wrong", "Back to home".
- Log out button: "Log out".

## Layout
No screenshot shows the shell itself (the references are Duolingo screens with their own chrome), so these values are derived from the screens it hosts and from the reference proportions (see OQ-44); the "Page not found" and "Something went wrong" screens are not in the references at all.

Shell rule: the shell is a full-width page (background, header, bottom action areas stretch to the window) holding a **single centred column per screen**; no screen content spans the whole window. Column maximum widths by screen:

| Screen | Column max width | Source |
|---|---|---|
| `/login` | about 500px | `01-login.png` |
| `/onboarding/*` | about 640px (mascot row hangs left of it on desktop) | `03` to `05` |
| `/learn` | about 640px (derived, see `learning-path.md`) | derived |
| `/lesson/:lessonId`, `/practice` | top bar about 1320px, question and cards about 790px | `06` to `08` |
| Not found, route error, state screens | about 480px, content centred | derived |

- App header (shown only on `/login` and `/learn`, OQ-34): full width, a content row of the same horizontal extent as the widest column in use, with 24px side padding on desktop and tablet and 16px on mobile; flame mark and product name left, theme toggle (and "Log out" on `/learn`) right; height about 64px (derived). It does not scale the column; it only spans the window.
- Desktop (1280 and wider): shell stretches; every column stays at its own maximum and is centred; extra width becomes side margin.
- Tablet (about 768 to 1279): same columns; side margins at least 24px; no screen switches layout except the hanging mascot row on onboarding (see `onboarding.md`).
- Mobile (about 390): every column fills the width minus 16px gutters (about 358px); header content row 16px padding; the header's text collapses before it wraps: product name hidden below about 480px, the flame mark and controls remain.
- "Page not found" and "Something went wrong": centred column about 480px, heading, message, "Back to home" link below it; top offset about 96px on desktop and tablet, 48px on mobile (derived); the link is a button-height target (at least 44px). The route-error message wraps and never overflows the column.
- The document never scrolls horizontally at any width from 320 up.

Stretches versus fixed: background, header and bottom bars stretch; columns, cards and form controls cap at their maximum; heights and tap targets stay fixed.

## Motion and sound
None specific to routing. Screen changes are instant; no route transition animation. Reduced-motion: no change needed.

## Data needed
Client-only. The session and the learner profile are the only state this file touches.
- `session`: `{ token: string, user: { id: string, email: string, displayName: string } } | null`, persisted in `localStorage` (OQ-07). Written by login, cleared by log out.
- `profile` (per user id, persisted in `localStorage`, OQ-08): `{ onboarding: { completed: boolean, level: 0-4 | null, startChoice: 'scratch' | 'find-level' | null }, startUnitIndex: number, completedLessonIds: string[], hearts: number, hasSeenHeartsIntro: boolean, placementNoteDismissed: boolean, noVoiceNoteDismissed: boolean }`.
- `startUnitIndex` only decides which lesson the path highlights as recommended (see `learning-path.md`); it never completes, hides or blocks any lesson.
- Defaults for a new profile: `completed: false`, `level: null`, `startChoice: null`, `startUnitIndex: 0`, `completedLessonIds: []`, `hearts: 5`, `hasSeenHeartsIntro: false`, `placementNoteDismissed: false`, `noVoiceNoteDismissed: false`.
- No endpoint is called by routing itself. If a stored session or profile fails zod parsing it is discarded and the user is sent to `/login`.

## Accessibility notes
On every route change focus moves to the screen's main heading (`h1`, `tabIndex={-1}`) so screen-reader users hear where they are; on the exercise screen the focus target is defined in `exercise-session.md`. The document title is set per screen: "Log in", "Onboarding", "Learn", "Lesson", "Practice", "Page not found", each followed by " | Spiritech".

## Out of scope
Real authentication, token expiry and refresh, sign-up, password reset, a marketing landing page, deep links to a specific unit, multiple courses or languages.

## Boards
Pending (Penpot not connected).
