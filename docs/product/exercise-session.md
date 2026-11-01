# Exercise session

Decisions marked (OQ-nn) are listed in `open-questions.md`. Which states show the red flame and which the blue is fixed in "Flame colour" below and in `data-loading-states.md`. Layout reference: `reference/06-exercise-picture-choice.png`, `07-exercise-option-selected.png`, `08-exercise-wrong-answer.png`. Behaviour reference: `reference/duolingo-behaviors.md` sections 1.2 to 1.9 and 4 (mostly UNVERIFIED there; every choice made here is listed in the open questions).

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
| Loading | Route opened with hearts above 0 (lesson mode) or in practice; data is being fetched | Full-screen, the blue flame mascot (bobbing) and "Getting your lesson ready…" (practice: "Getting your practice ready…"); close button visible | Close (leaves at once, no dialog) | Data arrives, fails, or is empty |
| Load error | Request failed, timed out (10 s) or invalid data | The red flame mascot, "We couldn't load this lesson" (practice: "We couldn't load this practice"), message by cause, "Try again" and "Back to path" buttons | Try again, back to path | Retry succeeds (the screen returns to Loading, so the flame turns blue again), or leave |
| Not found | 404 for the lesson id | The red flame mascot, "We couldn't find this lesson", "Back to path" | Back to path | `/learn` |
| Empty lesson | Response has zero exercises | The blue flame mascot (this is not a failure), "This lesson has no exercises yet", "Back to path" | Back to path | `/learn` |
| No hearts on entry | Lesson mode and hearts are 0 on arrival | The out-of-hearts screen (below) without fetching | As in Out of hearts | As in Out of hearts |
| Idle | An exercise is shown with no card selected | Top bar: close button, progress bar, hearts counter, and (only when sound is unavailable, see the Audio states below) a disabled speaker icon. Tag "NEW WORD" when `isNewWord`, the question, three cards, "SKIP" enabled, "CHECK" disabled | Select a card (click or key 1 to 3), skip, close | Select, skip, close |
| Option selected | A card is selected | The chosen card highlighted (primary outline and text, also shows a check); the other cards normal; "CHECK" enabled; the card's Estonian word is spoken by the browser's Estonian voice when one exists, otherwise its recorded clip is played when one exists (Audio rules) | Select another card (highlight moves, new word spoken), check, skip, close | Check, skip, close |
| Correct | CHECK with the right card | The cards lock; bottom panel replaces SKIP/CHECK in the success style: praise line, the Estonian word, "CONTINUE"; the bar advances | Continue, close | Continue |
| Wrong | CHECK with a wrong card | The cards lock, the chosen card marked wrong, the right card marked correct; hearts counter drops by one; bottom panel in the danger style: the small red flame (about 32px) at the left of the title "Correct solution:", the Estonian word below, "CONTINUE" | Continue, close | Continue |
| Skipped | SKIP pressed | Same as Wrong, with no card marked wrong (the right card is marked correct); the same panel, with the small red flame at the left of the title "Correct solution:" | Continue, close | Continue |
| First-mistake modal | The first Wrong or Skipped ever for this user (`hasSeenHeartsIntro` false), lesson mode | A modal over the screen: the red flame mascot (about 96px) centred at the top, above the heart row showing the loss, "Each mistake costs 1 heart!", "Stay sharp and focused to keep your hearts. You got this!", "KEEP GOING"; the Wrong or Skipped panel, with its own small red flame, is behind it | Dismiss with the button, Enter or Escape | Dismiss (flag saved, focus goes to CONTINUE) |
| Next exercise | CONTINUE after Correct, or after Wrong/Skipped with hearts above 0 and exercises left | The next queued exercise in Idle; focus on the question | As in Idle | As in Idle |
| Out of hearts | CONTINUE after a Wrong/Skipped that left hearts at 0, or arrival with 0 hearts | Full-screen red flame mascot (about 160px, slightly tilted and lowered), "You're out of hearts", "Practice to earn a heart, or come back later.", buttons "PRACTICE TO EARN A HEART" and "QUIT LESSON"; the lesson's progress is discarded | Practice, quit | Practice goes to `/practice`; Quit goes to `/learn` |
| Practice mode | `/practice` opened | Same screen as a lesson for 5 exercises from the whole word pool (random each time). Hearts counter shown and fixed; mistakes cost nothing; no first-mistake modal; the Wrong and Skipped panels are identical otherwise, including the small red flame | Same as a lesson | Last exercise answered correctly |
| Practice complete | Queue empty in practice | The blue flame mascot, "Practice complete!", "+1 heart" with the counter, "CONTINUE"; hearts +1 (max 5) saved | Continue | `/learn` |
| Lesson over | Queue empty in lesson mode | The blue flame mascot celebrating; heading "Lesson complete!" (all exercises right first time: "Perfect lesson!"); three stats: "XP" "+10", "Accuracy" "80%", "Time" "2:14"; "CONTINUE". The lesson is saved as completed | Continue | `/learn` (the lesson shows completed; the recommended node is recomputed and centred) |
| Exit dialog | Close button, the Escape key outside a modal, or browser Back while a lesson is in progress (not in Loading or the end screens) | Dialog "Quit lesson?" / "You'll lose your progress in this lesson." with "KEEP LEARNING" and "QUIT" (practice: "Quit practice?"); the screen behind is inert | Keep learning, quit | Keep learning closes the dialog and returns focus; Quit goes to `/learn` |

