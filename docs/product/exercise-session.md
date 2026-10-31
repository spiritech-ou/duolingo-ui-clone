# Exercise session

Decisions marked (OQ-nn) are listed in `open-questions.md`. Layout reference: `reference/06-exercise-picture-choice.png`, `07-exercise-option-selected.png`, `08-exercise-wrong-answer.png`. Behaviour reference: `reference/duolingo-behaviors.md` sections 1.2 to 1.9 and 4 (mostly UNVERIFIED there; every choice made here is listed in the open questions).

## Purpose
Let the user study one lesson: answer a series of picture-choice questions, get immediate feedback, manage a limited number of hearts, and finish with a summary. A second mode, practice, lets a user with no hearts earn one back.

## Entry points and routes
- `/lesson/:lessonId`: from any node on `/learn` (every lesson is open, OQ-15).
- `/practice`: only from the out-of-hearts screen.
- Leaving: "Continue" on the summary and "Quit" in the exit dialog go to `/learn` (history entry replaced, so Back does not re-open a finished lesson). An id the course does not contain shows the "Not found" state (OQ-33).

## States
Session rules (these define the transitions below):
- A lesson has 10 exercises, practice has 5 (OQ-19). The session keeps a queue; the first exercise is shown first.
- Exercise type: picture choice only. A question "Which one of these is "tea"?" with 3 picture cards, each showing a picture and its Estonian word (nominative singular, for example "tee" for "tea"), with the number key 1 to 3 shown on the card (OQ-19, OQ-42). Estonian words keep their spelling with õ, ä, ö, ü, š and ž and are never upper-cased or stripped of accents (OQ-43).
- Correct: the exercise leaves the queue, the progress bar advances by one step (steps = initial count; the bar counts correct answers only).
- Wrong or skipped: one heart is lost (lesson mode only, OQ-21, OQ-23) and the exercise goes to the end of the queue, so it comes again until answered correctly (OQ-22). The bar does not move.
- Answers are checked locally against the data already loaded; no request is made on CHECK (OQ-20), so there is no "checking" state.
- Hearts are saved to the profile at the moment they change, so quitting never refunds a heart.
- Hearts never go below 0 or above 5.
- Progress of a lesson (queue, bar, stats) is held in memory only; a refresh or quit restarts the lesson from the beginning (OQ-31).

