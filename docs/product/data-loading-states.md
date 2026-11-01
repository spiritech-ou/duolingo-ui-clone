# Data loading, error and empty states

Decisions marked (OQ-nn) are listed in `open-questions.md` (focus after "Try again" is OQ-57). This file fixes the shared rules and lists every screen that fetches data; the per-screen detail lives in `learning-path.md` and `exercise-session.md`, and this file must stay consistent with them.

## Purpose
Make every request-driven screen behave the same way while data is loading, when it fails, and when it returns nothing, so the user always knows what is happening and what they can do next.

## Entry points and routes
Screens that fetch: `/learn` (course), `/lesson/:lessonId` (lesson), `/practice` (practice set), and the submit on `/login`. `/onboarding/*` fetches nothing; the app shell's own "Page not found" and "Something went wrong" screens are in `app-shell-and-routing.md`.

## States
Shared rules (apply to every fetching screen, OQ-32):
- Request timeout: 10 seconds. A timeout is treated as a network failure.
- No automatic retries. The user retries with the screen's "Try again" button; each retry returns to the Loading state.
- Failure kinds map to two messages: connectivity (offline, network error, timeout) and everything else (5xx, an invalid response body, an unknown error). A 404 on a lesson has its own "not found" state.
- Loading appears immediately with no delay or minimum duration.
- Cached data (the course) is shown immediately on later visits while a silent refresh runs; a failed refresh keeps the cached data and shows nothing.
- An error never hides a way out: every error screen has "Try again" (when retrying makes sense) and a way back (path, or log out on the path itself).
- A response that fails zod validation is an error, not an empty state, and the cause is logged to the console for developers.
- The user's learner data (hearts, progress) is local, so it never has a loading state and is shown from the first frame.

| Screen | Request | Loading | Error | Empty | Not found |
|---|---|---|---|---|---|
| `/learn` | `GET /api/course` | Top bar plus a skeleton of one unit banner and five nodes (first visit only); no mascot | Red flame mascot, "We couldn't load your lessons", message by failure kind, "Try again" | Blue flame mascot, "No lessons yet", "Check back soon.", "Reload" | None |
| `/lesson/:lessonId` | `GET /api/lessons/:lessonId` | Full-screen blue flame mascot (bobbing) with "Getting your lesson ready…" | Red flame mascot, "We couldn't load this lesson", message by kind, "Try again" and "Back to path" | Blue flame mascot, "This lesson has no exercises yet", "Back to path" | Red flame mascot, "We couldn't find this lesson", "Back to path" |
| `/practice` | `GET /api/practice?count=5` | Full-screen blue flame mascot (bobbing) with "Getting your practice ready…" | Same as a lesson (red flame), headline "We couldn't load this practice" | Same as a lesson (blue flame) | None |
| `/login` submit | `POST /api/auth/login` | Busy button, read-only fields | Banner (401 or failed), see `login.md` | None | None |

State transitions for a fetching screen: Loading goes to Ready, Empty, Error or Not found; Error goes back to Loading on "Try again"; Empty on the path goes to Loading on "Reload".

Flame colour on state screens (OQ-45, OQ-46; brand rule in `design/brand.md`: a failure shows the red flame, drawn tilted and slightly lowered; everything else keeps the blue flame). A failure is a state in which the user did not get what they asked for and something went wrong; an empty result, a wait and a success are not failures.

| Flame | State screens |
|---|---|
| Red | Load error on `/learn`; Load error on `/lesson/:lessonId`; Load error on `/practice`; Not found on `/lesson/:lessonId`; Out of hearts (defined in `exercise-session.md`, with the red flame in the first-mistake modal and the Wrong and Skipped panels) |
| Blue | Loading on `/lesson/:lessonId` and `/practice` (bobbing); Empty on `/learn` ("No lessons yet"); Empty on `/lesson/:lessonId` and `/practice` ("This lesson has no exercises yet"); Loading on `/lesson/:lessonId` and `/practice` after "Try again"; Lesson over and Practice complete (defined in `exercise-session.md`); the "You finished the Estonian course!" card |
| None | The `/learn` Loading and Retrying skeleton (no mascot); `/login` submit states (banner, no mascot); the shell's "Page not found" and "Something went wrong" screens (no mascot today, see OQ-47) |

Rules: on `/lesson/:lessonId` and `/practice`, pressing "Try again" returns to Loading, so the flame turns blue again (bobbing); a second failure shows the red flame again. On `/learn`, pressing "Try again" (Load error) or "Reload" (Empty) returns to the Loading skeleton, which has no mascot: the red or blue flame is replaced by the skeleton, and a second failure or empty result shows the flame again. The red flame is the same size and position as the blue one it replaces on the same screen (see Layout), so the two colours swap without the layout moving. The flame colour never changes the message, the buttons or their order.

Mock scenarios (OQ-35): so every state above can be reached without breaking the server, the mock layer reads an optional `localStorage` key `mockScenario` with one of `ok` (default), `slow` (responses take 3 s), `timeout` (never respond), `error` (5xx), `empty` (course with no units, lesson with no exercises), `notfound` (404 on lessons). The scenario affects only course, lesson and practice requests; login errors use the email rules in `login.md`. There is no UI for this switch.

