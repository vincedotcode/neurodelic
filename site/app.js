// Neurodelic site. No framework: a tiny hash router and string templates.
import { renderIllustration, catalog, ASPECTS } from './src/render.js';
import { STATES, stateById, GENRE, ICON_STYLES, ICON_GRID } from './src/core/tokens.js';
import { SUBJECTS, subjectById } from './src/subjects.js';
import { renderIcon, ICONS } from './src/icons/render.js';
import { ICON_GROUPS } from './src/icons/defs.js';
import { renderScrawl, CHARSET } from './src/type/scrawl.js';
import { esc } from './src/core/util.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const main = $('#main');
const ICON_COUNT = Object.keys(ICONS).length;
const ART_COUNT = SUBJECTS.length * STATES.length;
const SITE = 'https://neurodelic.vincedotcode.com';

// ------------------------------------------------------------ helpers
let toastTimer;
function toast(msg) {
  const t = $('.toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 1800);
}

async function copy(text, msg = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.append(ta); ta.select();
    document.execCommand('copy'); ta.remove(); toast(msg);
  }
}

function download(name, data, type = 'image/svg+xml') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

async function svgToPng(svg, scale = 2) {
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const w = +m[1] * scale, h = +m[2] * scale;
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(url);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}

function toReact(svg, name) {
  const comp = name.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase()).replace(/[^\w]/g, '');
  const body = svg.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  return `// ${comp}.tsx · Neurodelic (${SITE})\nconst svg = \`${body}\`;\n\nexport default function ${comp}(props: React.HTMLAttributes<HTMLSpanElement>) {\n  return <span role="img" {...props} style={{ display: 'inline-block', lineHeight: 0, ...props.style }} dangerouslySetInnerHTML={{ __html: svg }} />;\n}\n`;
}

// Render art off the main thread's critical path: one picture per idle slice.
const queue = [];
let pumping = false;
const idle = window.requestIdleCallback || ((fn) => setTimeout(() => fn({ timeRemaining: () => 8 }), 16));
function pump() {
  if (pumping) return;
  pumping = true;
  idle((dl) => {
    while (queue.length && dl.timeRemaining() > 4) {
      const job = queue.shift();
      if (job.el.isConnected) job.run();
    }
    pumping = false;
    if (queue.length) pump();
  });
}
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    io.unobserve(e.target);
    const el = e.target;
    queue.push({ el, run: () => paintThumb(el) });
    pump();
  }
}, { rootMargin: '300px' });

const blobCache = new Map();
function thumbUrl(o) {
  const key = JSON.stringify(o);
  if (!blobCache.has(key)) {
    const svg = renderIllustration({ ...o, animate: false, id: 'nd' + blobCache.size.toString(36) });
    blobCache.set(key, URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })));
  }
  return blobCache.get(key);
}
function paintThumb(el) {
  const o = JSON.parse(el.dataset.art);
  const img = new Image();
  img.alt = el.dataset.alt || '';
  img.decoding = 'async';
  img.src = thumbUrl(o);
  img.onload = () => el.classList.add('ready');
  el.append(img);
}
function thumb(o, alt = '', cls = '') {
  return `<div class="art ${cls}" data-art='${esc(JSON.stringify(o))}' data-alt="${esc(alt)}" style="aspect-ratio:${ASPECTS[o.aspect || 'square'].W}/${ASPECTS[o.aspect || 'square'].H}"></div>`;
}
function hydrate(root = main) {
  $$('.art[data-art]', root).forEach((el) => io.observe(el));
  $$('[data-scrawl]', root).forEach((el) => {
    if (el.dataset.done) return;
    el.innerHTML = renderScrawl(el.dataset.scrawl, { capHeight: +(el.dataset.size || 22), style: el.dataset.style || 'scribble', color: el.dataset.color || 'currentColor', seed: +(el.dataset.seed || 3) });
    el.dataset.done = '1';
  });
  $$('[data-icon]', root).forEach((el) => {
    if (el.dataset.done) return;
    el.innerHTML = renderIcon(el.dataset.icon, { style: el.dataset.style || 'scribble', size: +(el.dataset.size || 20), title: '' });
    el.dataset.done = '1';
  });
}

const stateChip = (s, active, href) => `<a class="chip ${active ? 'on' : ''}" href="${href}" style="--c:${swatch(s)}">${s.name}</a>`;
function swatch(s) {
  const p = Object.values(s.palettes)[0];
  return p.colors?.[0] || p.ramp?.[6] || p.dot || p.bands?.[2] || p.glow?.[1] || p.halo || '#fff';
}
function paletteDots(s, pid) {
  const p = s.palettes[pid];
  const cols = [p.bg, ...(p.colors || p.ramp?.slice(2, 8) || p.bands || p.glow || p.sky || []), p.dot, p.halo, p.figure, p.ink].filter(Boolean);
  return [...new Set(cols)].slice(0, 8).map((c) => `<i style="background:${c}"></i>`).join('');
}

