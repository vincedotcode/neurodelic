// The Neurodelic style system: one genre, eight states of mind.
// A state is a way of making marks. Each one has palettes, a texture and rules.

export const GENRE = {
  name: 'Neurodelic',
  thesis: 'Quiet body, loud mind.',
  tagline: 'Illustrations of what thinking feels like.',
  version: '0.2.0',
};

export const STATES = [
  {
    id: 'tangle', name: 'Tangle', texture: 'Contour lines and coloured scribble',
    mood: 'A thought you can\'t stop thinking',
    summary: 'The body is drawn in dozens of loose contour lines. The mind is a knot of colour that never sits still.',
    rules: ['No edge is drawn once: every contour is several loose passes', 'The body is one ink colour, the mind holds all the colour', 'Lines follow the form, like a pencil feeling its way round'],
    palettes: {
      night: { bg: '#050507', ink: '#EDEAE3', colors: ['#4F5BFF', '#A24BFF', '#FF4FA3', '#FFC93C', '#3FE0C5', '#5AA9FF', '#FF7A3D'] },
      paper: { bg: '#EFEDE6', ink: '#15141A', colors: ['#2433D6', '#7A2BD9', '#E0246E', '#D98F00', '#0E9C84', '#1D6FE0', '#E8531F'] },
      indigo: { bg: '#0B0F3A', ink: '#DCE2FF', colors: ['#FF6FB5', '#FFD23F', '#6CF2D0', '#8E7CFF', '#FF8A4C', '#FFFFFF'] },
      moss: { bg: '#0D140F', ink: '#E8F0DF', colors: ['#B8F25C', '#4FD1C5', '#F2C14E', '#F25C78', '#9B7BFF'] },
    },
  },
  {
    id: 'thermal', name: 'Thermal', texture: 'False-colour scan bands',
    mood: 'Seeing the heat of a feeling',
    summary: 'A scan of a body that is feeling something. Colour is temperature: violet is calm, red is burning.',
    rules: ['Colour always means intensity, never decoration', 'Bands step, they never blend', 'Folds and tissue give it a body; the feeling gives it heat'],
    palettes: {
      scan: { bg: '#000000', ink: '#FFFFFF', ramp: ['#000000', '#1A0633', '#3B0F8C', '#2B3BE0', '#1E8CFF', '#18C6C0', '#4FE36A', '#C8F03A', '#FFE53B', '#FF9A1F', '#FF3B2E', '#FFE6D2'] },
      inferno: { bg: '#000004', ink: '#FFFFFF', ramp: ['#000004', '#1B0C41', '#4A0C6B', '#781C6D', '#A52C60', '#CF4446', '#ED6925', '#FB9B06', '#F7D13D', '#FCFFA4', '#FFFFFF', '#FFFFFF'] },
      ice: { bg: '#000000', ink: '#FFFFFF', ramp: ['#000000', '#071330', '#0B2A6B', '#1447B8', '#1F6BFF', '#22B8FF', '#7FE7FF', '#C9F6FF', '#FFFFFF', '#FFD7F0', '#FF8AD8', '#FF4FB4'] },
      acid: { bg: '#05060A', ink: '#FFFFFF', ramp: ['#05060A', '#0B2E2A', '#0E5C4A', '#119C6B', '#5BD66E', '#C6F03A', '#F7F7A1', '#FFB3E6', '#FF5CC8', '#C21E9C', '#6A0E7E', '#FFFFFF'] },
    },
  },
  {
    id: 'stipple', name: 'Stipple', texture: 'Dot shading under a deep sky',
    mood: 'Standing still while everything moves',
    summary: 'A small, solid figure under an enormous sky. Everything around it is made of dots and slow, wide rings.',
    rules: ['Shade with how many dots, never with grey', 'The figure is solid and small; the world is big', 'Rings and spirals are drawn like crayon on rough paper'],
    palettes: {
      cobalt: { sky: ['#06155C', '#1438C8', '#3F86F0'], ground: '#F2ECDD', dot: '#2C6FE0', ink: '#0B0D1C', light: '#F6F1E4' },
      dusk: { sky: ['#1F0A40', '#7A2AA8', '#F06A9A'], ground: '#F6E6DC', dot: '#9C2F86', ink: '#16081A', light: '#FFE9EF' },
      verdigris: { sky: ['#032A2A', '#0B7A6A', '#5FD3B5'], ground: '#EEF0E2', dot: '#11866F', ink: '#071512', light: '#F2F7EC' },
      noon: { sky: ['#1E4FD8', '#4F92F2', '#A9D3FF'], ground: '#FFF6E6', dot: '#2F6DD8', ink: '#101830', light: '#FFFFFF' },
    },
  },
  {
    id: 'haze', name: 'Haze', texture: 'Film grain and soft blur',
    mood: 'Letting go and falling into it',
    summary: 'Colour fog and heavy grain, with a blurred figure that glows at the edges.',
    rules: ['Nothing has a hard edge', 'Grain on everything, like old film', 'The figure bleeds colour at its rim'],
    palettes: {
      bloom: { bg: '#F4C3A4', ink: '#0A0908', halo: '#FF3B2E', colors: ['#48DFFF', '#FF5FD2', '#FFB36B', '#43C46A', '#FFE9A8', '#8A7CFF'] },
      lagoon: { bg: '#BEE6E0', ink: '#061014', halo: '#FF6A3D', colors: ['#2F8CFF', '#A06BFF', '#FFE07A', '#3DE0A0', '#FF8FB1', '#FFFFFF'] },
      nocturne: { bg: '#16122E', ink: '#020205', halo: '#FF3D7F', colors: ['#5B3CFF', '#FF4FA0', '#2EC5FF', '#FF9F45', '#9DFFDA', '#7A1FA2'] },
      citrus: { bg: '#F6EBA8', ink: '#121008', halo: '#E8341C', colors: ['#FF7A2E', '#FF3E7F', '#7BE495', '#3FA7FF', '#FFF6D8', '#FFC23D'] },
    },
  },
  {
    id: 'collage', name: 'Collage', texture: 'Cut paper, halftone and print grain',
    mood: 'Daydreaming through space',
    summary: 'Heads, mountains, clouds and planets cut from old prints and pasted under a sky full of stars. Thoughts become rainbow roads.',
    rules: ['Everything is cut out and pasted, with a paper edge', 'Shade with halftone dots, like an old print', 'A thought is a ribbon of six colours'],
    palettes: {
      cosmos: { space: '#070912', paper: '#F2E6CF', figure: '#7FC3CF', shade: '#1E3F55', bands: ['#2E5FBF', '#7A4FA8', '#E8433A', '#F28A2E', '#F6C945', '#45B39D'], mountain: ['#5C6F8C', '#E8E2D6'], ground: ['#C9542A', '#E0A15A', '#8C2F1E'], planet: ['#E0B25A', '#C24A2C', '#9FC4D8'] },
      faded: { space: '#1A1712', paper: '#EFE3C8', figure: '#C9A27A', shade: '#4A3020', bands: ['#3C6E8F', '#8A6A9E', '#C2563F', '#D98F48', '#E2C26A', '#6E9E7F'], mountain: ['#6F6A5E', '#E6DCC8'], ground: ['#9C5A32', '#C9A06A', '#5E3420'], planet: ['#D9B77A', '#B05A3A', '#A9B9A0'] },
      pop: { space: '#14104A', paper: '#FFF4E0', figure: '#FF9FB0', shade: '#4A1E5C', bands: ['#00A6FB', '#5B5BD6', '#FF3D7F', '#FF8C1A', '#FFD60A', '#06D6A0'], mountain: ['#3A2E7A', '#F0E6FF'], ground: ['#FF6B35', '#FFC15E', '#C73E1D'], planet: ['#FFD60A', '#FF3D7F', '#7DF9FF'] },
      lunar: { space: '#0B0B0D', paper: '#ECEAE4', figure: '#B9C2C9', shade: '#2A2F36', bands: ['#E8433A', '#F28A2E', '#F6C945', '#45B39D', '#2E5FBF', '#7A4FA8'], mountain: ['#4A4F57', '#DADCDC'], ground: ['#6B6E73', '#A7A9AA', '#3B3D41'], planet: ['#D8D3C7', '#9A9488', '#E8433A'] },
    },
  },
  {
    id: 'burst', name: 'Burst', texture: 'Paint shards and ink splatter',
    mood: 'Too much, all at once',
    summary: 'Paint shards fly out of one point, with patterns, drips and splatter on raw canvas.',
    rules: ['Everything flies out from one point', 'Black is a colour: use it as boldly as orange', 'Edges are torn, never smooth'],
    palettes: {
      riot: { bg: '#E6DCC9', ink: '#15120F', colors: ['#FF5A1F', '#15120F', '#B49CFF', '#FF6F91', '#F4EBDA', '#FF9A3C'] },
      acid: { bg: '#E4E2D6', ink: '#0F1112', colors: ['#C6FF2E', '#0F1112', '#2EC7FF', '#FF3EA5', '#F4F2EA', '#7A5CFF'] },
      blood: { bg: '#EFE8DA', ink: '#140C0C', colors: ['#D7261E', '#140C0C', '#F4EDE0', '#8E1B16', '#F2A33A', '#3D3A8F'] },
      ultra: { bg: '#141313', ink: '#F2EEE6', colors: ['#FF4D00', '#F2EEE6', '#5B3CFF', '#FF2E93', '#FFD400', '#00C2A8'] },
    },
  },
  {
    id: 'ember', name: 'Ember', texture: 'Pen hatching and flame',
    mood: 'A feeling that burns',
    summary: 'Thousands of pen strokes: a hatched body, a scratched red ground and a fire that lights everything near it.',
    rules: ['Every surface is hatched; nothing is flat', 'Light comes only from the fire', 'Strokes follow the form or the heat'],
    palettes: {
      fire: { bg: '#B3241A', ink: '#170606', hatch: ['#7E120D', '#D1392A', '#E5573A', '#5A0B08'], flame: ['#FF5A1F', '#FF9A2E', '#FFD34D', '#FFF4C9'], glow: '#FFB347' },
      violet: { bg: '#3A1466', ink: '#0C0414', hatch: ['#25084A', '#5B24A0', '#7A3CC8', '#16052C'], flame: ['#FF3D9A', '#FF7AD9', '#FFC3F0', '#FFFFFF'], glow: '#FF7AD9' },
      ash: { bg: '#D9D2C3', ink: '#1A1714', hatch: ['#B8AF9C', '#8F8676', '#EDE7DA', '#6E6658'], flame: ['#E23B1F', '#F27B2A', '#F7B548', '#FFF0C8'], glow: '#F27B2A' },
      sea: { bg: '#0C3B5E', ink: '#03101A', hatch: ['#062844', '#14588A', '#1F77B0', '#03182A'], flame: ['#2EE6D6', '#8AF5EA', '#D8FFF9', '#FFFFFF'], glow: '#5EF0E3' },
    },
  },
  {
    id: 'wall', name: 'Wall', texture: 'Handwriting, everywhere',
    mood: 'Every thought written down at once',
    summary: 'A wall covered in handwriting, glowing in five colours, with one still figure standing in front of it.',
    rules: ['Fill the whole frame with writing', 'Where the feeling is strongest, the writing burns brightest', 'The figure is a dark cut-out with a thin rim of light'],
    palettes: {
      electric: { bg: '#1335C9', ink: '#04050C', rim: '#8FB2FF', colors: ['#FFE14D', '#7CFF6B', '#FFFFFF', '#FF4D4D', '#3CE8FF', '#FF8AE2'] },
      night: { bg: '#07080F', ink: '#000000', rim: '#4DE1FF', colors: ['#FF4FD8', '#4DE1FF', '#FFE14D', '#9D7BFF', '#FFFFFF', '#5CFF9D'] },
      chalk: { bg: '#1F2B24', ink: '#0A0F0C', rim: '#F2F0E6', colors: ['#F2F0E6', '#F2D57E', '#9ED9C4', '#F29E9E', '#C3B4F0', '#FFFFFF'] },
      paper: { bg: '#ECE8DD', ink: '#16141A', rim: '#16141A', colors: ['#1335C9', '#D7261E', '#16141A', '#0E8A5F', '#C77700', '#7A2BD9'] },
    },
  },
];

export const STATE_IDS = STATES.map((s) => s.id);
export const stateById = (id) => STATES.find((s) => s.id === id) || STATES[0];

export function paletteFor(stateId, name) {
  const st = stateById(stateId);
  return st.palettes[name] || Object.values(st.palettes)[0];
}

export const ICON_GRID = { size: 24, padding: 2, stroke: 1.5, passes: 3, jitter: 0.35 };

export const ICON_STYLES = [
  { id: 'scribble', name: 'Scribble', summary: 'Three loose passes of one pen, like a sketch you meant to clean up.' },
  { id: 'neon', name: 'Neon', summary: 'A bright line with a soft glow. Made for dark screens.' },
  { id: 'stipple', name: 'Stipple', summary: 'Drawn in dots. Quiet at small sizes, rich at large ones.' },
  { id: 'hatch', name: 'Hatch', summary: 'A pen outline with hatched shading on the heavy parts.' },
];
