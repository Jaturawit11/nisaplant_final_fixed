'use client'

import React, { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

const money = (n) => Number(n || 0).toLocaleString('th-TH')

function pad2(n) {
  return String(n).padStart(2, '0')
}
function monthKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}
function startOfMonth(yyyyMm) {
  const [y, m] = yyyyMm.split('-').map((x) => Number(x))
  return new Date(y, m - 1, 1)
}
function endOfMonthExclusive(yyyyMm) {
  const [y, m] = yyyyMm.split('-').map((x) => Number(x))
  return new Date(y, m, 1)
}
function toISODate(d) {
  return d.toISOString().slice(0, 10)
}
function addDays(d, days) {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}
function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function pickRow(data) {
  const row = Array.isArray(data) ? data[0] : data
  return row || null
}
function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function normalizeSummary(sum) {
  const totalSales = Number(sum?.total_sales ?? sum?.sales ?? 0)
  const totalCost = Number(sum?.total_cost ?? sum?.cost ?? 0)
  const grossProfit = Number(sum?.gross_profit ?? sum?.gross ?? 0)
  const totalExpenses = Number(sum?.total_expenses ?? sum?.expenses ?? 0)
  const deadLoss = Number(sum?.dead_loss ?? sum?.dead ?? 0)
  const netProfit = Number(sum?.net_profit ?? sum?.net ?? 0)
  const tax15 = Number(sum?.tax_15 ?? sum?.tax ?? 0)
  const afterTax = Number(sum?.after_tax ?? sum?.after ?? 0)

  return {
    totalSales,
    totalCost,
    grossProfit,
    totalExpenses,
    deadLoss,
    netProfit,
    tax15,
    afterTax,
  }
}

function Pill({ tone = 'slate', children }) {
  const map = {
    emerald: 'border border-emerald-200/90 bg-emerald-50 text-emerald-700',
    amber: 'border border-amber-200/90 bg-amber-50 text-amber-700',
    rose: 'border border-rose-200/90 bg-rose-50 text-rose-700',
    slate: 'border border-slate-200/90 bg-white text-slate-600',
    sky: 'border border-sky-200/90 bg-sky-50 text-sky-700',
    lilac: 'border border-violet-200/90 bg-violet-50 text-violet-700',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-tight',
        map[tone] || map.slate
      )}
    >
      {children}
    </span>
  )
}

function ShellCard({ title, subtitle, tint = 'default', right, children, className = '' }) {
  const tintMap = {
    default:
      'border border-white/80 bg-white/92 shadow-[0_8px_24px_rgba(15,23,42,0.05)]',
    rose:
      'border border-rose-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(255,244,247,0.96)_46%,rgba(252,231,243,0.92)_100%)] shadow-[0_8px_24px_rgba(244,63,94,0.06)]',
    sky:
      'border border-sky-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(245,250,255,0.96)_46%,rgba(224,242,254,0.92)_100%)] shadow-[0_8px_24px_rgba(59,130,246,0.06)]',
    emerald:
      'border border-emerald-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(245,255,250,0.96)_46%,rgba(209,250,229,0.92)_100%)] shadow-[0_8px_24px_rgba(16,185,129,0.06)]',
    cream:
      'border border-amber-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(255,251,245,0.96)_46%,rgba(255,247,237,0.92)_100%)] shadow-[0_8px_24px_rgba(245,158,11,0.06)]',
    lilac:
      'border border-violet-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(249,247,255,0.96)_46%,rgba(243,232,255,0.92)_100%)] shadow-[0_8px_24px_rgba(139,92,246,0.06)]',
  }

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[30px] p-4 sm:p-5',
        tintMap[tint] || tintMap.default,
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.66),transparent_38%)]" />
      <div className="relative z-10">
        {(title || subtitle || right) && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title ? (
                <div className="text-[15px] font-semibold tracking-tight text-slate-900">
                  {title}
                </div>
              ) : null}
              {subtitle ? (
                <div className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</div>
              ) : null}
            </div>
            {right}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

