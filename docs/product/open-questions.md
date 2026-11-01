# Product decisions

Every item is a decision the UI designer made because the brief, the screenshots or `reference/duolingo-behaviors.md` did not settle it. The product owner has reviewed the list: each row carries its status and the decision now in force. Specs refer to these IDs as (OQ-nn).

Status values: **Approved** (default accepted as written), **Changed** (the owner replaced the default; the specs follow the new decision), **Amended** (approved, but changed by the consequence of another decision), **Superseded** (no longer applies), **Open** (new question raised during an update, awaiting approval).

Language change (course is English to Estonian, per the updated brief): rows touched by it are marked "Amended by language change" or are new (OQ-41 to OQ-43, then OQ-48). OQ-42's dataset and OQ-41's audio behaviour (voice first, clips second) are specified in `vocabulary-dataset.md` and `exercise-session.md`.

## Login

| ID | Status | Decision |
|---|---|---|
| OQ-01 | Approved (explicitly) | The identifier field is email only, labelled "Email", validated as an email, error "Invalid email address". |
| OQ-02 | Approved | Password minimum is 8 characters; an empty password shows "Password too short" and an empty email "Invalid email address". |
| OQ-03 | Approved | Validation on first blur, then on change, and on submit; LOG IN is never disabled by validity. |
| OQ-04 | Approved | Mock login accepts any valid email with a password of 8+ characters; emails ending `@fail.test` get 401, `@error.test` get 500. |
| OQ-05 | Approved | Social buttons and "Forgot?" are shown but inert ("Not available in this prototype."); no sign-up button, close button, terms or reCAPTCHA lines; social buttons are text only. |
| OQ-06 | Approved | The product name in copy is "Spiritech". |
| OQ-07 | Approved | Session in `localStorage`, never expires, "Log out" in the path's top bar. |

## State storage and routing

| ID | Status | Decision |
|---|---|---|
| OQ-08 | Approved | Learner state (onboarding answers, completed lessons, hearts, intro flag) is client-only, persisted per user in `localStorage`. The API serves only login, course, lessons and practice. |
| OQ-34 | Approved | The app header shows on login and the path only; onboarding and exercise screens are full-screen without it. |
| OQ-33 | Amended | An unknown lesson id shows "We couldn't find this lesson". The earlier redirect for locked lessons is gone because no lesson is locked (OQ-15). |

## Onboarding

| ID | Status | Decision |
|---|---|---|
| OQ-09 | Approved | Only two steps (level, start choice). No course selection, motivation, daily goal or notifications. |
| OQ-10 | Approved | The lowest level goes straight to the path; levels 2 to 5 show the start-choice step. |
| OQ-11 | Amended by OQ-15 | "Find my level" has no placement test. It only decides which node the path highlights as recommended: the first lesson of unit number equal to the chosen level (level 2 = unit 2 … level 5 = unit 5). No lesson is completed, hidden or locked by it. A one-time note "We recommend starting at Unit N based on your answer." explains the highlight. "Start from scratch" recommends the first lesson. |
| OQ-12 | Approved | No close button on onboarding; step 2 has a "Back" button. |
| OQ-13 | Approved; amended by language change | Reaction bubble lines for levels 2 to 5 and the "Find my level" card text are as written in `onboarding.md`. Every "French" in the onboarding copy now reads "Estonian": "How much Estonian do you know?", "I'm new to Estonian", "Take the easiest lesson of the Estonian course". |

## Learning path and course data

| ID | Status | Decision |
|---|---|---|
| OQ-14 | Approved; amended by language change | 6 units of 4 lessons (24 lessons); each lesson teaches 5 words (24 × 5 = 120 items), 10 exercises, deterministic per lesson id; practice draws 5 at random. The 120 items are the fixed English to Estonian dataset in `vocabulary-dataset.md` (OQ-42), not Google-translated. Course id `et`, title "Estonian". |
| OQ-15 | **Changed** | Every lesson is open: the user can pick any lesson on the tree and start it. There are no locked nodes. Node styles are completed, recommended (one highlighted node with a "START" bubble) and available. The routing guard for locked lessons is removed. |
| OQ-16 | Superseded | The locked-node message no longer exists (OQ-15). |
| OQ-17 | Approved | Completed lessons can be replayed with the same rules and XP as a first run; with OQ-15 any lesson, completed or not, is played the same way. |
| OQ-18 | Approved; amended by language change | When every lesson is completed the path shows the closing card "You finished the Estonian course!" and stays replayable; no node is recommended then. |
| OQ-37 | Approved | No reset-progress control. |
| OQ-40 | **Open (new)** | Which node is recommended once users can play lessons in any order: the first lesson in course order that is not completed, searching from the first lesson of the unit chosen in onboarding onward; if none remains after it, the first not-completed lesson before it. So completing a lesson out of order does not move the highlight past earlier unfinished lessons. Alternative: recommend the lesson right after the one most recently completed. Please approve or change. |

