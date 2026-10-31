# Onboarding

Decisions marked (OQ-nn) are listed in `open-questions.md`. Layout reference: `reference/03-onboarding-level.png`, `04-onboarding-level-selected.png`, `05-onboarding-start-choice.png` (layout and behaviour only; the owl is replaced by the Spiritech flame mascot).

## Purpose
Ask a new user how much Estonian they know, then choose which lesson the learning path highlights as the recommended start. Every lesson stays open; the answer never locks or completes anything. Shown once, right after the first login.

## Entry points and routes
- `/onboarding/level` (step 1): reached from login or any guarded route while onboarding is incomplete.
- `/onboarding/start` (step 2): reached from step 1 when the chosen level is not the lowest.
- Exit: `/learn`. Revisiting `/onboarding/*` after completion redirects to `/learn`.
- Only two steps exist; motivation, daily goal and notification steps are not built (OQ-09).

## States
| State | Trigger | What the user sees | What the user can do | Exit |
|---|---|---|---|---|
| Step 1, nothing chosen | Arrive on `/onboarding/level` | Mascot with the bubble "How much Estonian do you know?", five level options (each with a four-bar signal icon, see Copy), a disabled "CONTINUE" | Choose an option | Choose |
| Step 1, level chosen | Option selected | Chosen option highlighted (primary outline and text); the bubble changes to that level's reaction; "CONTINUE" enabled | Choose a different option (highlight and bubble follow), press CONTINUE | CONTINUE |
| Step 1 done, lowest level | CONTINUE with "I'm new to Estonian" | Profile saved: completed, `startUnitIndex` 0 | Nothing | Redirect to `/learn` (OQ-10) |
| Step 1 done, other level | CONTINUE with levels 2 to 5 | Level saved as a draft in the profile | Nothing | Go to `/onboarding/start` |
| Step 2, nothing chosen | Arrive on `/onboarding/start` | Mascot with the bubble "Now let's find the best place to start!", two option cards, a disabled "CONTINUE", a "Back" control | Choose a card, go back | Choose, Back |
| Step 2, choice made | Card selected | Card highlighted; "CONTINUE" enabled | Switch card, CONTINUE, Back | CONTINUE, Back |
| Back | "Back" pressed on step 2 | Step 1 with the previous level still highlighted and its reaction in the bubble | Change level or continue | CONTINUE |
| Completed | CONTINUE on step 2 | Profile saved: completed, `startChoice`, `startUnitIndex` | Nothing | Redirect to `/learn` |
| Reload mid-flow | Browser refresh | Step 1 returns with the draft level selected if one was saved; step 2 without a draft level redirects to step 1 | Continue | As above |

Loading, error and empty behaviour: both steps are static and read nothing from the network, so there is no loading, error or empty state. If the profile in storage is unreadable the user is returned to `/login` (see `app-shell-and-routing.md`).

Recommended start (decided in step 2, OQ-11 as amended by OQ-15):
- "Start from scratch": `startUnitIndex` 0, so the first lesson of the course is recommended.
- "Find my level": `startUnitIndex` = chosen level index (level 2 gives 1, level 5 gives 4); the path recommends the first lesson of that unit. There is no placement test. No lesson is marked completed, hidden or locked by this choice: the user can still open any lesson. If the course has fewer units than the index, the path uses the last unit.

## Copy
Step 1 bubble: "How much Estonian do you know?" (the reference screenshots say French; this product teaches Estonian, OQ-13, OQ-43)

| # | Option | Signal bars | Bubble after choosing |
|---|---|---|---|
| 1 | "I'm new to Estonian" | 0 of 4 | "Okay, we'll start fresh!" |
| 2 | "I know some common words" | 1 of 4 | "Nice, you already have a head start!" |
| 3 | "I can have basic conversations" | 2 of 4 | "Great, you can already chat a bit!" |
| 4 | "I can talk about various topics" | 3 of 4 | "Impressive, you're quite far along!" |
| 5 | "I can discuss most topics in detail" | 4 of 4 | "Wow, you're nearly fluent!" |

Only the first bubble line comes from the reference; lines 2 to 5 are invented (OQ-13).

Step 2:
- Bubble: "Now let's find the best place to start!"
- Card 1: "Start from scratch", description "Take the easiest lesson of the Estonian course".
- Card 2: "Find my level", description "Let the flame recommend where you should start learning".
- Buttons: "CONTINUE", "Back".
- The signal-bar icons are decorative (`aria-hidden`); the option text carries the meaning.

## Motion and sound
Bubble text swaps with a short fade; the mascot does a small bounce when the bubble changes. Option highlight transitions with `--duration-*`. Reduced motion: no bounce, no fade, instant swap. No sound.

## Data needed
Client-only, nothing fetched:
- Writes `profile.onboarding` and `profile.startUnitIndex` (see `app-shell-and-routing.md`) into the persisted store.
- Level list and reaction lines are static constants in the feature.
- The unit count (to cap `startUnitIndex`) is read later from `GET /api/course` by the learning path, not here.

## Accessibility notes
- Each step is a `radiogroup` labelled by the bubble text; options are `radio` inputs styled as cards. Arrow keys move between options, Space selects, Enter on a selected option presses CONTINUE.
- Focus order: Back (step 2 only), the radiogroup, CONTINUE. On arrival focus goes to the bubble text container (`h1`-level heading, `tabIndex={-1}`).
- The reaction bubble is `role="status"` (`aria-live="polite"`) so the change is announced.
- The disabled CONTINUE uses `aria-disabled` and states why through `aria-describedby` ("Choose an option to continue").
- Selection is never signalled by colour alone: the selected card also has a check mark in addition to the outline.
- The mascot image is decorative (`alt=""`) because the bubble holds the text.

## Out of scope
Course or language selection, motivation question, daily goal, notification permission, a real placement test, a close button (OQ-12), editing the level later.

## Boards
Pending (Penpot not connected).
