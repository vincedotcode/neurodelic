// Draws illustrations off the main thread. One job in, one SVG string out.
import { renderIllustration } from './src/render.js';

self.onmessage = (e) => {
  const { id, o } = e.data;
  try {
    self.postMessage({ id, svg: renderIllustration(o) });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
