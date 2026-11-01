---
name: neurodelic
description: Draw illustrations, icons and headline lettering in the Neurodelic genre ("quiet body, loud mind": a still figure, with what is happening inside drawn as scribble, thermal scan, stipple, haze, collage, paint burst, pen-hatched fire or handwriting). Use when a screen needs a picture for a product moment (onboarding, loading, empty state, error, success, search, waiting, upload, welcome, AI thinking) or icons and UI that look hand-drawn.
---

# Neurodelic

Neurodelic is an illustration genre for the moments in a product when someone is thinking. Its message is **quiet body, loud mind**: the figure is one still, solid shape, and everything happening inside it is drawn as texture and colour. Everything is drawn by code from one renderer, so new work stays on-style. Don't draw Neurodelic art by hand and don't use image models for it: call the renderer.

Renderer (ES modules, no dependencies, browser or Node 18+):

```js
import { renderIllustration } from 'https://neurodelic.vincedotcode.com/src/render.js';
import { renderIcon } from 'https://neurodelic.vincedotcode.com/src/icons/render.js';
import { renderScrawl } from 'https://neurodelic.vincedotcode.com/src/type/scrawl.js';
```

Static files, if you'd rather link or download one:
- `https://neurodelic.vincedotcode.com/art/{moment}--{state}--{seed}.svg` for the 1,024 gallery pieces (seeds 1 to 4)
- `https://neurodelic.vincedotcode.com/icons/{style}/{name}.svg`
- Full index: `https://neurodelic.vincedotcode.com/catalog.json`

UI kit (paper, one ink, a ballpoint pen): `https://neurodelic.vincedotcode.com/ui/neurodelic.css` and `.../ui/react.jsx`. Docs at `/#/ui`.

## 1. Pick the moment from the screen

| Screen | Moment | What it feels like |
|---|---|---|
| Empty state with a first action, Onboarding, Feature launch | `new-idea` | Something opens up behind the eyes. |
| Focus mode, Timers, Do not disturb | `deep-focus` | Everything turns around one still point. |
| Too many notifications, Rate limits, Errors that pile up | `overload` | Too much, all at once. |
| Log out, Cancel, Delete account | `letting-go` | The ground stops mattering. |
| Loading, Idle screens, Inspiration | `daydream` | A thought leaves and keeps going. |
| Search, No results, Filters | `searching` | Going round it again. |
| Collaboration, Sharing, Invites | `in-sync` | Two heads, one thought. |
| Upload, Progress, Level up | `rising` | Lighter than it was a minute ago. |
| Empty states, All caught up, Inbox zero | `empty-mind` | Nothing to hold. Good. |
| Success, Confirmed, Done | `clarity` | It all lines up. |
| 404, Session expired, Cache cleared | `forgetting` | It was right here a second ago. |
| Are you sure?, Warnings, Confirm dialogs | `doubt` | The same loop, tighter each time. |
| Voice input, Recording, Audio | `listening` | Letting it all come in. |
| Server error, Crash, Connection lost | `broken` | Something cracked. |
| Choose a plan, Settings, A or B | `deciding` | Half of me wants the other half. |
| Create new, Editor, Compose | `making` | It starts in the hands. |
| AI is thinking, Processing, Generating | `thinking` | Turning it over, and over. |
| Courses, Onboarding steps, Docs | `learning` | One layer, then the next. |
| History, Saved items, Archive | `remembering` | Pieces coming back. |
| Sleep mode, Scheduled, Night mode | `dreaming` | Floating somewhere warm. |
| Welcome back, Morning summary, Unlocked | `waking` | The light gets in first. |
| Integrations, Connected, Network | `connecting` | Everything links to everything. |
| Queues, Pending, In review | `waiting` | Rings on still water. |
| Limits reached, Take a break, Usage caps | `burnout` | Running on what is left. |
| Streaks, Productivity, Deep work | `flow-state` | Pulled in, and happy about it. |
| Tips, AI suggestions, Did you know | `insight` | It lands all at once. |
| Wellness, Breathing, Quiet hours | `calm` | Slow water. |
| Page not found, No access, Wrong turn | `lost` | Every way out looks the same. |
| Growth, Analytics, Milestones | `growing` | Branching into something. |
| Sign up, Welcome, Invite accepted | `welcome` | A door that was not there before. |
| Chat, Comments, Messages | `speaking` | Saying it out loud. |
| Community, Teams, Followers | `together` | Many heads, one sky. |

## 2. Pick one state for the whole product

Use ONE state across a product so it reads as one hand. Only mix states on a gallery or a moodboard.

| State | Looks like | Use when the product feels |
|---|---|---|
| `tangle` | Contour-line body, a knot of coloured scribble in the mind | technical, dark UI, developer tools |
| `thermal` | False-colour scan bands, violet to red | data, health, science, analytics |
| `stipple` | Small solid figure under a huge dotted sky, crayon rings | calm, editorial, wellbeing |
| `haze` | Colour fog, heavy grain, a glowing blurred figure | soft, consumer, music, social |
| `collage` | Cut paper, halftone planets, rainbow ribbons | playful, creative, education |
| `burst` | Paint shards, patterns and splatter out of one point | loud, launch pages, events |
| `ember` | Pen hatching on red, a fire that lights the figure | intense, security, alerts |
| `wall` | A wall of glowing handwriting behind a dark figure | notes, writing, journaling |

## 3. Call it

```js
renderIllustration({
  moment: 'thinking',    // see the first table
  state: 'stipple',      // see the second table
  seed: 7,               // any integer; same seed = same picture. 1-4 are the gallery pieces
  palette: 'cobalt',     // optional; each state has 4 (catalog.json). By default the seed picks one
  density: 1,            // 0.5 quiet ... 1.6 busy
  hue: 0,                // -180..180, rotate every colour toward a brand colour
  aspect: 'square',      // 'square' 400x400, 'wide' 640x400, 'tall' 400x500
  animate: true,         // CSS motion inside the SVG; it stops for prefers-reduced-motion
}); // -> SVG string
```

Icons: `renderIcon(name, { style: 'scribble' | 'neon' | 'stipple' | 'hatch', size: 24, color: 'currentColor', weight: 1.5, jitter: 1 })`.
Headlines: `renderScrawl('TEXT', { capHeight: 48, style: 'scribble' })`. Scrawl is caps-only and for titles, never body text.

## Rules that keep it on-style

1. One moment per picture. Don't stack two moments in one frame.
2. The body stays quiet: never add faces, smiles, props, lightbulbs, gears or sparkles to the figure.
3. Never redraw or trace the output with clean vector lines; the loose passes, dots, hatching and grain are the genre.
4. Don't recolour single elements by hand. To match a brand, use `hue` or another `palette`.
5. Keep the same `state` (and usually the same `palette`) across one product.
6. Change `seed` for a variation, not a different moment.
7. Around the art, keep the UI quiet: paper, one ink, one pen colour (the UI kit does this). The picture is the only loud thing on the screen.
8. Body text stays in a normal font (Bricolage Grotesque or the product's own). Scrawl only for short headlines.
9. Icons use `currentColor` so they follow the surrounding text. Use Neon only on dark backgrounds.
10. Keep the accessible name: every SVG has a `<title>` and `<desc>`; pass `title` to change it.