// ------------------------------------------------------------ views
function home() {
  const rotation = ['deep-focus', 'new-idea', 'in-sync', 'letting-go'];
  return `
<section class="hero wrap">
  <div class="hero-copy">
    <p class="eyebrow mono">A new illustration genre · v${GENRE.version}</p>
    <h1>Illustrations of the inside of a head.</h1>
    <p class="lede">Every illustration pack I found looked the same: flat people, pastel blobs, nothing going on inside. So I made a genre for the moments in a product that are about thinking. ${ART_COUNT} illustrations, ${ICON_COUNT} icons and a typeface, all drawn by code. Free to use.</p>
    <div class="cta">
      <a class="btn primary" href="#/library">Browse the library</a>
      <a class="btn" href="#/guide">Read the style guide</a>
    </div>
    <p class="fine mono">SVG · PNG · React · 16 palettes · reduced motion respected</p>
  </div>
  <div class="hero-art" aria-live="off">
    <div class="hero-stage" id="hero-stage"></div>
    <p class="hero-cap mono" id="hero-cap"></p>
  </div>
</section>

<section class="wrap block">
  <div class="block-head">
    <h2>Eight states of mind</h2>
    <p>One genre, eight ways of seeing. Each state has its own palette, texture and line rules, so the hundredth picture still looks like it came from the same hand.</p>
  </div>
  <div class="states">
    ${STATES.map((s, i) => `
    <a class="state-card" href="#/library?state=${s.id}">
      ${thumb({ subject: rotation[i % rotation.length], state: s.id }, `${s.name} state`)}
      <div class="state-meta"><span class="num mono">0${i + 1}</span><h3>${s.name}</h3><p>${esc(s.mood)}.</p><p class="mono tex">${s.texture}</p></div>
    </a>`).join('')}
  </div>
</section>

<section class="wrap block how">
  <div class="block-head"><h2>From idea to your page</h2></div>
  <ol class="steps">
    <li><span class="mono">1</span><h3>Pick a subject</h3><p>Twelve ideas, from "New idea" to "Letting go". Each one maps to a real product moment: onboarding, loading, empty states, errors, success.</p></li>
    <li><span class="mono">2</span><h3>Pick a state and tune it</h3><p>Same idea, eight states. Re-roll the seed, push the density, rotate the colours to your brand, choose square or wide.</p></li>
    <li><span class="mono">3</span><h3>Copy it in</h3><p>Plain SVG, a React component or a PNG. It animates on its own and goes still for anyone who turns motion off.</p></li>
  </ol>
</section>

<section class="wrap block split">
  <div>
    <h2>Icons with a hand</h2>
    <p>${ICON_COUNT} icons on a strict 24px grid, drawn in four hands: Scribble, Neon, Stipple and Hatch. They sit next to normal UI text without shouting, and they still look drawn.</p>
    <a class="btn" href="#/icons">See all icons</a>
  </div>
  <div class="icon-teaser">${['brain', 'idea', 'spiral', 'eye', 'flame', 'moon', 'search', 'bell', 'heart', 'sparkle', 'planet', 'bolt'].map((k, i) => `<span data-icon="${k}" data-size="40" data-style="${ICON_STYLES[i % 4].id}"></span>`).join('')}</div>
</section>

<section class="wrap block split">
  <div>
    <h2>Scrawl, the typeface</h2>
    <p>A single-stroke display face drawn by the same four hands. Type a headline, download the SVG. It's for titles, not paragraphs.</p>
    <a class="btn" href="#/type">Try Scrawl</a>
  </div>
  <div class="type-teaser"><span data-scrawl="AS WITHIN" data-size="44" data-style="neon"></span><span data-scrawl="SO WITHOUT" data-size="44" data-style="scribble"></span></div>
</section>

<section class="wrap block split">
  <div>
    <h2>Teach it to your agent</h2>
    <p>The genre is written down as rules, so your coding agent can keep to them. Drop the skill file into Claude Code, Cursor or Codex, or call the renderer straight from your code.</p>
    <a class="btn" href="#/use">How to use it</a>
  </div>
  <pre class="code"><code>import { renderIllustration } from
  '${SITE}/src/render.js';

const svg = renderIllustration({
  subject: 'deep-focus',
  state: 'stipple',
  seed: 7,
});</code></pre>
</section>`;
}

