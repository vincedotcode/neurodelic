// Neurodelic site. No framework: a hash router, string templates and a worker pool that draws the art.
import { renderIllustration, catalog, ASPECTS, SEEDS_PER_PAIR, paletteNameFor } from './src/render.js';
import { STATES, stateById, GENRE, ICON_STYLES, ICON_GRID } from './src/core/tokens.js';
import { MOMENTS, momentById } from './src/scene.js';
import { renderIcon, ICONS } from './src/icons/render.js';
import { ICON_GROUPS } from './src/icons/defs.js';
import { renderScrawl, CHARSET } from './src/type/scrawl.js';
import { esc } from './src/core/util.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const main = $('#main');
const SITE = 'https://neurodelic.vincedotcode.com';
const CATALOG = catalog();
// The gallery's default order: every seed 1 first, laid out so neighbours differ in moment and state.
const MIXED = (() => {
  const by = new Map(CATALOG.map((it) => [it.key, it]));
  const out = [];
  for (let seed = 1; seed <= SEEDS_PER_PAIR; seed++) for (let k = 0; k < MOMENTS.length * STATES.length; k++) {
    const m = MOMENTS[k % MOMENTS.length], st = STATES[(k + Math.floor(k / MOMENTS.length) + seed * 3) % STATES.length];
    out.push(by.get(`${m.id}--${st.id}--${seed}`));
  }
  return out;
})();
const ART_COUNT = CATALOG.length;
const ICON_COUNT = Object.keys(ICONS).length;
const fmt = (n) => n.toLocaleString('en-US');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const stateIds = new Set(STATES.map((s) => s.id));
const momentIds = new Set(MOMENTS.map((m) => m.id));