Flame colour (OQ-45, OQ-46; brand rule in `design/brand.md`). The mascot is the red flame (the failure look: the red artwork, drawn slightly tilted and lowered) in failure states and the blue flame everywhere else. The red flame is never grey or desaturated, and no state mixes the two on one screen element. Exact list for this feature:

| Flame | Where it shows | Size |
|---|---|---|
| Red | Wrong panel and Skipped panel (lesson and practice), at the left of the title "Correct solution:" | about 32px |
| Red | First-mistake modal, centred at the top above the heart row | about 96px |
| Red | Load error and Not found (lesson and practice) | per `data-loading-states.md` (about 120px, 96px on mobile) |
| Red | Out of hearts (reached from CONTINUE or on arrival with 0 hearts) | about 160px |
| Blue | Loading (bobbing), Empty lesson, Lesson over (celebrating), Practice complete | per the existing layout (about 120px loading and empty, about 160px end screens) |
| None | Correct panel (unchanged: it has no mascot, only the success style, praise and the word), exit dialog, Idle, Option selected, Next exercise, the audio notices | Not applicable |

Rules that follow from it:
- Colour follows the state, not the lesson: Wrong or Skipped in practice shows the red flame in the panel exactly as in a lesson (practice costs no heart, but the answer is still wrong); the first-mistake modal is lesson mode only, so practice never shows the 96px flame.
- On the lesson and practice routes, pressing "Try again" on a load error returns to Loading, so the flame is blue again; a second failure shows the red flame again. (On `/learn` the retry shows the skeleton, which has no mascot: see `data-loading-states.md`.)
- The red flame is decorative everywhere in this feature: `alt=""` (no accessible name), because the text already carries the message. It adds no announcement and no focus stop, changes no existing accessible name, and leaves the focus order and the `role="status"` announcements exactly as defined below.
- The flame is the same artwork in the light and dark themes; only the surface behind it changes.

Audio states (OQ-29 as amended, OQ-41 as amended). Words are spoken in this order: the browser's Estonian voice, then the pre-generated clip of that word, then nothing. Two things are known for the screen and re-evaluated when the browser reports new voices:
- the voice status: `checking`, `available`, `no-voice` or `unsupported`;
- the clip status: `checking`, `available` (the manifest loaded, is valid, and lists at least one clip) or `none` (the manifest is missing, cannot be loaded, is not valid, or lists no clip).