## Exercise session

| ID | Status | Decision |
|---|---|---|
| OQ-19 | Approved (explicitly) | Picture choice is the only exercise type in this build: three options, 10 exercises per lesson, 5 per practice. |
| OQ-20 | Approved | Answers are checked on the client; no request on CHECK. |
| OQ-21 | Approved (explicitly) | Skip costs a heart and shows the solution. |
| OQ-22 | Approved | Wrong and skipped exercises return to the end of the queue; the progress bar counts only correct answers. |
| OQ-23 | Approved (explicitly) | Hearts start at 5, max 5, saved immediately (quitting does not refund), no timed refill; the only way back is practice. |
| OQ-24 | Approved (explicitly) | Out of hearts (shown with the red flame, OQ-46) discards the lesson and offers "PRACTICE TO EARN A HEART" or "QUIT LESSON". Practice is 5 random exercises, costs no hearts, grants +1 heart, then returns to the path. |
| OQ-25 | Approved | Opening a lesson with 0 hearts shows the out-of-hearts screen directly, without loading. |
| OQ-26 | Approved | The "Each mistake costs 1 heart!" modal shows once per user on the first wrong answer or skip, in lesson mode; Enter or Escape dismisses it. |
| OQ-27 | Approved | Praise rotates through "Great job!", "Nice one!", "Perfect!", "Well done!" in order. |
| OQ-28 | Approved | Lesson over shows XP (+10 flat), accuracy and time; "Perfect lesson!" at 100%; XP is not accumulated elsewhere. |
| OQ-29 | Approved; amended by language change (and by OQ-41) | Audio only on card selection, Estonian (`et-EE`) speech synthesis, a new selection cancels the old one, no mute or replay. It no longer stays silent when unavailable: a pre-generated clip is played when there is no voice, and when there is neither the user is told (OQ-41). |
| OQ-30 | Approved | Keyboard: 1 to 3 select cards, Enter checks or continues, Escape opens/closes the exit dialog or the modal, arrows move through cards, no Skip shortcut, shortcuts ignored with modals open, with modifiers and on key repeat. |
| OQ-31 | Approved | Close, Escape and browser Back always ask for confirmation; a refresh discards the lesson (hearts kept). |
| OQ-36 | Approved | The "Too easy / Too difficult / Report" links are not built. |
| OQ-39 | Approved | Pictures are emoji with alt text, or small SVGs drawn for the app. Cues are chosen for the Estonian words in `vocabulary-dataset.md`. |
| OQ-41 | **Amended by the owner's request for audio clips; the no-voice behaviour is still open** | Estonian sound, voice first and clip second. **Decided by the owner:** speech is spoken by the browser's Estonian voice when one exists; otherwise the pre-generated clip of that word is played (one clip per vocabulary word, produced once with the ElevenLabs text-to-speech API using a model that supports Estonian, served from `public/audio/`), from the same user gesture; otherwise (no voice and no clip for the word, or the manifest cannot be loaded) nothing is played and the "Sound unavailable" icon and no-voice notice show exactly as before; the icon and notice appear only when neither a voice nor any clip is available; clips also work in a browser without speech synthesis; a clip that fails to play uses "Couldn't play this word."; a missing or broken manifest is never an error screen; every clip is flagged `needsReview` for an Estonian speaker, like the words (format in `vocabulary-dataset.md`). **Still open, as first proposed (unchanged):** with no voice and no clip the exercise works fully without sound; a disabled, crossed-out speaker icon in the exercise top bar (hidden otherwise, so there is still no mute or replay control); on the first exercise of a session a dismissible notice "No Estonian voice on this device / Words won't be spoken, but you can still do every exercise." (dismissal saved per browser, the icon stays and re-opens the explanation); a different message for browsers with no speech support; a failed playback shows "Couldn't play this word." for 4 s; no other-language voice as a fallback because it would mispronounce Estonian; voice detection waits up to 2 s. Alternatives: show the icon always, show the notice every session, or fall back to a non-Estonian voice. |
| OQ-48 | **Open (new)** | Designer defaults around the audio clips, in force until the owner changes them (the owner's decisions are in OQ-41 and are not repeated here): (1) the icon and notice are decided once both the 2 s voice check and the manifest read have finished, so nothing flashes; (2) "any clip" means the manifest loaded, is valid and lists at least one clip; when it does, a word with no entry plays nothing and shows nothing (no icon), because showing the "no Estonian voice" icon would be wrong for the other words; (3) the voice always wins and a voice that fails to speak does not fall back to the clip; (4) the manifest is read once per exercise screen, on mount, with no retry; a selection made before it has loaded plays nothing (a click must start the sound itself, so a late-arriving clip is never started afterwards); (5) a clip is fetched when its card is selected, not pre-loaded; (6) the clips and manifest are committed to the repository, and a manifest listing only some clips is fine; (7) a clip is matched by the exact Estonian text, so a word corrected after review has no clip until the clips are generated again; (8) a manifest entry whose file is missing counts as a clip that fails to play. Please approve or change. |
| OQ-42 | **Open (new)** | Vocabulary: a fixed, team-authored dataset of exactly 120 nouns (5 per lesson), nominative singular, served by the mock API, never imported directly, never machine-translated. Marked unreviewed and needing an Estonian speaker's review (checklist in `vocabulary-dataset.md`); the flag lives in the data file comment and that spec, not in the API or the app UI. Alternative: a visible "unreviewed vocabulary" label in the app until review is done. |
| OQ-43 | **Open (new)** | Estonian text handling: words are shown exactly as stored (NFC, õ ä ö ü š ž), never upper-cased or accent-stripped; every Estonian word is wrapped in `lang="et"`; the font must include those letters; interface copy and unit titles stay English; the reference screenshots' French wording is read as Estonian. Alternative: translate the interface into Estonian (out of scope today). |

## Failure look of the mascot (red flame)

`design/brand.md` requires the red flame for a wrong answer, a lost heart, error states and the out-of-hearts screen. These two decisions were raised as questions OQ-B and OQ-C in the review of the exercise spec and accepted by the product owner; they are numbered here so the specs can refer to them.

| ID | Status | Decision |
|---|---|---|
| OQ-45 | Approved (explicitly; raised as OQ-B) | A red flame of about 96px at the top of the first-mistake modal, above the hearts row; and a small red flame of about 32px at the left of the title "Correct solution:" in the Wrong and Skipped panels. The Correct panel stays as it is (no red flame). The text carries the message, so both flames are decorative. Specified in `exercise-session.md`. |
| OQ-46 | Approved (explicitly; raised as OQ-C) | Which states are failures (red flame) and which are not (blue flame). Failure: load error (lesson, practice and the learning path), "We couldn't find this lesson" (not found), and the out-of-hearts screen. Not failure: "This lesson has no exercises yet", the learning-path empty state "No lessons yet", loading, Lesson over, Practice complete and the "You finished the Estonian course!" card. Specified in `exercise-session.md` (Flame colour) and `data-loading-states.md`. |
| OQ-47 | **Open (new)** | Designer defaults and gaps around OQ-45 and OQ-46, in force until the owner changes them. Defaults for details the owner did not state: (1) the flame is static, fixed at 32px and 96px on every breakpoint, with an 8px gap to the title text; (2) the Estonian word under the title starts at the flame's left edge (alternative: at the title text's left edge, an extra 40px indent); (3) the modal grows by about 112px (the flame plus a 16px gap) and scrolls inside the window when too short; (4) Wrong and Skipped in practice also show the panel flame (practice never shows the modal); (5) on the lesson and practice routes "Try again" shows Loading, so the flame is blue again until a new failure, while on the learning path the retry shows the skeleton, which has no mascot. Screens outside the accepted list, left unchanged: (6) the shell's "Page not found" and "Something went wrong" screens in `app-shell-and-routing.md` have no mascot, although `design/brand.md` lists "an error" as a red-flame case; (7) the login banner for a failed sign-in has no mascot; (8) "The Correct panel stays blue" is read as "the Correct panel has no mascot" (no blue flame is added); the alternative is a blue flame there. Please approve or change. |