## Copy
- Connectivity message: "You seem to be offline, or the connection is slow. Check it and try again."
- Other failure message: "Something went wrong on our side. Try again in a moment."
- Buttons: "Try again", "Reload", "Back to path".
- Loading: "Loading your lessons" (visually hidden, path skeleton), "Getting your lesson ready…", "Getting your practice ready…".
- Headlines and empty copy are as in the table above.
- The flame, red or blue, has no text and no accessible name; no string is added by it.

## Layout
No reference screenshot shows a loading, error or empty state (OQ-44), so these values are derived from the references' single-column screens: the login column (about 500px) and the onboarding mascot-and-text pattern.

Container rule for every state screen: **one centred column, about 480px wide max**, `width: 100%`, `margin-inline: auto`; the mascot (about 120px) is centred at the top, then the headline, the message and the button(s), all centred text. Vertical gap about 24px between mascot, headline, message and buttons (16px between the headline and message). The block starts about 96px below the top of the content area on desktop and tablet and about 48px on mobile; it is not vertically centred, so it does not jump when the message wraps.

- Desktop (1280 and wider) and tablet: column about 480px, centred; buttons about 240px wide each, stacked with 12px between them when there are two ("Try again" above "Back to path"); the page background stretches.
- Mobile (about 390): column fills the width minus 16px gutters (about 358px); buttons fill the column width; headline wraps to at most two lines; mascot about 96px; top offset about 48px.
- Full-screen loading and error views for `/lesson/:lessonId` and `/practice` have no app header (OQ-34); the close button stays at the top-left, about 24px from the edges, and does not move the centred column.
- On `/learn` the state screen sits below the top bar and inside the page column; the skeleton reproduces one unit banner plus five nodes at the same size and pitch as in `learning-path.md`, so the Ready state replaces it without layout shift.
- Login's submit states are in `login.md` Layout: the busy button keeps its width and height (the spinner replaces nothing but the label's position), so the form does not move.

The mascot is the red flame on a failure screen (Load error, Not found) and the blue flame on the others (see "Flame colour on state screens"); size and position are the same for both colours: about 120px on desktop and tablet and about 96px on mobile, centred at the top of the column. The red flame keeps its static pose (slight tilt, slightly lowered) and does not bob.

Stretches versus fixed: the text and buttons follow the column (buttons fill it on mobile only); the column maximum, mascot size and heights are fixed.

## Motion and sound
The blue mascot on loading screens bobs gently; skeleton shapes shimmer. The red flame on failure screens does not bob or move. Reduced motion: no bob and no shimmer, a static placeholder; the red flame is unchanged (it never moves). No sound.

## Data needed
Endpoints and shapes are defined in `learning-path.md` (`GET /api/course`), `exercise-session.md` (`GET /api/lessons/:lessonId`, `GET /api/practice`) and `login.md` (`POST /api/auth/login`). Common error body for every endpoint: `{ "code": string, "message": string }`. The course is English to Estonian and its words come from the fixed dataset in `vocabulary-dataset.md`. The browser's voice list is not a request and has no loading or error state of its own: its "checking", "no voice" and "unsupported" states are in `exercise-session.md` (Audio states). Client-only: the fetch status of each request as a discriminated union (`idle`, `loading`, `success`, `error`) in the data layer; the cached course.

## Accessibility notes
- Loading: the region has `aria-busy="true"` and a polite `role="status"` text; skeleton shapes are `aria-hidden`.
- Error and not found: `role="alert"`; focus moves to the main action button ("Try again", or "Back to path" when retrying makes no sense) so keyboard users land on it.
- Empty: `role="status"`, focus stays on the heading.
- Focus after "Try again" (OQ-57), on `/lesson/:lessonId`, `/practice` and `/learn`: pressing "Try again" on a load error removes the button that had focus and returns to Loading. Focus then moves to the loading status region, so it is not left on the page body (`document.body`):
  - `/lesson/:lessonId` and `/practice`: the polite `role="status"` text of the Loading state ("Getting your lesson ready…" or "Getting your practice ready…").
  - `/learn`: the skeleton region (the `aria-busy="true"` region whose polite `role="status"` text is "Loading your lessons").
  - The target is made programmatically focusable (`tabIndex={-1}`) and is not a tab stop; Tab from it continues in DOM order. The focus move adds no announcement of its own beyond that status text.
  - The focus move happens when the Loading state appears after the retry. The first load of a screen (route opened, or a cached course with a silent refresh) has no focus move: focus stays where the route change or the page load put it.
  - If the retry fails again, the Error rule above applies (focus moves to "Try again", or "Back to path"). If it succeeds, the destination screen's own rule applies (a lesson moves focus to the question heading, see `exercise-session.md`).
  - This covers "Try again" on a load error only. "Reload" on the `/learn` Empty state is not covered by this decision (OQ-59).
- The mascot is decorative (`alt=""`) on every state screen, red or blue, because the text carries the message. The red flame changes no announcement, no `role="alert"` or `role="status"` text and no focus target: "Try again" (or "Back to path") still receives focus on Load error and Not found exactly as above. Failure is never signalled by the flame's colour alone; the headline and message say it.

## Out of scope
Automatic retry with backoff, offline mode, background sync, optimistic updates, partial-page error boundaries, analytics on errors, a visible way to switch mock scenarios.

## Boards
Pending (Penpot not connected).