function KPI({ title, value, tone = 'default', suffix = 'บาท' }) {
  const toneMap = {
    default: 'border-white/85 bg-white/82',
    rose: 'border-rose-100/90 bg-white/72',
    sky: 'border-sky-100/90 bg-white/72',
    emerald: 'border-emerald-100/90 bg-white/72',
    cream: 'border-amber-100/90 bg-white/72',
    lilac: 'border-violet-100/90 bg-white/72',
  }

  return (
    <div
      className={cn(
        'rounded-[26px] border p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]',
        toneMap[tone] || toneMap.default
      )}
    >
      <div className="text-xs font-semibold text-slate-500">{title}</div>
      <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="text-[30px] font-bold leading-none tracking-tight text-slate-900">
          {value}
        </span>
        <span className="mb-1 text-xs font-semibold text-slate-400">{suffix}</span>
      </div>
    </div>
  )
}

function MiniStat({ label, value, tone = 'default' }) {
  const toneMap = {
    default: 'border-white/85 bg-white/82',
    rose: 'border-rose-100/90 bg-white/72',
    sky: 'border-sky-100/90 bg-white/72',
    emerald: 'border-emerald-100/90 bg-white/72',
    cream: 'border-amber-100/90 bg-white/72',
    lilac: 'border-violet-100/90 bg-white/72',
  }

  return (
    <div
      className={cn(
        'rounded-[22px] border p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]',
        toneMap[tone] || toneMap.default
      )}
    >
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-[24px] font-bold tracking-tight text-slate-900">{value}</div>
    </div>
  )
}