| State | Trigger | What the user sees | What the user can do | Exit |
|---|---|---|---|---|
| Loading | Route opened with hearts above 0 (lesson mode) or in practice; data is being fetched | Full-screen, flame mascot and "Getting your lesson ready…" (practice: "Getting your practice ready…"); close button visible | Close (leaves at once, no dialog) | Data arrives, fails, or is empty |
| Load error | Request failed, timed out (10 s) or invalid data | Mascot, "We couldn't load this lesson", message by cause, "Try again" and "Back to path" buttons | Try again, back to path | Retry succeeds, or leave |
| Not found | 404 for the lesson id | Mascot, "We couldn't find this lesson", "Back to path" | Back to path | `/learn` |
| Empty lesson | Response has zero exercises | Mascot, "This lesson has no exercises yet", "Back to path" | Back to path | `/learn` |
| No hearts on entry | Lesson mode and hearts are 0 on arrival | The out-of-hearts screen (below) without fetching | As in Out of hearts | As in Out of hearts |
| Idle | An exercise is shown with no card selected | Top bar: close button, progress bar, hearts counter, and (only when sound is unavailable, see the Audio states below) a disabled speaker icon. Tag "NEW WORD" when `isNewWord`, the question, three cards, "SKIP" enabled, "CHECK" disabled | Select a card (click or key 1 to 3), skip, close | Select, skip, close |
| Option selected | A card is selected | The chosen card highlighted (primary outline and text, also shows a check); the other cards normal; "CHECK" enabled; the card's Estonian word is spoken when an Estonian voice is available | Select another card (highlight moves, new word spoken), check, skip, close | Check, skip, close |
| Correct | CHECK with the right card | The cards lock; bottom panel replaces SKIP/CHECK in the success style: praise line, the Estonian word, "CONTINUE"; the bar advances | Continue, close | Continue |
| Wrong | CHECK with a wrong card | The cards lock, the chosen card marked wrong, the right card marked correct; hearts counter drops by one; bottom panel in the danger style: "Correct solution:" and the Estonian word, "CONTINUE" | Continue, close | Continue |
| Skipped | SKIP pressed | Same as Wrong, with no card marked wrong (the right card is marked correct); panel title "Correct solution:" | Continue, close | Continue |
| First-mistake modal | The first Wrong or Skipped ever for this user (`hasSeenHeartsIntro` false), lesson mode | A modal over the screen: heart row showing the loss, "Each mistake costs 1 heart!", "Stay sharp and focused to keep your hearts. You got this!", "KEEP GOING"; the Wrong panel is behind it | Dismiss with the button, Enter or Escape | Dismiss (flag saved, focus goes to CONTINUE) |
| Next exercise | CONTINUE after Correct, or after Wrong/Skipped with hearts above 0 and exercises left | The next queued exercise in Idle; focus on the question | As in Idle | As in Idle |
| Out of hearts | CONTINUE after a Wrong/Skipped that left hearts at 0, or arrival with 0 hearts | Full-screen mascot in a sad pose, "You're out of hearts", "Practice to earn a heart, or come back later.", buttons "PRACTICE TO EARN A HEART" and "QUIT LESSON"; the lesson's progress is discarded | Practice, quit | Practice goes to `/practice`; Quit goes to `/learn` |
| Practice mode | `/practice` opened | Same screen as a lesson for 5 exercises from the whole word pool (random each time). Hearts counter shown and fixed; mistakes cost nothing; no first-mistake modal; wrong panel is identical otherwise | Same as a lesson | Last exercise answered correctly |
| Practice complete | Queue empty in practice | Mascot, "Practice complete!", "+1 heart" with the counter, "CONTINUE"; hearts +1 (max 5) saved | Continue | `/learn` |
| Lesson over | Queue empty in lesson mode | Mascot celebrating; heading "Lesson complete!" (all exercises right first time: "Perfect lesson!"); three stats: "XP" "+10", "Accuracy" "80%", "Time" "2:14"; "CONTINUE". The lesson is saved as completed | Continue | `/learn` (the lesson shows completed; the recommended node is recomputed and centred) |
| Exit dialog | Close button, the Escape key outside a modal, or browser Back while a lesson is in progress (not in Loading or the end screens) | Dialog "Quit lesson?" / "You'll lose your progress in this lesson." with "KEEP LEARNING" and "QUIT" (practice: "Quit practice?"); the screen behind is inert | Keep learning, quit | Keep learning closes the dialog and returns focus; Quit goes to `/learn` |

Audio states (OQ-29 as amended, OQ-41). Voice status is one of `checking`, `available`, `no-voice`, `unsupported`, held for the screen and re-evaluated when the browser reports new voices:

| State | Trigger | What the user sees | What the user can do | Exit |
|---|---|---|---|---|
| Voice check | Screen mounted; the voice list may still be loading (up to 2 s, or until the browser reports voices) | Nothing extra; cards work, selecting a card does not speak yet | Everything | Status becomes `available`, `no-voice` or `unsupported` |
| Sound on | An Estonian voice exists (a voice whose language is `et-EE` or starts with `et`) | No extra control; selecting a card speaks its word | Everything | A voice-list change |
| No Estonian voice | Speech synthesis exists but no Estonian voice | A disabled speaker icon (crossed out) in the top bar, and on the first exercise of the session a dismissible notice above the question: "No Estonian voice on this device" / "Words won't be spoken, but you can still do every exercise." with "Got it". Selecting cards works with no sound. No other-language voice is ever used to read Estonian words | Dismiss the notice (saved, so it is not shown again on this browser, `noVoiceNoteDismissed`); press or focus the icon to read the explanation again; do the exercises | A voice appears later (icon and notice disappear) |
| Speech unsupported | The browser has no speech synthesis | Same layout as No Estonian voice with the text "This browser can't speak words aloud" / "You can still do every exercise." | Same | None |
| Playback failed | A voice exists but speaking raises an error (an interruption caused by a newer selection or by leaving the screen is not an error) | A short status message under the cards, "Couldn't play this word.", cleared after 4 s or on the next selection; no automatic retry | Select again to retry | Message clears |

Stats rules for Lesson over (OQ-28):
- XP: 10 for any completed lesson (replays included).
- Accuracy: `round(100 × (10 − distinct exercises missed or skipped) / 10)`; an exercise missed twice still counts once.
- Time: elapsed time from the first exercise shown to the last CONTINUE, as `m:ss`.

First-mistake modal and skipping: skipping counts as the first mistake and also opens the modal if it has not been seen (OQ-26).

