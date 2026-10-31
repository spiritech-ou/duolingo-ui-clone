# Duolingo behaviour reference (English to French)

Purpose: a behavioural reference for a prototype inspired by Duolingo. No code, assets, branding, colours or mascot are to be reused. Researched 2026-10-31 using web search and page fetches. Duolingo's official help centre (support.duolingo.com) redirected to a bare page and could not be read, so most detail comes from Duolingo's own blog plus third-party write-ups. Anything not confirmed is marked UNVERIFIED. Where the brief supplies a behaviour (picture card selection, "Correct solution" panel, first-time modal), it is treated as the product spec and not as a verified Duolingo fact.

## 1. Web app behaviour

### 1.1 Course structure

- A course is a sequence of units. Each unit has a communication goal and covers the vocabulary and grammar for it. Units are split into short lessons covering speaking, writing, reading and listening. Source: https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo/
- Lessons appear as nodes on a learning path. Node icons differ by type (star, open book, microphone, barbell, video camera, headphones in the Spanish course). Source: same page.
- Each unit includes personalised practice lessons built from content due for review and past mistakes. Source: same page.
- Exercises within a course start with easier recognition types and progress to typing answers. Source: same page.
- Node states: locked, current, completed, practice. The blog confirms nodes differ by type and that completed lessons can be reviewed; the exact visual state names (locked / current / completed / practice-after-completion) are UNVERIFIED from official text but match widely observed behaviour: later nodes are locked until the current one is done, the current node is highlighted, finished nodes are marked complete and can be replayed as practice.
- Users can skip ahead one unit at a time even when starting from the beginning. Source: the Duolingo 101 page above.

### 1.2 What a lesson is

- Lessons are described as "bite-sized"; no official exercise count is given. Source: Duolingo 101 page. A typical lesson of about 10 to 20 exercises is UNVERIFIED (common observation, no source found). Suggested prototype value: 10 exercises.
- Progress bar: fills as exercises are answered correctly (UNVERIFIED in detail). Observed behaviour to implement: one step per exercise completed; a wrong answer does not advance the bar until the exercise is retried and answered correctly. Treat as UNVERIFIED.
- Lesson end: XP is awarded for completing lessons, plus bonuses at milestones. Source: Duolingo 101 page.

### 1.3 Exercise types

Types confirmed to exist: picture choice, translate with word bank or typing, tap/type what you hear (listening), matching pairs, speaking. Sources: https://duolingo.fandom.com/wiki/Exercise (reported via search snippet; the page itself returned 402 when fetched), https://blog.duolingo.com/covering-all-the-bases-duolingos-approach-to-listening-skills/, https://blog.duolingo.com/covering-all-the-bases-duolingos-approach-to-speaking-skills

Per-exercise behaviour. The user actions and the correct/wrong responses below are the brief's spec and general observed behaviour, not official documentation; the whole set of per-input outcomes is UNVERIFIED unless a source is given.

Common rules (UNVERIFIED as official, widely observed and used as the spec):
- The primary button is disabled until the user has provided an answer. Empty or partial input leaves CHECK disabled, so no outcome occurs.
- SKIP is available before checking. Skipping reveals the correct solution in the wrong-style panel. Whether a skip costs a heart is UNVERIFIED; suggested prototype rule: skip counts as a mistake and costs a heart, matching the brief's "SKIP" semantics being a deliberate give-up. Decide explicitly in the design doc.
- Correct: panel in positive style with short praise copy, CONTINUE button. Wrong: panel in negative style, shows the correct solution, CONTINUE button, one heart lost. The Duolingo help text confirms one heart lost per wrong exercise (section 1.5).
- Wrong exercises are re-queued later in the lesson (observed behaviour, UNVERIFIED in sources found).