function startHero() {
  const stage = $('#hero-stage');
  if (!stage) return;
  const picks = [['deep-focus', 'stipple'], ['new-idea', 'tangle'], ['overload', 'burst'], ['letting-go', 'haze'], ['in-sync', 'collage'], ['thinking', 'thermal'], ['clarity', 'ember'], ['memory', 'wall']];
  let i = 0;
  const show = () => {
    if (!stage.isConnected) return;
    const [subject, state] = picks[i % picks.length];
    const layer = document.createElement('div');
    layer.className = 'hero-layer';
    layer.innerHTML = renderIllustration({ subject, state, aspect: 'square' });
    stage.append(layer);
    requestAnimationFrame(() => layer.classList.add('in'));
    const old = $$('.hero-layer', stage).slice(0, -1);
    setTimeout(() => old.forEach((o) => o.remove()), 900);
    $('#hero-cap').textContent = `${subjectById[subject].title} · ${stateById[state].name}`;
    i++;
  };
  show();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const timer = setInterval(() => (stage.isConnected ? show() : clearInterval(timer)), 4200);
  }
}

function library(params) {
  const state = params.get('state') || 'all';
  const q = (params.get('q') || '').toLowerCase();
  const aspect = params.get('aspect') === 'wide' ? 'wide' : 'square';
  const items = catalog().filter((it) => (state === 'all' || it.state === state) &&
    (!q || `${it.title} ${it.line} ${it.use.join(' ')} ${it.stateName}`.toLowerCase().includes(q)));
  const link = (o) => {
    const p = new URLSearchParams({ state, q, aspect, ...o });
    for (const [k, v] of [...p]) if (!v || v === 'all' || (k === 'aspect' && v === 'square')) p.delete(k);
    const s = p.toString();
    return `#/library${s ? '?' + s : ''}`;
  };
  return `
<section class="wrap lib">
  <div class="lib-head">
    <h1>Library</h1>
    <p>${ART_COUNT} illustrations: ${SUBJECTS.length} ideas, each in ${STATES.length} states. Click one to tune it and copy it out.</p>
  </div>
  <div class="filters" role="search">
    <label class="search"><span class="sr">Search illustrations</span><span data-icon="search" data-size="18"></span><input id="q" type="search" placeholder="Search: loading, success, focus, empty…" value="${esc(q)}" autocomplete="off"></label>
    <div class="chips" aria-label="Filter by state">
      <a class="chip ${state === 'all' ? 'on' : ''}" href="${link({ state: 'all' })}">All</a>
      ${STATES.map((s) => stateChip(s, state === s.id, link({ state: s.id }))).join('')}
    </div>
    <div class="seg" aria-label="Shape">
      <a class="${aspect === 'square' ? 'on' : ''}" href="${link({ aspect: 'square' })}">Spot</a>
      <a class="${aspect === 'wide' ? 'on' : ''}" href="${link({ aspect: 'wide' })}">Section</a>
    </div>
  </div>
  <p class="count mono">${items.length} ${items.length === 1 ? 'illustration' : 'illustrations'}</p>
  ${items.length ? `<div class="grid ${aspect}">
    ${items.map((it) => `
    <article class="card">
      <a href="#/i/${it.subject}/${it.state}${aspect === 'wide' ? '?aspect=wide' : ''}" aria-label="${esc(it.title)} in ${it.stateName}, open">
        ${thumb({ subject: it.subject, state: it.state, aspect }, `${it.title}, ${it.stateName}`)}
      </a>
      <div class="card-meta">
        <div><h3>${esc(it.title)}</h3><p class="mono">${it.stateName} · ${it.use[0]}</p></div>
        <button class="icon-btn" data-quick="${it.subject}|${it.state}|${aspect}" aria-label="Copy SVG of ${esc(it.title)}, ${it.stateName}" title="Copy SVG"><span data-icon="copy" data-size="18"></span></button>
      </div>
    </article>`).join('')}
  </div>` : `<div class="empty">${thumb({ subject: 'empty-mind', state: 'stipple' }, 'Empty mind')}<p>Nothing matches "${esc(q)}". Try "loading", "success" or "focus".</p></div>`}
</section>`;
}

function bindLibrary(params) {
  const input = $('#q');
  let t;
  input?.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const p = new URLSearchParams(params);
      input.value ? p.set('q', input.value) : p.delete('q');
      const pos = input.selectionStart;
      history.replaceState(null, '', `#/library${p.toString() ? '?' + p : ''}`);
      route();
      const ni = $('#q'); ni.focus(); ni.setSelectionRange(pos, pos);
    }, 220);
  });
  $$('[data-quick]').forEach((b) => b.addEventListener('click', () => {
    const [subject, state, aspect] = b.dataset.quick.split('|');
    copy(renderIllustration({ subject, state, aspect, id: `nd-${subject}-${state}` }), 'SVG copied');
  }));
}

