# Product brief: language-learning prototype

This file records the request exactly as given. It is the single input for the product spec, the plan and the build. The screenshots it mentions are in `docs/product/reference/`; they are references for behaviour and layout only, never for branding.

## The request from the product owner (verbatim)

Focus is on creating a prototype of an agent that can build UI, not on the end result website. In terms of features, I minimally expect:
- A tree-like structure where users can select on which exercise they want to study the language
- The "courses" themselves can be an English -> French course (or whatever other language you're comfortable with), and you can use Google Translate to generate 100-200 exercises and re-use always the same data randomly. I'm not thinking about the data, just the UI and the logic of fetching.
- Talk with AI to come up with what the app should do in certain situations (e.g. correct user input in an exercise, bad user input in an exercise, what the app does when the set of exercises is over, loading screens, etc.)
- If you don't know what I'm talking about, use Duolingo for free on the web and inspire yourself from that. A 5-10 minute session trying to learn French/Spanish/whatever you're into should tell you everything you need to know
- Use the logo of Spiritech and its colors for the app theme, don't re-use Duolingo blue/green colors and its owl. The role of the owl in Duolingo is the role of the blue flame in my app.

## Additional direction from the developer

- Build the login, the learning path and the exercise screen, plus the screens around them (onboarding, lesson over, out of hearts, loading and error states).
- The login and any other input screens are forms: use react-hook-form with zod validation as the team conventions say. The login reference shows the error copy "Invalid email address" and "Password too short" under the fields, with the field outlined in the danger colour.
- Selecting an answer plays the French word out loud (use the browser's speech synthesis in French; no audio files).
- The data (about 120 English to French items with a picture cue each) comes from the mock API through the normal fetching layer, never imported directly.
- Pictures for words are simple illustrations drawn by us (emoji or small SVGs), not Duolingo's art.

## What the reference screenshots show

1. `01-login.png`, `02-login-validation-errors.png`: a centred "Log in" form with email or username and password fields ("Forgot?" link inside the password field), a primary LOG IN button, an OR divider and three social sign-in buttons, a sign-up button top right, a close button top left. The second screenshot shows both fields invalid with their messages.
2. `03-onboarding-level.png`, `04-onboarding-level-selected.png`: the mascot in the top left with a speech bubble ("How much French do you know?"); five level options with signal-bar icons; CONTINUE is disabled until one is chosen; after choosing, the bubble changes to a reaction ("Okay, we'll start fresh!") and the chosen option is highlighted.
3. `05-onboarding-start-choice.png`: "Now let's find the best place to start!" with two choices: Start from scratch, and Find my level.
4. `06-exercise-picture-choice.png`, `07-exercise-option-selected.png`: the exercise screen: close button, progress bar, hearts counter (5); a "NEW WORD" tag and the question "Which one of these is 'tea'?"; three picture cards each with its French word and a keyboard shortcut number; SKIP and CHECK at the bottom, CHECK disabled until a card is selected; the selected card is highlighted.
5. `08-exercise-wrong-answer.png`: after a wrong answer: the hearts counter drops to 4, a bottom panel shows "Correct solution:" with the right word and a CONTINUE button, and a first-time modal explains "Each mistake costs 1 heart!" with a KEEP GOING button.
6. `09-learning-path-tree-reference.png`: a path of lesson nodes in a zigzag column (a similar product, shown only for the tree layout): the current node is highlighted, the rest are locked.

## Out of scope

Real authentication (a mock login that accepts any valid-looking credentials is enough), real sign-in with social providers, payments, streak and XP leaderboards, speaking exercises.