Sound exists for the screen when the voice status is `available` or the clip status is `available`. The icon and the notice depend only on that: they show when the voice check and the manifest check have both finished and neither a voice nor any clip is available.

What the containers need to know, in behavioural terms (nothing else about voices, manifests or files): (1) whether any sound exists: still checking, yes, or no, and when no, why: this device has no Estonian voice, or this browser cannot speak at all (this picks the notice text; when a browser cannot speak but clips exist, the answer is simply "yes"); (2) a way to say "speak this word now", called straight from the selection, which cancels whatever is playing and reports one of three outcomes: started, nothing to play for this word (not an error), or failed (shows the message below); (3) a way to stop everything (exercise change, leaving). The container never needs to know whether a given word was spoken by the voice or by a clip.

| State | Trigger | What the user sees | What the user can do | Exit |
|---|---|---|---|---|
| Sound check | Screen mounted; the voice list may still be loading (up to 2 s, or until the browser reports voices) and the manifest is being read | Nothing extra: no icon, no notice; cards work, selecting a card does not speak yet | Everything | Both checks finish |
| Voice on | An Estonian voice exists (a voice whose language is `et-EE` or starts with `et`) | No extra control; selecting a card speaks its word with the voice, whether or not the manifest loaded | Everything | A voice-list change |
| Clips on | No Estonian voice (or no speech synthesis at all) but the clip status is `available` | No extra control, no icon, no notice; selecting a card plays that word's clip. Works in a browser without speech synthesis | Everything | A voice appears (the voice takes over from the next selection); the manifest never reloads during the screen |
| Word without a clip | Sound exists only through clips and the selected word has no clip in the manifest | Nothing plays, nothing is shown (no icon, no notice, no message) | Everything | Select another card |
| No Estonian voice | Speech synthesis exists, no Estonian voice, and the clip status is `none` | A disabled speaker icon (crossed out) in the top bar, and on the first exercise of the session a dismissible notice above the question: "No Estonian voice on this device" / "Words won't be spoken, but you can still do every exercise." with "Got it". Selecting cards works with no sound. No other-language voice is ever used to read Estonian words | Dismiss the notice (saved, so it is not shown again on this browser, `noVoiceNoteDismissed`); press or focus the icon to read the explanation again; do the exercises | A voice appears later (icon and notice disappear) |
| Speech unsupported | The browser has no speech synthesis and the clip status is `none` | Same layout as No Estonian voice with the text "This browser can't speak words aloud" / "You can still do every exercise." | Same | None |
| Playback failed | A voice or a clip was chosen for the word but playing it raises an error (an interruption caused by a newer selection or by leaving the screen is not an error) | A short status message under the cards, "Couldn't play this word.", cleared after 4 s or on the next selection; no automatic retry, and a failed voice does not fall back to the clip | Select again to retry | Message clears |

Stats rules for Lesson over (OQ-28):
- XP: 10 for any completed lesson (replays included).
- Accuracy: `round(100 × (10 − distinct exercises missed or skipped) / 10)`; an exercise missed twice still counts once.
- Time: elapsed time from the first exercise shown to the last CONTINUE, as `m:ss`.

First-mistake modal and skipping: skipping counts as the first mistake and also opens the modal if it has not been seen (OQ-26).