function detail(subjectId, stateId, params) {
  const s = subjectById[subjectId], st = stateById[stateId];
  if (!s || !st) return notFound();
  const pids = Object.keys(st.palettes);
  const o = {
    subject: s.id, state: st.id,
    palette: pids.includes(params.get('palette')) ? params.get('palette') : pids[0],
    seed: +params.get('seed') || 1,
    density: +params.get('density') || 1,
    hue: +params.get('hue') || 0,
    aspect: ASPECTS[params.get('aspect')] ? params.get('aspect') : 'square',
    animate: params.get('animate') !== '0',
  };
  const others = STATES.filter((x) => x.id !== st.id);
  return `
<section class="wrap detail" data-o='${esc(JSON.stringify(o))}'>
  <a class="back mono" href="#/library"><span data-icon="arrow-left" data-size="16"></span> Library</a>
  <div class="detail-grid">
    <div class="stage-wrap">
      <div class="stage ${o.aspect}" id="stage" aria-live="polite"></div>
    </div>
    <aside class="panel">
      <p class="eyebrow mono">${st.name} · ${esc(st.texture)}</p>
      <h1>${esc(s.title)}</h1>
      <p class="line">${esc(s.line)}</p>
      <p class="uses mono">Good for: ${s.use.map(esc).join(', ')}</p>

      <div class="ctl"><span class="lbl">State</span><div class="chips small">${STATES.map((x) => `<button class="chip ${x.id === st.id ? 'on' : ''}" data-state="${x.id}" style="--c:${swatch(x)}">${x.name}</button>`).join('')}</div></div>
      <div class="ctl"><span class="lbl">Palette</span><div class="pals">${pids.map((p) => `<button class="pal ${p === o.palette ? 'on' : ''}" data-palette="${p}" aria-label="${p} palette"><span class="dots">${paletteDots(st, p)}</span><span class="mono">${p}</span></button>`).join('')}</div></div>
      <div class="ctl row"><label class="lbl" for="seed">Seed</label><input id="seed" type="number" min="1" max="9999" value="${o.seed}"><button class="btn small" id="reroll"><span data-icon="refresh" data-size="16"></span> Re-roll</button></div>
      <div class="ctl"><label class="lbl" for="density">Density <output id="density-o">${o.density.toFixed(1)}</output></label><input id="density" type="range" min="0.5" max="1.6" step="0.1" value="${o.density}"></div>
      <div class="ctl"><label class="lbl" for="hue">Colour shift <output id="hue-o">${o.hue}°</output></label><input id="hue" type="range" min="-180" max="180" step="5" value="${o.hue}" class="hue"></div>
      <div class="ctl row">
        <span class="lbl">Shape</span>
        <div class="seg">${Object.entries(ASPECTS).map(([k, a]) => `<button class="${k === o.aspect ? 'on' : ''}" data-aspect="${k}">${a.size[0].toUpperCase() + a.size.slice(1)}</button>`).join('')}</div>
        <label class="toggle"><input type="checkbox" id="animate" ${o.animate ? 'checked' : ''}> Motion</label>
      </div>

      <div class="actions">
        <button class="btn primary" data-act="copy">Copy SVG</button>
        <button class="btn" data-act="svg">Download SVG</button>
        <button class="btn" data-act="png">Download PNG</button>
        <button class="btn" data-act="react">Copy React</button>
        <button class="btn" data-act="code">Copy code</button>
        <button class="btn" data-act="link">Copy link</button>
      </div>
      <p class="fine mono" id="size-note"></p>
    </aside>
  </div>
  <div class="block">
    <h2 class="small-h">The same idea in the other states</h2>
    <div class="grid square mini">${others.map((x) => `<a class="card" href="#/i/${s.id}/${x.id}">${thumb({ subject: s.id, state: x.id }, `${s.title}, ${x.name}`)}<div class="card-meta"><h3>${x.name}</h3></div></a>`).join('')}</div>
  </div>
</section>`;
}

