# Learning path

Decisions marked (OQ-nn) are listed in `open-questions.md`. Layout reference: `reference/09-learning-path-tree-reference.png` (zigzag column of nodes; layout only, it is a different product, and its locked nodes are not used).

## Purpose
Show the French course as a tree of units and lessons so the user can pick any lesson to study, see which are done, see which one is recommended next, and see their hearts.

## Entry points and routes
Route: `/learn`. Arrived at after login or onboarding, from the lesson-over and out-of-hearts screens, from "Back to path" on lesson load errors, and from `/`. Leaving: a node opens `/lesson/:lessonId`; "Log out" goes to `/login`.

## States
Structure: the path is a vertical list of units. Each unit has a banner (unit number, title, short description) followed by its lessons as round nodes in a zigzag column. Above the list, a top bar shows the hearts counter and the "Log out" button.

There are no locked nodes: every node opens (OQ-15). Node states (derived from the profile):
- completed: the id is in `completedLessonIds`. Shown with a check mark; still opens for replay.
- recommended: the single highlighted node, with a "START" bubble. It is the first lesson, in course order, that is not completed, looking from the first lesson of unit `startUnitIndex` onward (the unit index is capped at the last unit); if every lesson from there on is completed, the first not-completed lesson before it; if every lesson is completed, there is no recommended node (OQ-40).
- available: every other node. Neutral style, opens normally.

Completed and recommended each have their own distinct style; available nodes look the same whether they come before or after the recommended one.

| State | Trigger | What the user sees | What the user can do | Exit |
|---|---|---|---|---|
| Loading (first visit) | Arrive with no cached course | Top bar with the hearts counter; a skeleton of one unit banner and five node placeholders; `aria-busy` | Log out | Data arrives or fails |
| Refreshing | Arrive with a cached course | The cached path immediately; no spinner; a silent refresh runs | Everything in Ready | Refresh succeeds (content updates in place) or fails (cached content stays, no message) |
| Ready | Course loaded | Unit banners, nodes in the three node states (completed, recommended, available), hearts counter, the recommended node centred in view and carrying a "START" bubble | Open any node, scroll, log out | Open a node, log out |
| Ready, first arrival after "Find my level" | Onboarding finished with `find-level` and `placementNoteDismissed` false | A note above the first unit: "We recommend starting at Unit N based on your answer." with a "Got it" button | Dismiss it | Dismiss (stored, not shown again) |
| Node opened | Press any node (completed, recommended or available) | Navigates to `/lesson/:lessonId` | Nothing | Lesson route |
| No hearts | `hearts` is 0 | Counter shows 0 in a muted style with the label "No hearts left"; nodes still open normally (the lesson route handles it, see `exercise-session.md`) | Open nodes, which lead to the out-of-hearts screen | Earn a heart by practice |
| Course finished | Every lesson completed, so no recommended node | The last unit followed by a closing card "You finished the French course!" with the mascot; all nodes show completed and stay replayable | Replay any lesson, log out | Replay (OQ-18) |
| Empty | Course returns no units, or units with no lessons | Mascot and the text "No lessons yet" with "Check back soon." and a "Reload" button | Reload | Reload refetches |
| Load error | Request fails, times out (10 s) or data fails validation | Mascot, heading and message from "Copy", a "Try again" button | Try again, log out | Retry succeeds (Loading then Ready), or leave |
| Retrying | "Try again" pressed | Same layout as Loading | Log out | Data arrives or fails |
| Return from a lesson | Back on `/learn` after a lesson or practice | The path with up-to-date node states and hearts; the recommended node (which may have changed after a completion) centred, with a short highlight; if none is recommended, the lesson just left stays in view | As in Ready | As in Ready |

Scroll: on arrival the recommended node scrolls into the centre of the viewport (instant, not animated). Scroll position is not restored after leaving.

Layout of the zigzag: node `k` (0-based within its unit) sits at a horizontal offset taken from the repeating pattern `0, +1, +2, +1, 0, -1, -2, -1` steps from the column centre, so it reads as a winding path; on narrow screens the steps shrink so nothing overflows.

## Copy
- Top bar: hearts counter accessible name "5 hearts left" (the number changes), zero: "No hearts left"; button "Log out".
- Unit banner: "Unit 1", then the unit title and description from the API.
- Recommended node bubble: "START". Node accessible names: "Lesson 3, Greetings, completed", "Lesson 4, Food, recommended, start", "Lesson 5, Drinks".
- Placement note: "We recommend starting at Unit 3 based on your answer." with button "Got it".
- Finished card: "You finished the French course!" with "Replay any lesson to keep your words fresh."
- Empty: "No lessons yet", "Check back soon.", button "Reload".
- Load error, network or timeout: "We couldn't load your lessons", "You seem to be offline, or the connection is slow. Check it and try again."; any other failure: "We couldn't load your lessons", "Something went wrong on our side. Try again in a moment."; button "Try again".

## Motion and sound
The recommended node pulses gently while idle; after returning from a completed lesson a newly recommended node scales in once. Hearts counter pops when its value changes. Reduced motion: no pulse, no scale, no pop; the state is shown by style only. No sound.

## Data needed
- `GET /api/course`
  - 200: `{ "id": "fr", "title": "French", "fromLanguage": "English", "units": [ { "id": string, "title": string, "description": string, "lessons": [ { "id": string, "title": string } ] } ] }`.
  - The order of `units` and of `lessons` is the course order. The mock returns 6 units of 4 lessons (24 lessons, OQ-14).
  - Errors: network failure, timeout, 5xx `{ "code": "server_error", "message": string }`; a body that fails the zod schema counts as an error.
- Client-only (from the profile in `app-shell-and-routing.md`): `completedLessonIds`, `startUnitIndex`, `hearts`, `placementNoteDismissed`. The cached course is kept in the data layer for the session.

## Accessibility notes
- The path is one `nav` labelled "Learning path" containing a list of units; each unit is a labelled group (its banner is the heading) holding an ordered list of node buttons.
- Nodes are real buttons, all enabled; the recommended one has `aria-current="step"`.
- Focus order follows course order. On arrival focus goes to the recommended node (or the first node when none). The placement note uses `role="status"`.
- State is shown by icon and shape as well as colour (check mark for completed, play for recommended, plain number or book for available).
- Loading skeleton: container `aria-busy="true"` with a visually hidden "Loading your lessons" (`role="status"`). Error: `role="alert"`, focus moves to the "Try again" button.
- Arrow keys are not required; Tab and Enter/Space are enough.

## Out of scope
Locked or gated lessons, multiple courses, practice nodes, stories, unit tests/checkpoints, a stars or crowns system, streaks, XP totals and leaderboards, a sticky unit header, restoring scroll position, a reset-progress control (OQ-37).

## Boards
Pending (Penpot not connected).
