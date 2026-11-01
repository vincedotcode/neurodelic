# Neurodelic

**Illustrations of the inside of a head.** A new illustration genre, with a library to browse, tune, copy and download it.

![Neurodelic](site/og.png)

Every illustration pack I found looked the same: flat people, pastel blobs, nothing going on inside. So I made a genre for the moments in a product that are about thinking: loading, focus, an empty page, an error, the moment it clicks.

- **96 illustrations**: 12 ideas, each in 8 states of mind
- **61 icons** on a 24px grid, in 4 hands (Scribble, Neon, Stipple, Hatch)
- **Scrawl**, a single-stroke display typeface
- Everything is **drawn by code**: no stock, no image models, no dependencies

Live at **[neurodelic.vincedotcode.com](https://neurodelic.vincedotcode.com)**.

## The eight states

| State | Texture | Feels like |
|---|---|---|
| Tangle | Scribble | A thought you can't stop thinking |
| Thermal | Contour bands | Seeing the heat of a feeling |
| Stipple | Stipple dots | Standing still while everything moves |
| Haze | Film grain + blur | Letting go and falling into it |
| Collage | Halftone + paper | Daydreaming through space |
| Burst | Paint shards + splatter | Too much, all at once |
| Ember | Cross-hatching | A feeling that burns |
| Wall | Cursive loops | Every thought written down at once |

The full system (principles, palettes, line rules, the icon grid and type) is on the [style guide](https://neurodelic.vincedotcode.com/#/guide).

## Use it

From the site: open any illustration, tune seed, density, colour and shape, then copy the SVG, a React component or a PNG.

From code (browser or Node 18+, no install):

```js
import { renderIllustration } from 'https://neurodelic.vincedotcode.com/src/render.js';

const svg = renderIllustration({ subject: 'thinking', state: 'stipple', seed: 7, aspect: 'wide' });
```

With a coding agent: [`SKILL.md`](SKILL.md) writes the genre down as rules. Drop it into `.claude/skills/neurodelic/SKILL.md` (or your agent's equivalent) and it will pick the right subject and state for each product moment and keep new work on-style.

Static files: `/art/{subject}--{state}.svg`, `/icons/{style}/{name}.svg` and a machine-readable `/catalog.json`.

## Develop

No dependencies. Node 18+.

```bash
npm run dev     # http://localhost:5173, serves site/ and src/
npm run check   # renders all 1,100+ variants: valid SVG, deterministic, size budget
npm run build   # static site + every SVG into dist/
```

```
src/
  core/        tokens (the style system), RNG + geometry, mark-making (scribble, stipple, grain)
  figures.js   original silhouettes on a 400×400 stage
  subjects.js  the 12 ideas: figures + a motif (strokes, energy field, focal point, motion)
  states/      the 8 renderers that turn a scene into a picture
  icons/       icon skeletons + the 4 hands
  type/        Scrawl glyphs
  render.js    renderIllustration()
site/          the library app (vanilla JS, hash router)
scripts/       dev server, build, checks
```

Adding a subject means adding one entry to `src/subjects.js`; it then exists in all eight states. Adding a state means one renderer in `src/states/` plus its tokens in `src/core/tokens.js`.

Deployed on Vercel (`vercel.json`: build `npm run build`, output `dist`).

## License

Code: MIT. Artwork: free for any project, personal or commercial; just don't resell the library itself as an asset pack. See [LICENSE](LICENSE).

Made by [Vince Erkadoo](https://www.vincedotcode.com).
