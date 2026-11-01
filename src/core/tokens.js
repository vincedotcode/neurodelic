// The Neurodelic style system: one genre, eight states of mind.
// Every state has a palette, a texture and a set of line rules.

export const GENRE = {
  name: 'Neurodelic',
  tagline: 'Illustrations of the inside of a head.',
  version: '0.1.0',
};

export const STATES = [
  {
    id: 'tangle',
    name: 'Tangle',
    mood: 'A thought you can\'t stop thinking',
    summary: 'White scribble outlines on black, with a knot of colour where the thinking happens.',
    texture: 'Scribble',
    rules: ['Never one clean line: every edge is 3 to 6 loose passes', 'Colour only lives inside the mind, the body stays white', 'Lines wander, they never fill a shape flat'],
    palettes: {
      night: { bg: '#050507', ink: '#F4F1EA', colors: ['#5B5BFF', '#B455FF', '#FF5FB8', '#FFD447', '#3FE0C5', '#4AA8FF'] },
      daylight: { bg: '#F4F1EA', ink: '#111014', colors: ['#2B2BD9', '#8A2BE2', '#E0247A', '#E0A400', '#0FA38A', '#1F6FE0'] },
    },
  },
  {
    id: 'thermal',
    name: 'Thermal',
    mood: 'Seeing the heat of a feeling',
    summary: 'False-colour scan bands, from cold violet to burning red, with a soft contour on every edge.',
    texture: 'Contour bands',
    rules: ['Colour means intensity, never decoration', 'Bands step, they don\'t blend', 'Edges are bright, cores are hot'],
    palettes: {
      scan: { bg: '#000000', ink: '#FFFFFF', ramp: ['#000000', '#2A0E5C', '#5B2BC8', '#2F6BFF', '#18C6C0', '#7CE24A', '#FFE53B', '#FF8A1F', '#FF2E2E', '#FFE9D6'] },
      ice: { bg: '#000000', ink: '#FFFFFF', ramp: ['#000000', '#0A1B3D', '#123C8C', '#1F6BFF', '#22B8FF', '#7FE7FF', '#C9F6FF', '#FFFFFF', '#FFD7F0', '#FF8AD8'] },
    },
  },
  {
    id: 'stipple',
    name: 'Stipple',
    mood: 'Standing still while everything moves',
    summary: 'Blue dot fields on warm paper under a deep gradient sky, with one dark figure.',
    texture: 'Stipple dots',
    rules: ['Shade with dot density, never with tone', 'One figure, solid and quiet', 'The sky fades, the ground swirls'],
    palettes: {
      cobalt: { bg: '#F3ECDD', ink: '#0B0B10', sky: ['#0A1A6B', '#1F55E0', '#3E9BFF'], dot: '#2F7FE8' },
      dusk: { bg: '#F6E9E0', ink: '#140A12', sky: ['#2A0A4A', '#8C2BB8', '#FF7AA8'], dot: '#B23A8C' },
    },
  },
  {
    id: 'haze',
    name: 'Haze',
    mood: 'Letting go and falling into it',
    summary: 'Grainy gradient blur, soft colour clouds and a dark silhouette with a warm halo.',
    texture: 'Film grain + blur',
    rules: ['Nothing has a hard edge', 'Grain on everything, like old film', 'The figure glows red at the rim'],
    palettes: {
      bloom: { bg: '#F7C7A5', ink: '#0A0A0A', halo: '#FF3D2E', colors: ['#4FE3FF', '#FF5FD2', '#FFB36B', '#3BB54A', '#FFE7A8'] },
      lagoon: { bg: '#BDE7E2', ink: '#071014', halo: '#FF6A3D', colors: ['#2F8CFF', '#9C6BFF', '#FFE07A', '#3DE0A0', '#FF8FB1'] },
    },
  },
  {
    id: 'collage',
    name: 'Collage',
    mood: 'Daydreaming through space',
    summary: 'Cut-paper heads, rainbow ribbons and planets over a field of stars, printed on grainy paper.',
    texture: 'Halftone + paper',
    rules: ['Everything looks cut out and pasted', 'Ribbons are always 6 bands of colour', 'Shadows are hard and offset'],
    palettes: {
      cosmos: { bg: '#07080F', ink: '#F3E8D2', paper: '#F3E8D2', figure: '#6FB7C2', bands: ['#2E5FBF', '#7A4FA8', '#E8433A', '#F28A2E', '#F6C945', '#45B39D'], ground: '#C9542A' },
      faded: { bg: '#1A1610', ink: '#EFE3C8', paper: '#EFE3C8', figure: '#C9A27A', bands: ['#3C6E8F', '#8A6A9E', '#C2563F', '#D98F48', '#E2C26A', '#6E9E7F'], ground: '#8C5A36' },
    },
  },
  {
    id: 'burst',
    name: 'Burst',
    mood: 'Too much, all at once',
    summary: 'Explosive paint shards flying out from one point, with ink splatter on raw canvas.',
    texture: 'Paint shards + splatter',
    rules: ['Everything flies out from one point', 'Black is a colour, use it boldly', 'Edges are torn, never smooth'],
    palettes: {
      riot: { bg: '#D8CEBD', ink: '#15120F', colors: ['#FF5A1F', '#15120F', '#B49CFF', '#FF6F91', '#F2E6D0', '#FF8C3A'] },
      acid: { bg: '#E4E0D3', ink: '#0F1112', colors: ['#C6FF2E', '#0F1112', '#2EC7FF', '#FF3EA5', '#F2EFE6', '#7A5CFF'] },
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    mood: 'A feeling that burns',
    summary: 'Pen hatching on red, with a white-hot core and flame lines that pull everything up.',
    texture: 'Cross-hatching',
    rules: ['Shade with hatching, every stroke has a direction', 'Light is white-hot at the centre', 'Lines rise like heat'],
    palettes: {
      fire: { bg: '#C8261D', ink: '#1A0B10', glow: ['#FFFBE8', '#FFE26A', '#FFB000', '#FF6A00'], hatch: '#4A0A12' },
      violet: { bg: '#4B1D8F', ink: '#0D0618', glow: ['#FFFFFF', '#FFD6F5', '#FF7AD9', '#C23BFF'], hatch: '#1C0838' },
    },
  },
  {
    id: 'wall',
    name: 'Wall',
    mood: 'Every thought written down at once',
    summary: 'Looping handwriting scribbled in neon over electric blue, with a dark figure in front.',
    texture: 'Cursive loops',
    rules: ['The background is words you can\'t quite read', 'Neon on blue, with patches of colour bleeding through', 'The figure is dark, outlined by the writing'],
    palettes: {
      electric: { bg: '#1E3BE0', ink: '#06081A', colors: ['#FFF06A', '#F7F2D8', '#FFD21F', '#4CC94C', '#FF3B2F'], patches: ['#2E9E3A', '#E8322A', '#5A4BFF', '#FFE34A'] },
      night: { bg: '#0B0B2A', ink: '#000000', colors: ['#7CF3FF', '#F2F2FF', '#B88CFF', '#4CFFB0', '#FF5C9A'], patches: ['#1A2B8C', '#5B1A8C', '#0F6B6B', '#2B2BFF'] },
    },
  },
];

export const STATE_IDS = STATES.map((s) => s.id);
export const stateById = Object.fromEntries(STATES.map((s) => [s.id, s]));

export function paletteFor(stateId, paletteId) {
  const s = stateById[stateId];
  const keys = Object.keys(s.palettes);
  return s.palettes[paletteId] || s.palettes[keys[0]];
}

// The icon grid: 24 x 24, 2px safe area, 1.5px base stroke split into loose passes.
export const ICON_GRID = { size: 24, padding: 2, stroke: 1.5, passes: 3, jitter: 0.35 };

export const ICON_STYLES = [
  { id: 'scribble', name: 'Scribble', summary: 'Three loose pen passes' },
  { id: 'neon', name: 'Neon', summary: 'Scribble with a colour ramp along the line' },
  { id: 'stipple', name: 'Stipple', summary: 'The line, made of dots' },
  { id: 'hatch', name: 'Hatch', summary: 'The line, made of short pen strokes across it' },
];
