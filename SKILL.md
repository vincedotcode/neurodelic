---
name: neurodelic
description: Draw illustrations, icons and headline lettering in the Neurodelic genre (scribble heads, scan colours, stipple, grain, collage, paint bursts, hatched fire, neon handwriting). Use when a page needs an illustration for a product moment (onboarding, loading, empty state, error, success, search, sync, upload, offline) or icons that look hand-drawn.
---

# Neurodelic

Neurodelic is an illustration genre for the moments in a product that are about thinking. Everything is drawn by code from one renderer, so new work stays on-style. Don't draw Neurodelic art by hand and don't use image models for it: call the renderer.

Renderer (ES modules, no dependencies, browser or Node 18+):

```js
import { renderIllustration } from 'https://neurodelic.vincedotcode.com/src/render.js';
import { renderIcon } from 'https://neurodelic.vincedotcode.com/src/icons/render.js';
import { renderScrawl } from 'https://neurodelic.vincedotcode.com/src/type/scrawl.js';
```

Static files, if you'd rather link or download one:
- `https://neurodelic.vincedotcode.com/art/{subject}--{state}.svg` (square) and `...--wide.svg`
- `https://neurodelic.vincedotcode.com/icons/{style}/{name}.svg`
- Full index: `https://neurodelic.vincedotcode.com/catalog.json`

## 1. Pick the subject from the product moment

| Product moment | Subject |
|---|---|
| Onboarding, feature launch, blank editor | `new-idea` |
| Focus mode, do not disturb | `deep-focus` |
| Error, rate limit, too many notifications | `overload` |
| Logout, cancel, undo | `letting-go` |
| Search, no results, discovery | `searching` |
| History, archive, notes | `memory` |
| Offline, maintenance, sleep | `dreaming` |
| Integrations, team invite, sync complete | `in-sync` |
| Upload, publish, backup | `upload` |
| Loading, processing, AI generating | `thinking` |
| Empty state, inbox zero | `empty-mind` |
| Success, payment complete, done | `clarity` |

## 2. Pick one state for the whole product

Use ONE state across a product so it reads as one hand. Only mix states on a gallery or a moodboard.

| State | Looks like | Use when the product feels |
|---|---|---|
| `tangle` | White scribble outlines on black, colour knot in the mind | technical, dark UI, developer tools |
| `thermal` | False-colour scan bands, violet to red | data, health, science, analytics |
| `stipple` | Blue dot fields on warm paper, deep gradient sky | calm, editorial, wellbeing |
| `haze` | Grainy gradient blur, silhouette with red rim | soft, consumer, music, social |
| `collage` | Cut-paper figures, rainbow ribbons, stars | playful, creative, education |
| `burst` | Paint shards and splatter on raw canvas | loud, launch pages, events |
| `ember` | Pen hatching on red, white-hot core | intense, security, finance alerts |
| `wall` | Neon handwriting on electric blue | notes, writing, journaling |

## 3. Call it

```js
renderIllustration({
  subject: 'thinking',   // see table above
  state: 'stipple',      // see table above
  palette: 'cobalt',     // optional, each state has 2 (see catalog.json)
  seed: 7,               // any integer; same seed = same picture
  density: 1,            // 0.5 quiet ... 1.6 busy
  hue: 0,                // -180..180, rotate colours toward a brand colour
  aspect: 'square',      // 'square' 400x400 spot, 'wide' 640x400 section, 'tall' 400x500
  animate: true,         // CSS motion inside the SVG, stops for prefers-reduced-motion
}); // -> SVG string
```

Icons: `renderIcon(name, { style: 'scribble' | 'neon' | 'stipple' | 'hatch', size: 24, color: 'currentColor', weight: 1.5, jitter: 1 })`.
Headlines: `renderScrawl('TEXT', { capHeight: 48, style: 'scribble' })`. Scrawl is caps-only and for titles, never body text.

## Rules that keep it on-style

1. One idea per picture. Don't stack two subjects in one frame.
2. Never redraw or trace the output with clean vector lines; the loose passes, dots and grain are the genre.
3. Don't recolour single elements by hand. To match a brand, use `hue` or pick the other `palette`.
4. Keep the same `state` (and usually the same `palette`) across one product.
5. Change `seed` to get a variation, not a different subject.
6. Body text stays in a normal font (Geist or the product's own). Scrawl only for short headlines.
7. Icons use `currentColor` so they follow the surrounding text. Use Neon only on dark backgrounds.
8. Always give the SVG an accessible name: it has a `<title>` and `<desc>` built in; keep them or set `title`.