// Three colours that stand for each state, for the little dots in filters.
const STATE_DOT = {
  tangle: ['#4F5BFF', '#FF4FA3', '#FFC93C'], thermal: ['#3B0F8C', '#4FE36A', '#FF3B2E'],
  stipple: ['#06155C', '#3F86F0', '#F2ECDD'], haze: ['#48DFFF', '#FF5FD2', '#FFB36B'],
  collage: ['#2E5FBF', '#E8433A', '#F6C945'], burst: ['#FF5A1F', '#B49CFF', '#15120F'],
  ember: ['#5A0B08', '#D1392A', '#FFD34D'], wall: ['#1335C9', '#FFE14D', '#7CFF6B'],
};
const dot = (id) => `<i class="sdot" style="--a:${STATE_DOT[id][0]};--b:${STATE_DOT[id][1]};--c:${STATE_DOT[id][2]}" aria-hidden="true"></i>`;
const hexes = (pal) => [...new Set(JSON.stringify(pal).match(/#[0-9A-Fa-f]{6}/g))];
const palDots = (pal) => hexes(pal).slice(0, 7).map((c) => `<i style="background:${c}"></i>`).join('');

// ------------------------------------------------------------ small helpers
let toastTimer;
function toast(msg) {
  const t = $('.nd-toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 1800);
}
async function copy(text, msg = 'Copied') {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  toast(msg);
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
  const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
const pascal = (s) => s.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase()).replace(/\W/g, '');
function toReact(svg, name) {
  const comp = pascal(name);
  const body = svg.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  return `// ${comp}.tsx · Neurodelic (${SITE})\nconst svg = \`${body}\`;\n\nexport default function ${comp}(props: React.HTMLAttributes<HTMLSpanElement>) {\n  return <span role="img" {...props} style={{ display: 'inline-block', lineHeight: 0, ...props.style }} dangerouslySetInnerHTML={{ __html: svg }} />;\n}\n`;
}
const codeFor = (o) => {
  const args = { moment: o.moment, state: o.state, seed: o.seed };
  if (o.palette && o.palette !== paletteNameFor(o.state, o.seed)) args.palette = o.palette;
  if (o.density && o.density !== 1) args.density = o.density;
  if (o.hue) args.hue = o.hue;
  if (o.aspect && o.aspect !== 'square') args.aspect = o.aspect;
  if (o.animate === false) args.animate = false;
  const lit = Object.entries(args).map(([k, v]) => `  ${k}: ${typeof v === 'string' ? `'${v}'` : v},`).join('\n');
  return `import { renderIllustration } from '${SITE}/src/render.js';\n\nconst svg = renderIllustration({\n${lit}\n});`;
};

// ------------------------------------------------------------ the drawing pool
// Pictures are drawn in module workers so scrolling stays smooth. If workers
// aren't available, the same jobs run on the main thread in idle time.
const Pool = (() => {
  const size = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
  const workers = [];
  const queue = [];
  let seq = 0, broken = false, idleOn = false;
  const idle = window.requestIdleCallback || ((fn) => setTimeout(() => fn({ timeRemaining: () => 10 }), 16));
  const take = () => {
    while (queue.length) {
      const job = queue.shift();
      if (!job.alive || job.alive()) return job;
      job.resolve(null);
    }
    return null;
  };
  function mainThread() {
    if (idleOn) return;
    idleOn = true;
    idle((dl) => {
      idleOn = false;
      do {
        const job = take();
        if (!job) return;
        try { job.resolve(renderIllustration(job.o)); } catch (e) { job.reject(e); }
      } while (dl.timeRemaining() > 6);
      if (queue.length) mainThread();
    });
  }
  function next() {
    if (!queue.length) return;
    if (!workers.length) { mainThread(); return; }
    for (const w of workers) {
      if (w.job) continue;
      const job = take();
      if (!job) return;
      w.job = job;
      w.postMessage({ id: ++seq, o: job.o });
    }
  }
  try {
    for (let i = 0; i < size; i++) {
      const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      w.job = null;
      w.onmessage = (e) => {
        const job = w.job; w.job = null;
        if (job) e.data.error ? job.reject(new Error(e.data.error)) : job.resolve(e.data.svg);
        next();
      };
      w.onerror = (e) => {
        e.preventDefault?.();
        broken = true;
        const job = w.job; w.job = null;
        if (job) queue.unshift(job);
        workers.splice(workers.indexOf(w), 1);
        w.terminate();
        next();
      };
      workers.push(w);
    }
  } catch { broken = true; }
  return {
    render(o, { alive, front } = {}) {
      return new Promise((resolve, reject) => {
        const job = { o, resolve, reject, alive };
        front ? queue.unshift(job) : queue.push(job);
        next();
      });
    },
    get broken() { return broken; },
  };
})();

// Blob URLs for still thumbnails, newest kept, oldest let go when nothing shows them.
const urls = new Map();
function artUrl(o, opts) {
  const key = JSON.stringify(o);
  let p = urls.get(key);
  if (p) { urls.delete(key); urls.set(key, p); return p; }
  p = Pool.render({ ...o, animate: false, id: 'nd' }, opts).then((svg) => {
    if (svg == null) { urls.delete(key); return null; }
    return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  }, (e) => { urls.delete(key); throw e; });
  urls.set(key, p);
  if (urls.size > 900) {
    const [oldKey, oldP] = urls.entries().next().value;
    urls.delete(oldKey);
    oldP.then((u) => { if (u && !document.querySelector(`img[src="${u}"]`)) URL.revokeObjectURL(u); }).catch(() => {});
  }
  return p;
}

const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const el = e.target;
    el._near = e.isIntersecting;
    if (!e.isIntersecting || el._asked) continue;
    el._asked = true;
    const o = JSON.parse(el.dataset.o);
    artUrl(o, { alive: () => el.isConnected && el._near }).then((url) => {
      if (!url) { el._asked = false; return; }
      if (!el.isConnected) return;
      io.unobserve(el);
      const img = new Image();
      img.alt = el.dataset.alt || '';
      img.decoding = 'async';
      img.onload = () => el.classList.add('ready');
      img.src = url;
      el.append(img);
    }).catch(() => { el.classList.add('failed'); });
  }
}, { rootMargin: '400px 0px' });

function thumb(o, alt = '', cls = '') {
  const a = ASPECTS[o.aspect || 'square'];
  return `<span class="art ${cls}" data-o="${esc(JSON.stringify(o))}" data-alt="${esc(alt)}" style="aspect-ratio:${a.W}/${a.H}"></span>`;
}
const pieceHref = (m, s, seed, extra = '') => `#/p/${m}/${s}/${seed}${extra}`;
function tile(it, cls = '') {
  const m = momentById(it.moment), st = stateById(it.state);
  return `<a class="tile ${cls}" href="${pieceHref(it.moment, it.state, it.seed)}"><span class="nd-plate">${thumb({ moment: it.moment, state: it.state, seed: it.seed }, `${m.title}, ${st.name}, seed ${it.seed}`)}</span><span class="tile-cap"><span class="tile-t">${esc(m.title)}</span><span class="tile-s">${st.name} · ${it.seed}</span></span></a>`;
}

function hydrate(root = main) {
  $$('.art[data-o]', root).forEach((el) => { if (!el._seen) { el._seen = true; io.observe(el); } });
  $$('[data-scrawl]', root).forEach((el) => {
    if (el.dataset.done) return;
    el.innerHTML = renderScrawl(el.dataset.scrawl, { capHeight: +(el.dataset.size || 22), style: el.dataset.style || 'scribble', color: 'currentColor', seed: +(el.dataset.seed || 3) });
    el.dataset.done = '1';
  });
  $$('[data-icon]', root).forEach((el) => {
    if (el.dataset.done) return;
    el.innerHTML = renderIcon(el.dataset.icon, { style: el.dataset.style || 'scribble', size: +(el.dataset.size || 20), color: el.dataset.style === 'neon' ? undefined : 'currentColor', title: '' });
    el.dataset.done = '1';
  });
}
const icon = (name, size = 18, style = 'scribble') => `<span class="ico" data-icon="${name}" data-size="${size}" data-style="${style}" aria-hidden="true"></span>`;

// ------------------------------------------------------------ home
const HERO_PICKS = [['deep-focus', 1], ['new-idea', 1], ['in-sync', 1], ['waiting', 1], ['thinking', 2], ['daydream', 1], ['clarity', 1], ['overload', 1]];
const hero = { i: 0, moment: 'deep-focus', seed: 1, state: 'stipple', token: 0, auto: null };

function home() {
  const sheet = [];
  for (let k = 0; k < 16; k++) {
    const m = MOMENTS[(k * 11 + 3) % MOMENTS.length], st = STATES[(k * 3 + Math.floor(k / 8)) % STATES.length];
    sheet.push({ moment: m.id, state: st.id, seed: 1 + ((k * 5) % SEEDS_PER_PAIR) });
  }
  return `
<section class="hero wrap">
  <div class="hero-copy">
    <h1 class="nd-display">Quiet body, <span class="nd-pen-under">loud</span>&nbsp;mind.</h1>
    <p class="nd-lede">I made a genre for the moments in a product when someone is thinking. The body stays still, and everything going on inside it gets drawn.</p>
    <div class="actions">
      <a class="nd-btn nd-btn--solid" href="#/gallery">Browse all ${fmt(ART_COUNT)}</a>
      <a class="nd-btn" href="#/make">Make your own</a>
    </div>
    <p class="nd-small">${fmt(ART_COUNT)} illustrations and endless new ones, ${ICON_COUNT} icons, a typeface and a UI kit. All drawn by code, free to use.</p>
  </div>
  <div class="hero-art">
    <figure class="nd-plate nd-proof hero-plate">
      <div class="hero-stage" id="hero-stage"></div>
      <figcaption><span class="nd-slug" id="hero-slug"></span></figcaption>
    </figure>
    <div class="swatches" id="swatches" role="group" aria-label="Draw the same moment in another state of mind"></div>
    <p class="scrawl-note" aria-hidden="true">
      <svg class="pen-arrow" viewBox="0 0 70 44" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M64 38c-12 1.6-25-1-35-8.4C20.6 23.4 14.8 14.7 11.6 4.6"/><path d="M5.6 11.4c2.3-2.6 4.1-5 6-7.6 2.6 2 5.4 3.6 8.1 5.4"/></svg>
      <span data-scrawl="SAME MOMENT. 8 STATES OF MIND." data-size="12" data-seed="7"></span>
    </p>
    <div class="hero-cap">
      <p id="hero-cap" aria-live="polite"></p>
      <div class="hero-cap-actions">
        <button class="nd-btn nd-btn--quiet nd-btn--sm" id="hero-next" type="button">Another moment</button>
        <a class="nd-btn nd-btn--sm" id="hero-open" href="#/gallery">Open this one</a>
      </div>
    </div>
  </div>
</section>

<section class="wrap manifesto">
  <h2 class="nd-h1">Product art draws the person. I wanted to draw the&nbsp;thought.</h2>
  <div class="manifesto-body">
    <p>Open almost any app and you'll find the same picture: <s class="nd-redline">a flat person at a laptop, a pastel blob, a smile</s>. It works on a pricing page. It says nothing when someone is stuck on a loading screen, staring at an empty inbox, or about to delete their account.</p>
    <p>Those are moments of mind, so Neurodelic draws them from the inside. Every picture keeps to the same grammar, which means the thousandth one still looks like it came from the same hand as the first.</p>
    <ul class="laws">
      <li><strong>The body is quiet.</strong> One solid shape in one ink. No face to read, no laptop, no smile.</li>
      <li><strong>The mind is loud.</strong> All the colour and all the texture live where the thinking happens.</li>
      <li><strong>A hand makes every mark.</strong> Scribble, dot, hatch, grain. Nothing is a flat fill with a perfect edge.</li>
    </ul>
  </div>
</section>

<section class="wrap moments">
  <div class="sec-head">
    <h2 class="nd-h2">${MOMENTS.length} moments, matched to the screens that need them</h2>
    <p>Pick the moment your screen is about. Each one comes in ${STATES.length} states of mind and as many versions as you want.</p>
  </div>
  <ol class="moment-list">
    ${MOMENTS.map((m, i) => `<li><a href="#/gallery?moment=${m.id}">${thumb({ moment: m.id, state: STATES[i % STATES.length].id, seed: 1 }, '', 'ml-art')}<span class="ml-t">${esc(m.title)}</span><span class="ml-u">${esc(m.use.join(', '))}</span></a></li>`).join('')}
  </ol>
</section>

<section class="sheet-band">
  <div class="wrap">
    <div class="sec-head row">
      <div>
        <h2 class="nd-h2">Every moment in every state, four ways. Then it keeps going.</h2>
        <p>The gallery holds ${fmt(ART_COUNT)} pieces I picked out. Change the seed on any of them and you get one nobody has seen.</p>
      </div>
      <a class="nd-btn" href="#/gallery">Open the gallery</a>
    </div>
    <div class="sheet">${sheet.map((it) => `<a href="${pieceHref(it.moment, it.state, it.seed)}" aria-label="${esc(momentById(it.moment).title)}, ${stateById(it.state).name}">${thumb(it)}</a>`).join('')}</div>
  </div>
</section>

<section class="wrap kit">
  <div class="sec-head">
    <h2 class="nd-h2">Drawn in the same hand</h2>
    <p>Icons, a typeface and a UI kit, so the screen around the picture belongs to it too.</p>
  </div>
  <div class="kit-grid">
    <a class="kit-icons" href="#/icons">
      <span class="kit-icon-row">${['brain', 'idea', 'spiral', 'eye', 'flame', 'moon', 'search', 'bell', 'heart', 'sparkle', 'planet', 'bolt'].map((k, i) => `<span data-icon="${k}" data-size="34" data-style="${ICON_STYLES[i % 4].id === 'neon' ? 'scribble' : ICON_STYLES[i % 4].id}"></span>`).join('')}</span>
      <span class="kit-label"><strong>${ICON_COUNT} icons</strong> on a 24px grid, in four hands.</span>
    </a>
    <a class="kit-type" href="#/type">
      <span data-scrawl="LOUD MIND" data-size="58" data-seed="5"></span>
      <span class="kit-label"><strong>Scrawl</strong>, a single-stroke display face.</span>
    </a>
    <div class="kit-ui">
      <div class="kit-ui-demo">
        <button class="nd-btn nd-btn--solid" type="button">Start focus</button>
        <button class="nd-btn" type="button">Not now</button>
        <div class="nd-seg" role="group" aria-label="Example choice"><button type="button" aria-pressed="true" data-demo-seg>25 min</button><button type="button" aria-pressed="false" data-demo-seg>50 min</button></div>
        <label class="nd-choice"><input class="nd-switch" type="checkbox" role="switch" checked> Quiet hours</label>
      </div>
      <p class="kit-label"><strong>A UI kit</strong> in plain CSS and React. Paper, one ink and a ballpoint pen. <a class="nd-link" href="#/ui">Open the kit</a></p>
    </div>
  </div>
</section>

<section class="wrap agent">
  <div>
    <h2 class="nd-h2">Hand it to your agent</h2>
    <p>The genre is written down as rules, so your coding agent can keep to them. Drop the skill file into Claude Code, Cursor or Codex, or call the renderer straight from your code. It has no dependencies and runs in the browser or Node.</p>
    <a class="nd-btn" href="#/use">How to use it</a>
  </div>
  <pre class="code"><code>${esc(codeFor({ moment: 'deep-focus', state: 'stipple', seed: 7 }))}</code></pre>
</section>`;
}

function bindHome() {
  const stage = $('#hero-stage');
  if (!stage) return;
  const sw = $('#swatches');
  const drawSwatches = () => {
    sw.innerHTML = STATES.map((s) => `<button class="swatch" type="button" data-state="${s.id}" aria-pressed="${s.id === hero.state}"><span class="swatch-art">${thumb({ moment: hero.moment, state: s.id, seed: hero.seed })}</span><span class="swatch-name">${s.name}</span></button>`).join('');
    hydrate(sw);
  };
  const caption = () => {
    const m = momentById(hero.moment), st = stateById(hero.state);
    $('#hero-cap').innerHTML = `<strong>${esc(m.title)}</strong>, in ${st.name}. ${esc(m.line)}`;
    $('#hero-slug').textContent = `${hero.moment} · ${hero.state} · seed ${hero.seed} · ${paletteNameFor(hero.state, hero.seed)}`;
    $('#hero-open').href = pieceHref(hero.moment, hero.state, hero.seed);
  };
  const draw = async (reveal) => {
    const token = ++hero.token;
    const svg = await Pool.render({ moment: hero.moment, state: hero.state, seed: hero.seed, id: `ndh${token}` }, { front: true });
    if (token !== hero.token || !stage.isConnected || !svg) return;
    const [, fx, fy] = svg.match(/data-focal="([\d.]+) ([\d.]+)"/) || [0, 0.5, 0.5];
    const layer = document.createElement('div');
    layer.className = 'hero-layer';
    layer.style.setProperty('--fx', `${(+fx * 100).toFixed(1)}%`);
    layer.style.setProperty('--fy', `${(+fy * 100).toFixed(1)}%`);
    layer.innerHTML = svg;
    stage.append(layer);
    if (reveal && !reduced()) { layer.getBoundingClientRect(); layer.classList.add('in'); }
    else layer.classList.add('in', 'now');
    caption();
    const old = $$('.hero-layer', stage).slice(0, -1);
    setTimeout(() => old.forEach((o) => o.remove()), reveal && !reduced() ? 1300 : 0);
  };
  const setState = (id, reveal = true) => {
    hero.state = id;
    $$('.swatch', sw).forEach((b) => b.setAttribute('aria-pressed', b.dataset.state === id));
    draw(reveal);
  };
  const stopAuto = () => { clearInterval(hero.auto); hero.auto = null; };
  sw.addEventListener('click', (e) => {
    const b = e.target.closest('.swatch');
    if (!b) return;
    stopAuto();
    setState(b.dataset.state);
  });
  $('#hero-next').addEventListener('click', () => {
    stopAuto();
    hero.i = (hero.i + 1) % HERO_PICKS.length;
    [hero.moment, hero.seed] = HERO_PICKS[hero.i];
    drawSwatches();
    draw(true);
  });
  $$('[data-demo-seg]').forEach((b) => b.addEventListener('click', () => $$('[data-demo-seg]').forEach((x) => x.setAttribute('aria-pressed', x === b))));
  drawSwatches();
  draw(false);
  stopAuto();
  if (!reduced()) {
    const order = STATES.map((s) => s.id);
    hero.auto = setInterval(() => {
      if (!stage.isConnected) return stopAuto();
      if (document.hidden) return;
      setState(order[(order.indexOf(hero.state) + 1) % order.length]);
    }, 5200);
  }
}

// ------------------------------------------------------------ gallery
const PAGE = 48;
function gallery() {
  return `
<section class="wrap gallery">
  <div class="page-head">
    <h1 class="nd-h1">Gallery</h1>
    <p class="nd-lede">${MOMENTS.length} moments, each in ${STATES.length} states of mind, ${SEEDS_PER_PAIR} ways each. Open one to tune it and copy it out.</p>
  </div>
  <div class="filters" role="search">
    <label class="search">${icon('search')}<span class="sr">Search the gallery</span><input class="nd-input" id="q" type="search" placeholder="Try loading, error, success or focus" autocomplete="off"></label>
    <label class="sr" for="moment">Moment</label>
    <span class="nd-select-wrap"><select class="nd-select" id="moment"><option value="">Every moment</option>${MOMENTS.map((m) => `<option value="${m.id}">${esc(m.title)}</option>`).join('')}</select></span>
    <button class="nd-btn nd-btn--sm" id="shuffle" type="button">${icon('refresh', 16)} Shuffle</button>
  </div>
  <div class="nd-seg state-seg" role="group" aria-label="State of mind">
    <button type="button" data-state="" aria-pressed="true">All states</button>
    ${STATES.map((s) => `<button type="button" data-state="${s.id}" aria-pressed="false">${dot(s.id)}${s.name}</button>`).join('')}
  </div>
  <p class="count" id="count" aria-live="polite"></p>
  <div class="grid" id="grid"></div>
  <div class="sentinel" id="sentinel" aria-hidden="true"></div>
</section>`;
}

function bindGallery(params) {
  const f = { q: params.get('q') || '', moment: momentIds.has(params.get('moment')) ? params.get('moment') : '', state: stateIds.has(params.get('state')) ? params.get('state') : '', order: +params.get('order') || 0 };
  const grid = $('#grid'), count = $('#count');
  $('#q').value = f.q;
  $('#moment').value = f.moment;
  let list = [], shown = 0;
  const sync = () => {
    const p = new URLSearchParams();
    for (const k of ['q', 'moment', 'state']) if (f[k]) p.set(k, f[k]);
    if (f.order) p.set('order', f.order);
    history.replaceState(null, '', `#/gallery${p.toString() ? '?' + p : ''}`);
    $$('.state-seg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.state === f.state));
  };
  const more = () => {
    if (shown >= list.length) return;
    const next = list.slice(shown, shown + PAGE);
    shown += next.length;
    grid.insertAdjacentHTML('beforeend', next.map((it) => tile(it)).join(''));
    hydrate(grid);
  };
  const draw = () => {
    const q = f.q.trim().toLowerCase();
    list = (f.moment || f.state ? CATALOG : MIXED).filter((it) => (!f.state || it.state === f.state) && (!f.moment || it.moment === f.moment) &&
      (!q || `${it.title} ${it.line} ${it.use.join(' ')} ${it.stateName} ${it.moment}`.toLowerCase().includes(q)));
    if (f.order) {
      let s = f.order;
      const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      list = list.map((it) => [r(), it]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    }
    shown = 0;
    grid.innerHTML = '';
    count.textContent = list.length ? `${fmt(list.length)} ${list.length === 1 ? 'piece' : 'pieces'}` : '';
    if (!list.length) {
      grid.innerHTML = `<div class="nd-empty gallery-empty"><span class="nd-plate">${thumb({ moment: 'forgetting', state: 'haze', seed: 2 }, 'A thought drifting away')}</span><h2 class="nd-h3">Nothing matches "${esc(f.q)}"</h2><p>Try a screen instead of a feeling: loading, error, success, search or welcome.</p><button class="nd-btn" type="button" id="clear">Clear the filters</button></div>`;
      hydrate(grid);
      $('#clear').addEventListener('click', () => { Object.assign(f, { q: '', moment: '', state: '' }); $('#q').value = ''; $('#moment').value = ''; sync(); draw(); });
      return;
    }
    more();
  };
  let t;
  $('#q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { f.q = e.target.value; sync(); draw(); }, 180); });
  $('#moment').addEventListener('change', (e) => { f.moment = e.target.value; sync(); draw(); });
  $$('.state-seg button').forEach((b) => b.addEventListener('click', () => { f.state = b.dataset.state; sync(); draw(); }));
  $('#shuffle').addEventListener('click', () => { f.order = 1 + Math.floor(Math.random() * 99999); sync(); draw(); });
  const sio = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) more(); }, { rootMargin: '900px 0px' });
  sio.observe($('#sentinel'));
  sync();
  draw();
}

// ------------------------------------------------------------ piece editor
function readPiece(parts, params) {
  const moment = momentIds.has(parts[1]) ? parts[1] : null;
  const state = stateIds.has(parts[2]) ? parts[2] : null;
  if (!moment || !state) return null;
  const seed = Math.max(1, Math.min(999999, Math.trunc(+parts[3]) || 1));
  const st = stateById(state);
  const num = (k, d, lo, hi) => { const v = params.get(k); return v == null || v === '' || !Number.isFinite(+v) ? d : Math.max(lo, Math.min(hi, +v)); };
  return {
    moment, state, seed,
    palette: st.palettes[params.get('palette')] ? params.get('palette') : paletteNameFor(state, seed),
    density: num('density', 1, 0.5, 1.6),
    hue: num('hue', 0, -180, 180),
    aspect: ASPECTS[params.get('aspect')] ? params.get('aspect') : 'square',
    animate: params.get('animate') !== '0',
  };
}

function piece(o) {
  if (!o) return notFound();
  const m = momentById(o.moment);
  return `
<section class="wrap piece" id="piece">
  <a class="back nd-link" href="#/gallery">Back to the gallery</a>
  <div class="piece-grid">
    <div class="piece-stage">
      <figure class="nd-plate nd-proof"><div class="stage" id="stage" aria-live="polite"></div><figcaption><span class="nd-slug" id="slug"></span></figcaption></figure>
      <p class="nd-small" id="size-note"></p>
    </div>
    <div class="piece-panel">
      <h1 class="nd-h1" id="p-title">${esc(m.title)}</h1>
      <p class="p-line" id="p-line">${esc(m.line)}</p>
      <p class="nd-small" id="p-use">Good for ${esc(m.use.join(', ').toLowerCase())}.</p>
      <div class="actions">
        <button class="nd-btn nd-btn--solid" data-act="copy" type="button">Copy SVG</button>
        <button class="nd-btn" data-act="react" type="button">Copy React</button>
        <button class="nd-btn" data-act="code" type="button">Copy code</button>
      </div>
      <div class="actions quiet">
        <button class="nd-btn nd-btn--quiet nd-btn--sm" data-act="svg" type="button">Download SVG</button>
        <button class="nd-btn nd-btn--quiet nd-btn--sm" data-act="png" type="button">Download PNG</button>
        <button class="nd-btn nd-btn--quiet nd-btn--sm" data-act="link" type="button">Copy link</button>
      </div>

      <div class="ctl">
        <span class="nd-label" id="l-state">State of mind</span>
        <div class="nd-seg" role="group" aria-labelledby="l-state" id="c-state">${STATES.map((s) => `<button type="button" data-state="${s.id}" aria-pressed="${s.id === o.state}">${dot(s.id)}${s.name}</button>`).join('')}</div>
        <p class="nd-hint" id="p-texture"></p>
      </div>
      <div class="ctl">
        <span class="nd-label" id="l-pal">Palette</span>
        <div class="pals" role="group" aria-labelledby="l-pal" id="c-pal"></div>
      </div>
      <div class="ctl ctl-row">
        <div class="nd-field seed-field"><label class="nd-label" for="seed">Seed</label><input class="nd-input" id="seed" type="number" min="1" max="999999" inputmode="numeric"></div>
        <button class="nd-btn nd-btn--sm" id="reroll" type="button">${icon('refresh', 16)} New seed</button>
      </div>
      <div class="ctl two">
        <div class="nd-field"><label class="nd-label" for="density">Density <output id="density-o"></output></label><input class="nd-range" id="density" type="range" min="0.5" max="1.6" step="0.1"></div>
        <div class="nd-field"><label class="nd-label" for="hue">Colour shift <output id="hue-o"></output></label><input class="nd-range" id="hue" type="range" min="-180" max="180" step="5"></div>
      </div>
      <div class="ctl ctl-row">
        <div><span class="nd-label" id="l-shape">Shape</span><div class="nd-seg" role="group" aria-labelledby="l-shape" id="c-aspect">${Object.entries(ASPECTS).map(([k, a]) => `<button type="button" data-aspect="${k}" aria-pressed="${k === o.aspect}">${a.label}</button>`).join('')}</div></div>
        <label class="nd-choice"><input class="nd-switch" id="animate" type="checkbox" role="switch"> Motion</label>
      </div>

    </div>
  </div>
  <div class="related">
    <h2 class="nd-h3">The same moment in the other states</h2>
    <div class="row-grid" id="rel-states"></div>
    <h2 class="nd-h3">More of this one</h2>
    <div class="row-grid" id="rel-seeds"></div>
  </div>
</section>`;
}

function bindPiece(o) {
  if (!o) return;
  const stage = $('#stage');
  const name = () => `neurodelic-${o.moment}-${o.state}-${o.seed}`;
  const full = (extra = {}) => ({ ...o, id: `nd-${o.moment}-${o.state}`, ...extra });
  let svg = '', token = 0;
  const syncUrl = () => {
    const p = new URLSearchParams();
    if (o.palette !== paletteNameFor(o.state, o.seed)) p.set('palette', o.palette);
    if (o.density !== 1) p.set('density', o.density);
    if (o.hue) p.set('hue', o.hue);
    if (o.aspect !== 'square') p.set('aspect', o.aspect);
    if (!o.animate) p.set('animate', '0');
    history.replaceState(null, '', `${pieceHref(o.moment, o.state, o.seed)}${p.toString() ? '?' + p : ''}`);
    document.title = `Neurodelic · ${momentById(o.moment).title}, ${stateById(o.state).name}`;
  };
  const paint = async () => {
    const t = ++token;
    stage.style.aspectRatio = `${ASPECTS[o.aspect].W}/${ASPECTS[o.aspect].H}`;
    stage.closest('.piece-stage').style.setProperty('--ar', (ASPECTS[o.aspect].W / ASPECTS[o.aspect].H).toFixed(3));
    stage.setAttribute('aria-busy', 'true');
    const out = await Pool.render(full(), { front: true });
    if (t !== token || !stage.isConnected || !out) return;
    svg = out;
    stage.innerHTML = svg;
    stage.removeAttribute('aria-busy');
    const curated = o.seed <= SEEDS_PER_PAIR && o.palette === paletteNameFor(o.state, o.seed) && o.density === 1 && !o.hue;
    $('#size-note').textContent = `${(new Blob([svg]).size / 1024).toFixed(0)} KB SVG · ${ASPECTS[o.aspect].W} × ${ASPECTS[o.aspect].H} · seed ${o.seed}${curated ? ', from the gallery' : ', drawn just now'}`;
    $('#slug').textContent = `${o.moment} · ${o.state} · seed ${o.seed} · ${o.palette}${o.hue ? ` · hue ${o.hue}` : ''}${o.density !== 1 ? ` · density ${o.density}` : ''}`;
    syncUrl();
  };
  const drawPalettes = () => {
    const st = stateById(o.state);
    $('#c-pal').innerHTML = Object.entries(st.palettes).map(([k, pal]) => `<button class="pal" type="button" data-palette="${k}" aria-pressed="${k === o.palette}"><span class="pal-dots">${palDots(pal)}</span><span>${k}</span></button>`).join('');
    $('#p-texture').textContent = `${st.texture}. ${st.mood}.`;
  };
  const drawRelated = () => {
    $('#rel-states').innerHTML = STATES.filter((s) => s.id !== o.state).map((s) => tile({ moment: o.moment, state: s.id, seed: o.seed }, 'small')).join('');
    const seeds = [];
    for (let k = 1; seeds.length < 7; k++) if (o.seed + k !== o.seed) seeds.push(o.seed + k);
    $('#rel-seeds').innerHTML = seeds.map((s) => tile({ moment: o.moment, state: o.state, seed: s }, 'small')).join('');
    hydrate($('.related'));
  };
  const setInputs = () => {
    $('#seed').value = o.seed;
    $('#density').value = o.density; $('#density-o').textContent = o.density.toFixed(1);
    $('#hue').value = o.hue; $('#hue-o').textContent = `${o.hue}°`;
    $('#animate').checked = o.animate;
  };
  setInputs(); drawPalettes(); drawRelated(); paint();
  let raf;
  const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); };

  $('#c-state').addEventListener('click', (e) => {
    const b = e.target.closest('[data-state]'); if (!b) return;
    o.state = b.dataset.state; o.palette = paletteNameFor(o.state, o.seed);
    $$('#c-state button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    drawPalettes(); drawRelated(); paint();
  });
  $('#c-pal').addEventListener('click', (e) => {
    const b = e.target.closest('[data-palette]'); if (!b) return;
    o.palette = b.dataset.palette;
    $$('#c-pal button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    paint();
  });
  $('#c-aspect').addEventListener('click', (e) => {
    const b = e.target.closest('[data-aspect]'); if (!b) return;
    o.aspect = b.dataset.aspect;
    $$('#c-aspect button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    paint();
  });
  const setSeed = (s) => { o.seed = s; o.palette = paletteNameFor(o.state, o.seed); setInputs(); drawPalettes(); drawRelated(); paint(); };
  $('#seed').addEventListener('change', (e) => setSeed(Math.max(1, Math.min(999999, Math.round(+e.target.value) || 1))));
  $('#reroll').addEventListener('click', () => setSeed(SEEDS_PER_PAIR + 1 + Math.floor(Math.random() * 99990)));
  $('#density').addEventListener('input', (e) => { o.density = +e.target.value; $('#density-o').textContent = o.density.toFixed(1); later(); });
  $('#hue').addEventListener('input', (e) => { o.hue = +e.target.value; $('#hue-o').textContent = `${o.hue}°`; later(); });
  $('#animate').addEventListener('change', (e) => { o.animate = e.target.checked; paint(); });

  $$('[data-act]').forEach((b) => b.addEventListener('click', async () => {
    const act = b.dataset.act;
    if (!svg) return;
    if (act === 'copy') copy(svg, 'SVG copied');
    if (act === 'svg') download(`${name()}.svg`, svg);
    if (act === 'react') copy(toReact(svg, `${o.moment}-${o.state}`), 'React component copied');
    if (act === 'code') copy(codeFor(o), 'Code copied');
    if (act === 'link') copy(location.href, 'Link copied');
    if (act === 'png') {
      b.setAttribute('aria-busy', 'true');
      try { download(`${name()}.png`, await svgToPng(renderIllustration(full({ animate: false })), 3)); }
      catch { toast('This browser could not make a PNG. The SVG works everywhere.'); }
      b.removeAttribute('aria-busy');
    }
  }));
}

// ------------------------------------------------------------ make
const made = [];
function make(params) {
  const mSel = momentIds.has(params.get('moment')) ? params.get('moment') : '';
  const sSel = stateIds.has(params.get('state')) ? params.get('state') : '';
  return `
<section class="wrap make">
  <div class="page-head">
    <h1 class="nd-h1">Make one nobody has seen</h1>
    <p class="nd-lede">Every seed draws a new picture. Pick a moment and a state, or leave either on any, then press draw. Keep the one you like.</p>
  </div>
  <div class="make-grid">
    <div class="make-stage">
      <figure class="nd-plate"><div class="stage" id="mstage" aria-live="polite"></div></figure>
      <p class="nd-small" id="mcap"></p>
    </div>
    <div class="make-panel nd-panel">
      <div class="nd-field"><label class="nd-label" for="m-moment">Moment</label><span class="nd-select-wrap"><select class="nd-select" id="m-moment"><option value="">Any moment</option>${MOMENTS.map((m) => `<option value="${m.id}" ${m.id === mSel ? 'selected' : ''}>${esc(m.title)}</option>`).join('')}</select></span></div>
      <div class="nd-field"><label class="nd-label" for="m-state">State of mind</label><span class="nd-select-wrap"><select class="nd-select" id="m-state"><option value="">Any state</option>${STATES.map((s) => `<option value="${s.id}" ${s.id === sSel ? 'selected' : ''}>${s.name}</option>`).join('')}</select></span></div>
      <div class="make-actions">
        <button class="nd-btn nd-btn--pen" id="draw" type="button">Draw</button>
        <a class="nd-btn" id="mopen" href="#/gallery">Tune and copy</a>
      </div>
      <p class="nd-hint">Seeds run to 999,999 for every pair, so that's about 256 million pictures, and every one keeps to the rules.</p>
    </div>
  </div>
  <div class="related" id="mhist-wrap" hidden>
    <h2 class="nd-h3">Drawn so far</h2>
    <div class="row-grid" id="mhist"></div>
  </div>
</section>`;
}

function bindMake() {
  const stage = $('#mstage');
  let token = 0;
  const pick = (sel, list) => sel.value || list[Math.floor(Math.random() * list.length)].id;
  const hist = () => {
    $('#mhist-wrap').hidden = made.length < 2;
    $('#mhist').innerHTML = made.slice(1, 15).map((it) => tile(it, 'small')).join('');
    hydrate($('#mhist'));
  };
  const show = async (it) => {
    const t = ++token;
    stage.setAttribute('aria-busy', 'true');
    const svg = await Pool.render({ ...it, id: `ndm${t}` }, { front: true });
    if (t !== token || !stage.isConnected || !svg) return;
    stage.innerHTML = svg;
    stage.removeAttribute('aria-busy');
    const m = momentById(it.moment);
    $('#mcap').textContent = `${m.title}, in ${stateById(it.state).name}, seed ${fmt(it.seed)}. ${m.line}`;
    $('#mopen').href = pieceHref(it.moment, it.state, it.seed);
  };
  const draw = () => {
    const it = { moment: pick($('#m-moment'), MOMENTS), state: pick($('#m-state'), STATES), seed: SEEDS_PER_PAIR + 1 + Math.floor(Math.random() * 999990) };
    made.unshift(it);
    if (made.length > 40) made.pop();
    show(it);
    hist();
  };
  $('#draw').addEventListener('click', draw);
  if (made.length) { show(made[0]); hist(); } else draw();
}

// ------------------------------------------------------------ icons
function icons() {
  return `
<section class="wrap icons-page">
  <div class="page-head">
    <h1 class="nd-h1">Icons</h1>
    <p class="nd-lede">${ICON_COUNT} icons on a 24px grid with a 2px safe area, drawn in four hands. Click one to copy its SVG. They use <code>currentColor</code>, so they take the colour of the text around them.</p>
  </div>
  <div class="tools">
    <div class="nd-seg" role="group" aria-label="Hand" id="i-style">${ICON_STYLES.map((s, i) => `<button type="button" data-v="${s.id}" aria-pressed="${i === 0}" data-tip="${esc(s.summary)}">${s.name}</button>`).join('')}</div>
    <div class="nd-field inline"><label class="nd-label" for="iweight">Weight</label><input class="nd-range" type="range" id="iweight" min="1" max="2.5" step="0.1" value="1.5"></div>
    <div class="nd-field inline"><label class="nd-label" for="ijitter">Wobble</label><input class="nd-range" type="range" id="ijitter" min="0" max="2" step="0.1" value="1"></div>
    <div class="nd-field inline"><label class="nd-label" for="isize">Size</label><input class="nd-range" type="range" id="isize" min="20" max="64" step="4" value="40"></div>
    <label class="swatch-pick"><span class="nd-label">Colour</span><input type="color" id="icolor" value="#14152b"></label>
    <label class="search small">${icon('search')}<span class="sr">Search icons</span><input class="nd-input" id="iq" type="search" placeholder="Search icons"></label>
    <button class="nd-btn nd-btn--sm" id="isprite" type="button">Download all as a sprite</button>
  </div>
  <div id="icon-groups"></div>
</section>`;
}

function bindIcons() {
  const st = { style: 'scribble', color: '#14152b', weight: 1.5, jitter: 1, size: 40, q: '' };
  const opts = (extra = {}) => ({ style: st.style, weight: st.weight, jitter: st.jitter, color: st.style === 'neon' ? undefined : st.color, ...extra });
  const draw = () => {
    const html = Object.entries(ICON_GROUPS).map(([g, names]) => {
      const list = names.filter((k) => k.includes(st.q));
      if (!list.length) return '';
      return `<h2 class="nd-h3">${g}</h2><div class="icon-grid ${st.style === 'neon' ? 'dark' : ''}">${list.map((k) => `<button class="icon-cell" type="button" data-name="${k}">${renderIcon(k, opts({ size: st.size, title: '' }))}<span>${k}</span></button>`).join('')}</div>`;
    }).join('');
    $('#icon-groups').innerHTML = html || '<p class="nd-small">No icon by that name yet.</p>';
  };
  draw();
  $('#i-style').addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    st.style = b.dataset.v;
    $$('#i-style button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    draw();
  });
  for (const [id, key] of [['icolor', 'color'], ['iweight', 'weight'], ['ijitter', 'jitter'], ['isize', 'size']]) {
    $('#' + id).addEventListener('input', (e) => { st[key] = key === 'color' ? e.target.value : +e.target.value; draw(); });
  }
  $('#iq').addEventListener('input', (e) => { st.q = e.target.value.trim().toLowerCase(); draw(); });
  $('#icon-groups').addEventListener('click', (e) => {
    const b = e.target.closest('[data-name]'); if (!b) return;
    copy(renderIcon(b.dataset.name, opts({ size: 24, color: st.style === 'neon' ? undefined : 'currentColor' })), `${b.dataset.name} copied`);
  });
  $('#isprite').addEventListener('click', () => {
    const symbols = Object.keys(ICONS).map((k) => renderIcon(k, opts({ color: st.style === 'neon' ? undefined : 'currentColor', id: `nd-${k}` }))
      .replace(/^<svg[^>]*>/, `<symbol id="nd-${k}" viewBox="0 0 24 24">`).replace(/<\/svg>$/, '</symbol>')).join('\n');
    download(`neurodelic-icons-${st.style}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n<!-- Neurodelic icons, ${st.style} hand. Use: <svg width="24" height="24"><use href="#nd-brain"/></svg> -->\n${symbols}\n</svg>`);
  });
}

// ------------------------------------------------------------ type
function typePage() {
  return `
<section class="wrap type-page">
  <div class="page-head">
    <h1 class="nd-h1">Scrawl</h1>
    <p class="nd-lede">A single-stroke display face for headlines, in the same four hands as the icons. Capitals, numbers and a little punctuation on a 4 × 6 grid. Change the seed and the hand writes it again, slightly differently.</p>
  </div>
  <div class="tools">
    <div class="nd-field grow"><label class="nd-label" for="ttext">Your words</label><textarea class="nd-textarea" id="ttext" rows="2" maxlength="120">QUIET BODY\nLOUD MIND</textarea></div>
    <div class="nd-seg" role="group" aria-label="Hand" id="t-style">${ICON_STYLES.map((s, i) => `<button type="button" data-v="${s.id}" aria-pressed="${i === 0}">${s.name}</button>`).join('')}</div>
    <div class="nd-field inline"><label class="nd-label" for="tsize">Size</label><input class="nd-range" type="range" id="tsize" min="24" max="140" step="4" value="88"></div>
    <div class="nd-field inline seed-field"><label class="nd-label" for="tseed">Seed</label><input class="nd-input" type="number" id="tseed" min="1" max="999" value="3"></div>
    <label class="swatch-pick"><span class="nd-label">Colour</span><input type="color" id="tcolor" value="#2b3bd6"></label>
    <button class="nd-btn nd-btn--sm nd-btn--solid" id="tcopy" type="button">Copy SVG</button>
    <button class="nd-btn nd-btn--sm" id="tdl" type="button">Download SVG</button>
  </div>
  <div class="type-stage" id="tstage"></div>
  <h2 class="nd-h3">Every character</h2>
  <div class="charset"><span data-scrawl="${esc(CHARSET.replace(/ /g, '').slice(0, 26))}" data-size="32"></span><span data-scrawl="${esc(CHARSET.replace(/ /g, '').slice(26))}" data-size="32"></span></div>
</section>`;
}

function bindType() {
  const st = { style: 'scribble', color: '#2b3bd6', size: 88, seed: 3 };
  const text = $('#ttext');
  let svg = '';
  const draw = () => {
    svg = renderScrawl(text.value || ' ', { capHeight: st.size, style: st.style, color: st.style === 'neon' ? undefined : st.color, seed: st.seed });
    $('#tstage').innerHTML = svg;
    $('#tstage').classList.toggle('dark', st.style === 'neon');
  };
  draw();
  text.addEventListener('input', draw);
  $('#t-style').addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    st.style = b.dataset.v;
    $$('#t-style button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    draw();
  });
  $('#tcolor').addEventListener('input', (e) => { st.color = e.target.value; draw(); });
  $('#tsize').addEventListener('input', (e) => { st.size = +e.target.value; draw(); });
  $('#tseed').addEventListener('input', (e) => { st.seed = +e.target.value || 1; draw(); });
  $('#tcopy').addEventListener('click', () => copy(svg, 'SVG copied'));
  $('#tdl').addEventListener('click', () => download('neurodelic-scrawl.svg', svg));
}

