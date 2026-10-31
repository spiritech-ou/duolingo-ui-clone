# Vocabulary dataset (English to Estonian)

Decisions marked (OQ-nn) are listed in `open-questions.md`.

## Purpose
Define the fixed word list behind every lesson and practice set, how the mock API serves it, and the review it needs before anyone relies on its Estonian. The brief asks for the UI and the fetching logic, not for the data; this file keeps the data honest and predictable.

## Entry points and routes
No route. The dataset is read by the mock API handlers for `GET /api/course`, `GET /api/lessons/:lessonId` and `GET /api/practice` (see `learning-path.md` and `exercise-session.md`). The app never imports it directly; it always arrives through the fetching layer.

## States
Not a screen, so no user-facing states. Dataset rules:

| Rule | Value |
|---|---|
| Size | 120 items (about 120 was asked; exactly 120 gives 24 lessons × 5 words, OQ-14, OQ-42) |
| Source | Authored by the team as a fixed list in the mock data. Not produced by Google Translate or any translation service, and no translation is fetched or generated at run time (OQ-42) |
| Review status | **Unreviewed.** Every item must be reviewed by an Estonian speaker before the data is trusted. The mock data file starts with a comment stating this, and the status is tracked here (see "Review"), not in the API response and not in the app UI (OQ-42) |
| Shape of an item | `id`, `english`, `estonian`, `picture` (`emoji`, `alt`), `lessonId` |
| Word form | Nominative singular, lower case, one word, no article (Estonian has none). Nouns only in this build, so a picture cue always fits |
| Spelling | Correct Estonian spelling with õ, ä, ö, ü, š and ž. Stored as Unicode NFC, with precomposed letters (š is U+0161, ž is U+017E, never `s` plus a combining caron) |
| Picture cue | One emoji (or a small SVG drawn for the app) per item that clearly shows the English word; alt text in English. No emoji whose meaning is ambiguous or that old operating systems cannot draw |
| Assignment | Each item belongs to exactly one lesson, 5 per lesson. The first appearance of an item in its own lesson is flagged `isNewWord` |
| Distractors | The two wrong options of an exercise are other items, never the same item twice, never two items sharing one picture; they are taken from the same unit when possible |
| Determinism | A lesson returns the same exercises, order and options every time (seeded by the lesson id). Practice picks at random from all 120 items |

Sample of the first units (illustrative of the fixed list; the remaining items follow the same rules, all for review):

| Lesson | Theme | Items (Estonian, picture cue, English) |
|---|---|---|
| Unit 1, lesson 1 | Food and drink | tee 🍵 tea; kohv ☕ coffee; leib 🍞 bread; piim 🥛 milk; vesi 💧 water |
| Unit 1, lesson 2 | Food and drink | õun 🍎 apple; juust 🧀 cheese; muna 🥚 egg; kala 🐟 fish; kook 🍰 cake |
| Unit 1, lesson 3 | Food and drink | banaan 🍌 banana; porgand 🥕 carrot; kartul 🥔 potato; tomat 🍅 tomato; kurk 🥒 cucumber |
| Unit 1, lesson 4 | Food and drink | šokolaad 🍫 chocolate; jäätis 🍦 ice cream; maasikas 🍓 strawberry; seen 🍄 mushroom; ananass 🍍 pineapple |
| Unit 2, lesson 1 | Animals | kass 🐱 cat; koer 🐶 dog; hobune 🐴 horse; lehm 🐄 cow; siga 🐷 pig |
| Unit 2, lesson 2 | Animals | lind 🐦 bird; karu 🐻 bear; küülik 🐰 rabbit; mesilane 🐝 bee; žiraff 🦒 giraffe |
| Unit 2, lesson 3 | Nature | puu 🌳 tree; lill 🌸 flower; öö 🌃 night; päike ☀️ sun; kuu 🌙 moon |

These words cover every special letter: õ (õun), ä (jäätis, päike), ö (öö), ü (küülik), š (šokolaad) and ž (žiraff).

## Copy
The Estonian words are data, not interface copy. The question stays English: `Which one of these is “tea”?`; the cards show the Estonian word; the solution panel shows "Correct solution:" and the Estonian word.

## Motion and sound
None. The words are spoken by the browser's Estonian voice when one exists; the behaviour when none exists is defined in `exercise-session.md` (Audio states, OQ-41).

## Data needed
- Served through `GET /api/course`, `GET /api/lessons/:lessonId`, `GET /api/practice?count=5` as defined in the feature specs. The API does not expose a review flag.
- Validated on arrival with zod: `estonian` and `english` non-empty, exactly 3 options with distinct ids, `correctOptionId` among the options.
- A dataset test (for the developer who writes the mock data) must assert: 120 items, 5 per lesson, unique ids, unique `estonian` values, no two items with the same emoji within a lesson, every `estonian` value is NFC, and every string contains only letters that are valid Estonian (a-z, õ, ä, ö, ü, š, ž).

## Accessibility notes
Estonian words carry `lang="et"` wherever shown. Picture cues have English alt text and are never the only way to tell cards apart, because each card also shows its word (see `exercise-session.md`).

## Out of scope
Machine translation, run-time translation, verbs, phrases, sentences, inflected forms, vowel-length or stress marks, audio files, a review workflow inside the app, a user-visible "unreviewed" label (OQ-42).

## Review
Status: **unreviewed, needs an Estonian speaker.** The reviewer checks, for each of the 120 items:
1. the Estonian word is correct for the English word and is the common everyday term;
2. spelling and diacritics (õ, ä, ö, ü, š, ž) are right, and the word is in dictionary form;
3. the picture cue shows the meaning clearly;
4. the word is not offensive or confusing in context;
5. how the browser's Estonian voice reads it, where available (reported separately, since voices vary by device).
The reviewer's outcome (approved, or corrected words) is recorded by changing this status line and the mock data comment.

## Boards
Pending (Penpot not connected).