Audio rules (OQ-29 as amended, OQ-41 as amended). Decided by the owner (OQ-41): a, b, c, d, e, f, g, h. Designer defaults (OQ-48): i to n.
- a. Selecting a card, by click or key, speaks that card's Estonian word with the browser's speech synthesis when an Estonian voice exists (utterance `lang` set to `et-EE`, voice chosen from the available voices whose language is `et-EE` or starts with `et`).
- b. Otherwise the clip of that word is played, started from the same user gesture (the selection click or key press) that would have spoken it.
- c. Otherwise (no voice and no clip for that word, or the manifest cannot be loaded) nothing is played, and the existing "Sound unavailable" icon and no-voice notice show exactly as before, under the condition in d.
- d. The icon and the notice appear only when neither a voice nor any clip is available. When clips are available they never appear, even on a device with no Estonian voice or no speech synthesis.
- e. Clips work in a browser without speech synthesis.
- f. A clip that fails to play uses the existing "Couldn't play this word." message.
- g. A missing or broken manifest is never an error screen, banner or message: the screen behaves as if no clips existed.
- h. Clips are machine-generated and each is flagged `needsReview` until an Estonian speaker has checked it (`vocabulary-dataset.md`); this flag is never shown in the app.
- i. A new selection cancels any word still playing, voice or clip, before the new one starts.
- j. Nothing is spoken or played automatically on exercise load, on CHECK, on the feedback panel, or on the end screens. Speech and clips are stopped when the exercise changes or the screen is left.
- k. The manifest is read once when the screen mounts, in parallel with the voice check, and kept for the screen; an exercise or a retry never waits for it. A selection made before the manifest has loaded and before a voice is known plays nothing (as in the Sound check state); because the click must start the sound, the clip is never fetched and started later.
- l. The voice always wins: when a voice exists a clip is never played, even if the manifest lists one. A voice that fails does not hand over to the clip.
- m. A word the selected card shows is matched to the manifest by its exact Estonian text. A word with no entry plays nothing and shows nothing (Word without a clip) as long as sound exists for the screen through other clips; this is the one case where a word stays silent without telling the user, because sound works for the other words. A manifest entry whose file is missing counts as a clip that fails to play (f).
- n. There is no mute control and no replay button. Apart from m and a failed play (f), whenever neither a voice nor a clip exists the user is told through the Audio states above.

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
- Wrong and skipped panel: "Correct solution:" and the Estonian word (for example "tee"). The red flame beside the title has no text of its own.
- The red flame in the first-mistake modal, the Wrong and Skipped panels, the load error, Not found and Out of hearts has no text and no accessible name (`alt=""`); no string is added by the flame.
- Screen-reader announcements (`role="status"`): "Correct. {praise}", "Incorrect. Correct solution: {estonian}. {n} hearts left.", "Skipped. Correct solution: {estonian}. {n} hearts left." (in practice the heart sentence is omitted).
- Audio texts (OQ-41; the recorded clips add no text: no new string, no new label): icon accessible name "Sound unavailable"; icon description for no voice "This device has no Estonian voice, so words won't be spoken."; for unsupported "This browser can't speak words aloud, so sound is off."; notice for no voice "No Estonian voice on this device" / "Words won't be spoken, but you can still do every exercise." with "Got it"; notice for unsupported "This browser can't speak words aloud" / "You can still do every exercise." with "Got it"; playback failure "Couldn't play this word."
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

