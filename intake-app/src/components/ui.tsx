'use client';
// Small presentational primitives shared across wizard screens. Mobile-first.
import type { ReactNode } from 'react';

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit';
  full?: boolean;
}) {
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed';
  const styles =
    variant === 'primary'
      ? 'bg-brand text-brand-fg hover:opacity-90'
      : variant === 'secondary'
        ? 'border border-border bg-card text-foreground hover:bg-background'
        : 'text-muted hover:text-foreground';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles} ${full ? 'w-full' : ''}`}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-border" aria-hidden>
      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/** A large tappable toggle used for check/select screens. */
export function CheckPill({
  label,
  selected,
  onToggle,
  disabled,
  badge,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
        selected
          ? 'border-brand bg-brand/5 ring-1 ring-brand'
          : 'border-border bg-card hover:border-brand/40'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <span
        className={`flex h-5 w-5 flex-none items-center justify-center rounded border text-[11px] ${
          selected ? 'border-brand bg-brand text-brand-fg' : 'border-border'
        }`}
        aria-hidden
      >
        {selected ? '✓' : ''}
      </span>
      <span className="flex-1">{label}</span>
      {badge}
    </button>
  );
}

/** 1–5 rating selector. */
export function RatingRow({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (n: 1 | 2 | 3 | 4 | 5) => void;
}) {
  return (
    <div className="flex gap-1.5" role="radiogroup" aria-label="Rating 1 to 5">
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-md border text-sm font-semibold transition ${
            value === n
              ? 'border-brand bg-brand text-brand-fg'
              : 'border-border bg-card hover:border-brand/40'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warn' | 'error' | 'success';
  children: ReactNode;
}) {
  const styles = {
    info: 'border-border bg-background text-foreground',
    warn: 'border-amber-300 bg-amber-50 text-amber-900',
    error: 'border-red-300 bg-red-50 text-red-900',
    success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  }[tone];
  return <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />
    </label>
  );
}

export function Counter({ n, max, noun }: { n: number; max: number; noun: string }) {
  const done = n === max;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        done ? 'bg-emerald-100 text-emerald-800' : 'bg-border text-muted'
      }`}
    >
      {n} / {max} {noun}
    </span>
  );
}
