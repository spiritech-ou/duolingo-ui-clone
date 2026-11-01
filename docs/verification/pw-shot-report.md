# Visual pass report (task 32)

Branch `claude/language-learning-prototype`, tasks 1 to 31 committed. Dev server `npm run dev:mocks -- --port 5290 --strictPort` (mocks on), driven through the Playwright MCP at 1280x720 and 390x844, light and dark. States were reached through normal use plus the `mockScenario` key (`timeout` for loading/skeleton, `error`, `empty`, `notfound`).

Method: widths are `getBoundingClientRect` values from `browser_evaluate` (`left+width x height @top`). Horizontal scroll was checked with `document.documentElement.scrollWidth` against the viewport width: **no horizontal scroll in any cell** (scrollWidth equals viewport width at 1280 and 390 everywhere). Red flame check: counted `img[src*="flame-red"]`; it appears only on Wrong, Skipped, first-mistake modal, load error, not found and out of hearts, and never on login, onboarding, path ready/skeleton/empty, exercise idle/selected/correct, exit dialog, lesson over or practice complete.

Screenshots are `docs/verification/pw-shot-<screen>-<state>-<width>-<theme>.png`. Each row below stands for the four files `{1280,390}-{light,dark}` with that stem unless stated. Widths are measured per viewport; theme does not change layout (the dark cells were re-checked for scrollWidth only).

Capture note: to switch theme between shots the page's `data-theme` attribute was set directly. As a result the header toggle label in dark shots of `/login` and `/learn` still reads "Switch to dark theme" (the store was not toggled). The real header toggle was exercised and works (click: `data-theme` dark, label "Switch to light theme", stored choice `dark`), and `login-pristine-1280-dark` and `login-pristine-390-dark` were re-taken through the real toggle.

Summary of mismatches (details at the end): 1 first-mistake modal 399px high at 390 (spec about 520); 2 lesson not-found renders `role="status"` (spec `alert`); 3 onboarding mobile mascot row is side by side at 96px, spec stacks it at about 80px with a full-width bubble; 4 onboarding CONTINUE is 66px high, spec 60 (desktop) and 56 (mobile); 5 desktop onboarding mascot row is clamped to x=32, not hanging about 330px left of the column; 6 a spec number that does not match its own arithmetic (mobile dialog "about 326px").

## Login (`login.md` Layout: column about 500px, mobile 358px)

| State | Width | Measured | Spec | Result | Screenshot stem |
|---|---|---|---|---|---|
| pristine | 1280 | column 500 (x390), fields 500, LOG IN 500x66, divider 500, social buttons 500x66 each; header row 640 (x320) | 500 | pass | `pw-shot-login-pristine-1280-{light,dark}.png` |
| pristine | 390 | column 358 (x16), fields/buttons 358, buttons 66 high (>= 44) | 358 | pass | `pw-shot-login-pristine-390-{light,dark}.png` |
| field errors | 1280 | column 500; each field 500x105 (error text inside the field box) | 500 | pass | `pw-shot-login-fielderrors-1280-{light,dark}.png` |
| field errors | 390 | column 358; fields 358x105 | 358 | pass | `pw-shot-login-fielderrors-390-{light,dark}.png` |
| 401 banner (`ada@fail.test`) | 1280 | banner 500x54 inside the 500 column, same width as the fields; text "Incorrect email or password." | 500 | pass | `pw-shot-login-banner401-1280-{light,dark}.png` |
| 401 banner | 390 | banner 358x54, fields 358 | 358 | pass | `pw-shot-login-banner401-390-{light,dark}.png` |

Note: the app header content row is 640 wide at 1280 on `/login` (spec says "the same horizontal extent as the widest column in use"; 640 is the widest column of the app, so read as pass). At 390 the brand name is visually hidden (1x1) and the theme button sits at x158 to 374.

## Onboarding (`onboarding.md` Layout: column about 640px, mobile 358px)

| State | Width | Measured | Spec | Result | Screenshot stem |
|---|---|---|---|---|---|
| level, nothing chosen | 1280 | content column 640 (x320); 5 rows 640x80, 24px gaps; bubble 408x68 at x158; footer 1280 wide at y620 (86% of 720); CONTINUE 216x66 at x1040 | column 640, rows 80, gap 24, bubble about 400x68, CONTINUE 216x60 | mismatch (CONTINUE height 66 vs 60; mascot row see M5) | `pw-shot-onboarding-level-empty-1280-{light,dark}.png` |
| level, nothing chosen | 390 | column 358 (x16); rows 358x64 (last 84, two-line text); mascot 96x96 at x16, bubble 246x88 at x128 on the same row (y24); CONTINUE 358x66 | column 358, rows >= 64, mascot about 80 above a full-width bubble, CONTINUE 358x56 | mismatch (M3, M4) | `pw-shot-onboarding-level-empty-390-{light,dark}.png` |
| level, chosen | 1280 | rows 640x80 unchanged, one radio checked, CONTINUE 216x66 | as above | mismatch (M4 only) | `pw-shot-onboarding-level-chosen-1280-{light,dark}.png` |
| level, chosen | 390 | rows 358x64, CONTINUE 358x66 | as above | mismatch (M4) | `pw-shot-onboarding-level-chosen-390-{light,dark}.png` |
| start choice, nothing chosen | 1280 | 2 cards 640x175, gap 24; bubble 435x68; Back 76x41 at x24, CONTINUE 216x66 at x1040 | cards 640x175, gap about 22, bubble about 450x68, CONTINUE 216x60 | mismatch (M4; gap 24 vs 22 and bubble 435 vs 450 are within "about") | `pw-shot-onboarding-start-empty-1280-{light,dark}.png` |
| start choice, nothing chosen | 390 | cards 358x118; mascot 96 beside a 246x88 bubble; Back above CONTINUE at x16; CONTINUE 358x66 | column 358, mascot stacked, CONTINUE 56 | mismatch (M3, M4) | `pw-shot-onboarding-start-empty-390-{light,dark}.png` |
| start choice, chosen | 1280 | cards 640x175, one input checked | as above | mismatch (M4 only) | `pw-shot-onboarding-start-chosen-1280-{light,dark}.png` |
| start choice, chosen | 390 | same as empty | as above | mismatch (M3, M4) | `pw-shot-onboarding-start-chosen-390-{light,dark}.png` |

## Learning path (`learning-path.md` Layout: column about 640px; node 72, step 50, pitch 96, banner 80; mobile 358, node 64, step 40, pitch 88, banner 72)

| State | Width | Measured | Spec | Result | Screenshot stem |
|---|---|---|---|---|---|
| ready | 1280 | column 640 (x320), top bar 640x66, unit banners 640x80, nodes 72x72 at x604/654/704 (step 50), vertical pitch 96, banner gap 32 | as spec | pass | `pw-shot-learn-ready-1280-{light,dark}.png` |
| ready | 390 | column 358 (x16), top bar 358x66 on one row, banners 358x72, nodes 64x64 at x163/203/243 (step 40), pitch 88 | as spec | pass | `pw-shot-learn-ready-390-{light,dark}.png` |
| skeleton (`timeout`) | 1280 | column 640, banner 640x80, 5 nodes 72 high at pitch 96 | same size and pitch as ready | pass | `pw-shot-learn-skeleton-1280-{light,dark}.png` |
| skeleton | 390 | column 358, banner 358x72, 5 rows 64 high at pitch 88 | same as ready | pass | `pw-shot-learn-skeleton-390-{light,dark}.png` |
| load error (`error`) | 1280 | state column 480 (x400), mascot box 120 (img 136), first block 96px below the top bar, role="alert"; red flame | 480, mascot 120, offset 96, red flame | pass | `pw-shot-learn-error-1280-{light,dark}.png` |
| load error | 390 | state column 358 text at x16, mascot box 96 (img 108), offset 48; red flame | 358, mascot 96, offset 48 | pass | `pw-shot-learn-error-390-{light,dark}.png` |
| empty (`empty`) | 1280 | state column 480 (x400), mascot 120, offset 96, role="status", blue flame | 480, blue flame | pass | `pw-shot-learn-empty-1280-{light,dark}.png` |
| empty | 390 | column 358 inside 390, mascot 96, offset 48, blue flame | 358 | pass | `pw-shot-learn-empty-390-{light,dark}.png` |