- Top bar: **about 1320px wide, centred** (close at x 333, progress bar from 389 to 1557, about 1170px wide and 22px high, hearts counter to 1655). The close button is about 24px; the hearts counter (heart plus number) about 62px wide. About 100px below the top of the viewport (bar centre y 101). The speaker icon (only when neither a voice nor any clip is available) sits between the bar and the hearts counter.
- Question area: **about 790px wide, centred** (598 to 1389). Tag "NEW WORD" (about 30px high) at about y 357, question below it (large heading, about 40px), left-aligned to the column's left edge, about 120px between the question and the cards; question text wraps inside the column. The area is not vertically centred; it starts about 330px below the top of the viewport.
- Cards: three in one row filling the question column: each about 256px wide and 334px high, about 12px between them (598 to 853, 865 to 1121, 1133 to 1389). Picture in the upper 60% and about 60px of free space above the label; the Estonian word at the bottom-left and the number-key hint at the bottom-right of the card, with about 30px side padding.
- Bottom action bar: a full-width strip above which a 1-2px divider runs the whole window at about 85% of the viewport height (y 1118 of 1311), height about 190px. "SKIP" is left-aligned (x 387 to 584, about 197px wide, 64px high) and "CHECK" right-aligned (x 1402 to 1600, about 198px wide), their outer edges forming a column about 1213px wide centred on the page; they are vertically centred in the strip.
- Feedback panel (Correct, Wrong, Skipped): replaces the action bar content, a full-width tinted strip about 185px high pinned to the bottom (y 1135 onward in `08`); its content sits in a column about 1225px wide (icon circle at x 373, about 105px, title and word, then "CONTINUE" at x 1397 to 1597, about 200px wide, right-aligned). It stays at the bottom of the viewport while the exercise is above it.
- Red flame in the Wrong and Skipped panels (OQ-45): a 32px by 32px flame at the left of the title "Correct solution:", on the same row, vertically centred on the title's line, with 8px between the flame and the title text. The row (flame plus title) starts at the left edge of the title column, so the flame's left edge is where the title used to start; the Estonian word below keeps starting at that left edge. The large icon circle (about 105px) stays as it is: the flame is in addition to it, not a replacement. The panel keeps its height (about 185px on desktop) and its position; the flame is fixed at 32px at every breakpoint and never scales with the title. The Correct panel has no flame and its layout is unchanged.
- First-mistake modal: about 585px wide, centred on the screen over a darkened overlay (692 to 1277), with 40px inner padding. Top to bottom: the red flame at 96px by 96px, centred horizontally; 16px; the heart row; then heading, text, and the "KEEP GOING" button filling the modal's inner width (about 505px, 66px high), at the spacing the reference shows. The flame adds 96px plus the 16px gap to the reference height, so the modal is about 497px high (385 plus 112) on desktop and is still centred as a whole. If the window is too short for it, the overlay caps the modal at the window height minus 32px and the modal's contents scroll inside it; the flame scrolls with them and is never cropped by the card edge. The exit dialog uses the same dialog width and has no flame.
- End screens (Lesson over, Practice complete, Out of hearts): no reference; derived: a centred column about 480px max, mascot about 160px (red flame on Out of hearts, blue on the other two, see Flame colour), heading, then the content of that screen, and the primary button(s) below, all under the same 480px column and 160px mascot. Lesson over has the three stats ("XP", "Accuracy", "Time") in a row of equal cells; Practice complete shows its counter line ("+1 heart" with the counter); Out of hearts shows its message and its two stacked buttons ("PRACTICE TO EARN A HEART", "QUIT LESSON"), with no stats on either; the "CONTINUE" button fills the column on mobile and is about 240px wide elsewhere. The top bar is not shown on end screens. The Loading, Load error, Not found and Empty lesson screens are not end screens: their column, mascot size (about 120px, 96px on mobile) and vertical rule are in `data-loading-states.md`.

Desktop (1280 and wider): as above; the three column widths stay fixed and centred, and the strips, divider and overlay span the window. At 1280 the top bar (1320) is narrower than the window only slightly, so it is clamped to the window minus 48px of side padding.

Tablet (about 768 to 1279): top bar fills the width minus 24px gutters; question area about 790px or the width minus 48px when narrower; the cards stay in one row of three (each about one third of the area, down to about 200px wide, picture scaled down); the action bar buttons keep about 198px width and align to the gutters.

Mobile (about 390): top bar and question area fill the width minus 16px gutters (about 358px). The three cards stay as a row of three only if each stays at least 100px wide; otherwise (this case) they stack as three full-width rows about 88px high with the picture left, word centred-left and key hint (hidden on touch-only devices) at the right edge, with 12px gaps. The question shrinks one size step and wraps to up to three lines. The progress bar is flexible (about 200px at 390) with the hearts counter fixed at its right. The action bar and feedback panel are pinned to the bottom with the buttons filling the width minus gutters: SKIP and CHECK side by side each about half the width (gap 12px), or CONTINUE full width; the feedback text sits above the button, so the panel grows to about 200px high. On the Wrong and Skipped panels the 32px red flame stays 32px at the left of "Correct solution:" (the title is short and does not wrap, so the row stays on one line) and the panel height is unchanged by it. The modal and dialogs are the width minus 32px (about 358px at 390) and no more than 585px, vertically centred; the first-mistake modal keeps its 96px red flame at the top on mobile (not scaled down) and uses 24px inner padding and 24px gaps instead of the 40px of the desktop dialog, so it is about 400px high at 390 wide (358 wide; measured, the text wraps to more lines) and fits without scrolling in a 390x844 window; it still scrolls inside the window if the window is shorter than that (for example a phone in landscape); "KEEP GOING", "KEEP LEARNING" and "QUIT" fill the width and stack with 12px between them.

