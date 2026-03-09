'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function money(n) {
  return Number(n || 0).toLocaleString('th-TH')
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

function BigLine({ label, value, tone = 'default' }) {
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
        <div className="text-right text-[26px] font-bold tracking-tight text-slate-900">
          {value}
        </div>
      </div>
    </div>
  )
}

export default function SalaryPage() {
  const supabase = supabaseBrowser()

  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(true)

  const [monthNet, setMonthNet] = useState(0)
  const [monthProfit, setMonthProfit] = useState(0)
  const [monthExpenses, setMonthExpenses] = useState(0)

  const taxRate = 0.15
  const myRate = 0.1
  const partnerRate = 0.2
  const salaryCap = 60000

  const monthStart = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}-01`
  }, [])

  function toastOk(msg) {
    setOk(msg)
    setTimeout(() => setOk(''), 2000)
  }

  async function load() {
    setErr('')
    setOk('')
    setLoading(true)

    try {
      const invReq = supabase
        .from('invoices')
        .select('total_profit,sale_date')
        .gte('sale_date', monthStart)
        .limit(5000)

      const expReq = supabase
        .from('expenses')
        .select('amount,expense_date,type')
        .gte('expense_date', monthStart)
        .limit(5000)

      const [invRes, expRes] = await Promise.all([invReq, expReq])
      if (invRes.error) throw invRes.error
      if (expRes.error) throw expRes.error

      const profit = (invRes.data || []).reduce(
        (s, r) => s + Number(r.total_profit || 0),
        0
      )

      const expenses = (expRes.data || [])
        .filter((r) => String(r.type || '').toLowerCase() === 'expense')
        .reduce((s, r) => s + Number(r.amount || 0), 0)

      const net = profit - expenses

      setMonthProfit(profit)
      setMonthExpenses(expenses)
      setMonthNet(net)

      toastOk('อัปเดตแล้ว')
    } catch (e) {
      setErr(e?.message || 'โหลดข้อมูลไม่สำเร็จ')
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const calc = useMemo(() => {
    const net = Number(monthNet || 0)
    const taxReserve = net > 0 ? net * taxRate : 0
    const afterTax = Math.max(net - taxReserve, 0)

    const rawMe = afterTax * myRate
    const rawPartner = afterTax * partnerRate
    const rawTotal = rawMe + rawPartner

    let me = rawMe
    let partner = rawPartner
    let total = rawTotal

    if (rawTotal > salaryCap) {
      const k = salaryCap / rawTotal
      me = Math.floor(rawMe * k)
      partner = Math.floor(rawPartner * k)
      total = me + partner
    }

    return {
      net,
      taxReserve,
      afterTax,
      rawMe,
      rawPartner,
      rawTotal,
      me,
      partner,
      total,
      capHit: rawTotal > salaryCap,
    }
  }, [monthNet])

  return (
    <AppShell title="เงินเดือน (ผัวเมีย)">
      <div className="-m-3 min-h-full rounded-[34px] bg-[linear-gradient(180deg,#fffdfd_0%,#fff8fb_24%,#f7fbff_58%,#f8fff9_100%)] p-3 sm:-m-4 sm:p-4 md:-m-5 md:p-5">
        <div className="mx-auto grid max-w-6xl gap-3 sm:gap-4">
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                NisaPlant Salary
              </div>
              <div className="mt-1 text-[24px] font-semibold tracking-tight text-slate-900 sm:text-[29px]">
                เงินเดือน (ผัวเมีย)
              </div>
              <div className="mt-1 text-sm leading-relaxed text-slate-500">
                คิดจากกำไรสุทธิเดือนนี้ = รวม total_profit - รวม expense และกันภาษี 15% ก่อนคำนวณเงินเดือน
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill tone="sky">เริ่มเดือน {monthStart}</Pill>
              <Pill tone={calc.capHit ? 'amber' : 'emerald'}>
                {calc.capHit ? 'ชนเพดาน' : 'ไม่ชนเพดาน'}
              </Pill>
            </div>
          </div>

          {(err || ok) && (
            <div className="space-y-2">
              {err ? (
                <div className="rounded-[24px] border border-rose-100/90 bg-rose-50/92 px-4 py-3 text-sm font-semibold text-rose-700">
                  {err}
                </div>
              ) : null}
              {ok ? (
                <div className="rounded-[24px] border border-emerald-100/90 bg-emerald-50/92 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {ok}
                </div>
              ) : null}
            </div>
          )}

          <ShellCard
            title="สรุปฐานคำนวณ"
            subtitle="ตรวจสอบตัวเลขต้นทางก่อนคำนวณเงินเดือน"
            tint="default"
            right={
              <button
                onClick={load}
                className="inline-flex h-11 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-500 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.16)] transition hover:bg-emerald-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
              </button>
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label="รวมกำไรจากการขาย" value={`${money(monthProfit)} บาท`} tone="emerald" />
              <MiniStat label="รวมค่าใช้จ่ายจริง" value={`${money(monthExpenses)} บาท`} tone="rose" />
              <MiniStat label="กำไรสุทธิเดือนนี้ (net)" value={`${money(calc.net)} บาท`} tone="sky" />
            </div>
          </ShellCard>

          <div className="grid gap-3 sm:gap-4 xl:grid-cols-[1fr_1fr]">
            <ShellCard
              title="ฐานคำนวณหลังภาษี"
              subtitle="ถ้า net ≤ 0 ระบบจะให้เงินเดือน = 0"
              tint="lilac"
            >
              <div className="grid gap-3">
                <BigLine label="กำไรสุทธิเดือนนี้" value={`${money(calc.net)} บาท`} tone="default" />
                <BigLine label="กันภาษี 15%" value={`${money(calc.taxReserve)} บาท`} tone="cream" />
                <BigLine label="เหลือหลังกันภาษี" value={`${money(calc.afterTax)} บาท`} tone="emerald" />
              </div>
            </ShellCard>

            <ShellCard
              title="เงินเดือน"
              subtitle="ผัว 10% • เมีย 20% • รวมไม่เกิน 60,000"
              tint="sky"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <MiniStat label="ผัว 10% (ก่อนติดเพดาน)" value={`${money(calc.rawMe)} บาท`} tone="default" />
                <MiniStat label="เมีย 20% (ก่อนติดเพดาน)" value={`${money(calc.rawPartner)} บาท`} tone="default" />
                <MiniStat label="รวม (ก่อนติดเพดาน)" value={`${money(calc.rawTotal)} บาท`} tone="cream" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniStat label="ผัว (หลังคุมเพดาน)" value={`${money(calc.me)} บาท`} tone="sky" />
                <MiniStat label="เมีย (หลังคุมเพดาน)" value={`${money(calc.partner)} บาท`} tone="sky" />
                <MiniStat label="รวมจ่ายจริง" value={`${money(calc.total)} บาท`} tone="emerald" />
              </div>

              <div className="mt-4">
                {calc.capHit ? (
                  <div className="rounded-[22px] border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                    รวมเกิน 60,000 → ระบบลดสัดส่วนลงอัตโนมัติ แต่ยังคงอัตรา 10% : 20%
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-emerald-200/90 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    ไม่ชนเพดาน 60,000
                  </div>
                )}
              </div>
            </ShellCard>
          </div>
        </div>
      </div>
    </AppShell>
  )
}