function bindDetail() {
  const root = $('.detail');
  if (!root) return;
  const o = JSON.parse(root.dataset.o);
  const stage = $('#stage');
  const fileName = () => `neurodelic-${o.subject}-${o.state}-${o.seed}`;
  const svgNow = (extra = {}) => renderIllustration({ ...o, id: `nd-${o.subject}-${o.state}`, ...extra });
  let svg = '';
  const paint = () => {
    svg = svgNow();
    stage.className = `stage ${o.aspect}`;
    stage.innerHTML = svg;
    $('#size-note').textContent = `${(new Blob([svg]).size / 1024).toFixed(0)} KB SVG · ${ASPECTS[o.aspect].W}×${ASPECTS[o.aspect].H} · seed ${o.seed}`;
    const p = new URLSearchParams();
    if (o.palette !== Object.keys(stateById[o.state].palettes)[0]) p.set('palette', o.palette);
    if (o.seed !== 1) p.set('seed', o.seed);
    if (o.density !== 1) p.set('density', o.density);
    if (o.hue) p.set('hue', o.hue);
    if (o.aspect !== 'square') p.set('aspect', o.aspect);
    if (!o.animate) p.set('animate', '0');
    history.replaceState(null, '', `#/i/${o.subject}/${o.state}${p.toString() ? '?' + p : ''}`);
  };
  paint();
  let raf;
  const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); };

  $$('[data-state]', root).forEach((b) => b.addEventListener('click', () => { location.hash = `#/i/${o.subject}/${b.dataset.state}${o.aspect !== 'square' ? '?aspect=' + o.aspect : ''}`; }));
  $$('[data-palette]', root).forEach((b) => b.addEventListener('click', () => {
    o.palette = b.dataset.palette;
    $$('[data-palette]', root).forEach((x) => x.classList.toggle('on', x === b));
    paint();
  }));
  $$('[data-aspect]', root).forEach((b) => b.addEventListener('click', () => {
    o.aspect = b.dataset.aspect;
    $$('[data-aspect]', root).forEach((x) => x.classList.toggle('on', x === b));
    paint();
  }));
  $('#seed').addEventListener('change', (e) => { o.seed = Math.max(1, Math.min(9999, Math.round(+e.target.value) || 1)); e.target.value = o.seed; paint(); });
  $('#reroll').addEventListener('click', () => { o.seed = 1 + Math.floor(Math.random() * 9998); $('#seed').value = o.seed; paint(); });
  $('#density').addEventListener('input', (e) => { o.density = +e.target.value; $('#density-o').textContent = o.density.toFixed(1); later(); });
  $('#hue').addEventListener('input', (e) => { o.hue = +e.target.value; $('#hue-o').textContent = `${o.hue}°`; later(); });
  $('#animate').addEventListener('change', (e) => { o.animate = e.target.checked; paint(); });

  $$('[data-act]', root).forEach((b) => b.addEventListener('click', async () => {
    const act = b.dataset.act;
    if (act === 'copy') copy(svg, 'SVG copied');
    if (act === 'svg') download(`${fileName()}.svg`, svg);
    if (act === 'png') {
      b.disabled = true;
      try { download(`${fileName()}.png`, await svgToPng(svgNow({ animate: false }), 2)); } catch { toast('PNG failed in this browser, use SVG'); }
      b.disabled = false;
    }
    if (act === 'react') copy(toReact(svg, `${o.subject}-${o.state}`), 'React component copied');
    if (act === 'code') {
      const args = { subject: o.subject, state: o.state, palette: o.palette, seed: o.seed };
      if (o.density !== 1) args.density = o.density;
      if (o.hue) args.hue = o.hue;
      if (o.aspect !== 'square') args.aspect = o.aspect;
      copy(`import { renderIllustration } from '${SITE}/src/render.js';\n\nconst svg = renderIllustration(${JSON.stringify(args, null, 2).replace(/"(\w+)":/g, '$1:').replace(/"/g, "'")});`, 'Code copied');
    }
    if (act === 'link') copy(location.href, 'Link copied');
  }));
}

function icons(params) {
  const style = ICON_STYLES.some((s) => s.id === params.get('style')) ? params.get('style') : 'scribble';
  return `
<section class="wrap icons-page">
  <div class="lib-head">
    <h1>Icons</h1>
    <p>${ICON_COUNT} icons on a 24px grid with a 2px safe area. Click any icon to copy its SVG. They use <code>currentColor</code> by default, so they take the colour of the text around them.</p>
  </div>
  <div class="icon-tools">
    <div class="seg" aria-label="Hand">${ICON_STYLES.map((s) => `<button class="${s.id === style ? 'on' : ''}" data-istyle="${s.id}" title="${esc(s.summary)}">${s.name}</button>`).join('')}</div>
    <label class="ctl-inline">Colour <input type="color" id="icolor" value="#f3efe6"></label>
    <label class="ctl-inline">Weight <input type="range" id="iweight" min="1" max="2.5" step="0.1" value="1.5"></label>
    <label class="ctl-inline">Hand <input type="range" id="ijitter" min="0" max="2" step="0.1" value="1"></label>
    <label class="ctl-inline">Size <input type="range" id="isize" min="20" max="64" step="4" value="40"></label>
    <label class="search small"><span class="sr">Search icons</span><input id="iq" type="search" placeholder="Search icons"></label>
    <button class="btn small" id="isprite">Download all (sprite)</button>
  </div>
  <div id="icon-groups"></div>
</section>`;
}

