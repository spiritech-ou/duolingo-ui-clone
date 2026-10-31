# Data loading, error and empty states

Decisions marked (OQ-nn) are listed in `open-questions.md`. This file fixes the shared rules and lists every screen that fetches data; the per-screen detail lives in `learning-path.md` and `exercise-session.md`, and this file must stay consistent with them.

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
| `/learn` | `GET /api/course` | Top bar plus a skeleton of one unit banner and five nodes (first visit only) | Mascot, "We couldn't load your lessons", message by failure kind, "Try again" | Mascot, "No lessons yet", "Check back soon.", "Reload" | None |
| `/lesson/:lessonId` | `GET /api/lessons/:lessonId` | Full-screen mascot with "Getting your lesson ready…" | Mascot, "We couldn't load this lesson", message by kind, "Try again" and "Back to path" | Mascot, "This lesson has no exercises yet", "Back to path" | Mascot, "We couldn't find this lesson", "Back to path" |
| `/practice` | `GET /api/practice?count=5` | Full-screen mascot with "Getting your practice ready…" | Same as a lesson, headline "We couldn't load this practice" | Same as a lesson | None |
| `/login` submit | `POST /api/auth/login` | Busy button, read-only fields | Banner (401 or failed), see `login.md` | None | None |

State transitions for a fetching screen: Loading goes to Ready, Empty, Error or Not found; Error goes back to Loading on "Try again"; Empty on the path goes to Loading on "Reload".

Mock scenarios (OQ-35): so every state above can be reached without breaking the server, the mock layer reads an optional `localStorage` key `mockScenario` with one of `ok` (default), `slow` (responses take 3 s), `timeout` (never respond), `error` (5xx), `empty` (course with no units, lesson with no exercises), `notfound` (404 on lessons). The scenario affects only course, lesson and practice requests; login errors use the email rules in `login.md`. There is no UI for this switch.

## Copy
- Connectivity message: "You seem to be offline, or the connection is slow. Check it and try again."
- Other failure message: "Something went wrong on our side. Try again in a moment."
- Buttons: "Try again", "Reload", "Back to path".
- Loading: "Loading your lessons" (visually hidden, path skeleton), "Getting your lesson ready…", "Getting your practice ready…".
- Headlines and empty copy are as in the table above.

## Motion and sound
The mascot on loading screens bobs gently; skeleton shapes shimmer. Reduced motion: no bob and no shimmer, a static placeholder. No sound.

## Data needed
Endpoints and shapes are defined in `learning-path.md` (`GET /api/course`), `exercise-session.md` (`GET /api/lessons/:lessonId`, `GET /api/practice`) and `login.md` (`POST /api/auth/login`). Common error body for every endpoint: `{ "code": string, "message": string }`. The course is English to Estonian and its words come from the fixed dataset in `vocabulary-dataset.md`. The browser's voice list is not a request and has no loading or error state of its own: its "checking", "no voice" and "unsupported" states are in `exercise-session.md` (Audio states). Client-only: the fetch status of each request as a discriminated union (`idle`, `loading`, `success`, `error`) in the data layer; the cached course.

## Accessibility notes
- Loading: the region has `aria-busy="true"` and a polite `role="status"` text; skeleton shapes are `aria-hidden`.
- Error and not found: `role="alert"`; focus moves to the main action button ("Try again", or "Back to path" when retrying makes no sense) so keyboard users land on it.
- Empty: `role="status"`, focus stays on the heading.
- The mascot is decorative (`alt=""`) on every state screen because the text carries the message.

## Out of scope
Automatic retry with backoff, offline mode, background sync, optimistic updates, partial-page error boundaries, analytics on errors, a visible way to switch mock scenarios.

## Boards
Pending (Penpot not connected).
