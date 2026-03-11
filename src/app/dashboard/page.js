'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { supabaseBrowser } from '@/lib/supabase/browser'

function money(n) {
  const x = Number(n)
  return Number.isFinite(x) ? x.toLocaleString('th-TH') : '0'
}

function monthRange(date = new Date()) {
  const d = new Date(date)
  const start = new Date(d.getFullYear(), d.getMonth(), 1)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  const toISO = (x) => x.toISOString().slice(0, 10)
  return { start: toISO(start), end: toISO(end) }
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function roundUp1000(n) {
  const x = Number(n || 0)
  if (x <= 0) return 0
  return Math.ceil(x / 1000) * 1000
}

function isDateInRange(dateStr, start, end) {
  const d = String(dateStr || '')
  return d >= start && d < end
}

function Pill({ tone = 'slate', children }) {
  const map = {
    emerald:
      'border border-emerald-200/80 bg-emerald-50/90 text-emerald-700 shadow-[0_2px_8px_rgba(16,185,129,0.06)]',
    amber:
      'border border-amber-200/80 bg-amber-50/90 text-amber-700 shadow-[0_2px_8px_rgba(245,158,11,0.06)]',
    rose:
      'border border-rose-200/80 bg-rose-50/90 text-rose-700 shadow-[0_2px_8px_rgba(244,63,94,0.06)]',
    slate:
      'border border-slate-200/80 bg-white/90 text-slate-600 shadow-[0_2px_8px_rgba(15,23,42,0.04)]',
    sky:
      'border border-sky-200/80 bg-sky-50/90 text-sky-700 shadow-[0_2px_8px_rgba(59,130,246,0.06)]',
    lilac:
      'border border-violet-200/80 bg-violet-50/90 text-violet-700 shadow-[0_2px_8px_rgba(139,92,246,0.06)]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-tight whitespace-nowrap',
        map[tone] || map.slate
      )}
    >
      {children}
    </span>
  )
}

function Card({ children, className = '', style, tint = 'default' }) {
  const tintMap = {
    default:
      'border border-white/80 bg-white/88 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-[4px]',
    rose:
      'border border-rose-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(255,246,249,0.97)_54%,rgba(253,234,242,0.96)_100%)] shadow-[0_12px_30px_rgba(244,63,94,0.07)]',
    sky:
      'border border-sky-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(246,250,255,0.97)_54%,rgba(233,244,255,0.96)_100%)] shadow-[0_12px_30px_rgba(59,130,246,0.07)]',
    emerald:
      'border border-emerald-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(246,255,251,0.97)_54%,rgba(232,250,241,0.96)_100%)] shadow-[0_12px_30px_rgba(16,185,129,0.07)]',
    cream:
      'border border-amber-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(255,251,245,0.97)_54%,rgba(255,245,230,0.96)_100%)] shadow-[0_12px_30px_rgba(245,158,11,0.07)]',
    lilac:
      'border border-violet-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(249,247,255,0.97)_54%,rgba(241,235,255,0.96)_100%)] shadow-[0_12px_30px_rgba(139,92,246,0.07)]',
  }

  return (
    <div
      style={style}
      className={cn(
        'relative overflow-hidden rounded-[28px] p-4 sm:p-5 lg:p-6',
        tintMap[tint] || tintMap.default,
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.72),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.14)_100%)]" />
      {children}
    </div>
  )
}

/* ---------------- ICONS / ILLUSTRATIONS ---------------- */

function CornerBadge({ tone = 'slate', children }) {
  const map = {
    rose: 'bg-rose-100/90 text-rose-500',
    sky: 'bg-sky-100/90 text-sky-500',
    emerald: 'bg-emerald-100/90 text-emerald-500',
    cream: 'bg-amber-100/90 text-amber-500',
    lilac: 'bg-violet-100/90 text-violet-500',
    slate: 'bg-slate-100/90 text-slate-500',
  }

  return (
    <div
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]',
        map[tone] || map.slate
      )}
    >
      <span className="text-lg leading-none">{children}</span>
    </div>
  )
}

function Watermark({ children, tone = 'slate', className = '' }) {
  const map = {
    rose: 'text-rose-300/25',
    sky: 'text-sky-300/25',
    emerald: 'text-emerald-300/25',
    cream: 'text-amber-300/25',
    lilac: 'text-violet-300/25',
    slate: 'text-slate-300/25',
  }

  return (
    <div className={cn('pointer-events-none absolute bottom-2 right-2 select-none', className, map[tone] || map.slate)}>
      {children}
    </div>
  )
}

