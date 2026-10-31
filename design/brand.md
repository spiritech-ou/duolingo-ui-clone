# Brand: Spiritech flame

The product mascot is the Spiritech blue flame. It plays the role the owl plays in Duolingo: it appears in onboarding speech bubbles, empty states, celebration and out-of-hearts screens. Never use Duolingo's owl, its green (#58cc02 family) or its blue (#1cb0f6 family).

## Files

- `design/logo/flame-source.png`: the original artwork supplied by the product owner (flame on a black background).
- `design/logo/flame.svg`: vector trace of the flame, gradient fill plus white inner flame. Use this for the favicon, the app mark and the mascot.
- `design/logo/flame-transparent.png`: 1024 px transparent raster of the same artwork, for places where an SVG is not usable.

## Palette sampled from the artwork

The flame is a vertical gradient from light blue at the top to deep blue at the bottom, with a white inner flame.

| Role | Value |
|---|---|
| flame top | #2f8dcc |
| flame upper middle | #2d83c0 |
| flame middle | #2c77b3 |
| flame lower middle | #2a6ba6 |
| flame lower | #27538c |
| flame bottom | #254a85 |
| inner flame and highlights | #ffffff |
| artwork background | #000000 |

## Rules for the theme

- The primary brand colour is the flame blue. Derive the primary scale (default, hover, pressed, soft tint) from the gradient stops above; keep the hue family.
- The default theme is dark and its page background is exactly #000000, the artwork's own background, so the flame sits on the page with no visible edge. Raised surfaces (header, cards, inputs, panels) step up from black in small neutral increments; they may lean slightly towards the brand blue but never look navy or blue-grey. Borders and dividers are neutral greys. A light theme must exist too, both defined as semantic tokens.
- Success, danger, warning and info colours are ours to choose. They must not be Duolingo's green or blue.
- Every text token must pass the contrast tests the scaffold ships (4.5:1 for normal text, 3:1 for large text and UI components) in both themes. Darken or lighten the token, never relax the test.
- The typeface is Outfit for every text style, headings and body. Self-host it (no external font CDN) and make sure the loaded subsets include the Latin Extended letters the Estonian course needs (õ, ä, ö, ü, š, ž) so no word falls back to another font. The human approved adding the font package for this.
- The flame is used large (mascot, 96 to 160 px) beside speech bubbles and small (24 to 32 px) as the app mark and favicon.
