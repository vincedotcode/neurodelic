# Neurodelic design system

**Quiet body, loud mind.** The interface is the quiet body: paper, one blue-black ink, and a ballpoint pen. The art is the only loud thing on the page.

This file is the source of truth for how the site and the UI kit look and behave. The tokens live in [`ui/neurodelic.css`](ui/neurodelic.css); the React wrappers in [`ui/react.jsx`](ui/react.jsx); the live reference is at [/#/ui](https://neurodelic.vincedotcode.com/#/ui).

## The world

A proof print marked up in ballpoint. The page is cool paper waiting for sign-off. Text is printed in blue-black ink. Every mark a hand would make (an underline, a circle round the active thing, an arrow, a focus ring, the text selection) is the same ballpoint blue. A red pen only ever corrects.

What it refuses:

- The category default for illustration libraries: a white grid of rounded pastel cards under a purple gradient hero.
- The AI default: near-black with a neon glow.

## Colour

| Token | Value | Use |
|---|---|---|
| `--nd-paper` | `#EBEDEF` | Page ground |
| `--nd-paper-raised` | `#F6F7F9` | Plates, fields, panels |
| `--nd-paper-sunken` | `#DEE1E6` | Wells, scrollbar track |
| `--nd-ink` | `#14152B` | Text and solid buttons |
| `--nd-ink-soft` | `#3D3E57` | Secondary text |
| `--nd-ink-faint` | `#5C5D74` | Captions, slugs, crop marks |
| `--nd-pen` | `#2B3BD6` | Every hand mark: underline, circle, arrow, focus, selection |
| `--nd-pen-press` | `#1D2AA6` | Pen on press |
| `--nd-red-pen` | `#C2261C` | Corrections and errors only |
| `--nd-green-pen` | `#0C6E4C` | Done and success only |

There is one accent. If two things on a screen are blue, one of them is wrong.

## Type

- **Bricolage Grotesque** (variable, OFL) for everything a person reads. Display is weight 800 at 78% width, capped at 6rem. Headings are 760 at 84% width. Body text uses the regular width.
- **Geist Mono** (OFL) for code and proof slugs only. Mono is never used as decoration.
- **Scrawl**, the genre's own single-stroke face, for handwritten notes in the margin and the wordmark. It is drawn by [`src/type/scrawl.js`](src/type/scrawl.js), with proportional spacing.

Scale: `--nd-text-xs` 0.75rem, `sm` 0.875rem, `md` 1rem, `lg` 1.1875rem, `xl` 1.5rem, `2xl` 2rem, `3xl` 2.75rem, and `display` `clamp(2.75rem, 1.6rem + 4.6vw, 6rem)`.

## Space and shape

- **Space** comes in 4px steps: `--nd-1` (4px) to `--nd-10` (128px).
- **Wobble.** No corner is a perfect radius. `--nd-wob`, `--nd-wob-alt`, `--nd-wob-sm` and `--nd-wob-round` are hand-drawn elliptical radii.
- **The double edge.** Components get one firm 1.5px line plus a looser second pass (`--nd-mark-pass`), drawn as a mask in `currentColor`. The pass keeps a constant stroke width whatever the box size.
- **Plates.** Art sits in a plate with a thin paper margin, never in a rounded card. A plate marked `.nd-proof` gets crop marks outside its corners, and a `.nd-slug` caption in mono that reads like a print slug: `moment · state · seed · palette`.

## Marks

The pen marks are SVG masks, so they take `currentColor`:

- `--nd-mark-wave`: rules, the range track, the header edge
- `--nd-mark-pass`: the loose second edge
- `--nd-mark-tick`: checkbox
- `--nd-mark-dot`: radio
- `--nd-mark-chevron`: select

There are two word-level marks:

- `.nd-pen-under`: a double ballpoint underline. Used once per page, on the word that matters.
- `.nd-redline`: a red-pen strike for the thing being replaced.

The active item in a segmented control, tab bar or nav gets a pen circle (`aria-pressed`, `aria-selected` or `aria-current`). It does not get a filled pill.

## Components

`nd-` classes in plain CSS, mirrored one to one in React:

- **Type:** display, h1 to h3, lede, link, kbd, code
- **Actions:** button (solid, pen, quiet; sm and icon sizes; busy and disabled states)
- **Inputs:** field with label, hint and error; input, textarea, select; checkbox, radio, switch; range; segmented control; tabs
- **Display:** tag (pen, red, green), plate, panel, note (ok, error), avatar, divider, empty state, progress, loader
- **Overlays:** dialog (native `<dialog>`), toast, `data-tip` tooltip
- **Art:** an `Illustration` component that draws any piece from `renderIllustration()`

The browser's own parts are themed too: selection, caret, scrollbar, `accent-color` and focus ring.

## Motion

- One easing: `--nd-ease` `cubic-bezier(0.16, 1, 0.3, 1)`, an exponential ease-out that never bounces. Two speeds: `--nd-fast` (160ms) and `--nd-slow` (480ms).
- One authored moment: on the home page, a new state spreads out from the picture's focal point, where the thought starts. It is a `clip-path` circle that grows from `data-focal` on the SVG over 1150ms.
- Everything else is a quiet state change.
- `prefers-reduced-motion` turns all of it off, stops the hero from auto-advancing, and the art renders still.

## The art

The eight states of mind each keep their own grounds, palettes and textures. Those come from the genre's eight reference moods, not from the interface tokens. The dark grounds of Tangle and Thermal, the blur in Haze and the flat shards in Burst are on purpose. The interface stays quiet so they can be loud.

| State | Texture |
|---|---|
| Tangle | Contour lines and coloured scribble |
| Thermal | False-colour scan bands |
| Stipple | Dot shading under a deep sky |
| Haze | Film grain and soft blur |
| Collage | Cut paper, halftone and print grain |
| Burst | Paint shards and ink splatter |
| Ember | Pen hatching and flame |
| Wall | Handwriting, everywhere |

The grammar (moments, motifs, focal points) is in the [guide](https://neurodelic.vincedotcode.com/#/guide) and [`SKILL.md`](SKILL.md).

## Provenance

The repo's own code draws every image on the site and in this repo. That includes the 1,024 gallery SVGs, the icons, the Scrawl wordmark and the share image (`site/og.png`, rendered by [`scripts/og.mjs`](scripts/og.mjs) from the same renderer and fonts). There is no stock, no image model, and no traced artwork.