function bindIcons(params) {
  const st = { style: ICON_STYLES.some((s) => s.id === params.get('style')) ? params.get('style') : 'scribble', color: '#f3efe6', weight: 1.5, jitter: 1, size: 40, q: '' };
  const draw = () => {
    const html = Object.entries(ICON_GROUPS).map(([g, names]) => {
      const list = names.filter((k) => k.includes(st.q));
      if (!list.length) return '';
      return `<h2 class="small-h">${g}</h2><div class="icon-grid">${list.map((k) => `<button class="icon-cell" data-name="${k}" title="Copy ${k}">${renderIcon(k, { ...st, color: st.style === 'neon' ? undefined : st.color, title: k })}<span class="mono">${k}</span></button>`).join('')}</div>`;
    }).join('');
    $('#icon-groups').innerHTML = html || '<p class="empty-note">No icon by that name yet.</p>';
    $('#icon-groups').style.setProperty('--isz', st.size + 'px');
  };
  draw();
  $$('[data-istyle]').forEach((b) => b.addEventListener('click', () => {
    st.style = b.dataset.istyle;
    $$('[data-istyle]').forEach((x) => x.classList.toggle('on', x === b));
    history.replaceState(null, '', `#/icons?style=${st.style}`);
    draw();
  }));
  for (const [id, key] of [['icolor', 'color'], ['iweight', 'weight'], ['ijitter', 'jitter'], ['isize', 'size']]) {
    $('#' + id).addEventListener('input', (e) => { st[key] = key === 'color' ? e.target.value : +e.target.value; draw(); });
  }
  $('#iq').addEventListener('input', (e) => { st.q = e.target.value.trim().toLowerCase(); draw(); });
  $('#icon-groups').addEventListener('click', (e) => {
    const b = e.target.closest('[data-name]');
    if (!b) return;
    copy(renderIcon(b.dataset.name, { ...st, size: 24, color: st.style === 'neon' ? undefined : 'currentColor' }), `${b.dataset.name} copied`);
  });
  $('#isprite').addEventListener('click', () => {
    const symbols = Object.keys(ICONS).map((k) => {
      const svg = renderIcon(k, { ...st, color: st.style === 'neon' ? undefined : 'currentColor', id: `nd-${k}` });
      return svg.replace(/^<svg[^>]*>/, `<symbol id="nd-${k}" viewBox="0 0 24 24">`).replace(/<\/svg>$/, '</symbol>');
    }).join('\n');
    download(`neurodelic-icons-${st.style}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n<!-- Neurodelic icons, ${st.style} hand. Use: <svg width="24" height="24"><use href="#nd-brain"/></svg> -->\n${symbols}\n</svg>`);
  });
}

function typePage() {
  return `
<section class="wrap type-page">
  <div class="lib-head">
    <h1>Scrawl</h1>
    <p>A single-stroke display face for headlines. Capitals, numbers and a little punctuation, on a 4 × 6 grid. Every time you change the seed, the hand writes it again slightly differently.</p>
  </div>
  <div class="type-tools">
    <label class="type-input"><span class="sr">Your text</span><textarea id="ttext" rows="2" maxlength="120">AS WITHIN\nSO WITHOUT</textarea></label>
    <div class="seg" aria-label="Hand">${ICON_STYLES.map((s, i) => `<button class="${i === 0 ? 'on' : ''}" data-tstyle="${s.id}">${s.name}</button>`).join('')}</div>
    <label class="ctl-inline">Colour <input type="color" id="tcolor" value="#f3efe6"></label>
    <label class="ctl-inline">Size <input type="range" id="tsize" min="24" max="140" step="4" value="88"></label>
    <label class="ctl-inline">Seed <input type="number" id="tseed" min="1" max="999" value="3"></label>
    <button class="btn small" id="tcopy">Copy SVG</button>
    <button class="btn small" id="tdl">Download SVG</button>
  </div>
  <div class="type-stage" id="tstage"></div>
  <h2 class="small-h">Character set</h2>
  <div class="charset"><span data-scrawl="${esc(CHARSET.replace(/ /g, '').slice(0, 26))}" data-size="34"></span><span data-scrawl="${esc(CHARSET.replace(/ /g, '').slice(26))}" data-size="34"></span></div>
</section>`;
}