Stretches versus fixed: the progress bar, the cards (in width) and the panels' backgrounds stretch; the 32px panel flame and the 96px modal flame are fixed at every breakpoint; button heights, the hearts counter, card heights on desktop and the maximum column widths are fixed; the question, picture and word sizes follow the type scale per breakpoint.

## Motion and sound
- The progress bar fills with a short transition when it advances; the feedback panel slides up from the bottom on Correct, Wrong and Skipped; the hearts counter shakes once and the lost heart fades when a heart is lost; the wrong card shakes once; the selected card scales up slightly; the lesson-over mascot scales in. The red flames add no motion of their own: the panel flame arrives with the panel's slide-up and the modal flame with the modal's own appearance; they do not bob, shake or scale. The failure pose (slight tilt, slightly lowered) is static.
- Reduced motion (`prefers-reduced-motion`): no slide, shake, scale or pop; the bar and panel change instantly; state is carried by colour, icon and text. The red flames are unaffected (they have no motion) and keep their static pose.
- Sound: only the Estonian word on card selection (see Audio rules), spoken by the browser's Estonian voice or, when there is none, played from the word's recorded clip. No effect sounds for correct, wrong or completion. The audio notice appears without motion. Clips are not affected by `prefers-reduced-motion` (a word the user chose to hear is not motion).

## Data needed
- `GET /api/lessons/:lessonId`
  - 200: `{ "id": string, "title": string, "exercises": [ Exercise ] }`.
  - `Exercise`: `{ "id": string, "type": "picture-choice", "english": string, "isNewWord": boolean, "options": [ { "id": string, "estonian": string, "picture": { "emoji": string, "alt": string } } ], "correctOptionId": string }`, with exactly 3 options, `correctOptionId` among them. `estonian` is the word in Estonian spelling, Unicode NFC, shown and spoken as is.
  - The mock returns the same 10 exercises, in the same order and with the same option order, for the same lesson id on every call (deterministic, seeded by the id), drawn from the fixed dataset of about 120 English to Estonian items described in `vocabulary-dataset.md` (OQ-14, OQ-42). Pictures are emoji or small SVGs made for the app (OQ-39).
  - 404: `{ "code": "not_found", "message": string }`. 5xx: `{ "code": "server_error", "message": string }`.
- `GET /api/practice?count=5`
  - 200: same shape as a lesson with `id: "practice"`; exercises are drawn at random from the whole pool on every call, `isNewWord` is false.
  - Errors as above.
- Audio clips (static files, not API endpoints, and never intercepted by the mock layer): `GET /audio/manifest.json` returns the manifest described in `vocabulary-dataset.md` (version, model, voice id, generation time, and a `clips` object keyed by the Estonian word, each entry `{ itemId, file, needsReview }`); `GET /audio/<file>` returns one mp3 clip. A 404, a network failure, a timeout or a manifest that does not match this shape means "no clips" (silent, no message, no retry during the screen). Only the `clips` object, its keys and the `file` of each entry are used by the app; the other fields are provenance.
- Client-only:
  - Profile: `hearts`, `hasSeenHeartsIntro`, `completedLessonIds`, `noVoiceNoteDismissed` (read and written; see `app-shell-and-routing.md`).
  - Session state, in memory only: the queue, current exercise, selected option id, correct count, set of missed exercise ids, start time, whether a modal or dialog is open, voice status (`checking`, `available`, `no-voice`, `unsupported`), clip status (`checking`, `available`, `none`) and the manifest content, the transient playback-failed message. Voice status comes from the browser (`speechSynthesis` voices), clip status from the static manifest, not from the API.
  - Nothing is sent to the server when a lesson ends; completion is written to the profile.
  - The flame colour needs no data: it follows the state (see Flame colour) and uses the red and blue flame artwork already bundled with the app; nothing is fetched or stored for it.
