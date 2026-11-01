/*
 * Neurodelic UI for React. Copy this file into your project next to neurodelic.css.
 * No dependencies beyond React 18+. Every component is a thin wrapper over the nd- classes,
 * so the CSS stays the source of truth and you can drop to plain HTML whenever you like.
 *
 *   import './neurodelic.css';
 *   import { Button, Field, Input, Segmented, Note, Illustration } from './neurodelic-react';
 *
 * https://neurodelic.vincedotcode.com/#/ui
 */
import { forwardRef, useEffect, useId, useMemo, useRef, useState, useCallback, createContext, useContext } from 'react';

const cx = (...c) => c.filter(Boolean).join(' ');

/* ------------------------------------------------------------ type */

export const Display = ({ as: T = 'h1', className, ...p }) => <T className={cx('nd-display', className)} {...p} />;
export const Heading = ({ level = 2, className, ...p }) => {
  const T = `h${level}`;
  return <T className={cx(level <= 1 ? 'nd-h1' : level === 2 ? 'nd-h2' : 'nd-h3', className)} {...p} />;
};
export const Lede = ({ className, ...p }) => <p className={cx('nd-lede', className)} {...p} />;
export const Link = forwardRef(({ className, ...p }, ref) => <a ref={ref} className={cx('nd-link', className)} {...p} />);
export const Kbd = ({ className, ...p }) => <kbd className={cx('nd-kbd', className)} {...p} />;

/* ------------------------------------------------------------ buttons */

/** variant: 'outline' (default) | 'solid' | 'pen' | 'quiet'. size: 'md' | 'sm'. */
export const Button = forwardRef(({ variant = 'outline', size = 'md', icon = false, busy = false, className, children, ...p }, ref) => (
  <button
    ref={ref}
    type={p.type || 'button'}
    aria-busy={busy || undefined}
    className={cx('nd-btn', variant !== 'outline' && `nd-btn--${variant}`, size === 'sm' && 'nd-btn--sm', icon && 'nd-btn--icon', className)}
    {...p}
  >
    {children}
  </button>
));

/* ------------------------------------------------------------ fields */

const FieldCtx = createContext(null);

/** Wires up label, hint and error ids for the control inside it. */
export function Field({ label, hint, error, children, className }) {
  const id = useId();
  const ctx = useMemo(() => ({ id, hintId: hint ? `${id}-h` : undefined, errorId: error ? `${id}-e` : undefined, invalid: !!error }), [id, hint, error]);
  return (
    <FieldCtx.Provider value={ctx}>
      <div className={cx('nd-field', className)}>
        {label && <label className="nd-label" htmlFor={id}>{label}</label>}
        {children}
        {hint && !error && <span className="nd-hint" id={ctx.hintId}>{hint}</span>}
        {error && <span className="nd-error" id={ctx.errorId} role="alert">{error}</span>}
      </div>
    </FieldCtx.Provider>
  );
}
const useField = (p) => {
  const f = useContext(FieldCtx);
  if (!f) return p;
  return { id: f.id, 'aria-describedby': f.errorId || f.hintId, 'aria-invalid': f.invalid || undefined, ...p };
};

export const Input = forwardRef(({ className, ...p }, ref) => <input ref={ref} className={cx('nd-input', className)} {...useField(p)} />);
export const Textarea = forwardRef(({ className, ...p }, ref) => <textarea ref={ref} className={cx('nd-textarea', className)} {...useField(p)} />);
export const Select = forwardRef(({ className, children, ...p }, ref) => (
  <span className="nd-select-wrap"><select ref={ref} className={cx('nd-select', className)} {...useField(p)}>{children}</select></span>
));

const Choice = (cls) => forwardRef(({ label, className, ...p }, ref) => (
  <label className={cx('nd-choice', className)}>
    <input ref={ref} type={cls === 'nd-radio' ? 'radio' : 'checkbox'} role={cls === 'nd-switch' ? 'switch' : undefined} className={cls} {...p} />
    {label && <span>{label}</span>}
  </label>
));
export const Checkbox = Choice('nd-check');
export const Radio = Choice('nd-radio');
export const Switch = Choice('nd-switch');

export const Range = forwardRef(({ className, ...p }, ref) => <input ref={ref} type="range" className={cx('nd-range', className)} {...useField(p)} />);

/* ------------------------------------------------------------ choice rows */

