// Technical checks, no dependencies: every illustration, icon and glyph renders,
// is well-formed XML, contains no NaN/undefined, is deterministic and stays under a size budget.
import { renderIllustration, catalog, ASPECTS } from '../src/render.js';
import { renderIcon, ICONS } from '../src/icons/render.js';
import { ICON_STYLES, STATES } from '../src/core/tokens.js';
import { renderScrawl, CHARSET } from '../src/type/scrawl.js';

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
}
const strip = (s) => s.replace(/\bnd[a-z0-9]+\b/g, 'ID');

const t0 = Date.now();
let maxKB = 0, total = 0;
for (const it of catalog()) {
  for (const aspect of Object.keys(ASPECTS)) {
    const what = `${it.key} (${aspect})`;
    try {
      const a = renderIllustration({ subject: it.subject, state: it.state, aspect, id: 'ndx' });
      const b = renderIllustration({ subject: it.subject, state: it.state, aspect, id: 'ndx' });
      if (a !== b) fail(what, 'not deterministic');
      common(what, a, 400);
      maxKB = Math.max(maxKB, a.length / 1024); total += a.length;
      const st = STATES.find((s) => s.id === it.state);
      for (const palette of Object.keys(st.palettes)) common(`${what} ${palette}`, renderIllustration({ subject: it.subject, state: it.state, aspect, palette, seed: 42, density: 1.6, hue: 90, animate: false }), 500);
    } catch (e) { fail(what, e.stack); }
  }
}
for (const name of Object.keys(ICONS)) for (const s of ICON_STYLES) {
  try { common(`icon ${name} ${s.id}`, renderIcon(name, { style: s.id }), 24); } catch (e) { fail(`icon ${name}`, e.message); }
}
try { common('scrawl charset', renderScrawl(CHARSET, { style: 'neon' }), 400); } catch (e) { fail('scrawl', e.message); }
for (const s of ICON_STYLES) try { common(`scrawl ${s.id}`, renderScrawl('Hello & 123?', { style: s.id }), 200); } catch (e) { fail('scrawl', e.message); }

console.log(`${checked} renders checked in ${Date.now() - t0}ms. Largest illustration ${maxKB.toFixed(0)} KB, average ${(total / (catalog().length * 3) / 1024).toFixed(0)} KB.`);
if (failures) { console.error(`${failures} failures`); process.exit(1); }
console.log('All checks passed.');
