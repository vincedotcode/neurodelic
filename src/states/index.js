// The eight renderers. Each turns the same scene into its own state of mind.

import { tangle } from './tangle.js';
import { thermal } from './thermal.js';
import { stipple } from './stipple.js';
import { haze } from './haze.js';
import { collage } from './collage.js';
import { burst } from './burst.js';
import { ember } from './ember.js';
import { wall } from './wall.js';

export const RENDERERS = { tangle, thermal, stipple, haze, collage, burst, ember, wall };