function ReceiptIllustration({ className = '' }) {
  return (
    <svg viewBox="0 0 180 140" className={className}>
      <path d="M18 118 C50 108, 95 104, 162 111" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M95 20 l22 10 v72 l-10 -6 -10 6 -10 -6 -10 6 -10 -6 -10 6 V30 l22 -10z" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
      <path d="M75 47 h25 M75 63 h25 M75 79 h18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="122" cy="100" r="14" fill="none" stroke="currentColor" strokeWidth="6" />
      <path d="M122 92 v16 M115 100 h14" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

function TrendIllustration({ className = '' }) {
  return (
    <svg viewBox="0 0 180 140" className={className}>
      <path d="M15 120 C40 110, 65 90, 90 95 C118 100, 138 78, 165 52" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M143 53 h22 v22" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M120 120 h14 M140 120 h10 M155 120 h8" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <circle cx="74" cy="92" r="4" fill="currentColor" />
      <circle cx="108" cy="96" r="4" fill="currentColor" />
      <circle cx="136" cy="80" r="4" fill="currentColor" />
    </svg>
  )
}

function BoxIllustration({ className = '' }) {
  return (
    <svg viewBox="0 0 180 140" className={className}>
      <path d="M42 74 l48 -20 48 20 -48 23 -48 -23z" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
      <path d="M42 74 v28 l48 23 48 -23 V74" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
      <path d="M90 55 v42" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M89 53 C84 35, 94 24, 108 25 C108 39, 99 48, 89 53z" fill="none" stroke="currentColor" strokeWidth="5" />
      <path d="M89 53 C74 50, 65 39, 67 26 C82 28, 91 39, 89 53z" fill="none" stroke="currentColor" strokeWidth="5" />
    </svg>
  )
}

function WalletIllustration({ className = '' }) {
  return (
    <svg viewBox="0 0 180 140" className={className}>
      <path d="M36 48 h88 a14 14 0 0 1 14 14 v46 a14 14 0 0 1 -14 14 H36 a14 14 0 0 1 -14 -14 V62 a14 14 0 0 1 14 -14z" fill="none" stroke="currentColor" strokeWidth="6" />
      <path d="M28 60 h118" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M104 77 h38 a10 10 0 0 1 0 20 h-38z" fill="none" stroke="currentColor" strokeWidth="6" />
      <circle cx="129" cy="87" r="4" fill="currentColor" />
      <path d="M26 57 l20 -17 h73" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LeafIllustration({ className = '' }) {
  return (
    <svg viewBox="0 0 180 140" className={className}>
      <path d="M35 118 C58 88, 92 73, 140 69 C135 113, 103 128, 68 128 C52 128, 41 124, 35 118z" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
      <path d="M55 121 C76 101, 95 88, 129 77" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M28 100 C20 82, 20 60, 36 44 C50 57, 54 74, 48 94" fill="none" stroke="currentColor" strokeWidth="5" />
    </svg>
  )
}

function BrainIllustration({ className = '' }) {
  return (
    <svg viewBox="0 0 180 140" className={className}>
      <path d="M72 112 C48 112, 34 97, 34 76 C34 60, 44 47, 58 42 C60 24, 76 15, 91 19 C103 10, 121 12, 131 25 C146 25, 158 38, 158 54 C168 60, 172 74, 167 87 C162 100, 149 109, 136 109 H72z" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
      <path d="M88 31 v74 M63 47 c14 4 21 12 25 23 M113 44 c-10 6 -16 13 -18 24 M60 78 c11 -2 19 1 28 8 M119 78 c-12 -1 -19 2 -26 8" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

function SparkIllustration({ className = '' }) {
  return (
    <svg viewBox="0 0 180 140" className={className}>
      <path d="M90 18 L101 57 L140 68 L101 79 L90 118 L79 79 L40 68 L79 57 Z" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
      <path d="M142 31 v17 M133 40 h18 M37 97 v14 M30 104 h14" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

function ChartBarsIllustration({ className = '' }) {
  return (
    <svg viewBox="0 0 180 140" className={className}>
      <path d="M20 112 C45 102, 70 70, 94 78 C115 84, 130 68, 160 36" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M116 116 V93 M132 116 V78 M148 116 V62" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <circle cx="95" cy="79" r="4" fill="currentColor" />
      <circle cx="130" cy="68" r="4" fill="currentColor" />
    </svg>
  )
}

function BankIllustration({ className = '' }) {
  return (
    <svg viewBox="0 0 180 140" className={className}>
      <path d="M30 52 L90 24 L150 52" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
      <path d="M40 58 h100 M46 114 h88" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M56 58 v52 M82 58 v52 M108 58 v52 M134 58 v52" fill="none" stroke="currentColor" strokeWidth="6" />
    </svg>
  )
}

function IconReceipt(props) {
  return <ReceiptIllustration {...props} />
}
function IconTrend(props) {
  return <TrendIllustration {...props} />
}
function IconBox(props) {
  return <BoxIllustration {...props} />
}
function IconWallet(props) {
  return <WalletIllustration {...props} />
}
function IconLeaf(props) {
  return <LeafIllustration {...props} />
}
function IconBrain(props) {
  return <BrainIllustration {...props} />
}
function IconSpark(props) {
  return <SparkIllustration {...props} />
}
function IconBars(props) {
  return <ChartBarsIllustration {...props} />
}
function IconBank(props) {
  return <BankIllustration {...props} />
}

/* ---------------- UI SECTIONS ---------------- */

function PageHeader({ loading, onReload }) {
  return (
    <div className="mb-5 sm:mb-6 lg:mb-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
            NisaPlant Dashboard
          </div>
          <div className="mt-2 text-[28px] font-bold tracking-tight text-slate-900 sm:text-[34px]">
            ภาพรวมธุรกิจ
          </div>
        </div>

        <button
          onClick={onReload}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-500 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(16,185,129,0.20)] transition hover:bg-emerald-600 active:scale-[0.99]"
        >
          <span className={cn('inline-block', loading && 'animate-spin')}>↻</span>
          {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
        </button>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  suffix = 'บาท',
  tint = 'default',
  icon = '◦',
  watermark,
}) {
  return (
    <Card tint={tint} className="min-h-[158px]">
      {watermark ? (
        <Watermark tone={tint}>
          {watermark}
        </Watermark>
      ) : null}

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-sm font-medium text-slate-500">{title}</div>
          <CornerBadge tone={tint}>{icon}</CornerBadge>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
            <span className="text-[33px] font-bold leading-none tracking-tight text-slate-900 sm:text-[38px]">
              {money(value)}
            </span>
            {suffix ? (
              <span className="mb-1 text-sm font-semibold text-slate-400">{suffix}</span>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  )
}

function SmallStatCard({
  title,
  value,
  suffix = '',
  tint = 'default',
  icon = '◦',
  watermark,
}) {
  return (
    <Card tint={tint} className="min-h-[158px]">
      {watermark ? (
        <Watermark tone={tint}>
          {watermark}
        </Watermark>
      ) : null}

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-sm font-medium text-slate-500">{title}</div>
          <CornerBadge tone={tint}>{icon}</CornerBadge>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
            <span className="text-[33px] font-bold leading-none tracking-tight text-slate-900 sm:text-[38px]">
              {money(value)}
            </span>
            {suffix ? (
              <span className="mb-1 text-sm font-semibold text-slate-400">{suffix}</span>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  )
}

function TextCard({ title, text, tint = 'default', icon = '✦', watermark }) {
  return (
    <Card tint={tint} className="min-h-[192px]">
      {watermark ? (
        <Watermark tone={tint} className="bottom-0 right-0">
          {watermark}
        </Watermark>
      ) : null}

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-medium text-slate-500">{title}</div>
          <CornerBadge tone={tint}>{icon}</CornerBadge>
        </div>

        <div className="mt-3 inline-flex w-fit rounded-full border border-white/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-slate-500">
          Insight
        </div>

        <div className="mt-4 whitespace-pre-line text-[15px] font-semibold leading-8 tracking-tight text-slate-900 sm:text-[17px]">
          {text || '-'}
        </div>
      </div>
    </Card>
  )
}

function SalaryCard({ title, total, time, nisa, tint = 'default', icon = '↺', watermark }) {
  return (
    <Card tint={tint} className="min-h-[158px]">
      {watermark ? (
        <Watermark tone={tint}>
          {watermark}
        </Watermark>
      ) : null}

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-medium text-slate-500">{title}</div>
          <CornerBadge tone={tint}>{icon}</CornerBadge>
        </div>

        <div className="mt-3 inline-flex rounded-full border border-white/80 bg-white/75 px-3 py-1 text-xs font-semibold text-slate-500">
          Time {money(time)} / Nisa {money(nisa)}
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-x-2 gap-y-1">
          <span className="text-[33px] font-bold leading-none tracking-tight text-slate-900 sm:text-[38px]">
            {money(total)}
          </span>
          <span className="mb-1 text-sm font-semibold text-slate-400">บาท</span>
        </div>
      </div>
    </Card>
  )
}

function DonutCard({
  title,
  subtitle,
  data,
  colors,
  centerTop,
  centerBottom,
  tint = 'default',
  icon = '•',
  watermark,
}) {
  const total = data.reduce((a, b) => a + Number(b.value || 0), 0)
  const safeData = total > 0 ? data : [{ name: 'ไม่มีข้อมูล', value: 1 }]

  return (
    <Card tint={tint} className="p-0">
      {watermark ? (
        <Watermark tone={tint} className="bottom-3 right-3">
          {watermark}
        </Watermark>
      ) : null}

      <div className="relative z-10 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5 lg:px-6 lg:pb-6 lg:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-slate-500">{icon}</div>
              <div className="truncate text-[16px] font-bold tracking-tight text-slate-900">
                {title}
              </div>
            </div>
            {subtitle ? (
              <div className="mt-1 truncate text-xs leading-relaxed text-slate-500">
                {subtitle}
              </div>
            ) : null}
          </div>

          <span className="inline-flex items-center rounded-full border border-white/85 bg-white/84 px-3 py-1 text-[11px] font-semibold text-slate-600">
            รวม {money(total)}
          </span>
        </div>

        <div className="mt-3 h-[248px] sm:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={safeData}
                dataKey="value"
                nameKey="name"
                innerRadius={64}
                outerRadius={94}
                stroke="#fff"
                strokeWidth={2}
              >
                {safeData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={total > 0 ? colors[idx % colors.length] : '#e2e8f0'}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(v) => money(v)} />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none -mt-[150px] flex h-0 items-center justify-center">
            <div className="rounded-full border border-white/85 bg-white/88 px-6 py-5 text-center shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
              <div className="text-[23px] font-bold tracking-tight text-slate-900">
                {centerTop}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">{centerBottom}</div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {data.map((item, idx) => (
            <span
              key={item.name}
              className="inline-flex items-center gap-2 rounded-full border border-white/85 bg-white/84 px-3 py-1 text-[11px] font-semibold text-slate-600"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: colors[idx % colors.length] }}
              />
              {item.name} {money(item.value)}
            </span>
          ))}
        </div>
      </div>
    </Card>
  )
}

const BANK_THEME = {
  GSB: { tint: 'rose', logo: '/banks/gsb.png' },
  KTB: { tint: 'sky', logo: '/banks/ktb.png' },
  KBANK: { tint: 'emerald', logo: '/banks/kbank.png' },
}

function BankBalanceCard({ bank, balance, income, expense, tint = 'default', logo = '', watermark }) {
  return (
    <Card tint={tint} className="min-h-[182px]">
      {logo ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <img
            src={logo}
            alt=""
            className="absolute bottom-2 right-2 h-[90px] w-[90px] select-none object-contain opacity-[0.06] blur-[0.2px]"
          />
        </div>
      ) : null}

      {watermark ? (
        <Watermark tone={tint}>
          {watermark}
        </Watermark>
      ) : null}

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="text-[16px] font-bold tracking-[0.22em] text-slate-800">{bank}</div>
          <Pill tone={bank === 'GSB' ? 'rose' : bank === 'KTB' ? 'sky' : 'emerald'}>
            Balance
          </Pill>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-x-2 gap-y-1">
          <span className="text-[33px] font-bold leading-none tracking-tight text-slate-900">
            {money(balance)}
          </span>
          <span className="mb-1 text-sm font-semibold text-slate-400">บาท</span>
        </div>

        <div className="mt-5 rounded-[20px] border border-white/85 bg-white/72 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">รับเดือนนี้</span>
            <span className="font-bold text-slate-900">{money(income)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-slate-500">จ่ายเดือนนี้</span>
            <span className="font-bold text-slate-900">{money(expense)}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

function LatestInvoicesCard({ rows }) {
  return (
    <Card tint="default" className="p-0">
      <div className="relative z-10 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5 lg:px-6 lg:pb-6 lg:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[16px] font-bold tracking-tight text-slate-900">
              10 บิลล่าสุด
            </div>
            <div className="mt-1 text-xs leading-relaxed text-slate-500">
              รวม paid, partial, ยังไม่จ่าย
            </div>
          </div>
          <Pill tone="slate">{rows.length} รายการ</Pill>
        </div>

        <div className="mt-4">
          {!rows.length ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
              ยังไม่มีรายการ
            </div>
          ) : (
            <>
              <div className="hidden md:grid md:grid-cols-[1.1fr_1fr_auto] md:items-center md:gap-4 md:px-4 md:pb-3 md:text-xs md:font-bold md:text-slate-400">
                <div>เลขที่บิล / วันที่</div>
                <div>ลูกค้า</div>
                <div className="text-right">สถานะ / ยอดรวม</div>
              </div>

              <div className="grid gap-2.5">
                {rows
                  .filter((r) => String(r.invoice_status || '').toLowerCase() !== 'cancelled')
                  .map((r) => {
                    const tone =
                      r.pay_status === 'paid'
                        ? 'emerald'
                        : r.pay_status === 'partial'
                        ? 'amber'
                        : 'rose'

                    const payLabel =
                      r.pay_status === 'paid'
                        ? 'paid'
                        : r.pay_status === 'partial'
                        ? 'partial'
                        : 'unpaid'

                    return (
                      <div
                        key={r.id}
                        className="grid gap-3 rounded-[22px] border border-white/85 bg-white/84 px-4 py-4 shadow-[0_6px_18px_rgba(15,23,42,0.05)] md:grid-cols-[1.1fr_1fr_auto] md:items-center"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold tracking-tight text-slate-900">
                            {r.invoice_no}
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-500">{r.sale_date}</div>
                        </div>

                        <div className="min-w-0 text-xs text-slate-600 md:text-sm">
                          <div className="truncate">{r.customer_name || '-'}</div>
                        </div>

                        <div className="shrink-0 md:text-right">
                          <div className="flex items-center gap-2 md:justify-end">
                            <Pill tone={tone}>{payLabel}</Pill>
                          </div>
                          <div className="mt-2 text-sm font-bold text-slate-900">
                            {money(r.total_price)} บาท
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function DashboardPage() {
  const supabase = supabaseBrowser()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [kpi, setKpi] = useState({
    activeCount: 0,
    activeCostSum: 0,
    monthSales: 0,
    deadLoss: 0,
    monthNet: 0,
    taxReserve: 0,
    afterTax: 0,
    salaryTotal: 0,
    salaryTime: 0,
    salaryNisa: 0,
  })

  const [incomeExpenseData, setIncomeExpenseData] = useState([
    { name: 'รายรับ', value: 0 },
    { name: 'รายจ่าย', value: 0 },
  ])

  const [salesProfitData, setSalesProfitData] = useState([
    { name: 'ยอดขาย', value: 0 },
    { name: 'ทุนคงเหลือ', value: 0 },
  ])

  const [arData, setArData] = useState({
    total: 0,
    unpaidCount: 0,
    partialCount: 0,
    collectionPct: 0,
  })

  const [bankCards, setBankCards] = useState({
    GSB: { balance: 0, income: 0, expense: 0 },
    KTB: { balance: 0, income: 0, expense: 0 },
    KBANK: { balance: 0, income: 0, expense: 0 },
  })

  const [latestInvoices, setLatestInvoices] = useState([])

  const aiPlantText = useMemo(() => {
    const gsbBalance = Number(bankCards.GSB.balance || 0)
    const gsbExpense = Number(bankCards.GSB.expense || 0)
    const arTotal = Number(arData.total || 0)
    const deadLoss = Number(kpi.deadLoss || 0)
    const monthNet = Number(kpi.monthNet || 0)
    const activeCost = Number(kpi.activeCostSum || 0)

    const minReserve = Math.max(
      30000,
      roundUp1000(gsbExpense * 1.2),
      roundUp1000(arTotal * 0.5),
      deadLoss > 0 ? 40000 : 0
    )

    const rawBudget = gsbBalance - minReserve
    const profitCap = monthNet > 0 ? Number(kpi.afterTax || 0) : 0
    const maxBuy = Math.max(0, Math.min(rawBudget, profitCap))

    if (monthNet < 0 && deadLoss > 0) {
      return `เดือนนี้ยังไม่ควรซื้อไม้เพิ่ม\nขาดทุนสุทธิ ${money(Math.abs(monthNet))} บาท และมีไม้ตาย ${money(deadLoss)} บาท\nควรหยุดซื้อ ชะลอการจมทุน และเช็คสภาพแวดล้อมในตู้ก่อน`
    }

    if (monthNet < 0) {
      return `เดือนนี้ยังไม่ควรซื้อไม้เพิ่ม\nขาดทุนสุทธิ ${money(Math.abs(monthNet))} บาท\nควรคุมค่าใช้จ่ายและรอให้กำไรกลับมาเป็นบวกก่อน`
    }

    if (arTotal > 0) {
      return `เดือนนี้ควรซื้อไม้เพิ่มได้ไม่เกิน ${money(maxBuy)} บาท\nแต่ควรตามยอดค้างชำระ ${money(arTotal)} บาทก่อน\nและควรเหลือเงินใน GSB ไม่น้อยกว่า ${money(minReserve)} บาท`
    }

    if (activeCost > gsbBalance * 0.8 && activeCost > 0) {
      return `เงินจมในสต๊อกค่อนข้างสูง\nควรซื้อเพิ่มได้ไม่เกิน ${money(maxBuy)} บาท\nและควรเหลือเงินใน GSB ไม่น้อยกว่า ${money(minReserve)} บาท`
    }

    if (maxBuy <= 0) {
      return `เดือนนี้ควรซื้อไม้เพิ่มได้ไม่เกิน 0 บาท\nและควรเหลือเงินใน GSB ไม่น้อยกว่า ${money(minReserve)} บาท`
    }

    return `เดือนนี้ควรซื้อไม้เพิ่มได้ไม่เกิน ${money(maxBuy)} บาท\nและควรเหลือเงินใน GSB ไม่น้อยกว่า ${money(minReserve)} บาท`
  }, [arData.total, bankCards.GSB.balance, bankCards.GSB.expense, kpi.afterTax, kpi.deadLoss, kpi.monthNet, kpi.activeCostSum])

  const aiBizText = useMemo(() => {
    const monthNet = Number(kpi.monthNet || 0)
    const deadLoss = Number(kpi.deadLoss || 0)
    const arTotal = Number(arData.total || 0)
    const gsbBalance = Number(bankCards.GSB.balance || 0)
    const sales = Number(kpi.monthSales || 0)
    const activeCost = Number(kpi.activeCostSum || 0)

    const issues = []

    if (monthNet < 0) issues.push('กำไรสุทธิติดลบ')
    if (deadLoss > 0) issues.push('มีไม้ตาย')
    if (arTotal > 0) issues.push('มีลูกหนี้ค้างชำระ')
    if (gsbBalance < 30000) issues.push('เงินสดใน GSB ต่ำ')
    if (sales === 0) issues.push('ยังไม่มีรายได้')
    if (activeCost > gsbBalance && activeCost > 0) issues.push('เงินจมในสต๊อกสูง')

    let level = 'ปลอดภัย'
    if (monthNet < 0 || arTotal > 0 || deadLoss > 0) level = 'เฝ้าระวัง'
    if ((monthNet < 0 && arTotal > 0) || deadLoss > 0 || gsbBalance < 30000) level = 'เสี่ยง'
    if ((monthNet < 0 && deadLoss > 0 && arTotal > 0) || gsbBalance < 15000) level = 'อันตราย'

    if (level === 'อันตราย') {
      return `ธุรกิจเดือนนี้อยู่ในโซนอันตราย\nปัญหาหลัก: ${issues.join(' / ')}\nควรหยุดซื้อทันที ตามเก็บเงินลูกค้า และรักษาเงินสดใน GSB`
    }

    if (level === 'เสี่ยง') {
      return `ธุรกิจเดือนนี้อยู่ในโซนเสี่ยง\nปัญหาหลัก: ${issues.join(' / ')}\nควรชะลอการซื้อใหม่ ลดค่าใช้จ่าย และเร่งปิดยอดที่ค้าง`
    }

    if (level === 'เฝ้าระวัง') {
      return `ธุรกิจเดือนนี้อยู่ในโซนเฝ้าระวัง\nปัจจัยที่ต้องระวัง: ${issues.join(' / ')}\nควรติดตามตัวเลขทุกวันและอย่าขยายสต๊อกเร็วเกินไป`
    }

    return 'ธุรกิจเดือนนี้อยู่ในโซนปลอดภัย\nยอดขาย เงินสด และภาระค้างชำระอยู่ในระดับควบคุมได้'
  }, [arData.total, bankCards.GSB.balance, kpi.monthNet, kpi.monthSales, kpi.deadLoss, kpi.activeCostSum])

  async function loadDashboard() {
    setLoading(true)
    setErr('')

    try {
      const { start, end } = monthRange()

      const [
        plantsRes,
        monthSummaryRes,
        invoicesMonthRes,
        invoicesLatestRes,
        openingsRes,
        paymentsAllRes,
        expensesAllRes,
      ] = await Promise.all([
        supabase.rpc('dashboard_plants_agg'),
        supabase.rpc('get_month_summary', {
          p_start: start,
          p_end: end,
        }),
        supabase
          .from('invoices')
          .select(
            'id, invoice_no, sale_date, customer_name, total_price, total_profit, pay_status, invoice_status, created_at'
          )
          .gte('sale_date', start)
          .lt('sale_date', end)
          .neq('invoice_status', 'cancelled'),
        supabase
          .from('invoices')
          .select(
            'id, invoice_no, sale_date, customer_name, total_price, pay_status, invoice_status, created_at'
          )
          .neq('invoice_status', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('bank_opening_balances')
          .select('bank, opening_amount, as_of_date, created_at')
          .order('as_of_date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('payments').select('bank, amount, pay_date'),
        supabase.from('expenses').select('bank, amount, type, expense_date'),
      ])

      if (plantsRes.error) throw plantsRes.error
      if (monthSummaryRes.error) throw monthSummaryRes.error
      if (invoicesMonthRes.error) throw invoicesMonthRes.error
      if (invoicesLatestRes.error) throw invoicesLatestRes.error
      if (openingsRes.error) throw openingsRes.error
      if (paymentsAllRes.error) throw paymentsAllRes.error
      if (expensesAllRes.error) throw expensesAllRes.error

      const plantRow = Array.isArray(plantsRes.data) ? plantsRes.data[0] || {} : plantsRes.data || {}
      const summaryRow = Array.isArray(monthSummaryRes.data)
        ? monthSummaryRes.data[0] || {}
        : monthSummaryRes.data || {}

      const monthInvoicesRows = invoicesMonthRes.data || []
      const latestRows = invoicesLatestRes.data || []
      const openingRows = openingsRes.data || []
      const paymentsAllRows = paymentsAllRes.data || []
      const expensesAllRows = expensesAllRes.data || []

      const activeCount = Number(
        plantRow.active_count ?? plantRow.activecount ?? plantRow.count ?? 0
      )
      const activeCostSum = Number(
        plantRow.total_cost ?? plantRow.active_cost_sum ?? plantRow.cost_sum ?? 0
      )

      const totalSales = Number(summaryRow.total_sales ?? summaryRow.sales ?? 0)
      const deadLoss = Number(summaryRow.dead_loss ?? summaryRow.dead ?? 0)
      const netProfit = Number(summaryRow.net_profit ?? summaryRow.net ?? 0)
      const tax15 = Number(summaryRow.tax_15 ?? summaryRow.tax ?? 0)
      const afterTax = Number(summaryRow.after_tax ?? summaryRow.after ?? 0)

      const salaryTime = afterTax > 0 ? Math.floor((afterTax * 0.1) / 10) * 10 : 0
      const salaryNisa = afterTax > 0 ? Math.floor((afterTax * 0.2) / 10) * 10 : 0
      const salaryTotal = Math.min(60000, salaryTime + salaryNisa)

      let monthIncome = 0
      let monthExpense = 0

      for (const row of paymentsAllRows) {
        if (isDateInRange(row.pay_date, start, end)) {
          monthIncome += Number(row.amount || 0)
        }
      }

      for (const row of expensesAllRows) {
        const amount = Number(row.amount || 0)
        const type = String(row.type || '').toLowerCase()

        if (!isDateInRange(row.expense_date, start, end)) continue

        if (type === 'income') {
          monthIncome += amount
        } else {
          monthExpense += amount
        }
      }

      const unpaidInvoices = monthInvoicesRows.filter(
        (r) => String(r.pay_status || '').toLowerCase() === 'unpaid'
      )
      const partialInvoices = monthInvoicesRows.filter(
        (r) => String(r.pay_status || '').toLowerCase() === 'partial'
      )

      const arTotal = [...unpaidInvoices, ...partialInvoices].reduce(
        (sum, row) => sum + Number(row.total_price || 0),
        0
      )

      const totalMonthInvoiceAmount = monthInvoicesRows.reduce(
        (sum, row) => sum + Number(row.total_price || 0),
        0
      )

      const collectionPct =
        totalMonthInvoiceAmount > 0
          ? Math.max(
              0,
              Math.min(
                100,
                ((totalMonthInvoiceAmount - arTotal) / totalMonthInvoiceAmount) * 100
              )
            )
          : 0

      const bankMap = {
        GSB: { balance: 0, income: 0, expense: 0 },
        KTB: { balance: 0, income: 0, expense: 0 },
        KBANK: { balance: 0, income: 0, expense: 0 },
      }

      const latestOpeningMap = new Map()
      for (const row of openingRows) {
        const bank = String(row.bank || '')
        if (!bank) continue
        if (!latestOpeningMap.has(bank)) {
          latestOpeningMap.set(bank, {
            opening_amount: Number(row.opening_amount || 0),
            as_of_date: String(row.as_of_date || ''),
          })
        }
      }

      for (const bank of Object.keys(bankMap)) {
        const opening = latestOpeningMap.get(bank)
        if (opening) bankMap[bank].balance = Number(opening.opening_amount || 0)
      }

      for (const row of paymentsAllRows) {
        const bank = String(row.bank || '')
        if (!bankMap[bank]) continue

        const amount = Number(row.amount || 0)
        bankMap[bank].balance += amount

        if (isDateInRange(row.pay_date, start, end)) {
          bankMap[bank].income += amount
        }
      }

      for (const row of expensesAllRows) {
        const bank = String(row.bank || '')
        if (!bankMap[bank]) continue

        const amount = Number(row.amount || 0)
        const type = String(row.type || '').toLowerCase()

        if (type === 'income') {
          bankMap[bank].balance += amount
          if (isDateInRange(row.expense_date, start, end)) {
            bankMap[bank].income += amount
          }
        } else {
          bankMap[bank].balance -= amount
          if (isDateInRange(row.expense_date, start, end)) {
            bankMap[bank].expense += amount
          }
        }
      }

      setKpi({
        activeCount,
        activeCostSum,
        monthSales: totalSales,
        deadLoss,
        monthNet: netProfit,
        taxReserve: tax15,
        afterTax,
        salaryTotal,
        salaryTime,
        salaryNisa,
      })

      setIncomeExpenseData([
        { name: 'รายรับ', value: monthIncome },
        { name: 'รายจ่าย', value: monthExpense },
      ])

      setSalesProfitData([
        { name: 'ยอดขาย', value: totalSales },
        { name: 'ทุนคงเหลือ', value: activeCostSum },
      ])

      setArData({
        total: arTotal,
        unpaidCount: unpaidInvoices.length,
        partialCount: partialInvoices.length,
        collectionPct,
      })

      setBankCards(bankMap)
      setLatestInvoices(latestRows)
    } catch (e) {
      setErr(e?.message || 'โหลด Dashboard ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AppShell title="Dashboard">
      <div className="-m-3 min-h-full rounded-[34px] bg-[linear-gradient(180deg,#fffefe_0%,#fff9fb_22%,#f7fbff_58%,#f7fff9_100%)] p-3 sm:-m-4 sm:p-4 md:-m-5 md:p-5">
        <div className="mx-auto max-w-7xl">
          <PageHeader loading={loading} onReload={loadDashboard} />

          {err ? (
            <div className="mb-4 rounded-[24px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {err}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="ยอดขายเดือนนี้"
              value={kpi.monthSales}
              tint="rose"
              icon="🧾"
              watermark={<ReceiptIllustration className="h-24 w-24 sm:h-28 sm:w-28" />}
            />
            <StatCard
              title="กำไรสุทธิเดือนนี้"
              value={kpi.monthNet}
              tint="sky"
              icon="📈"
              watermark={<TrendIllustration className="h-24 w-24 sm:h-28 sm:w-28" />}
            />
            <SmallStatCard
              title="ไม้คงเหลือ"
              value={kpi.activeCount}
              suffix="ต้น"
              tint="cream"
              icon="📦"
              watermark={<BoxIllustration className="h-24 w-24 sm:h-28 sm:w-28" />}
            />
            <StatCard
              title="มูลค่าทุนคงเหลือ"
              value={kpi.activeCostSum}
              tint="emerald"
              icon="💼"
              watermark={<WalletIllustration className="h-24 w-24 sm:h-28 sm:w-28" />}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_0.95fr]">
            <DonutCard
              title="รายรับ / รายจ่าย"
              subtitle="ดูจากเงินเข้าออกจริงของเดือนนี้"
              data={incomeExpenseData}
              colors={['#34d399', '#fb7185']}
              centerTop={money(
                Number(incomeExpenseData[0]?.value || 0) -
                  Number(incomeExpenseData[1]?.value || 0)
              )}
              centerBottom="สุทธิเดือนนี้"
              tint="emerald"
              icon="◉"
              watermark={<LeafIllustration className="h-28 w-28 sm:h-32 sm:w-32" />}
            />

            <DonutCard
              title="ยอดขาย / ทุนคงเหลือ"
              subtitle="ยอดขายเดือนนี้ เทียบกับมูลค่าทุนคงเหลือปัจจุบัน"
              data={salesProfitData}
              colors={['#60a5fa', '#fbbf24']}
              centerTop={money(kpi.monthSales)}
              centerBottom="ยอดขายเดือนนี้"
              tint="sky"
              icon="↗"
              watermark={<ChartBarsIllustration className="h-28 w-28 sm:h-32 sm:w-32" />}
            />

            <Card tint="rose" className="min-h-[395px]">
              <Watermark tone="rose" className="bottom-4 right-3">
                <ReceiptIllustration className="h-28 w-28 sm:h-32 sm:w-32" />
              </Watermark>

              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-rose-500">⚠</span>
                      <div className="truncate text-[16px] font-bold tracking-tight text-slate-900">
                        ยอดค้างชำระ
                      </div>
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-slate-500">
                      ดูบิล unpaid / partial ของเดือนนี้
                    </div>
                  </div>
                  <div className="text-[36px] font-light text-rose-200">฿</div>
                </div>

                <div className="mt-5 flex flex-wrap items-end gap-x-2 gap-y-1">
                  <span className="text-[40px] font-bold leading-none tracking-tight text-slate-900">
                    {money(arData.total)}
                  </span>
                  <span className="mb-1 text-sm font-semibold text-slate-400">บาท</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Pill tone="rose">unpaid {arData.unpaidCount}</Pill>
                  <Pill tone="amber">partial {arData.partialCount}</Pill>
                </div>

                <div className="mt-6 rounded-[22px] border border-white/85 bg-white/76 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>สัดส่วนที่เก็บยอดขายเดือนนี้</span>
                    <span>{Math.round(arData.collectionPct)}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-rose-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-300 transition-all"
                      style={{ width: `${arData.collectionPct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-auto rounded-[20px] border border-white/85 bg-white/74 px-4 py-3 text-sm leading-6 text-slate-500">
                  ติดตามยอดค้างชำระก่อนซื้อเพิ่ม จะช่วยลดความเสี่ยงของ cashflow
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="ภาษี 15%"
              value={kpi.taxReserve}
              tint="cream"
              icon="%"
              watermark={<SparkIllustration className="h-24 w-24 sm:h-28 sm:w-28" />}
            />
            <SalaryCard
              title="เงินเดือน"
              total={kpi.salaryTotal}
              time={kpi.salaryTime}
              nisa={kpi.salaryNisa}
              tint="lilac"
              icon="↺"
              watermark={<SparkIllustration className="h-24 w-24 sm:h-28 sm:w-28" />}
            />
            <div className="hidden xl:block xl:col-span-2" />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr]">
            <TextCard
              title="AI แนะนำการซื้อไม้"
              text={aiPlantText}
              tint="cream"
              icon="✦"
              watermark={<SparkIllustration className="h-28 w-28 sm:h-32 sm:w-32" />}
            />
            <TextCard
              title="AI วิเคราะห์ธุรกิจ"
              text={aiBizText}
              tint="sky"
              icon="🧠"
              watermark={<BrainIllustration className="h-28 w-28 sm:h-32 sm:w-32" />}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <BankBalanceCard
              bank="GSB"
              balance={bankCards.GSB.balance}
              income={bankCards.GSB.income}
              expense={bankCards.GSB.expense}
              tint={BANK_THEME.GSB.tint}
              logo={BANK_THEME.GSB.logo}
              watermark={<ReceiptIllustration className="h-24 w-24 sm:h-28 sm:w-28" />}
            />
            <BankBalanceCard
              bank="KTB"
              balance={bankCards.KTB.balance}
              income={bankCards.KTB.income}
              expense={bankCards.KTB.expense}
              tint={BANK_THEME.KTB.tint}
              logo={BANK_THEME.KTB.logo}
              watermark={<BankIllustration className="h-24 w-24 sm:h-28 sm:w-28" />}
            />
            <BankBalanceCard
              bank="KBANK"
              balance={bankCards.KBANK.balance}
              income={bankCards.KBANK.income}
              expense={bankCards.KBANK.expense}
              tint={BANK_THEME.KBANK.tint}
              logo={BANK_THEME.KBANK.logo}
              watermark={<LeafIllustration className="h-24 w-24 sm:h-28 sm:w-28" />}
            />
          </div>

          <div className="mt-3">
            <LatestInvoicesCard rows={latestInvoices} />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