Audio rules (OQ-29 as amended, OQ-41):
- Selecting a card, by click or key, speaks that card's Estonian word with the browser's speech synthesis, using an Estonian voice with language tag `et-EE` (utterance `lang` set to `et-EE`, voice chosen from the available voices whose language is `et-EE` or starts with `et`). If none exists, nothing is spoken and the user is told (Audio states above); the exercise is otherwise identical.
- A new selection cancels any word still playing before speaking the new one.
- Nothing is spoken automatically on exercise load, on CHECK, on the feedback panel, or on the end screens.
- Speech is cancelled when the exercise changes or the screen is left.
- There is no mute control and no replay button. If synthesis, an Estonian voice or playback is missing, the user is always told through the Audio states above; sound never fails silently.

Keyboard rules (OQ-30):
- Keys `1`, `2`, `3` select the matching card in Idle and Option selected (same as click, including the audio). Pressing the number of the selected card keeps it selected.
- `Enter` presses CHECK when it is enabled in Option selected, and CONTINUE when a feedback panel (Correct, Wrong, Skipped) or an end screen is showing. In Idle `Enter` does nothing.
- `Enter` and number keys are ignored while any dialog or modal is open, when a modifier key is held, and for auto-repeat (`event.repeat`), so holding Enter cannot skip several exercises.
- When a native button has focus, `Enter` activates that button instead of the global shortcut, so the same action never fires twice.
- `Escape` closes the first-mistake modal (same as KEEP GOING) or the exit dialog (same as KEEP LEARNING); with none open it opens the exit dialog.
- Skip has no shortcut.
- Cards form a `radiogroup`: Tab enters it, arrow keys move the selection (and speak), Space selects.

## Copy
- Tag: "NEW WORD".
- Question: `Which one of these is “{english}”?` (curly quotes, `english` from the data).
- Card: the Estonian word exactly as in the data, the key hint "1", "2", "3"; picture alt text from the data (for example "A cup of tea"). Example for the question about "tea": cards "tee" (tea), "kohv" (coffee), "leib" (bread).
- Buttons: "SKIP", "CHECK", "CONTINUE", "KEEP GOING", "KEEP LEARNING", "QUIT", "PRACTICE TO EARN A HEART", "QUIT LESSON", "TRY AGAIN" (shown as "Try again" in the load error), "BACK TO PATH".
- Hearts counter accessible name: "{n} hearts left"; "1 heart left"; "No hearts left".
- Correct praise, in this order, repeating after the fourth: "Great job!", "Nice one!", "Perfect!", "Well done!" (OQ-27). The panel also shows the Estonian word.
- Wrong and skipped panel: "Correct solution:" and the Estonian word (for example "tee").
- Screen-reader announcements (`role="status"`): "Correct. {praise}", "Incorrect. Correct solution: {estonian}. {n} hearts left.", "Skipped. Correct solution: {estonian}. {n} hearts left." (in practice the heart sentence is omitted).
- Audio texts (OQ-41): icon accessible name "Sound unavailable"; icon description for no voice "This device has no Estonian voice, so words won't be spoken."; for unsupported "This browser can't speak words aloud, so sound is off."; notice for no voice "No Estonian voice on this device" / "Words won't be spoken, but you can still do every exercise." with "Got it"; notice for unsupported "This browser can't speak words aloud" / "You can still do every exercise." with "Got it"; playback failure "Couldn't play this word."
- First-mistake modal: "Each mistake costs 1 heart!", "Stay sharp and focused to keep your hearts. You got this!", "KEEP GOING".
- Out of hearts: "You're out of hearts", "Practice to earn a heart, or come back later.".
- Exit dialog: "Quit lesson?", "You'll lose your progress in this lesson.", "KEEP LEARNING", "QUIT". Practice: "Quit practice?", "You'll lose your progress in this practice.".
- Lesson over: "Lesson complete!", "Perfect lesson!", labels "XP", "Accuracy", "Time", "CONTINUE".
- Practice complete: "Practice complete!", "+1 heart".
- Loading: "Getting your lesson ready…", "Getting your practice ready…".
- Load error: "We couldn't load this lesson" with "You seem to be offline, or the connection is slow. Check it and try again." (network or timeout) or "Something went wrong on our side. Try again in a moment." (other).
- Not found: "We couldn't find this lesson". Empty: "This lesson has no exercises yet".
- Not shown (OQ-36): the "Too easy", "Too difficult" and "Report" links from the reference.