## Data fetching

| ID | Status | Decision |
|---|---|---|
| OQ-32 | Approved | 10 s timeout, no automatic retry, two failure messages (connectivity, other), course cached with silent refresh, loading shown instantly. |
| OQ-35 | Approved | The mock layer has a hidden `localStorage` key `mockScenario` (`ok`, `slow`, `timeout`, `error`, `empty`, `notfound`) so every loading, error, empty and not-found state can be reached. |

## Layout: what the references could not settle

Layout sections were added to every screen spec after the fact. Values come from the reference captures where they show the screen; the rest is derived and needs a decision or a reference.

| ID | Status | Question |
|---|---|---|
| OQ-44 | **Open (new)** | Layout values not derivable from the references: (1) **Capture scale.** The captures are about 2000px wide; whether that is a 1000px window at 2x or a 2000px window at 1x is unknown. The specs quote capture pixels (login column about 500px, onboarding column about 640px, exercise question area about 790px) and treat them as CSS pixels at a 1280 or wider desktop; if the captures are 2x, every width halves and the 500px login column becomes about 250px, which looks too narrow, so 1x is assumed. (2) **Tablet and mobile (about 390).** No reference exists for any screen at those widths; all tablet and mobile behaviour is derived (gutters 24px and 16px, stacking, full-width buttons, stacked cards). (3) **Learning path on desktop.** Screenshot 09 is a phone-sized capture of another product; the 640px path column, the 72px node size and the 50px step are derived from its proportions and from the onboarding column. Its zigzag only moves one step either side of the centre, while the spec's pattern goes two steps (`0, 1, 2, 1, 0, -1, -2, -1`): keep the two-step pattern, or reduce it to one step? (4) **App header.** No capture shows the shell's header (height about 64px is a guess). (5) **Loading, error, empty, not-found, lesson over, practice complete, out of hearts.** No captures exist; these use a centred column about 480px and mascot sizes by analogy. (6) **Mascot size.** The Spiritech flame has no reference size; sizes of 96 to 160px follow the owl in the onboarding captures (about 110px). (7) **Exercise on tablet and mobile.** Whether three cards stay in a row or stack on a 390px screen is a judgement (stacked chosen); Duolingo's real mobile layout was not captured. Please supply captures at about 768 and 390 for login, onboarding and an exercise, or approve the derived values. |