/** A row of options where the chosen one is circled in pen. options: [{ value, label }] */
export function Segmented({ options, value, onChange, label, className }) {
  return (
    <div role="group" aria-label={label} className={cx('nd-seg', className)}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange?.(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

/** Tabs with arrow-key support. tabs: [{ id, label, content }] */
export function Tabs({ tabs, value, onChange, label }) {
  const [inner, setInner] = useState(tabs[0]?.id);
  const active = value ?? inner;
  const set = (id) => (onChange ? onChange(id) : setInner(id));
  const base = useId();
  const refs = useRef([]);
  const onKey = (e, i) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    const n = (i + d + tabs.length) % tabs.length;
    set(tabs[n].id);
    refs.current[n]?.focus();
  };
  return (
    <div>
      <div role="tablist" aria-label={label} className="nd-tabs">
        {tabs.map((t, i) => (
          <button key={t.id} ref={(el) => (refs.current[i] = el)} role="tab" id={`${base}-${t.id}`} aria-controls={`${base}-${t.id}-p`}
            aria-selected={t.id === active} tabIndex={t.id === active ? 0 : -1} onClick={() => set(t.id)} onKeyDown={(e) => onKey(e, i)}>{t.label}</button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`${base}-${t.id}-p`} aria-labelledby={`${base}-${t.id}`} hidden={t.id !== active}>{t.content}</div>
      ))}
    </div>
  );
}

/** tone: 'ink' (default) | 'pen' | 'red' | 'green' */
export const Tag = ({ tone = 'ink', className, ...p }) => <span className={cx('nd-tag', tone !== 'ink' && `nd-tag--${tone}`, className)} {...p} />;

/* ------------------------------------------------------------ surfaces */

export const Plate = ({ caption, className, children, ...p }) => (
  <figure className={cx('nd-plate', className)} {...p}>{children}{caption && <figcaption>{caption}</figcaption>}</figure>
);
export const Panel = ({ as: T = 'section', className, ...p }) => <T className={cx('nd-panel', className)} {...p} />;

/** tone: 'info' (default) | 'ok' | 'error' */
export function Note({ tone = 'info', title, children, className }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('nd-note', tone !== 'info' && `nd-note--${tone}`, className)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        {tone === 'ok' ? <path d="M5 12.6c1.8 1.3 3.2 3 4.4 5 2.4-5 5.4-8.9 9.6-11.8" /> : tone === 'error' ? <path d="M12 6.2c.1 2.6-.1 5.3.1 7.9M12.1 17.6v.2M4.4 19.3c2.4-5.1 5-9.8 7.7-14.4 2.6 4.6 5.3 9.3 7.6 14.2-5.1.4-10.2.5-15.3.2z" /> : <path d="M12.2 10.8c-.1 2.4.1 4.7-.1 7.1M12 6.6v.2M12 3.4c4.8-.1 8.7 3.8 8.6 8.6.1 4.8-3.9 8.7-8.7 8.6-4.7 0-8.5-3.9-8.5-8.6.1-4.7 3.9-8.6 8.6-8.6z" />}
      </svg>
      <div>{title && <strong>{title}</strong>}{children}</div>
    </div>
  );
}

/** Native <dialog>, so focus trapping and Escape come free. */
export function Dialog({ open, onClose, title, children, actions }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="nd-dialog" aria-labelledby={titleId} onClose={onClose} onCancel={onClose}>
      <h2 className="nd-h3" id={titleId}>{title}</h2>
      <div>{children}</div>
      {actions && <div className="nd-dialog-actions">{actions}</div>}
    </dialog>
  );
}

/** const toast = useToast(); toast('Copied'). Render <toast.Region /> once. */
export function useToast(ms = 1800) {
  const [msg, setMsg] = useState('');
  const [on, setOn] = useState(false);
  const timer = useRef();
  const show = useCallback((m) => {
    setMsg(m); setOn(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOn(false), ms);
  }, [ms]);
  show.Region = useCallback(() => <div className={cx('nd-toast', on && 'is-on')} role="status" aria-live="polite">{msg}</div>, [on, msg]);
  return show;
}

export const Tooltip = ({ tip, children }) => <span data-tip={tip}>{children}</span>;
export const Progress = ({ value, max = 100, label, ...p }) => <progress className="nd-progress" value={value} max={max} aria-label={label} {...p} />;
export const Loader = ({ label = 'Loading' }) => (
  <svg className="nd-loader" viewBox="0 0 28 28" role="img" aria-label={label}>
    <path d="M14 4.2c5.6-.2 9.9 4.2 9.8 9.7.1 5.6-4.3 9.9-9.9 9.9-5.4-.1-9.6-4.4-9.5-9.8C4.5 8.6 8.7 4.4 14 4.2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
export const Avatar = ({ src, alt = '', size = 'md', children }) => (
  <span className={cx('nd-avatar', size === 'lg' && 'nd-avatar--lg')}>{src ? <img src={src} alt={alt} /> : children}</span>
);
export const Divider = ({ ink = false }) => <hr className={cx('nd-divider', ink && 'nd-divider--ink')} />;

/** An empty state: a picture of the moment, what happened, and one way forward. */
export function EmptyState({ art, title, children, action }) {
  return (
    <div className="nd-empty">
      {art && <Plate>{art}</Plate>}
      <h3 className="nd-h3">{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

/* ------------------------------------------------------------ art */

/**
 * A Neurodelic illustration, drawn by the renderer on the client.
 * Pass the renderIllustration function you import from the site (or your own copy of src/):
 *   import { renderIllustration } from 'https://neurodelic.vincedotcode.com/src/render.js';
 *   <Illustration render={renderIllustration} moment="deep-focus" state="stipple" seed={3} />
 */
export function Illustration({ render, moment, state, seed = 1, palette, aspect = 'square', density, hue, animate = true, title, className, style }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const svg = useMemo(
    () => render({ moment, state, seed, palette, aspect, density, hue, animate, title, id: `nd${id}` }),
    [render, moment, state, seed, palette, aspect, density, hue, animate, title, id],
  );
  return <span className={className} style={{ display: 'block', lineHeight: 0, ...style }} dangerouslySetInnerHTML={{ __html: svg.replace(/ width="\d+" height="\d+"/, ' width="100%" height="auto"') }} />;
}