## Layout
Measured from `reference/06-exercise-picture-choice.png`, `07-exercise-option-selected.png` and `08-exercise-wrong-answer.png` (captures about 2000 px wide; widths in capture pixels, approximate; see OQ-44). The screen is full-screen with no app header (OQ-34) and has three parts: a top bar, a centred question area and a bottom action bar. Every part is a centred column of its own maximum width.

- Top bar: **about 1320px wide, centred** (close at x 333, progress bar from 389 to 1557, about 1170px wide and 22px high, hearts counter to 1655). The close button is about 24px; the hearts counter (heart plus number) about 62px wide. About 100px below the top of the viewport (bar centre y 101). The speaker icon (no-voice states only) sits between the bar and the hearts counter.
- Question area: **about 790px wide, centred** (598 to 1389). Tag "NEW WORD" (about 30px high) at about y 357, question below it (large heading, about 40px), left-aligned to the column's left edge, about 120px between the question and the cards; question text wraps inside the column. The area is not vertically centred; it starts about 330px below the top of the viewport.
- Cards: three in one row filling the question column: each about 256px wide and 334px high, about 12px between them (598 to 853, 865 to 1121, 1133 to 1389). Picture in the upper 60% and about 60px of free space above the label; the Estonian word at the bottom-left and the number-key hint at the bottom-right of the card, with about 30px side padding.
- Bottom action bar: a full-width strip above which a 1-2px divider runs the whole window at about 85% of the viewport height (y 1118 of 1311), height about 190px. "SKIP" is left-aligned (x 387 to 584, about 197px wide, 64px high) and "CHECK" right-aligned (x 1402 to 1600, about 198px wide), their outer edges forming a column about 1213px wide centred on the page; they are vertically centred in the strip.
- Feedback panel (Correct, Wrong, Skipped): replaces the action bar content, a full-width tinted strip about 185px high pinned to the bottom (y 1135 onward in `08`); its content sits in a column about 1225px wide (icon circle at x 373, about 105px, title and word, then "CONTINUE" at x 1397 to 1597, about 200px wide, right-aligned). It stays at the bottom of the viewport while the exercise is above it.
- First-mistake modal: about 585px wide and 385px high, centred on the screen over a darkened overlay (692 to 1277), with 40px inner padding; heart row at the top, heading, text, "KEEP GOING" button filling the modal's inner width (about 505px, 66px high). The exit dialog uses the same dialog width.
- End screens (Lesson over, Practice complete, Out of hearts) and loading/error/not-found: no reference; derived: a centred column about 480px max, mascot about 160px, heading, the three stats in a row of equal cells, and the primary button(s) below; the "CONTINUE" button fills the column on mobile and is about 240px wide elsewhere. The top bar is not shown on end screens. State screens follow the vertical rule in `data-loading-states.md`.

Desktop (1280 and wider): as above; the three column widths stay fixed and centred, and the strips, divider and overlay span the window. At 1280 the top bar (1320) is narrower than the window only slightly, so it is clamped to the window minus 48px of side padding.

Tablet (about 768 to 1279): top bar fills the width minus 24px gutters; question area about 790px or the width minus 48px when narrower; the cards stay in one row of three (each about one third of the area, down to about 200px wide, picture scaled down); the action bar buttons keep about 198px width and align to the gutters.

Mobile (about 390): top bar and question area fill the width minus 16px gutters (about 358px). The three cards stay as a row of three only if each stays at least 100px wide; otherwise (this case) they stack as three full-width rows about 88px high with the picture left, word centred-left and key hint (hidden on touch-only devices) at the right edge, with 12px gaps. The question shrinks one size step and wraps to up to three lines. The progress bar is flexible (about 200px at 390) with the hearts counter fixed at its right. The action bar and feedback panel are pinned to the bottom with the buttons filling the width minus gutters: SKIP and CHECK side by side each about half the width (gap 12px), or CONTINUE full width; the feedback text sits above the button, so the panel grows to about 200px high. The modal and dialogs are the width minus 32px (about 326px) and no more than 585px, vertically centred; "KEEP GOING", "KEEP LEARNING" and "QUIT" fill the width and stack with 12px between them.

Stretches versus fixed: the progress bar, the cards (in width) and the panels' backgrounds stretch; button heights, the hearts counter, card heights on desktop and the maximum column widths are fixed; the question, picture and word sizes follow the type scale per breakpoint.