// ------------------------------------------------------------ UI kit
const NOTE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12.2 10.8c-.1 2.4.1 4.7-.1 7.1M12 6.6v.2M12 3.4c4.8-.1 8.7 3.8 8.6 8.6.1 4.8-3.9 8.7-8.7 8.6-4.7 0-8.5-3.9-8.5-8.6.1-4.7 3.9-8.6 8.6-8.6z"/></svg>';
const OK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 12.6c1.8 1.3 3.2 3 4.4 5 2.4-5 5.4-8.9 9.6-11.8"/></svg>';
const ERR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 6.2c.1 2.6-.1 5.3.1 7.9M12.1 17.6v.2M4.4 19.3c2.4-5.1 5-9.8 7.7-14.4 2.6 4.6 5.3 9.3 7.6 14.2-5.1.4-10.2.5-15.3.2z"/></svg>';
const LOADER = '<svg class="nd-loader" viewBox="0 0 28 28" role="img" aria-label="Loading"><path d="M14 4.2c5.6-.2 9.9 4.2 9.8 9.7.1 5.6-4.3 9.9-9.9 9.9-5.4-.1-9.6-4.4-9.5-9.8C4.5 8.6 8.7 4.4 14 4.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

const DEMOS = [
  { id: 'button', name: 'Button', what: 'Four weights. Solid for the one thing you want done, pen for a creative action, outline for the rest, quiet for the least important. Every edge is drawn twice, a firm line and a loose pass.',
    html: `<button class="nd-btn nd-btn--solid">Save changes</button>
<button class="nd-btn nd-btn--pen">Draw</button>
<button class="nd-btn">Cancel</button>
<button class="nd-btn nd-btn--quiet">Skip for now</button>
<button class="nd-btn nd-btn--sm" aria-busy="true">Saving</button>
<button class="nd-btn nd-btn--sm" disabled>Disabled</button>`,
    react: `<Button variant="solid">Save changes</Button>
<Button variant="pen">Draw</Button>
<Button>Cancel</Button>
<Button variant="quiet">Skip for now</Button>
<Button size="sm" busy>Saving</Button>` },
  { id: 'field', name: 'Text field', what: 'A label, a hint and an error, all wired up for screen readers. Focus is a ring of pen-blue wash, not a glow.',
    html: `<div class="nd-field">
  <label class="nd-label" for="d-name">Your name</label>
  <input class="nd-input" id="d-name" placeholder="Vince" aria-describedby="d-name-h">
  <span class="nd-hint" id="d-name-h">The one people call you.</span>
</div>
<div class="nd-field">
  <label class="nd-label" for="d-mail">Email</label>
  <input class="nd-input" id="d-mail" value="vince@" aria-invalid="true" aria-describedby="d-mail-e">
  <span class="nd-error" id="d-mail-e">That email is missing the part after the @.</span>
</div>`,
    react: `<Field label="Your name" hint="The one people call you.">
  <Input placeholder="Vince" />
</Field>
<Field label="Email" error="That email is missing the part after the @.">
  <Input defaultValue="vince@" />
</Field>` },
  { id: 'select', name: 'Select and textarea', what: 'Native controls, restyled. The chevron is a pen mark, so it takes the text colour.',
    html: `<div class="nd-field">
  <label class="nd-label" for="d-sel">State of mind</label>
  <span class="nd-select-wrap"><select class="nd-select" id="d-sel"><option>Stipple</option><option>Haze</option><option>Ember</option></select></span>
</div>
<div class="nd-field">
  <label class="nd-label" for="d-ta">What's on your mind?</label>
  <textarea class="nd-textarea" id="d-ta" placeholder="Start anywhere"></textarea>
</div>`,
    react: `<Field label="State of mind">
  <Select><option>Stipple</option><option>Haze</option></Select>
</Field>
<Field label="What's on your mind?">
  <Textarea placeholder="Start anywhere" />
</Field>` },
  { id: 'choice', name: 'Checkbox, radio, switch', what: 'The tick, the dot and the knob are drawn marks in pen blue. The switch knob turns as it slides.',
    html: `<label class="nd-choice"><input class="nd-check" type="checkbox" checked> Remember me</label>
<label class="nd-choice"><input class="nd-radio" type="radio" name="d-r" checked> Monthly</label>
<label class="nd-choice"><input class="nd-radio" type="radio" name="d-r"> Yearly</label>
<label class="nd-choice"><input class="nd-switch" type="checkbox" role="switch" checked> Quiet hours</label>`,
    react: `<Checkbox label="Remember me" defaultChecked />
<Radio name="plan" label="Monthly" defaultChecked />
<Radio name="plan" label="Yearly" />
<Switch label="Quiet hours" defaultChecked />` },
  { id: 'range', name: 'Range', what: 'A wavy ballpoint line with an ink blot for a handle.',
    html: `<div class="nd-field">
  <label class="nd-label" for="d-range">Density</label>
  <input class="nd-range" id="d-range" type="range" min="0" max="100" value="60">
</div>`,
    react: `<Field label="Density"><Range min={0} max={100} defaultValue={60} /></Field>` },
  { id: 'seg', name: 'Segmented and tabs', what: 'The chosen option gets circled in pen, the way you would mark a printout. Tabs move with the arrow keys.',
    html: `<div class="nd-seg" role="group" aria-label="Length">
  <button aria-pressed="false">15 min</button>
  <button aria-pressed="true">25 min</button>
  <button aria-pressed="false">50 min</button>
</div>
<div class="nd-tabs" role="tablist" aria-label="Views">
  <button role="tab" aria-selected="true">Today</button>
  <button role="tab" aria-selected="false">This week</button>
  <button role="tab" aria-selected="false">All time</button>
</div>`,
    react: `<Segmented label="Length" value={len} onChange={setLen}
  options={[{ value: 15, label: '15 min' }, { value: 25, label: '25 min' }, { value: 50, label: '50 min' }]} />
<Tabs label="Views" tabs={[
  { id: 'today', label: 'Today', content: <Today /> },
  { id: 'week', label: 'This week', content: <Week /> },
]} />` },
  { id: 'tag', name: 'Tag', what: 'Small labels for status. Use pen, red and green only when the colour carries meaning.',
    html: `<span class="nd-tag">Draft</span>
<span class="nd-tag nd-tag--pen">New</span>
<span class="nd-tag nd-tag--green">Live</span>
<span class="nd-tag nd-tag--red">Failed</span>`,
    react: `<Tag>Draft</Tag> <Tag tone="pen">New</Tag> <Tag tone="green">Live</Tag> <Tag tone="red">Failed</Tag>` },
  { id: 'note', name: 'Note', what: 'Inline messages, outlined in the colour of the pen that fits: blue to inform, green when it worked, red when it did not.',
    html: `<div class="nd-note" role="status">${NOTE_ICON}<div><strong>Heads up</strong>Your focus timer keeps running while this tab is closed.</div></div>
<div class="nd-note nd-note--ok" role="status">${OK_ICON}<div><strong>Saved</strong>I'll remember this layout next time.</div></div>
<div class="nd-note nd-note--error" role="alert">${ERR_ICON}<div><strong>That didn't upload</strong>The file is over 20 MB. Try a smaller one.</div></div>`,
    react: `<Note title="Heads up">Your focus timer keeps running while this tab is closed.</Note>
<Note tone="ok" title="Saved">I'll remember this layout next time.</Note>
<Note tone="error" title="That didn't upload">The file is over 20 MB.</Note>` },
  { id: 'overlay', name: 'Dialog, toast, tooltip', what: 'The dialog is a native <dialog>, so focus and Escape work for free. Toasts say what just happened in a few words.',
    html: `<button class="nd-btn" data-open-dialog>Open dialog</button>
<button class="nd-btn" data-toast>Show a toast</button>
<button class="nd-btn nd-btn--quiet" data-tip="Tooltips are drawn too">Hover me</button>
<dialog class="nd-dialog" id="d-dialog" aria-labelledby="d-dialog-t">
  <h2 class="nd-h3" id="d-dialog-t">Delete this board?</h2>
  <p>Everything on it goes too. You can't undo this.</p>
  <div class="nd-dialog-actions">
    <button class="nd-btn" data-close-dialog>Keep it</button>
    <button class="nd-btn nd-btn--solid" data-close-dialog>Delete</button>
  </div>
</dialog>`,
    react: `<Dialog open={open} onClose={() => setOpen(false)} title="Delete this board?"
  actions={<><Button onClick={() => setOpen(false)}>Keep it</Button><Button variant="solid">Delete</Button></>}>
  <p>Everything on it goes too. You can't undo this.</p>
</Dialog>

const toast = useToast();
toast('Copied');   // render <toast.Region /> once
<Tooltip tip="Tooltips are drawn too"><Button variant="quiet">Hover me</Button></Tooltip>` },
  { id: 'progress', name: 'Progress and loader', what: 'A pen line filling up, and one loop being drawn over and over. Both stop moving when someone asks for less motion.',
    html: `<progress class="nd-progress" value="62" max="100" aria-label="Upload"></progress>
${LOADER}`,
    react: `<Progress value={62} label="Upload" />
<Loader label="Loading" />` },
  { id: 'misc', name: 'Avatar, divider, keys', what: 'The small parts. Avatars sit in a hand-drawn ring; the divider is a ballpoint line, not a rule.',
    html: `<span class="nd-avatar"><svg viewBox="0 0 44 44" aria-hidden="true"><rect width="44" height="44" fill="#1438C8"/><circle cx="22" cy="18" r="8" fill="#0B0D1C"/><path d="M8 44c2-10 8-14 14-14s12 4 14 14z" fill="#0B0D1C"/></svg></span>
<hr class="nd-divider">
<p>Press <kbd class="nd-kbd">⌘</kbd> <kbd class="nd-kbd">K</kbd> to search.</p>`,
    react: `<Avatar src="/me.jpg" alt="Vince" />
<Divider />
<p>Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to search.</p>` },
  { id: 'empty', name: 'Empty state and plate', what: 'Where the art meets the interface. A plate frames a piece with a thin paper margin. An empty state is a picture of the moment, what happened, and one way forward.',
    html: `<div class="nd-empty">
  <figure class="nd-plate">ILLUSTRATION</figure>
  <h3 class="nd-h3">You're all caught up</h3>
  <p>Nothing new since this morning. Go do something else.</p>
  <button class="nd-btn">Back to the board</button>
</div>`,
    react: `<EmptyState
  art={<Illustration render={renderIllustration} moment="empty-mind" state="stipple" seed={2} />}
  title="You're all caught up"
  action={<Button>Back to the board</Button>}>
  Nothing new since this morning. Go do something else.
</EmptyState>` },
];