## Layout corrections from the visual pass

The visual pass (`docs/verification/pw-shot-report.md`, M1, M6, N1) found three places where the written Layout of `exercise-session.md` was wrong and the built screen was right. The human decided the spec follows the built screen; no code changes. Nothing is left to approve.

| ID | Status | Decision |
|---|---|---|
| OQ-49 | Approved (human decision after the visual pass; M6) | At a 390px window the modal and dialogs are 358px wide (the width minus 32px), not "about 326px"; the earlier figure was an arithmetic slip. The exit dialog measures 358x293 and the first-mistake modal 358 wide. |
| OQ-50 | Approved (human decision after the visual pass; M1) | The first-mistake modal is about 400px high at 390 wide (measured 399), not "about 520px", which was derived and never measured. On mobile it uses 24px inner padding and gaps instead of the 40px of the desktop dialog, keeps the 96px red flame, and wraps its text to more lines; it fits without scrolling in a 390x844 window. The rule is kept that it scrolls inside the window when the window is shorter (for example a phone in landscape). |
| OQ-51 | Approved (human decision after the visual pass; N1) | The end screens share the 480px column and the 160px mascot but not their content: only Lesson over has the three stats (XP, Accuracy, Time); Practice complete shows its "+1 heart" counter line and Out of hearts its message and two stacked buttons. The earlier line "the three stats in a row of equal cells" for all three screens contradicted the States table and is removed. |

## Still pending for the human

- Open: OQ-44 (layout values the references did not show, above).
- Open: OQ-47 (designer defaults around the red flame, and the screens outside the accepted list: the shell's error screens, the login banner, the Correct panel). OQ-45 and OQ-46 are decided and need no action.
- Open: OQ-40 (recommended-node rule, from the previous round), OQ-41 (the no-voice behaviour; the clip fallback in it is decided), OQ-48 (designer defaults for the audio clips), OQ-42 (vocabulary dataset and review flag), OQ-43 (Estonian text handling).
- Review by an Estonian speaker of the 120 words, and of the 120 generated clips, is a hard dependency for trusting the vocabulary and its sound (see `vocabulary-dataset.md`).
- Penpot is not connected, so no boards exist. The `Boards` section of each spec reads "Pending (Penpot not connected)". Brand colours, the flame artwork and tokens for success, danger, warning and info are still for the design pass; the specs use semantic token names only.
- Screenshot 09 is another product (a chess app). Only its zigzag node layout was used; its locked nodes are not.
- The reference screenshots show Duolingo's owl, green and blue; none are used. The mascot is the Spiritech flame, per `design/brand.md`.