1. Picture choice ("Which one of these is 'tea'?"): three or more picture cards with French labels. Selecting a card highlights it and plays the French word (the brief's spec). Only one card is selected at a time; selecting another moves the highlight. CHECK enabled once a card is selected. Correct card: correct panel. Other card: wrong panel with "Correct solution: thé" style copy.
2. Translate, word bank: a sentence in one language, a shuffled bank of word tiles. Tapping a tile moves it into the answer line; tapping it again returns it. Empty answer line keeps CHECK disabled. Order matters; also-acceptable alternatives are accepted by Duolingo (UNVERIFIED). Source for tap-from-bank format: https://blog.duolingo.com/covering-all-the-bases-duolingos-approach-to-listening-skills/ and the fandom wiki.
3. Translate, typing: free-text input. Empty input keeps CHECK disabled. Duolingo tolerates minor typos and shows "you have a typo" style feedback with the answer accepted (UNVERIFIED in sources; do not implement unless the design doc asks for it). Accented characters are usually offered on screen as buttons (UNVERIFIED).
4. Listening, "Tap what you hear": a speaker button plays the audio, a blank line plus word bank is shown. A "Can't listen now" link is shown below the bank, which skips the exercise without penalty. Source: https://blog.duolingo.com/learning-with-hearing-aids/ (described in search; page not opened). Penalty-free behaviour is UNVERIFIED. A slower-audio second speaker button exists (UNVERIFIED).
5. Listening, "Type what you hear": same but with free typing. Same input rules as typing translate.
6. Matching pairs: two columns of boxes (even count, half per language). The user taps one box then its partner. A right pair is marked and disabled; a wrong pair flashes then resets. Source for layout: the fandom wiki via search. Whether a wrong pair costs a heart is UNVERIFIED (commonly yes); the exercise completes when all pairs are matched, with CHECK not used.
7. Speaking ("Tap to speak" / "Repeat what you hear"): a microphone button; the browser asks for microphone permission. A skip link such as "Can't speak now" is shown (UNVERIFIED wording). Source for existence and microphone label: https://blog.duolingo.com/covering-all-the-bases-duolingos-approach-to-speaking-skills. For the prototype, speaking can be omitted or simulated; flag as out of scope unless requested.

### 1.4 Feedback panel

- Docked to the bottom of the screen, replacing the CHECK/SKIP bar. Contains status copy, the correct solution when wrong, and one CONTINUE button. This is the brief's spec; Duolingo layout details are UNVERIFIED from official text.
- First-time modal "Each mistake costs 1 heart!" is the brief's spec; the first-mistake explainer in the real product is UNVERIFIED.

### 1.5 Hearts

- Official-blog statements: you lose a heart for each wrong exercise; after five mistakes you must complete a practice lesson to earn a heart back; hearts can be bought with gems; subscribers have unlimited hearts. Source: https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo/
- Start with 5 hearts. Source: same page ("after five mistakes").
- Refill: practice lessons, gems, or waiting. Passive refill of one heart every 4 hours (about 20 hours for a full set of 5) comes only from low-quality guide sites that disagree with each other, so it is UNVERIFIED. Gem prices vary between sources (350, 360, 450, 500 reported), so UNVERIFIED. Duolingo's own statement is that energy (below) fully recharges in about a day, "the same timing as hearts": https://blog.duolingo.com/duolingo-energy/
- Out of hearts: the lesson is interrupted and an out-of-hearts screen offers options (practice to earn a heart, gems, subscription, or wait). The exact screen copy is UNVERIFIED. Suggested prototype options: "Practice to earn a heart", "Wait" (returns to the path), and "Quit lesson".
- Important: Duolingo has been replacing hearts with an "energy" battery for some users (reviewing mistakes at lesson end costs nothing, energy recharges about a day, rewarded ad or gems for more). Only a small group had it at the time of the blog post, and the current rollout state is UNVERIFIED. Source: https://blog.duolingo.com/duolingo-energy/. The prototype uses hearts as the brief states.

### 1.6 XP, streak, lesson-complete screen

- XP is earned for completing lessons, stories, practice and timed challenges, with bonuses. Weekly leaderboards rank XP. Source: https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo/
- Streak: consecutive days with at least one completed lesson; a Streak Freeze protects a missed day. Same source.
- Lesson-complete screen: summary of XP earned, accuracy and time, and a continue button, with streak update when it is the first lesson of the day. The exact stat set (XP, "Amazing" or similar label, accuracy percentage, time) is UNVERIFIED but widely observed; use it as the spec if the design doc agrees. Typical XP per lesson of about 10 is UNVERIFIED.

### 1.7 Loading and error behaviour

No official source found. UNVERIFIED. Suggested prototype behaviour: a full-screen loading state while a lesson loads, an error panel with a Retry button if lesson data fails, and answers not lost on a failed save (retry silently).

### 1.8 Keyboard shortcuts

No official Duolingo source found. A third-party tutorial lists Enter to check/continue and the digits 1 to 3 to pick multiple-choice answers (https://tutorialtactic.com/?p=13268), which is consistent with the brief. Treat as UNVERIFIED but adopt as the spec: number keys select the corresponding card (1 to N), Enter triggers CHECK when enabled, and Enter triggers CONTINUE when the panel is showing. Skip has no known shortcut.

### 1.9 Audio

- Listening exercises play audio via a speaker button; whether the clip autoplays on exercise load is UNVERIFIED but observed (the sentence plays once automatically on listening types).
- For the prototype per the brief: selecting a picture card plays that card's French word. In the real product, the French sentence also plays after a correct answer on translation exercises (observed, UNVERIFIED). Provide a mute setting (UNVERIFIED but sensible, "Can't listen now" supports it).

## 2. Onboarding flow (web)

Verified outline, from https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo/ : choose a language, answer questions about motivations and goals, turn on notifications (reminder time), then choose to start from the beginning or take a placement test to skip units. After a placement test you can review completed lessons but cannot restart from scratch.

Further steps as typically seen on web, all UNVERIFIED in detail since sign-up walls prevented direct inspection:
1. Course selection ("I want to learn..."), picking French from an "I speak English" base.
2. "Why are you learning French?" motivation choices.
3. "How much French do you know?" with level options: "I'm new to French", "I know some common words", "I can have basic conversations", "I can talk about various topics", "I can discuss most topics in detail". Treat these labels as UNVERIFIED approximations.
4. Placement choice: "Start from scratch" vs "Find my level" (the brief's wording; the blog describes it as start from the beginning vs placement test). Picking a level beyond the first leads to the placement choice; the lowest level goes straight to scratch.
5. Daily goal (casual to intense, minutes per day) and optionally notification permission.
6. First lesson is played before account creation; a "Create a profile to save your progress" prompt appears after the first lesson (observed, UNVERIFIED). The brief wants a login form too, so the prototype can show the account prompt after the first lesson and also expose "Log in" on the landing page.

## 3. Open-source clones (feature checklist only)

Our stack is React + TypeScript + Vite + SCSS modules, with no Tailwind and no component library. None of the repos below match fully. We will use them as a feature checklist only and will not copy code, markup, styling or assets. All repos are third-party interpretations; check each licence file before even reading closely.

1. bryanjenningz/react-duolingo. https://github.com/bryanjenningz/react-duolingo. React, TypeScript, Next.js, Tailwind, Zustand (create-t3-app). MIT. 471 stars (fetched 2026-10-31; an earlier snippet said 366). Description: "A simple Duolingo web app clone". The README does not list features, so which of path, hearts, XP it implements is UNVERIFIED. Conflicts: Next.js, Tailwind.
2. sanidhyy/duolingo-clone ("Lingo"). https://github.com/sanidhyy/duolingo-clone. React, Next.js, TypeScript, Tailwind, PostgreSQL, Clerk, Neon, Drizzle, Stripe, Zustand, Vercel. MIT. 693 stars. Features inferred from folder names and captions: lessons, quests, shop, progress view, a hearts modal. XP and units not confirmed by the README. Conflicts: Next.js, Tailwind, shadcn-style components (the repo family uses shadcn), backend services.
3. bernietv/duo-clone. https://github.com/bernietv/duo-clone. Next.js 14, Drizzle, NeonDB, Stripe, Clerk, ElevenLabs voices, shadcn UI, Tailwind, React Admin. MIT. 1 star. Features listed: hearts with out-of-hearts popup, points/XP and leaderboard, exit confirmation popup, practice old lessons to regain hearts, quests, shop to buy hearts with points, pro tier, admin dashboard. Best feature checklist of the set. Conflicts: Next.js, Tailwind, shadcn UI.
4. crist-pereyra/duolingo-clone. https://github.com/crist-pereyra/duolingo-clone. Next.js 14, TypeScript, Tailwind, shadcn/ui, Drizzle, Neon, Stripe. Licence and stars not confirmed (few stars per search). Lesson-related folders only; features UNVERIFIED. Conflicts: Next.js, Tailwind, shadcn/ui.
5. ryancrumble/duolingo-clone. https://github.com/ryancrumble/duolingo-clone. React Native, Expo, TypeScript. 43 stars. No licence found on the page, so assume all rights reserved and do not reuse anything. Features not listed. Conflicts: native mobile, not web.

No Vite-based clone surfaced in searches. Every found repo that is web-based uses Next.js and (mostly) Tailwind, so none is a direct fit for our stack.

## 4. Suggested exercise state machine

States: idle, optionSelected, checking, correct, wrong, lessonOver, outOfHearts.

- idle: no answer given. CHECK disabled. SKIP enabled.
  - Select option or enter answer: go to optionSelected.
  - SKIP: go to wrong (shows solution), costing a heart (decision flagged in 1.3; change if the design doc says otherwise).
- optionSelected: answer present. CHECK enabled.
  - Change selection: stay in optionSelected (card selection also plays its audio).
  - Clear the answer entirely: back to idle.
  - CHECK or Enter: go to checking.
  - SKIP: go to wrong.
- checking: answer is being evaluated (synchronous for local data, brief for server calls). Inputs disabled.
  - Answer is correct: go to correct. Progress bar advances.
  - Answer is wrong: go to wrong. Hearts decrease by one.
  - Evaluation error: return to optionSelected with an error message.
- correct: positive panel, CONTINUE shown.
  - CONTINUE or Enter, more exercises remain: next exercise, go to idle.
  - CONTINUE or Enter, last exercise: go to lessonOver.
- wrong: negative panel with "Correct solution: ..." and CONTINUE. If this is the first mistake ever, show the "Each mistake costs 1 heart!" modal once, persisted in storage; CONTINUE is available after the modal is dismissed.
  - After the mistake, hearts equal zero: go to outOfHearts (on CONTINUE).
  - CONTINUE or Enter with hearts remaining: re-queue the exercise to the end of the lesson, next exercise, go to idle.
- lessonOver: summary shows XP, accuracy and a CONTINUE button back to the path. XP and streak update; the node becomes completed and the next node becomes current.
- outOfHearts: lesson is interrupted, progress for the lesson is discarded (UNVERIFIED in the real product). Offers practice to earn a heart, wait, or quit to the path. Practice that finishes grants a heart and returns to the path or resumes (decide in design doc).
- Global: exit button during a lesson shows a confirmation, then returns to the path from any state except lessonOver. Hearts never go below zero.

## Unverified summary

Everything marked UNVERIFIED above, notably: lesson length, exact progress-bar rules, skip penalty, per-exercise wrong-input details, out-of-hearts screen copy, passive refill timing and gem prices, keyboard shortcuts (only a third-party source), audio autoplay rules, loading and error behaviour, onboarding level wording, stars/licences of the smaller repos.
