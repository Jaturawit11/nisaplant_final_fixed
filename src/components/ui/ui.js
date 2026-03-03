'use client'

import React from 'react'

export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

export function Card({ className, children }) {
  return (
    <div
      className={cx(
        'rounded-3xl border border-black/10 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.06)]',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, right, className }) {
  return (
    <div className={cx('flex items-start justify-between gap-3 p-4 md:p-5', className)}>
      <div>
        <div className="text-base font-semibold text-slate-900 md:text-lg">{title}</div>
        {subtitle ? <div className="mt-0.5 text-xs text-slate-500 md:text-sm">{subtitle}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}

export function CardBody({ className, children }) {
  return <div className={cx('px-4 pb-4 md:px-5 md:pb-5', className)}>{children}</div>
}

export function Button({ variant = 'primary', className, ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-60'
  const styles =
    variant === 'primary'
      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
      : variant === 'danger'
        ? 'bg-rose-600 text-white hover:bg-rose-700'
        : variant === 'ghost'
          ? 'bg-transparent text-slate-700 hover:bg-slate-100'
          : 'bg-slate-900 text-white hover:bg-slate-800'

  return <button className={cx(base, styles, className)} {...props} />
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cx(
        'w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-emerald-600/40 focus:ring-4 focus:ring-emerald-600/10',
        className
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cx(
        'w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-emerald-600/40 focus:ring-4 focus:ring-emerald-600/10',
        className
      )}
      {...props}
    />
  )
}

export function Label({ children }) {
  return <div className="mb-1 text-xs font-semibold text-slate-700">{children}</div>
}

export function Pill({ tone = 'gray', children }) {
  const s =
    tone === 'green'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'yellow'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : tone === 'red'
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-slate-200 bg-slate-50 text-slate-700'
  return (
    <span className={cx('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold', s)}>
      {children}
    </span>
  )
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-2xl border border-black/10 bg-white p-1 shadow-sm">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cx(
              'rounded-xl px-3 py-2 text-sm font-semibold',
              active ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-100'
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Divider() {
  return <div className="h-px w-full bg-black/5" />
}

export function EmptyState({ title = 'ยังไม่มีข้อมูล', subtitle }) {
  return (
    <div className="rounded-3xl border border-dashed border-black/15 bg-white p-6 text-center">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
    </div>
  )
}