function BigLine({ label, value, tone = 'default', emphasize = false }) {
  const toneMap = {
    default: 'border-white/85 bg-white/80',
    rose: 'border-rose-100/90 bg-white/74',
    sky: 'border-sky-100/90 bg-white/74',
    emerald: 'border-emerald-100/90 bg-white/74',
    cream: 'border-amber-100/90 bg-white/74',
    lilac: 'border-violet-100/90 bg-white/74',
  }

  return (
    <div
      className={cn(
        'rounded-[22px] border px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]',
        toneMap[tone] || toneMap.default
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-semibold text-slate-600">{label}</div>
        <div
          className={cn(
            'text-right font-bold tracking-tight text-slate-900',
            emphasize ? 'text-[28px]' : 'text-[22px]'
          )}
        >
          {value}
        </div>
      </div>
    </div>
  )
}

function EmptyHint({ text }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
      {text}
    </div>
  )
}

function SimpleBarChart({ rows, xKey, yKey }) {
  const cleaned = (rows || [])
    .map((r) => ({
      x: r?.[xKey] ?? r?.d ?? '',
      y: Number(r?.[yKey] ?? 0),
    }))
    .slice(-30)

  if (!cleaned.length) return null

  const maxAbs = Math.max(1, ...cleaned.map((p) => Math.abs(p.y)))
  const w = 960
  const h = 210
  const pad = 16
  const baseY = h / 2
  const gap = 4
  const barW = Math.max(6, Math.floor((w - pad * 2) / cleaned.length) - gap)

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-[220px] min-w-[760px] w-full rounded-[24px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0.72)_100%)]"
      >
        <line x1={0} y1={baseY} x2={w} y2={baseY} stroke="rgba(100,116,139,0.18)" strokeWidth="1" />

        {cleaned.map((p, i) => {
          const x = pad + i * (barW + gap)
          const barH = Math.round((Math.abs(p.y) / maxAbs) * (h / 2 - 26))
          const y = p.y >= 0 ? baseY - barH : baseY
          const fill = p.y >= 0 ? '#34d399' : '#fb7185'

          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx="4" fill={fill} />
              {i % 6 === 0 ? (
                <text x={x} y={h - 8} fontSize="10" fill="rgba(100,116,139,0.75)">
                  {String(p.x).slice(5)}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-emerald-400" />
          กำไร (+)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-rose-400" />
          ขาดทุน (-)
        </span>
      </div>
    </div>
  )
}

export default function SummaryPage() {
  const supabase = supabaseBrowser()

  const [month, setMonth] = useState(() => monthKey(new Date()))
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const [sumMonth, setSumMonth] = useState(null)
  const [sumToday, setSumToday] = useState(null)

  const [salaryMonth, setSalaryMonth] = useState(0)
  const [salaryToday, setSalaryToday] = useState(0)

  const [series30, setSeries30] = useState([])
  const [series30Note, setSeries30Note] = useState('')

  const [top10, setTop10] = useState([])
  const [top10Note, setTop10Note] = useState('')

  const rangeMonth = useMemo(() => {
    const s = startOfMonth(month)
    const e = endOfMonthExclusive(month)
    return { start: toISODate(s), end: toISODate(e) }
  }, [month])

  const rangeToday = useMemo(() => {
    const s = startOfDay(new Date())
    const e = startOfDay(addDays(s, 1))
    return { start: toISODate(s), end: toISODate(e) }
  }, [])

  const range30 = useMemo(() => {
    const end = startOfDay(addDays(new Date(), 1))
    const start = startOfDay(addDays(end, -30))
    return { start: toISODate(start), end: toISODate(end) }
  }, [])

  async function rpcSafe(name, args) {
    const { data, error } = await supabase.rpc(name, args)
    if (error) throw error
    return data
  }

  async function sumSalaryBetween(start, end) {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('type', 'salary')
      .gte('expense_date', start)
      .lt('expense_date', end)

    if (error) throw error

    return (data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0)
  }

  async function loadAll() {
    setErr('')
    setLoading(true)

    try {
      {
        const data = await rpcSafe('get_month_summary', {
          p_start: rangeMonth.start,
          p_end: rangeMonth.end,
        })
        setSumMonth(pickRow(data))
      }

      {
        const data = await rpcSafe('get_month_summary', {
          p_start: rangeToday.start,
          p_end: rangeToday.end,
        })
        setSumToday(pickRow(data))
      }

      {
        const [monthSalaryValue, todaySalaryValue] = await Promise.all([
          sumSalaryBetween(rangeMonth.start, rangeMonth.end),
          sumSalaryBetween(rangeToday.start, rangeToday.end),
        ])
        setSalaryMonth(monthSalaryValue)
        setSalaryToday(todaySalaryValue)
      }

      try {
        const data = await rpcSafe('get_daily_profit_series', {
          p_start: range30.start,
          p_end: range30.end,
        })
        const rows = Array.isArray(data) ? data : []
        setSeries30(rows)
        setSeries30Note('')
      } catch (e) {
        setSeries30([])
        setSeries30Note('ยังไม่ได้เปิดใช้กราฟ 30 วัน (ต้องสร้าง RPC: get_daily_profit_series)')
      }

      try {
        const data = await rpcSafe('get_top_profit_items', {
          p_start: rangeMonth.start,
          p_end: rangeMonth.end,
          p_limit: 10,
        })
        const rows = Array.isArray(data) ? data : []
        setTop10(rows)
        setTop10Note('')
      } catch (e) {
        setTop10([])
        setTop10Note('ยังไม่ได้เปิดใช้ Top 10 (ต้องสร้าง RPC: get_top_profit_items)')
      }
    } catch (e) {
      setErr(e.message || String(e))
      setSumMonth(null)
      setSumToday(null)
      setSalaryMonth(0)
      setSalaryToday(0)
      setSeries30([])
      setTop10([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeMonth.start, rangeMonth.end])

  function prevMonth() {
    const d = startOfMonth(month)
    d.setMonth(d.getMonth() - 1)
    setMonth(monthKey(d))
  }

  function nextMonth() {
    const d = startOfMonth(month)
    d.setMonth(d.getMonth() + 1)
    setMonth(monthKey(d))
  }

  const m = normalizeSummary(sumMonth)
  const t = normalizeSummary(sumToday)

  const todayAfterSalary = t.afterTax - salaryToday
  const monthAfterSalary = m.afterTax - salaryMonth

  return (
    <AppShell title="สรุป (Summary)">
      <div className="-m-3 min-h-full rounded-[34px] bg-[linear-gradient(180deg,#fffdfd_0%,#fff8fb_24%,#f7fbff_58%,#f8fff9_100%)] p-3 sm:-m-4 sm:p-4 md:-m-5 md:p-5">
        <div className="mx-auto grid max-w-6xl gap-3 sm:gap-4">
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                NisaPlant Summary
              </div>
              <div className="mt-1 text-[24px] font-semibold tracking-tight text-slate-900 sm:text-[29px]">
                สรุป
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill tone="sky">เดือน {month}</Pill>
              <Pill tone="emerald">วันนี้ {rangeToday.start}</Pill>
              <Pill tone="lilac">เงินเดือนเดือนนี้ {money(salaryMonth)}</Pill>
            </div>
          </div>

          <ShellCard
            title="เลือกเดือน"
            subtitle={`ช่วงข้อมูลเดือน: ${rangeMonth.start} - ${rangeMonth.end} | วันนี้: ${rangeToday.start}`}
            tint="default"
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={prevMonth}
                className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                disabled={loading}
              >
                ◀ เดือนก่อน
              </button>

              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-11 rounded-2xl border border-slate-200/90 bg-white/85 px-4 text-[15px] text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
              />

              <button
                onClick={nextMonth}
                className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                disabled={loading}
              >
                เดือนถัดไป ▶
              </button>

              <button
                onClick={loadAll}
                className="inline-flex h-11 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-500 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.16)] transition hover:bg-emerald-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
              </button>
            </div>

            {err ? (
              <div className="mt-4 rounded-[22px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 whitespace-pre-wrap">
                {err}
              </div>
            ) : null}
          </ShellCard>

          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-6">
            <KPI title="ยอดขายวันนี้" value={money(t.totalSales)} tone="rose" />
            <KPI title="กำไรวันนี้" value={money(t.netProfit)} tone="sky" />
            <KPI title="เงินเดือนวันนี้" value={money(salaryToday)} tone="lilac" />
            <KPI title="ยอดขายเดือนนี้" value={money(m.totalSales)} tone="cream" />
            <KPI title="กำไรเดือนนี้" value={money(m.netProfit)} tone="emerald" />
            <KPI title="เงินเดือนเดือนนี้" value={money(salaryMonth)} tone="lilac" />
          </div>

          <ShellCard title="ภาพรวมรายเดือน" subtitle="ค่าสรุปหลักของเดือนที่เลือก" tint="default">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MiniStat label="ยอดขายรวม" value={money(m.totalSales)} tone="rose" />
              <MiniStat label="ต้นทุนรวม" value={money(m.totalCost)} tone="sky" />
              <MiniStat label="กำไรจากการขาย" value={money(m.grossProfit)} tone="emerald" />
              <MiniStat label="ค่าใช้จ่ายรวม" value={money(m.totalExpenses)} tone="cream" />
              <MiniStat label="ขาดทุนจากไม้ตาย" value={money(m.deadLoss)} tone="rose" />
            </div>
          </ShellCard>

          <ShellCard title="กำไรสุทธิจริง + ภาษี + เงินเดือน" subtitle="สรุปกำไรหลังหักค่าใช้จ่าย กันภาษี และดูเงินเหลือหลังเงินเดือน" tint="lilac">
            <div className="grid gap-3">
              <BigLine label="กำไรจากการขาย" value={money(m.grossProfit)} tone="default" />
              <BigLine label="ค่าใช้จ่ายรวม" value={money(m.totalExpenses)} tone="cream" />
              <BigLine label="ขาดทุนจากไม้ตาย" value={money(m.deadLoss)} tone="rose" />
              <BigLine
                label="กำไรสุทธิจริง (กำไรจากการขาย - ค่าใช้จ่าย - ไม้ตาย)"
                value={money(m.netProfit)}
                tone="sky"
              />
              <BigLine label="ภาษี 15%" value={money(m.tax15)} tone="cream" />
              <BigLine
                label="เหลือหลังกันภาษี"
                value={money(m.afterTax)}
                tone="emerald"
              />
              <BigLine label="เงินเดือนรวม" value={money(salaryMonth)} tone="lilac" />
              <BigLine
                label="เหลือหลังกันภาษีและหลังเงินเดือน"
                value={money(monthAfterSalary)}
                tone="emerald"
                emphasize
              />
            </div>
          </ShellCard>

          <ShellCard title="ภาพรวมวันนี้" subtitle="ดูเงินเดือนวันนี้แยกจากกำไรธุรกิจวันนี้" tint="sky">
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label="กำไรวันนี้" value={money(t.netProfit)} tone="sky" />
              <MiniStat label="เงินเดือนวันนี้" value={money(salaryToday)} tone="lilac" />
              <MiniStat label="เหลือหลังเงินเดือนวันนี้" value={money(todayAfterSalary)} tone="emerald" />
            </div>
          </ShellCard>

          <ShellCard
            title="แนวโน้มกำไร 30 วันล่าสุด"
            subtitle={`ช่วงข้อมูล: ${range30.start} - ${range30.end}`}
            tint="sky"
            right={series30Note ? <Pill tone="amber">ยังไม่ครบ</Pill> : null}
          >
            {series30?.length ? (
              <SimpleBarChart rows={series30} xKey="d" yKey="net" />
            ) : (
              <EmptyHint text={series30Note || 'ยังไม่มีข้อมูลกราฟ 30 วัน'} />
            )}
          </ShellCard>

          <ShellCard
            title="Top 10 รายการกำไรสูงสุด"
            subtitle="อ้างอิงจากเดือนที่เลือก"
            tint="cream"
            right={top10Note ? <Pill tone="amber">ยังไม่ครบ</Pill> : null}
          >
            {top10?.length ? (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className="border-b border-slate-100 px-3 py-3 text-left text-xs font-semibold text-slate-400">อันดับ</th>
                        <th className="border-b border-slate-100 px-3 py-3 text-left text-xs font-semibold text-slate-400">รายการ</th>
                        <th className="border-b border-slate-100 px-3 py-3 text-right text-xs font-semibold text-slate-400">ยอดขาย</th>
                        <th className="border-b border-slate-100 px-3 py-3 text-right text-xs font-semibold text-slate-400">กำไร</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top10.map((r, idx) => (
                        <tr key={idx}>
                          <td className="border-b border-slate-100 px-3 py-4 text-sm font-bold text-slate-900">
                            {idx + 1}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-4 text-sm text-slate-700">
                            <div className="font-semibold text-slate-900">
                              {r.name || r.item_name || r.plant_name || '-'}
                            </div>
                            {r.note ? <div className="mt-1 text-xs text-slate-500">{r.note}</div> : null}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-4 text-right text-sm font-semibold text-slate-900">
                            {money(r.total_sales || r.sales || 0)}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-4 text-right text-sm font-bold text-emerald-700">
                            {money(r.profit || r.net_profit || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-2 md:hidden">
                  {top10.map((r, idx) => (
                    <div
                      key={idx}
                      className="rounded-[22px] border border-white/85 bg-white/82 px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-500">#{idx + 1}</div>
                          <div className="mt-1 text-sm font-bold tracking-tight text-slate-900">
                            {r.name || r.item_name || r.plant_name || '-'}
                          </div>
                          {r.note ? <div className="mt-1 text-xs text-slate-500">{r.note}</div> : null}
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-xs text-slate-500">ยอดขาย</div>
                          <div className="text-sm font-semibold text-slate-900">
                            {money(r.total_sales || r.sales || 0)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">กำไร</div>
                          <div className="text-sm font-bold text-emerald-700">
                            {money(r.profit || r.net_profit || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyHint text={top10Note || 'ยังไม่มีข้อมูล Top 10'} />
            )}
          </ShellCard>
        </div>
      </div>
    </AppShell>
  )
}