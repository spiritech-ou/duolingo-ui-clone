# Product decisions

Every item is a decision the UI designer made because the brief, the screenshots or `reference/duolingo-behaviors.md` did not settle it. The product owner has reviewed the list: each row carries its status and the decision now in force. Specs refer to these IDs as (OQ-nn).

Status values: **Approved** (default accepted as written), **Changed** (the owner replaced the default; the specs follow the new decision), **Amended** (approved, but changed by the consequence of another decision), **Superseded** (no longer applies), **Open** (new question raised during the update, awaiting approval).

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
| OQ-13 | Approved | Reaction bubble lines for levels 2 to 5 and the "Find my level" card text are as written in `onboarding.md`. |

## Learning path and course data

| ID | Status | Decision |
|---|---|---|
| OQ-14 | Approved | 6 units of 4 lessons (24 lessons); each lesson teaches 5 words (24 × 5 = 120 pool items), 10 exercises, deterministic per lesson id; practice draws 5 at random. |
| OQ-15 | **Changed** | Every lesson is open: the user can pick any lesson on the tree and start it. There are no locked nodes. Node styles are completed, recommended (one highlighted node with a "START" bubble) and available. The routing guard for locked lessons is removed. |
| OQ-16 | Superseded | The locked-node message no longer exists (OQ-15). |
| OQ-17 | Approved | Completed lessons can be replayed with the same rules and XP as a first run; with OQ-15 any lesson, completed or not, is played the same way. |
| OQ-18 | Approved | When every lesson is completed the path shows the closing card "You finished the French course!" and stays replayable; no node is recommended then. |
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
| OQ-24 | Approved (explicitly) | Out of hearts discards the lesson and offers "PRACTICE TO EARN A HEART" or "QUIT LESSON". Practice is 5 random exercises, costs no hearts, grants +1 heart, then returns to the path. |
| OQ-25 | Approved | Opening a lesson with 0 hearts shows the out-of-hearts screen directly, without loading. |
| OQ-26 | Approved | The "Each mistake costs 1 heart!" modal shows once per user on the first wrong answer or skip, in lesson mode; Enter or Escape dismisses it. |
| OQ-27 | Approved | Praise rotates through "Great job!", "Nice one!", "Perfect!", "Well done!" in order. |
| OQ-28 | Approved | Lesson over shows XP (+10 flat), accuracy and time; "Perfect lesson!" at 100%; XP is not accumulated elsewhere. |
| OQ-29 | Approved | Audio only on card selection, French (`fr-FR`) speech synthesis, a new selection cancels the old one, silent if unavailable, no mute or replay. |
| OQ-30 | Approved | Keyboard: 1 to 3 select cards, Enter checks or continues, Escape opens/closes the exit dialog or the modal, arrows move through cards, no Skip shortcut, shortcuts ignored with modals open, with modifiers and on key repeat. |
| OQ-31 | Approved | Close, Escape and browser Back always ask for confirmation; a refresh discards the lesson (hearts kept). |
| OQ-36 | Approved | The "Too easy / Too difficult / Report" links are not built. |
| OQ-39 | Approved | Pictures are emoji with alt text, or small SVGs drawn for the app. |

## Data fetching

| ID | Status | Decision |
|---|---|---|
| OQ-32 | Approved | 10 s timeout, no automatic retry, two failure messages (connectivity, other), course cached with silent refresh, loading shown instantly. |
| OQ-35 | Approved | The mock layer has a hidden `localStorage` key `mockScenario` (`ok`, `slow`, `timeout`, `error`, `empty`, `notfound`) so every loading, error, empty and not-found state can be reached. |

## Still pending for the human

- OQ-40 (recommended-node rule) is the only open question.
- Penpot is not connected, so no boards exist. The `Boards` section of each spec reads "Pending (Penpot not connected)". Brand colours, the flame artwork and tokens for success, danger, warning and info are still for the design pass; the specs use semantic token names only.
- Screenshot 09 is another product (a chess app). Only its zigzag node layout was used; its locked nodes are not.
- The reference screenshots show Duolingo's owl, green and blue; none are used. The mascot is the Spiritech flame, per `design/brand.md`.
