// Technical checks, no dependencies: every gallery piece, icon and glyph renders, is well-formed XML,
// contains no NaN/undefined, is deterministic and stays under a size budget. Every moment and state
// is also drawn wide, tall and with extreme settings. Pass --quick to check one seed per pair.
import { renderIllustration, catalog } from '../src/render.js';
import { renderIcon, ICONS } from '../src/icons/render.js';
import { ICON_STYLES, STATES } from '../src/core/tokens.js';
import { MOMENTS } from '../src/scene.js';
import { renderScrawl, CHARSET } from '../src/type/scrawl.js';

const quick = process.argv.includes('--quick');
let failures = 0, checked = 0;
const fail = (what, why) => { failures++; console.error(`FAIL ${what}: ${why}`); };

function wellFormed(svg) {
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>|<!--[\s\S]*?-->/g;
  let m, last = 0, text = '';
  while ((m = re.exec(svg))) {
    text += svg.slice(last, m.index); last = re.lastIndex;
    if (!m[2]) continue;
    if (m[1]) { if (stack.pop() !== m[2]) return `mismatched </${m[2]}>`; }
    else if (!m[4]) stack.push(m[2]);
  }
  text += svg.slice(last);
  if (stack.length) return `unclosed <${stack.at(-1)}>`;
  // Inside <style> we allow CSS; elsewhere stray < or unescaped & mean broken markup.
  const outside = text.replace(/@media[^{]*\{[\s\S]*?\}\}|[#.@][^{}<]*\{[^}]*\}/g, '');
  if (/[<>]/.test(outside)) return 'stray angle bracket';
  if (/&(?!amp;|lt;|gt;|quot;|#39;)/.test(svg)) return 'unescaped &';
  return null;
}
function common(what, svg, budgetKB) {
  checked++;
  if (/NaN|undefined|Infinity/.test(svg)) fail(what, 'contains NaN/undefined/Infinity');
  const wf = wellFormed(svg);
  if (wf) fail(what, wf);
  if (svg.length / 1024 > budgetKB) fail(what, `${(svg.length / 1024).toFixed(0)} KB > ${budgetKB} KB budget`);
  return svg.length;
}
const draw = (what, o, budget) => { try { return common(what, renderIllustration({ id: 'ndx', ...o }), budget); } catch (e) { fail(what, e.stack); return 0; } };

const t0 = Date.now();
let maxKB = 0, total = 0, n = 0;
const items = quick ? catalog().filter((it) => it.seed === 1) : catalog();
for (const it of items) {
  const size = draw(it.key, it, 400);
  maxKB = Math.max(maxKB, size / 1024); total += size; n++;
}
for (const m of MOMENTS) for (const st of STATES) {
  const key = `${m.id}--${st.id}`;
  const a = renderIllustration({ moment: m.id, state: st.id, seed: 1, id: 'ndx' });
  if (a !== renderIllustration({ moment: m.id, state: st.id, seed: 1, id: 'ndx' })) fail(key, 'not deterministic');
  draw(`${key} wide`, { moment: m.id, state: st.id, seed: 2, aspect: 'wide' }, 500);
  draw(`${key} tall`, { moment: m.id, state: st.id, seed: 3, aspect: 'tall' }, 500);
  const pals = Object.keys(st.palettes);
  draw(`${key} extreme`, { moment: m.id, state: st.id, seed: 98765, palette: pals[m.id.length % pals.length], density: 1.6, hue: 90, animate: false }, 600);
}
for (const name of Object.keys(ICONS)) for (const s of ICON_STYLES) {
  try { common(`icon ${name} ${s.id}`, renderIcon(name, { style: s.id }), 24); } catch (e) { fail(`icon ${name}`, e.message); }
}
try { common('scrawl charset', renderScrawl(CHARSET, { style: 'neon' }), 400); } catch (e) { fail('scrawl', e.message); }
for (const s of ICON_STYLES) try { common(`scrawl ${s.id}`, renderScrawl('Hello & 123?', { style: s.id }), 200); } catch (e) { fail('scrawl', e.message); }
try { renderIllustration({ moment: 'nope', state: 'tangle' }); fail('unknown moment', 'did not throw'); } catch { /* expected */ }

console.log(`${checked} renders checked in ${((Date.now() - t0) / 1000).toFixed(1)}s. Gallery pieces: ${n}, largest ${maxKB.toFixed(0)} KB, average ${(total / n / 1024).toFixed(0)} KB.`);
if (failures) { console.error(`${failures} failures`); process.exit(1); }
console.log('All checks passed.');