Not covered here: the "finished" card and the placement note (not in the task's state list). Verified later, see "Plan 04: learning path finished card and placement note" below.

## Exercise (`exercise-session.md` Layout: top bar about 1320 clamped to window minus 48, question and cards 790, cards about 256x334 with 12px gaps, bar 190, feedback 185; mobile 358, stacked cards 88 high, feedback 200)

In headless Chromium there is no Estonian voice and the Estonian audio clips do not exist yet (operator runs `npm run audio:generate` later), so every exercise state shows the disabled "Sound unavailable" speaker icon (44x44) in the top bar and the "No Estonian voice on this device" notice with a "Got it" button above the question. This is the no-voice case; the speaker-with-voice state could not be produced in this browser. The notice makes the question start lower than the spec's 330px (cards at y447 at 1280, y332 at 390), which is expected while the notice is shown.

| State | Width | Measured | Spec | Result | Screenshot stem |
|---|---|---|---|---|---|
| idle | 1280 | top bar 1232 (x24, window minus 48), progress bar 1010x22, question area 790 (x245), cards 255x333 at x245/512/780 (gaps 12), notice 790x72, footer 1280x190, SKIP 197x64, CHECK 198x64 (outer edges x34 to x1247, 1213 wide) | 1320 clamped, 790, 256x334, 12, 190, 197/198, 1213 | pass | `pw-shot-exercise-idle-1280-{light,dark}.png` |
| idle | 390 | top bar 358 (x16), progress bar 184x22, close and speaker 44x44, hearts at right; cards stacked 358x88, 12px gaps; footer 390x120; SKIP and CHECK 173x64 each, gap 12 | 358, bar about 200, cards 358x88, buttons half width gap 12 | pass | `pw-shot-exercise-idle-390-{light,dark}.png` |
| option selected | 1280 | cards 255x333 unchanged, one input checked, CHECK 198x64 enabled | as idle | pass | `pw-shot-exercise-selected-1280-{light,dark}.png` |
| option selected | 390 | cards 358x88, one checked | as idle | pass | `pw-shot-exercise-selected-390-{light,dark}.png` |
| correct | 1280 | panel 1280x185 at y535, CONTINUE 200x64 at x1053, no red flame | 185, 200 | pass | `pw-shot-exercise-correct-1280-{light,dark}.png` |
| correct | 390 | panel 390x200 at y644, CONTINUE 358x64 | 200, full width | pass | `pw-shot-exercise-correct-390-{light,dark}.png` |
| wrong, first-mistake modal | 1280 | modal 585x494 at x348 (centred), flame image 108x108, KEEP GOING 505x66; red flames: modal plus panel behind | 585, about 497 high, 505x66 | pass | `pw-shot-exercise-wrong-modal-1280-{light,dark}.png` |
| wrong, first-mistake modal | 390 | modal 358x399 at y223, KEEP GOING 310x66, flame image 108x108, no inner scroll | width minus 32 = 358, about 520 high | **mismatch M1** | `pw-shot-exercise-wrong-modal-390-{light,dark}.png` |
| wrong, modal dismissed | 1280 | panel 1280x185, red flame wrapper 32x32, CONTINUE 200x64, hearts 4 | 185, 32px flame | pass | `pw-shot-exercise-wrong-1280-{light,dark}.png` |
| wrong, modal dismissed | 390 | panel 390x200, flame wrapper 32x32 (img 36 inside), CONTINUE 358x64 | 200, 32px flame | pass | `pw-shot-exercise-wrong-390-{light,dark}.png` |
| skipped | 1280 | no modal (not the first mistake), panel 1280x185, flame wrapper 32x32 at x157, CONTINUE 200x64 | 185, 32px flame | pass | `pw-shot-exercise-skipped-1280-{light,dark}.png` |
| skipped | 390 | panel 390x200, flame wrapper 32x32, CONTINUE 358x64 | 200, 32px flame | pass | `pw-shot-exercise-skipped-390-{light,dark}.png` |
| exit dialog ("Quit lesson?") | 1280 | dialog 585x388 at x348 (centred), KEEP LEARNING and QUIT 505x66 stacked 12 apart, no flame | 585, no flame | pass | `pw-shot-dialog-exit-1280-{light,dark}.png` |
| exit dialog | 390 | dialog 358x293, buttons 310x66 stacked 12 apart, no flame | width minus 32 (spec text says "about 326", see M6) | pass (spec number inconsistent) | `pw-shot-dialog-exit-390-{light,dark}.png` |

## End screens and state screens (`exercise-session.md` end screens and `data-loading-states.md`: column about 480, mascot 160 on end screens, 120/96 on state screens; buttons 240 desktop, full width mobile)

| State | Width | Measured | Spec | Result | Screenshot stem |
|---|---|---|---|---|---|
| lesson over | 1280 | column 480 (x400), mascot 160x160 (blue), heading, stats list 480x80, CONTINUE 240x52, no top bar | 480, 160, 240 | pass | `pw-shot-exercise-lessonover-1280-{light,dark}.png` |
| lesson over | 390 | stats list 358x80, CONTINUE 358x52, mascot 160 | CONTINUE fills the column | pass | `pw-shot-exercise-lessonover-390-{light,dark}.png` |
| practice complete | 1280 | column 480, mascot 160 (blue), heading, one "+1 heart" line, CONTINUE 240x52 | 480, 160, 240; "three stats in a row" | pass for widths; see note N1 | `pw-shot-exercise-practicecomplete-1280-{light,dark}.png` |
| practice complete | 390 | CONTINUE 358x52, mascot 160 | full width | pass | `pw-shot-exercise-practicecomplete-390-{light,dark}.png` |
| out of hearts | 1280 | column 480 (x400), mascot 160x160 red at y96, message, two stacked buttons in a 480x140 block | 480, 160, red flame | pass; see note N1 | `pw-shot-exercise-outofhearts-1280-{light,dark}.png` |
| out of hearts | 390 | mascot 160 red at x115, "Practice to earn a heart" and "Quit lesson" 358x52 each | full width buttons | pass | `pw-shot-exercise-outofhearts-390-{light,dark}.png` |
| lesson loading (`timeout`) | 1280 | state column 480 (x400) under the 80px top strip with the close button 44x44 at x24 | 480, close top-left | pass | `pw-shot-exercise-loading-1280-{light,dark}.png` |
| lesson loading | 390 | column inside 358 (x16), close at x24 | 358 | pass | `pw-shot-exercise-loading-390-{light,dark}.png` |
| lesson load error (`error`) | 1280 | column 480, mascot box 120 (img 136) red, offset 96 below the strip (y176), role="alert", TRY AGAIN and BACK TO PATH 240x52 stacked 12 apart | 480, 120, 240, 12 | pass | `pw-shot-exercise-error-1280-{light,dark}.png` |
| lesson load error | 390 | mascot box 96 (img 108) red, offset 48 (y128), buttons 358x52 stacked 12 | 358, 96, 48 | pass | `pw-shot-exercise-error-390-{light,dark}.png` |
| lesson not found (`notfound`) | 1280 | column 480, mascot box 120 red, BACK TO PATH 240x52, container role="status" | 480, 120, 240, role alert | **mismatch M2** | `pw-shot-lesson-notfound-1280-{light,dark}.png` |
| lesson not found | 390 | mascot box 96 red, BACK TO PATH 358x52, role="status" | 358, 96, role alert | **mismatch M2** | `pw-shot-lesson-notfound-390-{light,dark}.png` |

## Shell: page not found and route error (`app-shell-and-routing.md` Layout: column about 480, link at least 44px, top offset 96 desktop and 48 mobile)

| State | Width | Measured | Spec | Result | Screenshot stem |
|---|---|---|---|---|---|
| page not found (`/zzz-nothing`) | 1280 | section 480 (x400), h1 222x48, link "Back to home" 96x44, first block at y161 (65px header plus 96) | 480, link >= 44, offset 96 | pass | `pw-shot-notfound-1280-{light,dark}.png` (reused) |
| page not found | 390 | section 358 (x16), link 96x44, first block at y113 (65 plus 48) | 358, offset 48 | pass | `pw-shot-notfound-390-{light,dark}.png` (reused) |
| route error | 1280 | not re-measured live (see below); screenshot shows heading, message wrapped inside the column and link | 480 | not re-measured; screenshot only | `pw-shot-routeerror-1280-{light,dark}.png` (reused) |
| route error | 390 | not re-measured live; screenshot shows the message wrapping inside the 358 column, no overflow | 358 | not re-measured; screenshot only | `pw-shot-routeerror-390-{light,dark}.png` (reused) |

Reuse justification: `src/router.tsx` and `router.module.scss` have no commit since task 7 (15:41); the only later change touching shared pieces is task 19's red-flame mascot, which these screens do not render (the header brand mark is the blue flame). The route error could not be triggered live without editing `src` or aborting the lazy chunk request (no network-abort tool is allowed here), so its widths were not re-measured; the existing screenshots were opened and match the spec layout.

## Plan 04: learning path finished card and placement note (`learning-path.md` Layout: "Placement note and finished card: fill the column width; the note sits above the first unit with 16px below it"; column 640, mobile 358)

Reached live (dev server with mocks, own port, Playwright MCP): the profile of ada@example.com was reset to onboarding not completed, then "How much Estonian do you know?" the fourth option ("I can talk about various topics"), "Find my level", CONTINUE gave `/learn` with "We recommend starting at Unit 4 based on your answer." and "Got it". "Got it" removed the note; after a reload it did not return (`placementNoteDismissed` true, no "Got it" button). The finished card was reached by seeding `completedLessonIds` with all 24 lesson ids from `/api/course` in the `profiles` localStorage entry. Light and dark were switched with the header toggle.

| State | Width | Measured (light and dark identical) | Spec | Result | Screenshot |
|---|---|---|---|---|---|
| placement note | 1280 | note 640x69 at x320, nav starts 16px below the note, no horizontal scroll, text and "Got it" (86x41) as spec | column 640, 16px below | pass | `pw-shot-learn-placementnote-1280-{light,dark}.png` |
| placement note | 390 | note 358x70 at x16 (text wraps to two lines, "Got it" 86x41), nav 358 wide 16px below, scrollWidth equals 390 | column 358, 16px below | pass | `pw-shot-learn-placementnote-390-{light,dark}.png` |
| finished card | 1280 | card 640x273 at x320 (region, h2 "You finished the Estonian course!", p "Replay any lesson to keep your words fresh."), 24px below the last unit, no horizontal scroll; flame image 128 attribute (136 rendered by the celebrating animation) with stops `#2f8dcc` and `#254a85` (blue) | fills the 640 column, blue flame | pass | `pw-shot-learn-finished-1280-{light,dark}.png` |
| finished card | 390 | card 358x326 at x16, 24px below the last unit, no horizontal scroll, same blue flame | fills the 358 column | pass | `pw-shot-learn-finished-390-{light,dark}.png` (the stale `-390-light` file was re-taken) |

Mismatches: none. Notes: the card sits after the last unit (the spec gives no gap there; 24px measured). The page opens scrolled to the recommended unit (the note is off screen above), so the note screenshots were taken after `scrollTo(0, 0)`. The note and the card have no tabs of their own; the note is `role="status"`. Typed copy matched the spec exactly in all four states.

## Mismatches, with the spec line

- **M1 First-mistake modal height at 390.** Measured 358x399 (flame image 108, KEEP GOING 310x66, no inner scroll). `exercise-session.md` line 148: "the first-mistake modal keeps its 96px red flame at the top on mobile ... so it is about 520px high at 390 wide". Also measured in task 22 (399px). At 1280 the modal is 494 high against about 497, which passes.
- **M2 Lesson not-found role.** Rendered container has `role="status"`; the spec says not-found should be `role="alert"` (load error does render `role="alert"`, so only not-found differs). Both widths.
- **M3 Onboarding mobile mascot row.** Measured at 390: mascot 96x96 at x16 and a 246x88 bubble at x128 on the same row (y24 to y112). `onboarding.md` Mobile: "The mascot and bubble stack: the mascot above (about 80px) with the bubble below it, full column width; the bubble tail points up". Both steps.
- **M4 Onboarding CONTINUE height.** Measured 66px at 390 (358x66) and at 1280 (216x66). `onboarding.md` line 60: "about 216px wide and 60px high" (desktop); Mobile: "full-width button, 56px high". Width passes.
- **M5 Onboarding desktop mascot row.** Measured at 1280: mascot 110x110 at x32, bubble 408 to 435 wide at x158. `onboarding.md` lines 57 and 63: the row hangs about 330px left of the 640 column (column left edge is x320, so the mascot would start near x-10). It is clamped to the window padding instead. At 1280 the spec position does not fit on screen, so this is probably intended; the spec should say what happens below about 1300px wide. Listed so the planner decides.
- **M6 Spec arithmetic (not an app defect).** `exercise-session.md` line 148 says the modal and dialogs are "the width minus 32px (about 326px)"; 390 minus 32 is 358, which is what the app renders for both the modal and the exit dialog. Suggest the spec says 358.

## Notes

- **N1.** `exercise-session.md` line 142 describes end screens (Lesson over, Practice complete, Out of hearts) with "the three stats in a row of equal cells". Lesson over renders a stats list (480x80). Practice complete renders one "+1 heart" line and Out of hearts renders a message and buttons only. Widths pass; whether those two should carry the three stats is a spec question, not measured as a mismatch.
- Console on exercise routes shows one error per load: the Estonian audio clips are not generated yet (operator runs `npm run audio:generate`), so the no-voice icon and notice show; this is expected, not a layout finding.
- Not-found message line: the page not-found screen has heading and link only (no message paragraph).
- Stale files left in `docs/verification/` from earlier tasks (not part of this pass, not re-verified): `pw-shot-exercise-empty-*`, `pw-shot-lesson-firstmistake-*`, `pw-shot-lesson-loaderror-*`, `pw-shot-lesson-outofhearts-1280-*`, `pw-shot-dialog-firstmistake-*`, `pw-shot-footer-*`, `pw-shot-picturechoice-*`, `pw-shot-radiocards-*`, `pw-shot-speechbubble-*`, `pw-shot-unit-*`, `pw-shot-skeleton-unit-*`, `pw-shot-focusedlayout-*`, `pw-shot-exercisetopbar-*`, `pw-shot-learn-finished-390-light.png`. The files of this report supersede the ones with the same screen and state.
- `npm run e2e` could not run in this environment: `playwright.config.ts` fixes the port at 5273 with `reuseExistingServer: false` and `npm run dev:mocks` hard-codes `--port 5273 --strictPort`; port 5273 is held by a foreign process, so Playwright stops with "http://localhost:5273 is already used". Not changed (config belongs to another role and the port rule is the team's).

## Plan 04: audio fallback in the browser (`exercise-session.md` Audio states, Audio rules a to n; `vocabulary-dataset.md` manifest)

Method: `npm run dev:mocks -- --port 5391 --strictPort` (the script's own `--port 5273` is overridden by the later flag), headless Chromium through the Playwright MCP, lesson `u1-l1` at 1280x720 and 390x844, reduced motion emulated so the pulsing start node can be clicked. Audio observed with a wrapper on `HTMLMediaElement.prototype.play` and `pause` (injected with `browser_evaluate`, re-injected after each reload). The browser reports 180 voices and none is Estonian, so the clip path is what plays. Manifest failures were produced with an init script wrapping `window.fetch` for `/audio/manifest.json` (Playwright `page.route` does not work here: the MSW service worker answers the page and its own network requests bypass `page.route`). The init script lived in the browser session only; nothing was added to the repository. Every one of the 120 words in the 24 lessons has a manifest entry, and all 120 `/audio/<file>` answer `HEAD` 200 with an audio content type.

### Check 1: manifest served, no icon, no notice, layout

| Item | Expected | Observed | Result |
|---|---|---|---|
| "Sound unavailable" icon, 1280 and 390 | absent (spec lines 76, 91, 199) | absent, in the DOM and the accessibility tree, also after 2.8 s | pass |
| "No Estonian voice on this device" notice | absent | absent | pass |
| Cards 1280 | about 256x334, 12px gaps (line 146) | 255x333 at x245/512/780, gaps 12 | pass |
| Cards 390 | stacked 358x88, 12px gaps (line 157) | 358x88 at y203/303/403, x16, no horizontal scroll (scrollWidth 390) | pass |
| Question area start 1280x720 | "about 330px below the top" (line 145) | question area box starts at y92, tag "NEW WORD" y176, heading y210, cards (radiogroup) y359 | **mismatch M7** (see below) |
| Question area start 390x844 | no figure in the spec | tag y108, heading y142, cards y203 | not judged |

### Check 2: selecting a card plays that word's clip

| Item | Expected | Observed | Result |
|---|---|---|---|
| Click on a card, 2.5 s or more after the screen opened | exactly one `play()`, URL `/audio/<itemId>.mp3` | one `play()` per selection: tee -> `/audio/tea.mp3`, piim -> `/audio/milk.mp3`, leib -> `/audio/bread.mp3`; each new `Audio` element, no `<audio>` in the DOM | pass |
| Every card of 10 exercises (30 selections, second full run) | URL equals `/audio/` + the manifest `file` of the card's exact Estonian text | 30 of 30 equal, 16 distinct files; includes jäätis, šokolaad, õun | pass |
| Diacritics õ ä ö ü š ž | same | õun -> apple.mp3, jäätis -> ice-cream.mp3, šokolaad -> chocolate.mp3 observed live; manifest has 20 non-ASCII keys (öö, küülik, žiraff, ...) and a full lookup of all 120 words found no missing entry. ö, ü, ž played live only through the lookup, not clicked (lesson u1-l1 has no such words); first run: 21 of 21 equal except the miss below | pass for õ ä š; ö ü ž by manifest lookup only |
| Select another card while one plays | first stops, second plays | tee at ct 0.22 s, dur 0.96 s: `pause` logged on tea.mp3 (paused true, not ended), then `play` milk.mp3 | pass |
| Number key (`Digit2`, `Digit3`) | same as click | `Digit3` -> tea.mp3, `Digit2` on the already selected card -> milk.mp3 played again | pass |
| Select the same card again by click | plays again (task; line 106 "same as click, including the audio") | selected card clicked again with the MCP click and with `label.click()`: no `play()` at all | **mismatch M8** |
| Nothing on exercise load | none | no `play()` on load of 3 lessons, on the next exercise, or after lesson start | pass |
| Nothing on CHECK, feedback panel, SKIP, end screen | none | CHECK (Incorrect panel), SKIP panel, next exercise, "Lesson complete!" and "Perfect lesson!" screens: empty play log (only a `pause` of a clip still playing when CHECK or the next exercise came, which is the stop in rule j) | pass |
| Selection in the first 2.2 s after the lesson screen opens | per rule k, plays nothing only "before the manifest has loaded and before a voice is known" | manifest loaded in about 200 ms, yet 5 of 5 selections made 0.6 to 2.1 s after the node click played nothing; selections at 2.5 s and 3.5 s played. `useSpeech.ts` lines 283 to 286 skip the clip until the 2 s voice check settles | **mismatch M9** (consistent with the Sound check row, line 72) |
| One miss in the first full run | none expected | one of 51 selections (tee, first card of the re-queued "tea" exercise) played nothing; the second run (30 selections) had none. Not reproduced, cause not found (card already selected is the same symptom as M8, not confirmed) | unverified |

### Check 3: leaving stops a playing clip

| Item | Expected | Observed | Result |
|---|---|---|---|
| Close button with a clip playing | exit dialog; line 97 stops on leaving | dialog opens, clip keeps playing (ct 0.02 to 0.17, not paused): the dialog is not leaving | pass (as spec) |
| KEEP LEARNING / QUIT | QUIT stops the clip | select, Close, QUIT within 120 ms: `pause` on fish.mp3 at ct 0.05 of 1.12, route `/learn`, still paused 1.5 s later | pass |
| Browser Back while playing | not run (Back opens the same dialog, covered by task 12) | n/a | not run |

### Check 4: failure paths (all reached, through a `fetch` wrapper and a renamed manifest)

| Item | Expected | Observed | Result |
|---|---|---|---|
| Manifest request rejected (network error) | icon "Sound unavailable" and notice, never an error screen | icon, notice with "Got it", exercise screen, no `role="alert"` | pass |
| Manifest 404, HTML body with 200, wrong shape (`clips` a string), empty `clips`, request that never answers (3 s bound) | same | all five: icon and notice shown, no error screen | pass |
| Selecting a card with the manifest rejected | nothing plays, no message | no `play()`, no "Couldn't play this word.", card selected | pass |
| Clip file missing (manifest entries renamed to `gone-<file>`) | "Couldn't play this word." about 4 s | `play()` on `/audio/gone-tea.mp3`, message visible at 0.5 s, still visible at 3.55 s, gone at 4.06 s (samples every 0.5 s); icon and notice not shown | pass |
| Message cleared on the next selection | cleared | not isolated: the next selection also fails and shows the message again | not reached |
| Not reached: a clip that fails with a `play()` rejection other than a missing file, and a failing Estonian voice (no fallback to the clip, rule l) | n/a | headless Chromium has no Estonian voice and no rejection source other than the file error; faking `speechSynthesis` would test a fake | not reached |
| Not reached: speech unsupported text ("This browser can't speak words aloud") | n/a | the browser has `speechSynthesis`; removing it needs an init script before app code, not done | not reached |

Screenshots (1280x720 and 390x844, light and dark, no icon, no notice): `pw-shot-exercise-sound-{idle,selected}-{1280,390}-{light,dark}.png`.

Mismatches (details above; none edits `src`):

- **M7 Question area start.** 1280x720: question area y92, tag y176, heading y210, cards y359. `exercise-session.md` line 145: "it starts about 330px below the top of the viewport". The cards start 29px below 330; the tag and heading start 154px and 120px above it. The 330 comes from the 2000px capture (tag at y357), so the spec number is not in CSS pixels; the planner should state which element and which unit.
- **M8 Same card again.** Clicking an already selected card plays nothing (the radio `change` does not fire); the key does replay. Line 106 says the number key is "same as click, including the audio", and the task asks that a repeat selection plays again.
- **M9 Silent first 2.2 s.** Rule k (line 98) reads "before the manifest has loaded and before a voice is known"; the code waits for the 2 s voice timeout even though the manifest is loaded after about 200 ms and 180 non-Estonian voices are listed, so selections in the first 2.2 s are silent. The Sound check row (line 72) says "selecting a card does not speak yet", so the behaviour matches that row; the two lines disagree.

Notes (audio pass): the manifest is requested twice per screen mount in the dev server (React strict mode double effect, assumed; not checked in a production build). Once, right after resizing from 1280 to 390 and leaving the lesson, the app showed "We couldn't load this lesson" with console errors "Invalid response body from GET /course ... <!doctype" (the mock layer answered with the Vite HTML page); a reload fixed it and it did not come back, so it is not an audio finding and is unverified.

## Plan 04: final re-verification

Branch `claude/language-learning-prototype`, tasks 1 to 13 committed. Dev server `npm run dev:mocks -- --port 5412 --strictPort` (mocks on), headless Chromium through the Playwright MCP, 1280x720 and 390x844, light and dark. Clips are served (manifest answers, 120 files), so no "Sound unavailable" icon and no "No Estonian voice" notice appear anywhere below. Themes: the real header toggle on `/learn` (header exists there); `data-theme` set directly on every full-screen route (onboarding, lesson, practice have no header, OQ-34). States came from the `mockScenario` key (`ok`, `error`, `timeout`, `notfound`) and edits of the `profiles` entry in `localStorage` (`hearts`, `hasSeenHeartsIntro`), made inside the browser session; no repository file was added. Widths are `getBoundingClientRect` values (`left,top widthxheight`); `scrollWidth` equalled the viewport width (no horizontal scroll) in every cell measured.

Limits: a real AZERTY keyboard cannot be emulated, so the number-key check used synthetic `KeyboardEvent`s. In this environment a `timeout` scenario does not stay in Loading: after a few seconds the app shows the load error again (client timeout), so loading shots were taken straight after pressing "Try again".

### Onboarding (`onboarding.md` Layout, Desktop and Mobile paragraphs)

| State | Width | Measured | Spec | Result | Screenshots |
|---|---|---|---|---|---|
| level, nothing chosen | 1280 | mascot 110x110 at x32 y134; bubble 408x68 at x158; row from x32 to the column's right edge x960 = 928 wide; rows 640x80 at x320, 24px gaps; CONTINUE 216x60 at x1040; footer 1280 wide | mascot x32, row 928, CONTINUE 216x60 | pass | `pw-shot-onboarding-level-empty-1280-{light,dark}.png` |
| level, chosen | 1280 | rows unchanged, one radio checked, CONTINUE 216x60 enabled | same | pass | `pw-shot-onboarding-level-chosen-1280-{light,dark}.png` |
| level, nothing chosen | 390 | mascot 80x80 at x16 y24; bubble 358x88 at x16 y120 (16px below the mascot), full column width, tail points up (seen in the screenshot); rows 358x64 (last 84, two lines); CONTINUE 358x56 at y772; scrollWidth 390 | mascot about 80 above full-width bubble, CONTINUE 56 | pass | `pw-shot-onboarding-level-empty-390-{light,dark}.png` |
| level, chosen | 390 | one radio checked, rows 358x64, CONTINUE 358x56 | same | pass | `pw-shot-onboarding-level-chosen-390-{light,dark}.png` |
| start choice, nothing chosen | 1280 | mascot 110 at x32; bubble 435x68; cards 640x175 at x320/y284 and y483 (gap 24); Back 76x41 at x24; CONTINUE 216x60 at x1040 | cards 640x175, CONTINUE 216x60 | pass | `pw-shot-onboarding-start-empty-1280-{light,dark}.png` |
| start choice, chosen | 1280 | one input checked, same sizes | same | pass | `pw-shot-onboarding-start-chosen-1280-{light,dark}.png` |
| start choice, nothing chosen | 390 | mascot 80x80 at x16 y24; bubble 358x88 below; cards 358x118; Back 76x41 at x16 above CONTINUE 358x56 | stacked mascot, CONTINUE 56 | pass | `pw-shot-onboarding-start-empty-390-{light,dark}.png` |
| start choice, chosen | 390 | one checked, same sizes | same | pass | `pw-shot-onboarding-start-chosen-390-{light,dark}.png` |

Note: the level draft is saved in the profile, so a revisit of the level step shows the earlier choice checked; the "nothing chosen" 390 shots were taken after clearing `onboarding.level` in the stored profile.

### Lesson not found, load errors and loading (`data-loading-states.md` Layout)

| State | Width | Measured | Spec | Result | Screenshots |
|---|---|---|---|---|---|
| lesson not found (`notfound`) | 1280 | text container `role="alert"` (the div holding heading and message, 295x29 text row at x493 y320); column 480 at x400; mascot img 136 (box 120) at y174; "Back to path" 240x52 at x520 y373 and it holds focus (`document.activeElement`) | role alert, 480, 240, focus on Back to path | pass | `pw-shot-lesson-notfound-1280-{light,dark}.png` |
| lesson not found | 390 | `role="alert"`; mascot img 108 (box 96) at y126; "Back to path" 358x52 at x16 y301, focused; scrollWidth 390 | alert, 358, focus, layout unchanged | pass | `pw-shot-lesson-notfound-390-{light,dark}.png` |
| lesson load error (`error`) | 1280 | `role="alert"` 412x69; mascot 136 (box 120) at y174; Try again and Back to path 240x52 at x520, stacked 12 apart; focus on Try again | 480, 240, focus | pass | `pw-shot-exercise-error-1280-{light,dark}.png` |
| lesson load error | 390 | `role="alert"` 358x93; mascot img 108 at y126; buttons 358x52 stacked 12 apart; Try again focused | 358, 96 box | pass | `pw-shot-exercise-error-390-{light,dark}.png` |
| lesson loading after Try again (scenario `timeout`) | 1280 and 390 | `document.activeElement` is the `role="status"` region "Getting your lesson ready" (`tabindex=-1`); Close 44x44 at x24 y24 (390) | focus on the loading status region (task 8) | pass | `pw-shot-exercise-loading-{1280,390}-{light,dark}.png` |
| practice load error, Try again, loading | 1280 | after Try again `activeElement` is the `role="status"` region "Getting your practice ready" | same (task 8) | pass | none new (state identical to the lesson one) |
| `/learn` load error, Try again, skeleton | 1280 | after Try again `activeElement` is the `role="status"` region "Loading your lessons" (visually hidden, 1x1 at x319 y178); skeleton 640 wide at x320 | same (task 8) | pass | `pw-shot-learn-error-1280-{light,dark}.png`, `pw-shot-learn-skeleton-1280-{light,dark}.png` |
| `/learn` load error and skeleton | 390 | error text 358, skeleton 358x552 at x16 y179, `role="status"` focused after Try again, scrollWidth 390 | 358, same focus | pass | `pw-shot-learn-error-390-{light,dark}.png`, `pw-shot-learn-skeleton-390-{light,dark}.png` |

### First-mistake modal, exit dialog and Back (`exercise-session.md` Layout, Mobile paragraph; task 11)

| State | Width | Measured | Spec | Result | Screenshots |
|---|---|---|---|---|---|
| first-mistake modal | 390 | dialog 358x399 at x16 y223 (`scrollHeight` 399 = `clientHeight`, no inner scroller), flame image 108 (box 96) at y245, KEEP GOING 310x66 | width 358, about 400 high, no scroll at 390x844 | pass | `pw-shot-exercise-wrong-modal-390-{light,dark}.png` |
| first-mistake modal | 1280 | dialog 585x494 at x348 y113, KEEP GOING 505x66, flame image 108, two red flames in the DOM (modal plus panel behind) | 585, about 497 | pass | `pw-shot-exercise-wrong-modal-1280-{light,dark}.png` |
| exit dialog | 390 | "Quit lesson?" 358x293 at y276, Keep learning and Quit 310x66 stacked 12 apart, no image | 358, no flame | pass | `pw-shot-dialog-exit-390-{light,dark}.png` |
| exit dialog | 1280 | 585x388 at x348 y166, buttons 505x66, no image | 585 | pass | `pw-shot-dialog-exit-1280-{light,dark}.png` |
| browser Back with the modal open (390, lesson reached from `/learn`, history idx 1) | 390 | first `history.back()`: modal gone, URL stays `/lesson/u1-l1`, wrong panel visible; second `history.back()`: "Quit lesson?" dialog open, URL unchanged; Keep learning closes it | task 11 | pass | none (the dialog shot above) |

Back caveat (not a mismatch of the task): when the lesson page was opened by a fresh `goto` (history idx 0, no earlier in-app entry) the first Back left the app for the previous document; the guard only applies to in-app history.

### Exercise screens with sound available (`exercise-session.md` Layout)

Top bar and speaker: no speaker icon and no notice at any width (`[aria-label*="ound"]` count 0); the top bar holds Close 44x44, the progress bar and the hearts counter only. Lesson `u1-l1` first exercise (tee), then bread (wrong), then skip.

| State | Width | Measured | Spec | Result | Screenshots |
|---|---|---|---|---|---|
| idle | 1280x720 | top bar 1232 at x24 (window minus 48), progress 1078x22, question area 790 at x245; tag "NEW WORD" y176, heading y210, cards 255x333 at x245/512/780 y359 (gaps 12); footer 1280x190 at y530; SKIP 197x64, CHECK 198x64 (outer edges x34 and x1247) | tag at about 330 (line 145), cards 256x334, footer 190 | cards pass; question start **M7 still open** (see below) | `pw-shot-exercise-idle-1280-{light,dark}.png` |
| idle | 390x844 | top bar 358 at x16, progress 236x22, Close 44x44; tag y108, heading y142, cards 358x88 at y203/303/403 (gaps 12), last card ends y491; footer 390x120 at y724; SKIP and CHECK 173x64, gap 12 | 358, cards 88, buttons half width | pass | `pw-shot-exercise-idle-390-{light,dark}.png` |
| option selected | 1280 / 390 | one input checked, CHECK enabled, sizes unchanged | as idle | pass | `pw-shot-exercise-selected-{1280,390}-{light,dark}.png` |
| correct | 1280 | panel 1280x185 at y535, CONTINUE 200x64 at x1053, no red flame | 185, 200 | pass | `pw-shot-exercise-correct-1280-{light,dark}.png` |
| correct | 390 | panel 390x200 at y644, CONTINUE 358x64, no red flame, counter "5 hearts left" | 200, full width | pass | `pw-shot-exercise-correct-390-{light,dark}.png` |
| wrong, modal | see the modal table above | | | pass | `pw-shot-exercise-wrong-modal-{1280,390}-{light,dark}.png` |
| wrong, modal dismissed | 1280 / 390 | panel 1280x185 / 390x200, red flame wrapper 36x36 in the panel row (img), CONTINUE 200x64 / 358x64, counter "4 hearts left" | 185 / 200, 32px flame | pass | `pw-shot-exercise-wrong-{1280,390}-{light,dark}.png` |
| skipped | 1280 / 390 | no modal, panel 1280x185 / 390x200, flame 36x36 img (32px wrapper), CONTINUE 200x64 / 358x64, counter one lower | same | pass | `pw-shot-exercise-skipped-{1280,390}-{light,dark}.png` |

Are the cards cut by the footer at 1280x720? Yes. The footer starts at y530; the cards run to y692 and their word labels sit at y636 to 660, so the card labels (and the lower part of every card) are hidden under the footer when the screen opens. The screen does not scroll as a document (`scrollHeight` 720 = viewport); `main` is the scroller (`overflow-y: auto`, `scrollHeight` 648 against `clientHeight` 462), so the labels can be reached by scrolling inside `main`, but the idle, selected and 1280 states shown in the screenshots have the labels covered. At 390x844 the cards end at y491, well above the footer (y724): not cut. This matches the review remark about `pw-shot-exercise-sound-selected-1280-dark.png`.

Number keys (task 10), synthetic events on the exercise "bread": `{ key: '&', code: 'Digit1' }` selected card 1; `{ key: '2', code: 'Digit2' }` card 2; `{ key: '3', code: 'Numpad3' }` card 3; `{ key: '1', code: 'Numpad1' }` card 1 again. All four selected the expected card. Pass (a real AZERTY keyboard cannot be emulated; the layout-independent `code` is what was exercised).

### End screens (`exercise-session.md` line 151)

| State | Width | Measured | Spec | Result | Screenshots |
|---|---|---|---|---|---|
| practice complete, 3 hearts | 1280 and 390 | text "Practice complete!", "+1 heart", counter 4 (was 3); CONTINUE 240x52 at x520 (1280) / 358x52 at x16 (390); mascot 170 img (box 160) | counter one higher, "+1 heart" shown | pass | `pw-shot-exercise-practicecomplete-{1280,390}-{light,dark}.png` |
| practice complete, 5 hearts | 1280 | no "+1 heart" text, counter "5 hearts left" 37x24 at x621 (centre 639.5), CONTINUE 240x52 at y387 directly below, no gap | counter 5 only, centred, no empty gap | pass | `pw-shot-practice-complete-5hearts-1280-{light,dark}.png` |
| practice complete, 5 hearts | 390 | no "+1 heart", counter 37x24 at x176 (centre 194.5 of 390), CONTINUE 358x52 | same | pass | `pw-shot-practice-complete-5hearts-390-{light,dark}.png` |
| out of hearts (0 hearts) | 1280 | column 480, mascot red 181 img at x541 y93, "Practice to earn a heart" 240x76 (wraps to two lines) and "Quit lesson" 240x52, stacked 12 apart, no stats; the heading holds focus on arrival | 480, 160 mascot, two stacked buttons | pass | `pw-shot-exercise-outofhearts-1280-{light,dark}.png` |
| out of hearts | 390 | mascot 181 img at x96, buttons 358x52 at x16, stacked 12 apart | full width | pass | `pw-shot-exercise-outofhearts-390-{light,dark}.png` |
| Enter on out of hearts (task 5) | 390 | Enter with focus on the page: URL became `/practice` and a practice exercise showed; on a fresh visit Tab, Tab moved focus to "Quit lesson" and Enter went to `/learn` | Enter runs the focused action, default "Practice to earn a heart" | pass | none |

### M1 to M6 and N1: status

| Item | Plan 03 finding | Measured now | Status |
|---|---|---|---|
| M1 first-mistake modal height at 390 | 399, spec about 520 | 358x399, no inner scroll at 390x844; spec line 157 now says about 400 (358 wide, fits without scrolling) | **resolved** (spec corrected) |
| M2 lesson not-found role | `role="status"` | `role="alert"` on the text container at both widths, focus on "Back to path", layout unchanged (480 / 240x52 and 358 / 358x52) | **resolved** |
| M3 onboarding mobile mascot row | side by side, 96px | mascot 80x80 above a 358x88 bubble, tail up, both steps | **resolved** |
| M4 onboarding CONTINUE height | 66 | 216x60 at 1280 and 358x56 at 390, both steps | **resolved** |
| M5 desktop mascot row | clamped to x32, spec said hang 330 | x32 at 1280 as the updated spec's rule (hang = min(330, (1280-640)/2-32 = 288)); row 928 wide, wider than the 640 column; the 1364+ and 1920 values were not re-measured | **resolved** at 1280 |
| M6 spec arithmetic "about 326" | spec number wrong | spec line 157 now says 358 (390 minus 32); modal and dialog measure 358 | **resolved** |
| N1 end-screen stats | spec said three stats in a row for all end screens | spec line 151 now limits the three stats to Lesson over; Practice complete shows its counter line and Out of hearts message and buttons, which is what is rendered; Lesson over was not re-measured in this pass | **resolved** (spec aligned with the app) |

### Still open (carried from task 13; no `src` change made here)

- **M7 Question area start at 1280x720.** Measured: question area box y92, tag y176, heading y210, cards (radiogroup) y359. `exercise-session.md` line 145: "it starts about 330px below the top of the viewport". The 330 comes from the 2000px capture (tag at y357 there); the number is not in CSS pixels. Spec fix: say which element and which unit. Related effect: the cards are covered by the footer at 720px height (see above).
- **M8 Same card again.** Re-clicking the already selected card plays no clip (the radio `change` does not fire), while the number key replays. `exercise-session.md` line 106: the number key is "same as click, including the audio". Not re-tested in this pass.
- **M9 Silent first 2.2 s.** Selections in the first about 2.2 s after the screen opens play no clip; `exercise-session.md` rule k (line 98) reads "before the manifest has loaded and before a voice is known", while the Sound check row (line 72) says selecting does not speak yet. The two lines disagree. Not re-tested in this pass.
- **Lesson not found: `role="alert"` is on the text container only** (heading and message), not on the whole column that also holds the mascot and button. This matches the load error and the spec says "container"; listed in case the spec means the whole column.
- **Timeout scenario**: the app leaves Loading by itself after a few seconds and shows the load error (client timeout); if the spec wants an unbounded loading state for `timeout`, that differs (not a layout item).

No other mismatch was found in the screens re-measured.

### Stale files still remaining

Not re-taken in this pass (earlier plans' files; the files of this report supersede those of the same screen and state): `pw-shot-exercise-empty-*`, `pw-shot-lesson-firstmistake-*`, `pw-shot-lesson-loaderror-*`, `pw-shot-lesson-outofhearts-1280-*`, `pw-shot-dialog-firstmistake-*`, `pw-shot-footer-*`, `pw-shot-picturechoice-*`, `pw-shot-radiocards-*`, `pw-shot-speechbubble-*`, `pw-shot-unit-*`, `pw-shot-skeleton-unit-*`, `pw-shot-focusedlayout-*`, `pw-shot-exercisetopbar-*`, `pw-shot-practice-complete-5hearts-1280-current.png`, and the task 13 `pw-shot-exercise-sound-*` files (kept, not overwritten; they show the same sound-available screens). The `pw-shot-exercise-lessonover-*`, `pw-shot-learn-ready/empty/finished/placementnote-*`, login and not-found files were not touched by plan 04 and were not re-run. `pw-shot-lesson-notfound-*` and `pw-shot-exercise-error-{1280,390}-dark.png` and the 5 hearts 390/1280 shots may show as unchanged in git because the layout is identical to the plan 03 files.

### Verdict

Plan 04's visible fixes hold at 1280x720 and 390x844 in both themes: the onboarding mascot row, mobile stacking and CONTINUE sizes follow the updated spec, the not-found screen announces itself as an alert and focuses "Back to path", the first-mistake modal is 358x399 with no scroll, the load-error, loading and skeleton states move focus to the loading status region on `/learn`, lesson and practice, Practice complete shows or omits "+1 heart" correctly for fewer than 5 and 5 hearts, Out of hearts responds to Enter as specified, number keys work by physical key, and Back closes the modal before opening the exit dialog; M1 to M6 and N1 are resolved. What remains is not a regression of plan 04: M7 (the 330 figure in the spec is not in CSS pixels, and at 1280x720 the cards are hidden behind the footer until `main` is scrolled), M8 (replay on re-click) and M9 (silent first 2.2 s), all carried from task 13 and recorded with their spec lines for a following plan.

## Plan 05: final verification

Run against the committed code of tasks 1 to 6, `npm run dev:mocks` on port 5391, headless Chromium through the Playwright MCP, measured with `browser_evaluate` against `docs/product/exercise-session.md` "Layout" (vertical rule, line 158 onward, tolerance 2px). Lesson `u1-l2` (new-word exercises, with the NEW WORD tag) and `/practice` (no tag). Light and dark by the persisted theme choice (`localStorage.theme`), the clips in `public/audio/` are what plays. `npm run e2e` not run (out of scope). No `src` change.

### Exercise screens, with tag (lesson u1-l2)

| State | Window | Measured (y, h in CSS px) | Spec | Result | Screenshots |
|---|---|---|---|---|---|
| idle | 1280x720 | tag y176, heading y210, cards y287 255x219 (x245/512/780), card bottom 506, word labels y450 to 474, footer y530 (190), main 462 high, no scroll (scrollHeight 462), document 720 | tag 176, cards top 287, h 219, bottom 506, footer 530, no scroll | pass | `pw-shot-exercise-idle-1280-{light,dark}.png` |
| option selected | 1280x720 | same boxes, one radio checked, CHECK enabled; selected card scales 3%, visual bottom about 510 | as idle, below footer top 530 | pass | `pw-shot-exercise-selected-1280-{light,dark}.png` |
| correct | 1280x720 | cards unchanged (287/219), panel 1280x185 at y535, CONTINUE 200x64 | card height unchanged, panel 185 | pass | `pw-shot-exercise-correct-1280-{light,dark}.png` |
| wrong, modal | 1280x720 | modal 585x494 at x348 y113 (first-mistake, 96px flame), cards unchanged | about 585x497 | pass, with a **tolerance exception**: height is 3px under the spec figure (outside the 2px tolerance); the spec figure is probably the sum 385 + 112, so this is a spec-figure note (see "Remaining mismatches") | `pw-shot-exercise-wrong-modal-1280-{light,dark}.png` |
| wrong, modal dismissed | 1280x720 | panel 1280x185 at y535, flame img 36x36 (32px wrapper), cards 287/219 | 185, 32px flame | pass | `pw-shot-exercise-wrong-1280-{light,dark}.png` |
| skipped | 1280x720 | panel 185 at y535, CONTINUE 200x64, cards 287/219, no modal | same | pass | `pw-shot-exercise-skipped-1280-{light,dark}.png` |
| idle (dark only) | 1280x600 | tag y146, heading y180, cards y257 200 high (floor), bottom 457, footer y410; `main` scrolls: scrollHeight 579 against 342; at the end of the scroll (scrollTop 237) the cards end y220 and the footer top is y410: 190px clear | tag 146, cards 257, h 200, bottom 457, footer 410, scrolls | pass | `pw-shot-exercise-idle-1280x600-dark.png`, `pw-shot-exercise-idle-1280x600-end-dark.png` |
| idle (dark only) | 1280x696 / 690 | 696: cards h 201, no scroll (scrollHeight 438 = clientHeight 438); 690: cards h 200, scrollHeight 602 against 432 (extra scroll below the floor, by design OQ-67) | floor at about 695 at lg | pass | none |
| idle (dark only) | 1280x800 / 900 | 800: tag 196, cards 327 h 259 (bottom 586), footer 610; 900: tag 221, cards 377 h 309 (bottom 686), footer 710 | table rows 800 and 900 | pass | none |
| idle (dark only) | 1920x1080 | tag y266, heading y300, cards y449 255x333 (x565/832/1100), bottom 782, footer y890 | row 1080: 266, 449, 333, 782, 890 | pass | `pw-shot-exercise-idle-1920x1080-dark.png` |
| idle | 390x844 | cards 358x88 at y203/303/403, last card ends y491, footer 390x120 at y724, tag y108, heading y142; SKIP and CHECK 173x64 | unchanged (cards 358x88, last end 491, footer 724) | pass | `pw-shot-exercise-idle-390-{light,dark}.png` |
| selected, correct, wrong modal, wrong dismissed, skipped | 390x844 | cards unchanged in every state (203/303/403, h 88); feedback panel 390x200 at y644, CONTINUE 358x64; modal 358x399 at x16 y223 (no scroll) | panel 200, modal about 400 | pass | `pw-shot-exercise-{selected,correct,wrong-modal,wrong,skipped}-390-{light,dark}.png` |

### Exercise screens, no tag (`/practice`)

| State | Window | Measured | Spec (table rows "no tag") | Result | Screenshots |
|---|---|---|---|---|---|
| idle (dark only) | 1280x720 | no tag, heading y176, cards y253 255x219, bottom 472, labels y416 to 440, footer y530 (58px clear), no scroll (462 = 462) | 253, 219, 472, 530 | pass | `pw-shot-exercise-practice-idle-1280-dark.png` |
| idle (dark only) | 1280x600 | heading y146, cards y223 h 200, bottom 423, footer y410; `main` scrolls (545 against 342); at the end cards end y220, footer y410: 190 clear | 223, 200 (floor), 423, 410, scrolls | pass | `pw-shot-exercise-practice-idle-1280x600-dark.png` |

Every card, label and the selected card's visual edge are above the footer top (y530) at 1280x720 without scrolling, in both themes. Not measured: a lesson exercise without the tag (review exercise that comes round again) and the md width (768 to 1023), so the 64px and 80px md offsets stay unverified. Practice complete, Lesson over and the other end screens were not part of this pass.

### M7, M8, M9

| Item | Result | Numbers |
|---|---|---|
| **M7** question area and cards against the hidden footer at 1280x720 | **resolved** | tag y176 (spec 176), cards y287 to 506 against footer y530; spec line 150 now states the rule in CSS pixels |
| **M8** same card again | **resolved** | `HTMLMediaElement.prototype.play` wrapper: first selection of "kook" played `/audio/cake.mp3` once; two more clicks on the already selected card added one `/audio/cake.mp3` each; the key `3` pressed twice added one each (5 plays for 1 select + 2 re-clicks + 2 key presses); still exactly one radio checked, CHECK stayed enabled, no focus move off the input |
| **M9** silent first 2.2 s | **resolved** (one 10 ms window noted) | one clean run (a same-origin iframe loading `/lesson/u1-l2` as a full page load; times are `performance.now()` offsets from the iframe's creation, the cards polled every 5 ms): `GET /audio/manifest.json` started at 478 ms and ended at 491 ms (13 ms); the cards (`[role=radiogroup] label`) first appeared at 484 ms; a click was made 100 ms later, at 593 ms, which is the time of the first successful selection from page load; the wrapped `play()` ran at 587 ms for `/audio/cake.mp3` and the mp3 request followed (594 to 598 ms), one radio checked. Separate earlier run, same method: a click 11 ms after the cards appeared (425 ms), before the manifest response (430 ms), played nothing and nothing later either (the hook plays only when the manifest is already loaded, `useSpeech.ts` lines 283 to 289); that window is about 10 ms with the mock and exists because the manifest request starts after the lesson answer |
| Manifest requests | pass | `performance.getEntriesByType('resource')`: 1 request to `/audio/manifest.json` for the first lesson (StrictMode dev), still 1 after going `/learn`, then `/lesson/u1-l3` in the same page session (SPA navigation through `popstate`); the first selection in the second lesson played `/audio/coffee.mp3` at once |
| Manifest in the lesson flow | pass | `public/audio/manifest.json` is served by Vite (the audio handler is opt-in and not in the default mock set), 200 JSON, so a missing mock does not feed the non-JSON re-arm |

### Defect: stopped mock worker

Reached through `browser_run_code_unsafe` (a CDP session: `ServiceWorker.enable`, then `ServiceWorker.stopWorker` for the version of `localhost:5391`; the task named it explicitly). Stopping the worker made Chrome restart it at once with no MSW client state: `fetch('/api/lessons/u1-l3')` returned 200 `text/html` (`<!doctype html>`) three times in a row, so the defect reproduces.

| Check | Result |
|---|---|
| Lesson opened (SPA navigation) with the dead worker | load error "We couldn't load this lesson / Something went wrong on our side. Try again in a moment." with TRY AGAIN and BACK TO PATH, focus on "Try again"; console warning "Got a page instead of data from GET /lessons/u1-l3" |
| Worker re-armed by the non-JSON response | after the error, `fetch('/api/lessons/u1-l3')` returned `application/json` without any reload |
| "Try again" recovers without reload | clicked: the lesson opened (heading "Which one of these is “tomato”?", 3 cards), no `<!doctype` text anywhere in the DOM |
| `/learn` with the dead worker | the path still rendered; the console shows "Got a page instead of data from GET /course" (the first response was a page and the screen recovered; not examined further) |
| `visibilitychange` (state `visible`) re-arms | dispatched on `document` with the worker dead: next fetch `application/json`; pass |
| `pageshow` with `persisted: true` re-arms | dispatched on `window`: next fetch `application/json`; pass |
| `pageshow` with `persisted: false` | worker stayed dead (HTML), as specified (the initial load must not re-arm) |

Could not reach: a real tab switch (headless Chromium reports `visibilityState` `visible` all the time, so `visibilitychange` was a synthetic event on a visible document) and a real bfcache restore (`pageshow` was a synthetic `PageTransitionEvent`). The re-arm code path and its effect on the real worker are verified; the browser's own trigger of these two events is not.

Also confirmed: lesson not found (`/lesson/nope`): `role="alert"` is on the text container only (it holds just the heading "We couldn't find this lesson", 295x29 at y320), the column (480 wide, y80, 377 high) also holds the mascot and "Back to path" button outside the alert, focus on "Back to path". Load error with `localStorage.mockScenario` `error`, then switching to `slow` and "Try again": focus moved to the Loading `role="status"` region ("Getting your lesson ready…") and the lesson opened when the answer came. Screenshots `pw-shot-lesson-loaderror-1280-dark.png`; `pw-shot-lesson-notfound-1280-dark.png` re-taken, identical to the earlier file.

### Remaining mismatches

None against the spec lines checked. Spec-figure note: the first-mistake modal measures 585x494 where `exercise-session.md` line 155 says about 497 (385 plus 112); the 3px is outside the 2px tolerance and most likely the spec figure's rounding, not an app defect. Open points, none a defect: (1) the roughly 10 ms window in which a selection made after the cards appear but before the manifest response plays no clip (spec line 204 and rule k accept this; it is nearly unreachable by a person); (2) `/learn` shows "Got a page instead of data from GET /course" in the console when the worker is dead, yet the path renders, which looks like a silent retry after the re-arm (not asserted either way by the spec); (3) the md widths (768 to 1023) and the review exercise without a tag inside a lesson were not measured.

### Verdict

Plan 05 holds. At 1280x720 the cards, their word labels and the selected card's scaled edge sit above the footer in light and dark, with the tag at y176 and the cards at y287 (lesson) or y253 (practice), matching the vertical rule and its table at heights 600, 696, 720, 800, 900 and 1080 (1920 wide for the last), including the 200px floor with the extra 190px of scroll below it; 390x844 is unchanged. M7, M8 and M9 are resolved: re-selecting a card replays its clip once per click or number key without touching the selection, a selection about 100 ms after the cards appear already plays, and the manifest is requested once per page session even across a second lesson. A stopped mock worker, which reproduced over CDP, now shows the load error, re-arms by itself, and "Try again" recovers without a reload; `visibilitychange` and a persisted `pageshow` also re-arm (synthetic events only).
