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

## Layout
Measured from `reference/03-onboarding-level.png`, `04-onboarding-level-selected.png` and `05-onboarding-start-choice.png` (captures about 2000 px wide; widths in capture pixels, approximate; see OQ-44). Both steps share one structure: a full-screen view (no app header, OQ-34) with three parts: a top area, a centred content column and a bottom action bar.

- Content column: **about 640px wide, centred horizontally** (options span 676 to 1318 on step 1 and 681 to 1319 on step 2; page centre 1000). Option cards fill the column and never exceed it. `max-width` about 640px, `width: 100%`, `margin-inline: auto`.
- Mascot and bubble row: sits above the options and hangs to the left of the column by up to 330px, and never closer to the window's left edge than the side gutter of 32px (`--space-6`) (mascot about 110px wide at x 345 to 458; bubble from x 495 to 895, about 400px wide, height about 68px, step 2 bubble about 450px; these x values are the reference capture's, where the full 330px hang fits). On desktop the row is therefore wider than the column (up to about 970px) and its left edge is not the column's edge. The bubble text wraps inside the bubble. The exact hang at each window width is given under "Desktop" below (OQ-52).
- Options: step 1, five rows about 80px high with about 24px between them (signal icon left, text after it, row fills the column). Step 2, two cards about 175px high with about 22px between them (icon left about 80px square, title and description to its right).
- Vertical: mascot row top about 130 to 145px below the top of the viewport; first option about 40px below the bubble; options end well above the action bar, leaving free space (the group is top-aligned, not vertically centred).
- Action bar: a full-width strip separated from the content by a 1-2px divider at about 85% of the viewport height (y 1117 of 1313). "CONTINUE" is right-aligned in the strip about 30px from the right edge, about 216px wide and 60px high, vertically centred in the strip. It stays at the bottom of the viewport (sticky) while content scrolls. "Back" (step 2) sits at the left of the strip, aligned to the same left margin.
- Close "X" in the reference (top left, about 40px from the edges) is not built (OQ-12).

Desktop (1280 and wider): as above; the column stays about 640px and centred, the action bar and divider stretch full width, the CONTINUE button stays fixed width at the right edge. The mascot and bubble row hangs left of the column by `hang = min(330px, (window width - 640px) / 2 - 32px)`; the row's left edge is the column's left edge minus `hang`, and its width is the column width plus `hang`. The 32px side gutter is `--space-6`, so the mascot's left edge is never closer than 32px to the window edge. Window width means the viewport width including any scrollbar (`100vw`). Testable values:
- At 1280: column left edge x320, hang 288px (not 330), so the mascot starts at x32 and the row is 928px wide.
- Between 1280 and 1364: the hang grows by 0.5px for each px of window width (the column moves right by that amount), and the mascot stays at x32.
- From 1364 up: the full 330px hang applies (1364 = 640 + 2 x (330 + 32)); at 1364 the column's left edge is x362 and the mascot starts at x32. Wider than 1364 the hang stays 330px, the row is 970px wide, and the mascot starts further from the window edge (at 1920: column left edge x640, mascot at x310).
- Every window width of 1280 and above keeps the mascot at least 32px from the window's left edge, so it is never cut off and never touches the edge.

Tablet (about 768 to 1279): the column stays about 640px when it fits, else fills the width minus 24px gutters; the mascot row no longer hangs left: mascot and bubble sit on one line at the column's left edge (mascot about 96px).

Mobile (about 390): column fills the width minus 16px gutters (about 358px). The mascot and bubble stack: the mascot above (about 80px) with the bubble below it, full column width; the bubble tail points up to the mascot. Option rows keep at least 64px height and 12-16px gaps; text wraps to two lines. The action bar is pinned to the bottom; "CONTINUE" fills the bar's width minus the gutters (full-width button, 56px high); on step 2 "Back" stacks above it as a text-style button.

Stretches versus fixed: option cards and the bubble follow the column; icons, mascot, button heights and the column maximum are fixed; the divider and bar background span the full window.

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