const TOKENS = {
  colour: [
    ['--nd-paper', 'Paper', 'The page'], ['--nd-paper-raised', 'Raised paper', 'Fields, panels, plates'], ['--nd-paper-sunken', 'Sunken paper', 'Tracks, bands'],
    ['--nd-ink', 'Ink', 'Text, outlines, solid buttons'], ['--nd-ink-soft', 'Soft ink', 'Body copy'], ['--nd-ink-faint', 'Faint ink', 'Hints, captions'],
    ['--nd-pen', 'Ballpoint', 'Every mark a hand makes: links, focus, selection, circles'], ['--nd-pen-press', 'Pressed pen', 'Hover on pen and solid'],
    ['--nd-red-pen', 'Red pen', 'Errors only'], ['--nd-green-pen', 'Green pen', 'It worked'],
  ],
  type: [['--nd-text-display', 'Display', 'Quiet body, loud mind'], ['--nd-text-3xl', 'Heading 1', 'Make one nobody has seen'], ['--nd-text-2xl', 'Heading 2', 'Drawn in the same hand'], ['--nd-text-xl', 'Heading 3', 'More of this one'], ['--nd-text-lg', 'Lede', 'Every seed draws a new picture.'], ['--nd-text-md', 'Body', 'The body stays still. Everything inside it gets drawn.'], ['--nd-text-sm', 'Small', 'Seed 3, from the gallery'], ['--nd-text-xs', 'Tag', 'NEW']],
  space: ['--nd-1', '--nd-2', '--nd-3', '--nd-4', '--nd-5', '--nd-6', '--nd-7', '--nd-8', '--nd-9'],
  radius: [['--nd-wob', 'Wobble', 'Buttons, panels, notes'], ['--nd-wob-sm', 'Small wobble', 'Fields, tags'], ['--nd-wob-round', 'Round wobble', 'Avatars, radios, knobs']],
};