- Loading, error and empty behaviour for both endpoints is also summarised in `data-loading-states.md`.

## Accessibility notes
- Focus order: close button, hearts counter (not focusable, read as text), the radiogroup of cards, SKIP, CHECK. The progress bar is a `progressbar` (`aria-valuenow` = correct count, `aria-valuemax` = steps) labelled "Lesson progress".
- When a new exercise appears, focus moves to the question heading (`tabIndex={-1}`) and it is read out. After CHECK or SKIP, focus moves to CONTINUE and the result is announced through the `role="status"` region. After the first-mistake modal closes, focus returns to CONTINUE.
- Modals and the exit dialog are real dialogs (`role="dialog"`, `aria-modal="true"`, labelled by their heading), trap focus, restore it on close, and make the rest of the screen inert.
- Correct, wrong and selected are never colour alone: icon and text accompany them, and the wrong card also has an "incorrect" accessible description.
- Cards that no longer accept input after checking use `aria-disabled`, not removed from the tab order mid-announcement.
- The red flame (32px in the Wrong and Skipped panels, 96px in the first-mistake modal, and on the load error, Not found and Out of hearts screens) is decorative: `alt=""`, because the text next to it carries the whole message. It is not focusable, is not part of any accessible name, and adds nothing to the `role="status"` announcements, so the announcements, the focus order, the dialog's accessible name (its heading) and where focus lands after CHECK, SKIP and the modal are exactly as written above. The red colour is never the only signal: the wrong card's mark, the panel's icon circle and title, and the hearts counter carry it too.
- Number-key hints on the cards are decorative (`aria-hidden`); the shortcut is described in a visually hidden hint "Press 1 to 3 to choose, Enter to check".
- Colours meet WCAG AA in both themes; the danger and success panels keep 4.5:1 text contrast.
- Every Estonian word (card label, solution panel, announcements) is wrapped with `lang="et"` so assistive tech can pronounce it correctly or fall back; the surrounding text stays English.
- The font used for words must contain õ, ä, ö, ü, š and ž; words are never styled with `text-transform: uppercase` and never ASCII-folded.
- The disabled speaker icon is a focusable button with `aria-disabled="true"`, accessible name "Sound unavailable", and `aria-describedby` pointing at its explanation; activating it re-opens the notice. The notice and the playback-failed message use `role="status"`, so assistive-tech users are told as well as sighted users. State is never shown by the icon colour alone.
- Clips add no accessibility surface: no player control, no focus stop, no announcement when a clip starts or ends. The icon and notice are absent (not hidden-but-focusable) whenever a voice or any clip exists, so screen-reader users hear no "Sound unavailable" on a device where words are in fact played. A clip playing is not a live change and is not announced.

## Out of scope
Other exercise types (translate, word bank, matching, listening, speaking), typo tolerance, timed refill of hearts, buying hearts, streaks, XP totals and leaderboards, a mute setting, a replay-audio button, falling back to a non-Estonian voice, downloading voices, generating speech at run time or calling any text-to-speech service from the app (clips are generated once, offline, see `vocabulary-dataset.md`), an error screen or message for a missing manifest, resuming a lesson after a refresh, "too easy / too difficult / report" feedback, hint lessons, sound effects, a mascot in the Correct panel, a red flame anywhere other than the places listed in Flame colour.

## Boards
Pending (Penpot not connected).