function bindType() {
  const st = { style: 'scribble', color: '#f3efe6', size: 88, seed: 3 };
  const text = $('#ttext');
  let svg = '';
  const draw = () => {
    svg = renderScrawl(text.value || ' ', { capHeight: st.size, style: st.style, color: st.style === 'neon' ? undefined : st.color, seed: st.seed });
    $('#tstage').innerHTML = svg;
  };
  draw();
  text.addEventListener('input', draw);
  $$('[data-tstyle]').forEach((b) => b.addEventListener('click', () => { st.style = b.dataset.tstyle; $$('[data-tstyle]').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
  $('#tcolor').addEventListener('input', (e) => { st.color = e.target.value; draw(); });
  $('#tsize').addEventListener('input', (e) => { st.size = +e.target.value; draw(); });
  $('#tseed').addEventListener('input', (e) => { st.seed = +e.target.value || 1; draw(); });
  $('#tcopy').addEventListener('click', () => copy(svg, 'SVG copied'));
  $('#tdl').addEventListener('click', () => download('neurodelic-scrawl.svg', svg));
}

function guide() {
  return `
<section class="wrap guide">
  <div class="lib-head">
    <p class="eyebrow mono">Style guide · v${GENRE.version}</p>
    <h1>Neurodelic</h1>
    <p class="lede">Neuro, as in the brain. Delic, as in psychedelic: "mind-revealing". It's a genre for drawing what thinking feels like, instead of what a person at a laptop looks like.</p>
  </div>

  <div class="principles">
    <div><h3>1. Draw the inside</h3><p>The subject is always a mind: a head, a figure, a thought. The body stays quiet. The energy lives where the thinking happens.</p></div>
    <div><h3>2. Never one clean line</h3><p>Every mark is made by a hand: a scribble, a dot, a hatch, a grain. Nothing is a flat vector fill with a perfect edge.</p></div>
    <div><h3>3. One idea per picture</h3><p>A spiral means focus. A burst means too much. A ring means waiting. If it needs a caption to make sense, it isn't done.</p></div>
    <div><h3>4. Colour means intensity</h3><p>Brightest where the mind is busiest. Colour is a reading, like a scan, not decoration.</p></div>
  </div>

  <h2>The eight states</h2>
  <div class="guide-states">
    ${STATES.map((s, i) => `
    <article class="gs">
      ${thumb({ subject: 'new-idea', state: s.id }, `${s.name} sample`)}
      <div>
        <p class="mono num">0${i + 1} · ${s.texture}</p>
        <h3>${s.name}</h3>
        <p>${esc(s.summary)}</p>
        <ul>${s.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
        <div class="pal-rows">${Object.keys(s.palettes).map((p) => `<div class="pal-row"><span class="dots">${paletteDots(s, p)}</span><span class="mono">${p}</span></div>`).join('')}</div>
      </div>
    </article>`).join('')}
  </div>

  <h2>Line rules</h2>
  <div class="rules-grid">
    <div><h3>Scribble</h3><p>3 to 6 passes per line, each one wobbling a little off the last. Round caps, round joins. Widths vary ±20% between passes.</p></div>
    <div><h3>Stipple</h3><p>Tone is dot density, never opacity. Dots are round, 1.4 to 2.6px on a 400px stage.</p></div>
    <div><h3>Hatch</h3><p>Short pen strokes with a direction. Heat rises; shadows cross at about 60°.</p></div>
    <div><h3>Grain</h3><p>Fractal noise over everything soft. Blur hides edges, grain keeps it from looking digital.</p></div>
  </div>

  <h2>The icon grid</h2>
  <div class="grid-demo">
    <div class="grid-box">${renderIcon('brain', { size: 240, color: '#f3efe6' })}</div>
    <ul class="spec mono">
      <li>Canvas: ${ICON_GRID.size} × ${ICON_GRID.size}</li>
      <li>Safe area: ${ICON_GRID.padding}px each side</li>
      <li>Base weight: ${ICON_GRID.stroke}, drawn as ${ICON_GRID.passes} loose passes</li>
      <li>Wobble: ${ICON_GRID.jitter}px on the grid</li>
      <li>Colour: currentColor, or the Neon ramp</li>
      <li>Hands: ${ICON_STYLES.map((s) => s.name).join(', ')}</li>
    </ul>
  </div>

  <h2>Type</h2>
  <div class="type-spec">
    <div><span data-scrawl="SCRAWL" data-size="72"></span><p class="mono">Scrawl · display only · caps, numbers, punctuation</p></div>
    <div><p class="geist-big">Geist for reading.</p><p class="mono">Geist Mono for labels and numbers.</p></div>
  </div>
</section>`;
}

function use() {
  return `
<section class="wrap use">
  <div class="lib-head"><h1>Use it</h1><p>Copy from the site, call it from code, or hand the rules to your agent.</p></div>

  <h2>1. Copy from the site</h2>
  <p>Open any illustration, tune it, then copy the SVG, a React component or a PNG. Icons copy on click. Everything is a single self-contained SVG: no fonts, no external files.</p>

  <h2>2. Call it from code</h2>
  <p>The renderer is plain JavaScript with no dependencies. Import it in the browser or in Node 18+.</p>
  <pre class="code"><code>import { renderIllustration } from '${SITE}/src/render.js';
import { renderIcon } from '${SITE}/src/icons/render.js';
import { renderScrawl } from '${SITE}/src/type/scrawl.js';

renderIllustration({ subject: 'thinking', state: 'thermal', seed: 12, aspect: 'wide' });
renderIcon('brain', { style: 'neon', size: 32 });
renderScrawl('HELLO', { capHeight: 48, style: 'hatch' });</code></pre>
  <p>Subjects: <span class="mono">${SUBJECTS.map((s) => s.id).join(', ')}</span>.</p>
  <p>States: <span class="mono">${STATES.map((s) => s.id).join(', ')}</span>.</p>
  <p>Static files live at <a class="mono" href="/art/">/art/</a> and <a class="mono" href="/icons/">/icons/</a> if you'd rather link a file.</p>

  <h2>3. Teach your agent</h2>
  <p>The skill file writes down the genre's rules, so Claude Code, Cursor or Codex can pick the right subject and state, call the renderer and keep new work on-style.</p>
  <div class="cta"><a class="btn primary" href="/neurodelic.skill.md" download>Download the skill</a><button class="btn" id="copy-skill-cmd">Copy install command</button></div>

  <h2>License</h2>
  <p>The code is MIT. The illustrations, icons and lettering you make with it are yours to use in any project, personal or commercial, with no credit required (I'd love a link though). Please don't repackage the library itself and sell it as an asset pack. Full text in the <a href="https://github.com/vincedotcode/neurodelic/blob/main/LICENSE">LICENSE</a>.</p>
</section>`;
}

function notFound() {
  return `<section class="wrap nf">${thumb({ subject: 'letting-go', state: 'haze' }, 'Falling softly')}<div><h1>Lost the thought</h1><p>This page doesn't exist. It happens.</p><a class="btn primary" href="#/">Back home</a></div></section>`;
}

// ------------------------------------------------------------ router
const TITLES = { '': 'Illustrations of the inside of a head', library: 'Library', icons: 'Icons', type: 'Scrawl typeface', guide: 'Style guide', use: 'Use it' };

function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const params = new URLSearchParams(qs || '');
  const parts = path.split('/').filter(Boolean);
  const page = parts[0] || '';
  let html, bind = () => {}, title;
  if (page === '') { html = home(); bind = startHero; }
  else if (page === 'library') { html = library(params); bind = () => bindLibrary(params); }
  else if (page === 'i') { html = detail(parts[1], parts[2], params); bind = bindDetail; title = `${subjectById[parts[1]]?.title || ''} · ${stateById[parts[2]]?.name || ''}`; }
  else if (page === 'icons') { html = icons(params); bind = () => bindIcons(params); }
  else if (page === 'type') { html = typePage(); bind = bindType; }
  else if (page === 'guide') { html = guide(); }
  else if (page === 'use') { html = use(); bind = bindUse; }
  else { html = notFound(); }
  const same = main.dataset.page === page && page === 'library';
  main.innerHTML = html;
  main.dataset.page = page;
  document.title = `Neurodelic · ${title || TITLES[page] || 'Not found'}`;
  $$('.nav a').forEach((a) => a.toggleAttribute('aria-current', a.getAttribute('href') === `#/${page}` || (page === 'i' && a.getAttribute('href') === '#/library')));
  hydrate();
  bind();
  if (!same) window.scrollTo(0, 0);
}

function bindUse() {
  $('#copy-skill-cmd')?.addEventListener('click', () => copy(`mkdir -p .claude/skills/neurodelic && curl -sL ${SITE}/neurodelic.skill.md -o .claude/skills/neurodelic/SKILL.md`, 'Command copied'));
}

window.addEventListener('hashchange', route);
$$('[data-version]').forEach((el) => (el.textContent = GENRE.version));
hydrate(document.body);
route();