function uiKit() {
  return `
<section class="wrap ui-page">
  <div class="page-head">
    <h1 class="nd-h1">The UI kit</h1>
    <p class="nd-lede">Quiet body, loud mind applies to the interface too. The screen is paper, one blue-black ink and a ballpoint pen, so the only loud thing on it is the picture. It's plain CSS with React wrappers, and it themes the browser's own parts too: the selection, the caret, the focus ring and the scrollbar.</p>
    <div class="actions">
      <a class="nd-btn nd-btn--solid" href="/ui/neurodelic.css" download>Download the CSS</a>
      <a class="nd-btn" href="/ui/react.jsx" download="neurodelic-react.jsx">Download the React file</a>
    </div>
  </div>
  <pre class="code"><code>${esc(`<!-- Bricolage Grotesque for everything, Geist Mono for code -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&display=swap">
<link rel="stylesheet" href="${SITE}/ui/neurodelic.css">

<body class="nd-root"> … </body>`)}</code></pre>

  <h2 class="nd-h2 ui-sec">Tokens</h2>
  <h3 class="nd-h3">Colour</h3>
  <div class="tok-colours">${TOKENS.colour.map(([v, n, use]) => `<div class="tok-c"><span class="tok-sw" style="background:var(${v})"></span><span><strong>${n}</strong><code data-var="${v}">${v}</code><span class="nd-small">${use}</span></span></div>`).join('')}</div>
  <h3 class="nd-h3">Type</h3>
  <p class="nd-small">Bricolage Grotesque, a variable grotesque with width and optical size axes. Display and headings run condensed and heavy; body text runs at normal width. Geist Mono only for code.</p>
  <div class="tok-type">${TOKENS.type.map(([v, n, s], i) => `<div class="tok-t"><span class="nd-small">${n} · <code data-var="${v}">${v}</code></span><span class="${i === 0 ? 'nd-display' : i < 4 ? `nd-h${i}` : ''}" style="font-size:var(${v})">${s}</span></div>`).join('')}</div>
  <h3 class="nd-h3">Space and shape</h3>
  <div class="tok-space">${TOKENS.space.map((v) => `<div><span class="bar" style="width:var(${v})"></span><code>${v}</code></div>`).join('')}</div>
  <div class="tok-radius">${TOKENS.radius.map(([v, n, use]) => `<div><span class="shape" style="border-radius:var(${v})"></span><strong>${n}</strong><code>${v}</code><span class="nd-small">${use}</span></div>`).join('')}</div>
  <p class="nd-small">Motion: <code>--nd-ease</code> is an exponential ease-out, <code>--nd-fast</code> is 160ms for colour and <code>--nd-slow</code> is 480ms for movement. Nothing bounces, and everything stops for prefers-reduced-motion.</p>

  <h2 class="nd-h2 ui-sec">Components</h2>
  ${DEMOS.map((d) => `
  <section class="demo" id="ui-${d.id}">
    <div class="demo-text"><h3 class="nd-h3">${d.name}</h3><p>${esc(d.what)}</p></div>
    <div class="demo-live">${d.id === 'empty' ? d.html.replace('<figure class="nd-plate">ILLUSTRATION</figure>', `<span class="nd-plate">${thumb({ moment: 'empty-mind', state: 'stipple', seed: 2 }, 'A still figure under a quiet sky')}</span>`) : d.html}</div>
    <div class="demo-code">
      <div class="nd-tabs" role="tablist" aria-label="${d.name} code">
        <button role="tab" aria-selected="true" data-code="html">HTML</button><button role="tab" aria-selected="false" data-code="react">React</button>
        <button class="nd-btn nd-btn--quiet nd-btn--sm copy-code" type="button">Copy</button>
      </div>
      <pre class="code" data-for="html"><code>${esc(d.html.replace(/<svg[\s\S]*?<\/svg>/g, '<svg>…</svg>'))}</code></pre>
      <pre class="code" data-for="react" hidden><code>${esc(d.react)}</code></pre>
    </div>
  </section>`).join('')}
</section>`;
}