## Motion and sound
- The progress bar fills with a short transition when it advances; the feedback panel slides up from the bottom on Correct, Wrong and Skipped; the hearts counter shakes once and the lost heart fades when a heart is lost; the wrong card shakes once; the selected card scales up slightly; the lesson-over mascot scales in.
- Reduced motion (`prefers-reduced-motion`): no slide, shake, scale or pop; the bar and panel change instantly; state is carried by colour, icon and text.
- Sound: only the Estonian word on card selection (see Audio rules), and only when an Estonian voice exists. No effect sounds for correct, wrong or completion. The audio notice appears without motion.

## Data needed
- `GET /api/lessons/:lessonId`
  - 200: `{ "id": string, "title": string, "exercises": [ Exercise ] }`.
  - `Exercise`: `{ "id": string, "type": "picture-choice", "english": string, "isNewWord": boolean, "options": [ { "id": string, "estonian": string, "picture": { "emoji": string, "alt": string } } ], "correctOptionId": string }`, with exactly 3 options, `correctOptionId` among them. `estonian` is the word in Estonian spelling, Unicode NFC, shown and spoken as is.
  - The mock returns the same 10 exercises, in the same order and with the same option order, for the same lesson id on every call (deterministic, seeded by the id), drawn from the fixed dataset of about 120 English to Estonian items described in `vocabulary-dataset.md` (OQ-14, OQ-42). Pictures are emoji or small SVGs made for the app (OQ-39).
  - 404: `{ "code": "not_found", "message": string }`. 5xx: `{ "code": "server_error", "message": string }`.
- `GET /api/practice?count=5`
  - 200: same shape as a lesson with `id: "practice"`; exercises are drawn at random from the whole pool on every call, `isNewWord` is false.
  - Errors as above.
- Client-only:
  - Profile: `hearts`, `hasSeenHeartsIntro`, `completedLessonIds`, `noVoiceNoteDismissed` (read and written; see `app-shell-and-routing.md`).
  - Session state, in memory only: the queue, current exercise, selected option id, correct count, set of missed exercise ids, start time, whether a modal or dialog is open, voice status (`checking`, `available`, `no-voice`, `unsupported`), the transient playback-failed message. Voice status comes from the browser (`speechSynthesis` voices), not from the API.
  - Nothing is sent to the server when a lesson ends; completion is written to the profile.
- Loading, error and empty behaviour for both endpoints is also summarised in `data-loading-states.md`.

## Accessibility notes
- Focus order: close button, hearts counter (not focusable, read as text), the radiogroup of cards, SKIP, CHECK. The progress bar is a `progressbar` (`aria-valuenow` = correct count, `aria-valuemax` = steps) labelled "Lesson progress".
- When a new exercise appears, focus moves to the question heading (`tabIndex={-1}`) and it is read out. After CHECK or SKIP, focus moves to CONTINUE and the result is announced through the `role="status"` region. After the first-mistake modal closes, focus returns to CONTINUE.
- Modals and the exit dialog are real dialogs (`role="dialog"`, `aria-modal="true"`, labelled by their heading), trap focus, restore it on close, and make the rest of the screen inert.
- Correct, wrong and selected are never colour alone: icon and text accompany them, and the wrong card also has an "incorrect" accessible description.
- Cards that no longer accept input after checking use `aria-disabled`, not removed from the tab order mid-announcement.
- Number-key hints on the cards are decorative (`aria-hidden`); the shortcut is described in a visually hidden hint "Press 1 to 3 to choose, Enter to check".
- Colours meet WCAG AA in both themes; the danger and success panels keep 4.5:1 text contrast.
- Every Estonian word (card label, solution panel, announcements) is wrapped with `lang="et"` so assistive tech can pronounce it correctly or fall back; the surrounding text stays English.
- The font used for words must contain õ, ä, ö, ü, š and ž; words are never styled with `text-transform: uppercase` and never ASCII-folded.
- The disabled speaker icon is a focusable button with `aria-disabled="true"`, accessible name "Sound unavailable", and `aria-describedby` pointing at its explanation; activating it re-opens the notice. The notice and the playback-failed message use `role="status"`, so assistive-tech users are told as well as sighted users. State is never shown by the icon colour alone.

## Out of scope
Other exercise types (translate, word bank, matching, listening, speaking), typo tolerance, timed refill of hearts, buying hearts, streaks, XP totals and leaderboards, a mute setting, a replay-audio button, falling back to a non-Estonian voice, downloading voices or audio files, resuming a lesson after a refresh, "too easy / too difficult / report" feedback, hint lessons, sound effects.

## Boards
Pending (Penpot not connected).
