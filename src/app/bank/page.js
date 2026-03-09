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
  }

  return (
    <div
      className={cn(
        'rounded-[22px] border p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]',
        toneMap[tone] || toneMap.default
      )}
    >
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-[26px] font-bold tracking-tight text-slate-900">{value}</div>
    </div>
  )
}

function bankTone(bank) {
  if (bank === 'GSB') return 'rose'
  if (bank === 'KTB') return 'sky'
  if (bank === 'KBANK') return 'emerald'
  return 'default'
}

function netTone(net) {
  if (net > 0) return 'emerald'
  if (net < 0) return 'rose'
  return 'slate'
}

export default function BankReportPage() {
  const supabase = supabaseBrowser()

  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])

  const monthStart = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}-01`
  }, [])

  async function load() {
    setErr('')
    setLoading(true)

    try {
      const payReq = supabase
        .from('payments')
        .select('bank,amount,pay_date')
        .gte('pay_date', monthStart)
        .limit(5000)

      const expReq = supabase
        .from('expenses')
        .select('bank,amount,expense_date,type,category')
        .gte('expense_date', monthStart)
        .limit(5000)

      const [a, b] = await Promise.all([payReq, expReq])
      if (a.error) throw a.error
      if (b.error) throw b.error

      setPayments(a.data || [])
      setExpenses(b.data || [])
    } catch (e) {
      setErr(e?.message || 'โหลดรายงานธนาคารไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const report = useMemo(() => {
    const byBank = new Map()

    function ensure(bank) {
      const key = bank || 'UNKNOWN'
      const found = byBank.get(key)
      if (found) return found

      const created = {
        bank: key,
        income: 0,
        expense: 0,
        paymentIncome: 0,
        otherIncome: 0,
        paymentCount: 0,
        incomeRows: 0,
        expenseRows: 0,
      }
      byBank.set(key, created)
      return created
    }

    // เงินเข้า "จริง" จากการขาย = payments.amount
    for (const r of payments) {
      const obj = ensure(r.bank)
      const amt = Number(r.amount || 0)
      obj.income += amt
      obj.paymentIncome += amt
      obj.paymentCount += 1
    }

    // เงินเข้า/ออกอื่น ๆ จาก expenses โดยดู type
    for (const r of expenses) {
      const obj = ensure(r.bank)
      const amt = Number(r.amount || 0)
      const type = String(r.type || '').toLowerCase()

      if (type === 'income') {
        obj.income += amt
        obj.otherIncome += amt
        obj.incomeRows += 1
      } else {
        obj.expense += amt
        obj.expenseRows += 1
      }
    }

    const rows = Array.from(byBank.values()).map((x) => ({
      ...x,
      net: x.income - x.expense,
    }))

    const bankOrder = { GSB: 1, KTB: 2, KBANK: 3, UNKNOWN: 99 }
    rows.sort((a, b) => {
      const ao = bankOrder[a.bank] ?? 50
      const bo = bankOrder[b.bank] ?? 50
      if (ao !== bo) return ao - bo
      return a.bank.localeCompare(b.bank)
    })

    const totalIncome = rows.reduce((s, r) => s + r.income, 0)
    const totalExpense = rows.reduce((s, r) => s + r.expense, 0)

    return {
      rows,
      totalIncome,
      totalExpense,
      totalNet: totalIncome - totalExpense,
    }
  }, [payments, expenses])

  return (
    <AppShell title="รายงานธนาคาร">
      <div className="-m-3 min-h-full rounded-[34px] bg-[linear-gradient(180deg,#fffdfd_0%,#fff8fb_24%,#f7fbff_58%,#f8fff9_100%)] p-3 sm:-m-4 sm:p-4 md:-m-5 md:p-5">
        <div className="mx-auto grid max-w-6xl gap-3 sm:gap-4">
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                NisaPlant Bank Report
              </div>
              <div className="mt-1 text-[24px] font-semibold tracking-tight text-slate-900 sm:text-[29px]">
                รายงานธนาคาร
              </div>
              <div className="mt-1 text-sm leading-relaxed text-slate-500">
                เงินเข้า = payments + expenses(type=income) • เงินออก = expenses(type=expense)
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill tone="sky">เริ่ม {monthStart}</Pill>
              <Pill tone={netTone(report.totalNet)}>
                สุทธิ {money(report.totalNet)}
              </Pill>
            </div>
          </div>

          {err ? (
            <div className="rounded-[24px] border border-rose-100/90 bg-rose-50/92 px-4 py-3 text-sm font-semibold text-rose-700">
              {err}
            </div>
          ) : null}

          <ShellCard
            title="ภาพรวมเดือนนี้"
            subtitle="คำนวณจากเงินเข้าและเงินออกจริงแยกตามธนาคาร"
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
              <MiniStat label="เงินเข้าเดือนนี้" value={`${money(report.totalIncome)} บาท`} tone="emerald" />
              <MiniStat label="เงินออกเดือนนี้" value={`${money(report.totalExpense)} บาท`} tone="rose" />
              <MiniStat label="สุทธิเดือนนี้" value={`${money(report.totalNet)} บาท`} tone="sky" />
            </div>
          </ShellCard>

          <div className="grid gap-3 sm:gap-4">
            {loading ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
                กำลังโหลด...
              </div>
            ) : null}

            {!loading && !report.rows.length ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
                ไม่มีข้อมูล
              </div>
            ) : null}

            {report.rows.map((r) => (
              <ShellCard
                key={r.bank}
                title={r.bank}
                subtitle="สรุปเงินเข้าออกของธนาคารนี้ในเดือนปัจจุบัน"
                tint={bankTone(r.bank)}
                right={
                  <div className="text-right">
                    <div
                      className={cn(
                        'text-[28px] font-bold tracking-tight',
                        r.net > 0
                          ? 'text-emerald-700'
                          : r.net < 0
                          ? 'text-rose-700'
                          : 'text-slate-700'
                      )}
                    >
                      {r.net > 0 ? '+' : ''}
                      {money(r.net)} บาท
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">สุทธิ</div>
                  </div>
                }
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <MiniStat
                    label={`เงินเข้า (ขายจริง ${r.paymentCount} รายการ)`}
                    value={`${money(r.paymentIncome)} บาท`}
                    tone="emerald"
                  />

                  <MiniStat
                    label={`เงินเข้าอื่น (${r.incomeRows} รายการ)`}
                    value={`${money(r.otherIncome)} บาท`}
                    tone="sky"
                  />

                  <MiniStat
                    label={`เงินเข้ารวม`}
                    value={`${money(r.income)} บาท`}
                    tone="cream"
                  />

                  <MiniStat
                    label={`เงินออก (${r.expenseRows} รายการ)`}
                    value={`${money(r.expense)} บาท`}
                    tone="rose"
                  />
                </div>
              </ShellCard>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}