function bindUi() {
  const css = getComputedStyle(document.documentElement);
  $$('[data-var]').forEach((el) => {
    const v = css.getPropertyValue(el.dataset.var).trim();
    if (/^#|^rgba?/.test(v)) el.textContent = v.toUpperCase();
  });
  $$('.demo').forEach((d) => {
    const tabs = $$('[role=tab]', d);
    tabs.forEach((t) => t.addEventListener('click', () => {
      tabs.forEach((x) => x.setAttribute('aria-selected', x === t));
      $$('pre[data-for]', d).forEach((p) => (p.hidden = p.dataset.for !== t.dataset.code));
    }));
    $('.copy-code', d).addEventListener('click', () => copy($('pre:not([hidden])', d).textContent, 'Code copied'));
    $$('.demo-live .nd-seg button', d).forEach((b) => b.addEventListener('click', () => $$('.demo-live .nd-seg button', d).forEach((x) => x.setAttribute('aria-pressed', x === b))));
    $$('.demo-live .nd-tabs button', d).forEach((b) => b.addEventListener('click', () => $$('.demo-live .nd-tabs button', d).forEach((x) => x.setAttribute('aria-selected', x === b))));
  });
  $('[data-open-dialog]')?.addEventListener('click', () => $('#d-dialog').showModal());
  $$('[data-close-dialog]').forEach((b) => b.addEventListener('click', () => $('#d-dialog').close()));
  $('[data-toast]')?.addEventListener('click', () => toast('Saved. That was easy.'));
}

// ------------------------------------------------------------ guide
function guide() {
  return `
<section class="wrap guide">
  <div class="page-head">
    <h1 class="nd-h1">The guide</h1>
    <p class="nd-lede">Neuro, as in the brain. Delic, from psychedelic, which means mind-revealing. It's a genre for drawing what thinking feels like, instead of what a person at a laptop looks like. This is how it works, so you can keep new work on-style.</p>
  </div>

  <div class="g-sec">
    <h2 class="nd-h2">The message</h2>
    <div class="g-body">
      <p class="g-big">Quiet body, loud mind.</p>
      <p>Every picture says the same thing: the outside is calm, the inside is busy. The figure is one still, solid shape. The mind is where all the colour, texture and movement go. That's true of the interface too: the screen stays quiet so the picture can be loud.</p>
    </div>
  </div>

  <div class="g-sec">
    <h2 class="nd-h2">The problem it solves</h2>
    <table class="g-table">
      <thead><tr><th scope="col">What product art does now</th><th scope="col">What Neurodelic does</th></tr></thead>
      <tbody>
        <tr><td>Draws a person doing a task: typing, pointing at a chart, high-fiving.</td><td>Draws the state of mind the task puts you in: waiting, deciding, overloaded, clear.</td></tr>
        <tr><td>Every pack looks the same: flat people, pastel blobs, rounded everything.</td><td>Eight textures from real image-making (contour scribble, thermal scan, stipple, film haze, cut paper, paint shards, pen hatching, handwriting).</td></tr>
        <tr><td>You run out. A pack has 40 pictures, so the same one shows up on three screens.</td><td>${fmt(ART_COUNT)} picked pieces and a seed for every one, so there's always another that fits.</td></tr>
        <tr><td>Off-brand the moment you change a colour.</td><td>Palettes and a colour shift that keep the rules, so it bends to your brand and still looks like itself.</td></tr>
        <tr><td>Error, empty and loading screens get a sad cloud.</td><td>Each of those has its own moment: Broken, Empty mind, Daydream, Lost, Forgetting.</td></tr>
      </tbody>
    </table>
  </div>

  <div class="g-sec">
    <h2 class="nd-h2">The grammar</h2>
    <div class="g-body">
      <p>Every piece is three choices.</p>
      <dl class="g-dl">
        <dt>A moment</dt><dd>What is happening, in a product's terms: ${MOMENTS.length} of them, from New idea to Together. Each moment has a motif (a spiral for focus, rings for waiting, a crack for broken) and a few ways to frame the figure.</dd>
        <dt>A state of mind</dt><dd>How it feels, which decides the texture and the palette: ${STATES.map((s) => s.name).join(', ')}.</dd>
        <dt>A seed</dt><dd>Which version. Seeds 1 to ${SEEDS_PER_PAIR} are the ones in the gallery. Every other number is a new picture that follows the same rules.</dd>
      </dl>
      <p>Inside each picture there's always a <strong>figure</strong> (quiet, solid, one ink), a <strong>focal point</strong> (where the thought starts, usually the mind) and <strong>guides</strong> (the paths the thought takes: a spiral, a river, a ring). Each state draws those same three things in its own hand, which is why one moment reads the same in all eight.</p>
    </div>
  </div>

  <div class="g-sec">
    <h2 class="nd-h2">Eight states of mind</h2>
    <div class="g-states">
      ${STATES.map((s) => `
      <article class="g-state">
        <a class="nd-plate" href="${pieceHref('new-idea', s.id, 1)}">${thumb({ moment: 'new-idea', state: s.id, seed: 1 }, `New idea, in ${s.name}`)}</a>
        <div>
          <h3 class="nd-h3">${dot(s.id)}${s.name}</h3>
          <p class="nd-small">${esc(s.texture)}. ${esc(s.mood)}.</p>
          <p>${esc(s.summary)}</p>
          <ul class="g-rules">${s.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
          <div class="g-pals">${Object.entries(s.palettes).map(([k, p]) => `<span class="pal static"><span class="pal-dots">${palDots(p)}</span><span>${k}</span></span>`).join('')}</div>
        </div>
      </article>`).join('')}
    </div>
  </div>

  <div class="g-sec">
    <h2 class="nd-h2">The moments</h2>
    <table class="g-table moments-table">
      <thead><tr><th scope="col">Moment</th><th scope="col">What it feels like</th><th scope="col">Screens it's for</th></tr></thead>
      <tbody>${MOMENTS.map((m) => `<tr><th scope="row"><a class="nd-link" href="#/gallery?moment=${m.id}">${esc(m.title)}</a></th><td>${esc(m.line)}</td><td>${esc(m.use.join(', '))}</td></tr>`).join('')}</tbody>
    </table>
  </div>

  <div class="g-sec">
    <h2 class="nd-h2">Marks</h2>
    <dl class="g-dl wide">
      <dt>Scribble</dt><dd>Three to six passes per line, each wobbling a little off the last. Round caps, round joins.</dd>
      <dt>Stipple</dt><dd>Tone is how many dots, never grey. Dots are round, like crayon on rough paper.</dd>
      <dt>Hatch</dt><dd>Short pen strokes with a direction. They follow the form, and they get brighter facing the light.</dd>
      <dt>Grain</dt><dd>Fractal noise over everything soft. Blur hides the edges, grain stops it looking digital.</dd>
      <dt>Colour</dt><dd>Brightest where the mind is busiest. Colour is a reading, like a scan, not decoration.</dd>
    </dl>
  </div>

  <div class="g-sec">
    <h2 class="nd-h2">Icons and type</h2>
    <div class="g-icons">
      <div class="grid-box">${renderIcon('brain', { size: 220, color: '#14152B', title: 'Brain icon on the grid' })}</div>
      <dl class="g-dl">
        <dt>Grid</dt><dd>${ICON_GRID.size} × ${ICON_GRID.size} with a ${ICON_GRID.padding}px safe area.</dd>
        <dt>Line</dt><dd>${ICON_GRID.stroke} base weight, drawn as ${ICON_GRID.passes} loose passes, ${ICON_GRID.jitter}px of wobble.</dd>
        <dt>Hands</dt><dd>${ICON_STYLES.map((s) => s.name).join(', ')}.</dd>
        <dt>Type</dt><dd>Scrawl for headlines that should look written. Bricolage Grotesque for everything you read. Geist Mono only for code.</dd>
      </dl>
    </div>
  </div>
</section>`;
}

// ------------------------------------------------------------ use
function use() {
  return `
<section class="wrap use">
  <div class="page-head">
    <h1 class="nd-h1">Use it</h1>
    <p class="nd-lede">Copy from the site, call it from your code, link the files, or hand the rules to your agent.</p>
  </div>
  <div class="g-sec">
    <h2 class="nd-h2">Copy from the site</h2>
    <div class="g-body"><p>Open any piece, tune it, then copy the SVG, a React component or the code that draws it, or download a PNG. Every piece is one self-contained SVG with no fonts and no outside files. It animates on its own and goes still for anyone who has asked their device for less motion.</p></div>
  </div>
  <div class="g-sec">
    <h2 class="nd-h2">Call it from code</h2>
    <div class="g-body">
      <p>The renderer is plain JavaScript with no dependencies. Import it in the browser or in Node 18 and up.</p>
      <pre class="code"><code>${esc(`import { renderIllustration } from '${SITE}/src/render.js';
import { renderIcon } from '${SITE}/src/icons/render.js';
import { renderScrawl } from '${SITE}/src/type/scrawl.js';

renderIllustration({ moment: 'thinking', state: 'thermal', seed: 12, aspect: 'wide' });
renderIcon('brain', { style: 'neon', size: 32 });
renderScrawl('HELLO', { capHeight: 48, style: 'hatch' });`)}</code></pre>
      <dl class="g-dl wide">
        <dt>moment</dt><dd>${MOMENTS.map((m) => `<code>${m.id}</code>`).join(' ')}</dd>
        <dt>state</dt><dd>${STATES.map((s) => `<code>${s.id}</code>`).join(' ')}</dd>
        <dt>seed</dt><dd>Any whole number. 1 to ${SEEDS_PER_PAIR} are the gallery pieces.</dd>
        <dt>palette</dt><dd>One of the state's four palette names. By default the seed picks one.</dd>
        <dt>density, hue</dt><dd>0.5 to 1.6 for how much the hand puts down; −180 to 180 to rotate every colour.</dd>
        <dt>aspect</dt><dd><code>square</code> (400 × 400), <code>wide</code> (640 × 400), <code>tall</code> (400 × 500).</dd>
        <dt>animate</dt><dd><code>false</code> for a still picture.</dd>
      </dl>
    </div>
  </div>
  <div class="g-sec">
    <h2 class="nd-h2">Link a file</h2>
    <div class="g-body"><p>Every gallery piece is also a plain file: <code>/art/{moment}--{state}--{seed}.svg</code>, for example <a class="nd-link" href="/art/deep-focus--stipple--1.svg">/art/deep-focus--stipple--1.svg</a>. Icons are at <code>/icons/{hand}/{name}.svg</code>. There's an index of everything at <a class="nd-link" href="/catalog.json">/catalog.json</a>.</p></div>
  </div>
  <div class="g-sec">
    <h2 class="nd-h2">Teach your agent</h2>
    <div class="g-body">
      <p>The skill file writes the genre down as rules, so Claude Code, Cursor or Codex can pick the right moment and state for a screen, call the renderer and keep new work on-style.</p>
      <div class="actions"><a class="nd-btn nd-btn--solid" href="/neurodelic.skill.md" download>Download the skill</a><button class="nd-btn" id="copy-skill-cmd" type="button">Copy the install command</button></div>
    </div>
  </div>
  <div class="g-sec">
    <h2 class="nd-h2">License</h2>
    <div class="g-body"><p>The code is MIT. The illustrations, icons and lettering you make with it are yours to use in any project, personal or commercial, and you don't have to credit me (I'd love a link though). Please don't repackage the library and sell it as an asset pack. The full text is in the <a class="nd-link" href="https://github.com/vincedotcode/neurodelic/blob/main/LICENSE">LICENSE</a>.</p></div>
  </div>
</section>`;
}
function bindUse() {
  $('#copy-skill-cmd')?.addEventListener('click', () => copy(`mkdir -p .claude/skills/neurodelic && curl -sL ${SITE}/neurodelic.skill.md -o .claude/skills/neurodelic/SKILL.md`, 'Command copied'));
}

function notFound() {
  return `<section class="wrap nf"><div class="nd-empty"><span class="nd-plate">${thumb({ moment: 'lost', state: 'stipple', seed: 1 }, 'A small figure in a maze')}</span><h1 class="nd-h2">Lost the thought</h1><p>This page doesn't exist. It happens to all of us.</p><a class="nd-btn nd-btn--solid" href="#/">Back home</a></div></section>`;
}

// ------------------------------------------------------------ router
const TITLES = { '': 'Quiet body, loud mind', gallery: 'Gallery', make: 'Make one', icons: 'Icons', type: 'Scrawl typeface', ui: 'UI kit', guide: 'Guide', use: 'Use it' };

function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const params = new URLSearchParams(qs || '');
  const parts = path.split('/').filter(Boolean);
  let page = parts[0] || '';
  // Old links from the first version.
  if (page === 'library') { location.replace(`#/gallery${qs ? '?' + qs : ''}`); return; }
  if (page === 'i') { location.replace(momentIds.has(parts[1]) && stateIds.has(parts[2]) ? pieceHref(parts[1], parts[2], 1) : '#/gallery'); return; }
  let html, bind = () => {}, title;
  if (page === '') { html = home(); bind = bindHome; }
  else if (page === 'gallery') { html = gallery(); bind = () => bindGallery(params); }
  else if (page === 'p') { const o = readPiece(parts, params); html = piece(o); bind = () => bindPiece(o); title = o ? `${momentById(o.moment).title}, ${stateById(o.state).name}` : 'Not found'; }
  else if (page === 'make') { html = make(params); bind = bindMake; }
  else if (page === 'icons') { html = icons(); bind = bindIcons; }
  else if (page === 'type') { html = typePage(); bind = bindType; }
  else if (page === 'ui') { html = uiKit(); bind = bindUi; }
  else if (page === 'guide') { html = guide(); }
  else if (page === 'use') { html = use(); bind = bindUse; }
  else { html = notFound(); page = '404'; }
  main.innerHTML = html;
  main.dataset.page = page;
  document.title = `Neurodelic · ${title || TITLES[page] || 'Not found'}`;
  const navKey = page === 'p' ? 'gallery' : page;
  $$('.nav a').forEach((a) => (a.getAttribute('href') === `#/${navKey}` ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  hydrate();
  bind();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
$$('[data-version]').forEach((el) => (el.textContent = GENRE.version));
hydrate(document.body);
route();
